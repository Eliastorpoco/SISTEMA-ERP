"""Prueba focal V1N contra una base temporal clonada; nunca usar en producción."""
import os
import uuid
from decimal import Decimal

from sqlalchemy import text

from infrastructure.database import SQLDatabaseConnection
from controllers import finanzas_integraciones_controller as v1n


assert os.getenv("V1N_TEMP_DATABASE") == "v1n_finanzas_test_20260816", "Solo base temporal autorizada"
db = SQLDatabaseConnection.get_instance().get_session()
tenant = "00000000-0000-0000-0000-000000000001"
payment_id = "TEST-V1N-PAYMENT-0001"

try:
    concept = db.execute(text("""
        INSERT INTO conceptos_pago (tenant_id,nombre,descripcion,monto_default,activo)
        VALUES (CAST(:tenant AS uuid),'Pensión V1N TEST','Solo prueba temporal',125.50,true)
        ON CONFLICT (nombre,tenant_id) DO UPDATE SET monto_default=EXCLUDED.monto_default
        RETURNING id
    """), {"tenant": tenant}).scalar_one()
    obligation = db.execute(text("""
        INSERT INTO pensiones (tenant_id,estudiante_id,concepto_id,anio,mes,monto,estado)
        VALUES (CAST(:tenant AS uuid),2,:concept,2026,8,125.50,'pendiente')
        ON CONFLICT (estudiante_id,concepto_id,anio,mes,tenant_id)
        DO UPDATE SET monto=EXCLUDED.monto,estado='pendiente' RETURNING id
    """), {"tenant": tenant, "concept": concept}).scalar_one()
    db.execute(text("UPDATE apoderados SET telefono='51999999999' WHERE id=1 AND tenant_id::text=:tenant"), {"tenant": tenant})
    db.commit()

    attempt = v1n._crear_intento(db, tenant, obligation, 1)
    before = v1n._estado_cuenta(db, tenant, 2)["total_pendiente"]
    assert Decimal(str(before)) == Decimal("125.50")

    event1 = uuid.uuid4()
    db.execute(text("""
        INSERT INTO integracion_webhook_eventos
          (id,provider,event_type,external_event_id,payload,headers,estado)
        VALUES (:id,'MERCADO_PAGO','payment.updated','TEST-EVENT-1','{}'::jsonb,'{}'::jsonb,'RECIBIDO')
    """), {"id": event1})
    db.commit()
    payment = {
        "id": payment_id,
        "status": "approved",
        "external_reference": attempt["external_reference"],
        "transaction_amount": 125.50,
        "currency_id": "PEN",
        "date_approved": "2026-08-16T12:00:00Z",
    }
    first = v1n._aplicar_pago(db, payment, event1)
    assert first["resultado"] == "APLICADO"

    event2 = uuid.uuid4()
    db.execute(text("""
        INSERT INTO integracion_webhook_eventos
          (id,provider,event_type,external_event_id,payload,headers,estado)
        VALUES (:id,'MERCADO_PAGO','payment.updated','TEST-EVENT-2','{}'::jsonb,'{}'::jsonb,'RECIBIDO')
    """), {"id": event2})
    db.commit()
    second = v1n._aplicar_pago(db, payment, event2)
    assert second["resultado"] == "IDEMPOTENTE"

    after = v1n._estado_cuenta(db, tenant, 2)["total_pendiente"]
    counts = db.execute(text("""
        SELECT
          (SELECT count(*) FROM pagos WHERE provider='MERCADO_PAGO' AND external_payment_id=:payment),
          (SELECT count(*) FROM aplicaciones_pago a JOIN pagos p ON p.id=a.pago_id WHERE p.external_payment_id=:payment)
    """), {"payment": payment_id}).one()
    assert Decimal(str(after)) == Decimal("0.0")
    assert counts == (1, 1)
    print(f"POSTGRES_E2E_PASS intento={attempt['id']} referencia={attempt['external_reference']} pago={payment_id} saldo_antes={before} saldo_despues={after}")
finally:
    db.close()
