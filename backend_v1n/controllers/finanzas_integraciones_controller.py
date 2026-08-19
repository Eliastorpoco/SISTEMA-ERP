"""V1N: intentos, estado de cuenta e integración canónica con Mercado Pago."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from factories.factories import get_usuario_actual
from infrastructure.database import get_db

logger = logging.getLogger("erp.finanzas.v1n")
router = APIRouter()

PROVIDER = "MERCADO_PAGO"
MONEDA = "PEN"


class IntentoCreate(BaseModel):
    obligacion_id: int = Field(gt=0)
    apoderado_id: Optional[int] = Field(default=None, gt=0)


class PreferenciaUpdate(BaseModel):
    preference_id: str = Field(min_length=1, max_length=180)
    checkout_url: str = Field(min_length=10, max_length=2000)


class ConfirmacionMP(BaseModel):
    payment_id: str = Field(min_length=1, max_length=180)
    external_reference: Optional[str] = Field(default=None, max_length=180)
    status: Optional[str] = Field(default=None, max_length=40)
    transaction_amount: Optional[Decimal] = None
    currency_id: Optional[str] = Field(default=None, max_length=3)
    date_approved: Optional[datetime] = None


class ConfirmacionWhatsApp(BaseModel):
    estado: str = Field(pattern="^(ENVIADA|PENDIENTE|ERROR)$")
    error: Optional[str] = Field(default=None, max_length=1000)


def _tenant(request: Request) -> str:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(401, "Tenant no autenticado.")
    return str(tenant_id)


def _role(request: Request) -> str:
    user = getattr(request.state, "current_user", None) or {}
    return str(user.get("role", "")).upper()


def _actor_id(db: Session, request: Request, tenant: str) -> Optional[int]:
    user = getattr(request.state, "current_user", None) or {}
    username = user.get("sub") or user.get("username")
    if not username:
        return None
    return db.execute(
        text("SELECT id FROM usuarios WHERE tenant_id::text=:tenant AND username=:username LIMIT 1"),
        {"tenant": tenant, "username": username},
    ).scalar()


def _require_admin(request: Request) -> None:
    if _role(request) not in {"ADMIN", "DIRECTOR"}:
        raise HTTPException(403, "Solo ADMIN/DIRECTOR accede a gestión financiera.")


def _require_integration(x_erp_integration_token: Optional[str] = Header(None)) -> None:
    expected = os.getenv("ERP_INTEGRATION_TOKEN", "")
    if not expected or not x_erp_integration_token or not hmac.compare_digest(expected, x_erp_integration_token):
        raise HTTPException(401, "Credencial de integración inválida.")


def _money(value: Any) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise HTTPException(422, "Monto inválido.") from exc


def _iso(value: Any) -> Optional[str]:
    return value.isoformat() if value else None


def _obligacion(db: Session, tenant: str, obligacion_id: int, lock: bool = False):
    if lock:
        db.execute(text("""
            SELECT id FROM pensiones
            WHERE tenant_id::text=:tenant AND id=:id FOR UPDATE
        """), {"tenant": tenant, "id": obligacion_id}).first()
    return db.execute(text("""
        SELECT p.id, p.tenant_id, p.estudiante_id, p.concepto_id, p.anio, p.mes,
               p.monto::numeric(12,2) monto_original, p.estado,
               e.nombre estudiante, c.nombre concepto,
               GREATEST(p.monto::numeric(12,2)-COALESCE(SUM(a.monto_aplicado),0),0)::numeric(12,2) saldo
        FROM pensiones p
        JOIN estudiantes e ON e.id=p.estudiante_id AND e.tenant_id=p.tenant_id
        JOIN conceptos_pago c ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
        LEFT JOIN aplicaciones_pago a ON a.obligacion_id=p.id AND a.tenant_id=p.tenant_id
        WHERE p.tenant_id::text=:tenant AND p.id=:id
        GROUP BY p.id,e.nombre,c.nombre
    """), {"tenant": tenant, "id": obligacion_id}).mappings().first()


def _assert_student_scope(db: Session, request: Request, tenant: str, estudiante_id: int) -> None:
    role = _role(request)
    if role in {"ADMIN", "DIRECTOR"}:
        return
    if role != "ESTUDIANTE":
        raise HTTPException(403, "Rol sin acceso a finanzas.")
    actor_id = _actor_id(db, request, tenant)
    if actor_id != estudiante_id:
        raise HTTPException(403, "Sin acceso al estado de cuenta solicitado.")


def _estado_cuenta(db: Session, tenant: str, estudiante_id: int) -> dict[str, Any]:
    student = db.execute(text("""
        SELECT id,nombre FROM estudiantes
        WHERE tenant_id::text=:tenant AND id=:id LIMIT 1
    """), {"tenant": tenant, "id": estudiante_id}).mappings().first()
    if not student:
        raise HTTPException(404, "Estudiante no encontrado en el tenant actual.")
    rows = db.execute(text("""
        SELECT p.id obligacion_id,c.nombre concepto,p.anio,p.mes,
               p.monto::numeric(12,2) monto_original,p.estado,
               GREATEST(p.monto::numeric(12,2)-COALESCE(SUM(a.monto_aplicado),0),0)::numeric(12,2) saldo,
               make_date(p.anio,p.mes,1)+(interval '1 month - 1 day') vencimiento
        FROM pensiones p JOIN conceptos_pago c
          ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
        LEFT JOIN aplicaciones_pago a
          ON a.obligacion_id=p.id AND a.tenant_id=p.tenant_id
        WHERE p.tenant_id::text=:tenant AND p.estudiante_id=:id
        GROUP BY p.id,c.nombre ORDER BY p.anio,p.mes,p.id
    """), {"tenant": tenant, "id": estudiante_id}).mappings().all()
    pagos = db.execute(text("""
        SELECT pg.fecha_pago,pg.monto_pagado::numeric(12,2) monto,pg.metodo_pago,
               pg.provider,pg.estado,cp.nombre concepto
        FROM pagos pg JOIN pensiones p ON p.id=pg.pension_id AND p.tenant_id=pg.tenant_id
        JOIN conceptos_pago cp ON cp.id=p.concepto_id AND cp.tenant_id=p.tenant_id
        WHERE pg.tenant_id::text=:tenant AND p.estudiante_id=:id
        ORDER BY pg.fecha_pago DESC,pg.id DESC
    """), {"tenant": tenant, "id": estudiante_id}).mappings().all()
    obligaciones = [{
        **dict(row), "monto_original": float(row["monto_original"]),
        "saldo": float(row["saldo"]), "vencimiento": row["vencimiento"].date().isoformat(),
    } for row in rows]
    pendientes = [row for row in obligaciones if row["saldo"] > 0]
    return {
        "estudiante": {"id": student["id"], "nombre": student["nombre"]},
        "periodo": f"{date.today().year}",
        "total_pendiente": float(sum((_money(x["saldo"]) for x in pendientes), Decimal("0"))),
        "vencimiento_proximo": min((x["vencimiento"] for x in pendientes), default=None),
        "obligaciones": obligaciones,
        "pagos": [{**dict(row), "monto": float(row["monto"]), "fecha_pago": _iso(row["fecha_pago"])} for row in pagos],
        "ultimo_pago": ({**dict(pagos[0]), "monto": float(pagos[0]["monto"]), "fecha_pago": _iso(pagos[0]["fecha_pago"]) } if pagos else None),
    }


def _relacion_whatsapp(db: Session, apoderado_id: int, estudiante_id: int):
    return db.execute(text("""
        SELECT ea.tenant_id,a.telefono
        FROM estudiante_apoderado ea JOIN apoderados a
          ON a.id=ea.apoderado_id AND a.tenant_id=ea.tenant_id
        WHERE ea.apoderado_id=:apoderado AND ea.estudiante_id=:estudiante
          AND ea.activo IS TRUE AND a.activo IS TRUE LIMIT 1
    """), {"apoderado": apoderado_id, "estudiante": estudiante_id}).mappings().first()


@router.get("/finanzas/estudiantes/{estudiante_id}/estado-cuenta")
def estado_cuenta(estudiante_id: int, request: Request, db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    _assert_student_scope(db, request, tenant, estudiante_id)
    return _estado_cuenta(db, tenant, estudiante_id)


@router.get("/finanzas/mi-estado-cuenta")
def mi_estado_cuenta(request: Request, db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    if _role(request) != "ESTUDIANTE":
        raise HTTPException(403, "Endpoint exclusivo para estudiantes.")
    actor_id = _actor_id(db, request, tenant)
    if not actor_id:
        raise HTTPException(404, "Identidad de estudiante no resuelta.")
    return _estado_cuenta(db, tenant, actor_id)


@router.get("/finanzas/integraciones/whatsapp/apoderados/{apoderado_id}/estudiantes/{estudiante_id}/estado-cuenta")
def estado_cuenta_whatsapp(apoderado_id: int, estudiante_id: int, db: Session = Depends(get_db), _=Depends(_require_integration)):
    relacion = _relacion_whatsapp(db, apoderado_id, estudiante_id)
    if not relacion:
        raise HTTPException(404, "Relación WhatsApp no válida.")
    return _estado_cuenta(db, str(relacion["tenant_id"]), estudiante_id)


def _crear_intento(db: Session, tenant: str, obligacion_id: int, apoderado_id: Optional[int]) -> dict[str, Any]:
    obligacion = _obligacion(db, tenant, obligacion_id, lock=True)
    if not obligacion:
        raise HTTPException(404, "Obligación no encontrada en el tenant actual.")
    if _money(obligacion["saldo"]) <= 0:
        raise HTTPException(409, "La obligación no tiene saldo pendiente.")
    if apoderado_id and not db.execute(text("""
        SELECT 1 FROM estudiante_apoderado WHERE tenant_id::text=:tenant
        AND estudiante_id=:estudiante AND apoderado_id=:apoderado AND activo IS TRUE
    """), {"tenant": tenant, "estudiante": obligacion["estudiante_id"], "apoderado": apoderado_id}).first():
        raise HTTPException(422, "El apoderado no está vinculado al estudiante.")
    intento_id = uuid.uuid4()
    reference = f"ERP-{tenant}-{obligacion_id}-{intento_id}"
    row = db.execute(text("""
        INSERT INTO intentos_cobro
          (id,tenant_id,estudiante_id,obligacion_id,apoderado_id,monto,moneda,provider,external_reference,estado)
        VALUES (:id,CAST(:tenant AS uuid),:estudiante,:obligacion,:apoderado,:monto,'PEN','MERCADO_PAGO',:reference,'CREADO')
        RETURNING *
    """), {"id": intento_id, "tenant": tenant, "estudiante": obligacion["estudiante_id"], "obligacion": obligacion_id,
              "apoderado": apoderado_id, "monto": obligacion["saldo"], "reference": reference}).mappings().first()
    db.commit()
    return _intento_dict(row)


@router.get("/finanzas/obligaciones")
def listar_obligaciones(request: Request, estudiante_id: Optional[int] = Query(None, gt=0), db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    if estudiante_id is not None:
        _assert_student_scope(db, request, tenant, estudiante_id)
    else:
        _require_admin(request)
    rows = db.execute(text("""
        SELECT p.id,p.estudiante_id,e.nombre estudiante,c.nombre concepto,p.anio,p.mes,
               p.monto::numeric(12,2) monto_original,p.estado,
               GREATEST(p.monto::numeric(12,2)-COALESCE(SUM(a.monto_aplicado),0),0)::numeric(12,2) saldo
        FROM pensiones p JOIN estudiantes e ON e.id=p.estudiante_id AND e.tenant_id=p.tenant_id
        JOIN conceptos_pago c ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
        LEFT JOIN aplicaciones_pago a ON a.obligacion_id=p.id AND a.tenant_id=p.tenant_id
        WHERE p.tenant_id::text=:tenant AND (:estudiante IS NULL OR p.estudiante_id=:estudiante)
        GROUP BY p.id,e.nombre,c.nombre ORDER BY p.anio DESC,p.mes DESC,p.id DESC
    """), {"tenant": tenant, "estudiante": estudiante_id}).mappings().all()
    return [{**dict(x), "monto_original": float(x["monto_original"]), "saldo": float(x["saldo"])} for x in rows]


@router.post("/finanzas/intentos-cobro", status_code=201)
def crear_intento(body: IntentoCreate, request: Request, db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    obligacion = _obligacion(db, tenant, body.obligacion_id, lock=True)
    if not obligacion:
        raise HTTPException(404, "Obligación no encontrada en el tenant actual.")
    _assert_student_scope(db, request, tenant, obligacion["estudiante_id"])
    return _crear_intento(db, tenant, body.obligacion_id, body.apoderado_id)


@router.post("/finanzas/integraciones/whatsapp/apoderados/{apoderado_id}/estudiantes/{estudiante_id}/intentos-cobro", status_code=201)
def crear_intento_whatsapp(apoderado_id: int, estudiante_id: int, body: IntentoCreate, db: Session = Depends(get_db), _=Depends(_require_integration)):
    relacion = _relacion_whatsapp(db, apoderado_id, estudiante_id)
    if not relacion:
        raise HTTPException(404, "Relación WhatsApp no válida.")
    obligacion = _obligacion(db, str(relacion["tenant_id"]), body.obligacion_id)
    if not obligacion or obligacion["estudiante_id"] != estudiante_id:
        raise HTTPException(422, "La obligación no corresponde al estudiante seleccionado.")
    return _crear_intento(db, str(relacion["tenant_id"]), body.obligacion_id, apoderado_id)


@router.patch("/finanzas/intentos-cobro/{intento_id}/preferencia")
def guardar_preferencia(intento_id: uuid.UUID, body: PreferenciaUpdate, db: Session = Depends(get_db), _=Depends(_require_integration)):
    row = db.execute(text("""
        UPDATE intentos_cobro SET preference_id=:preference,checkout_url=:url,
          estado='LINK_GENERADO',error=NULL,updated_at=now()
        WHERE id=:id AND estado IN ('CREADO','ERROR') RETURNING *
    """), {"id": intento_id, "preference": body.preference_id, "url": body.checkout_url}).mappings().first()
    if not row:
        raise HTTPException(409, "Intento inexistente o no actualizable.")
    db.commit()
    return _intento_dict(row)


@router.post("/finanzas/intentos-cobro/{intento_id}/error")
def marcar_error_preferencia(intento_id: uuid.UUID, error: str = "PREFERENCE_ERROR", db: Session = Depends(get_db), _=Depends(_require_integration)):
    db.execute(text("UPDATE intentos_cobro SET estado='ERROR',error=:error,updated_at=now() WHERE id=:id AND estado<>'PAGADO'"), {"id": intento_id, "error": error[:1000]})
    db.commit()
    return {"ok": True}


@router.post("/finanzas/intentos-cobro/{intento_id}/confirmacion-whatsapp")
def marcar_confirmacion_whatsapp(intento_id: uuid.UUID, body: ConfirmacionWhatsApp, db: Session = Depends(get_db), _=Depends(_require_integration)):
    estado = "CONFIRMACION_WHATSAPP_PENDIENTE" if body.estado in {"PENDIENTE", "ERROR"} else "ENVIADA"
    updated = db.execute(text("""
        UPDATE intentos_cobro SET confirmacion_whatsapp_estado=:estado,
          error=CASE WHEN :input_estado='ERROR' THEN :error ELSE error END,updated_at=now()
        WHERE id=:id RETURNING id
    """), {"id": intento_id, "estado": estado, "input_estado": body.estado, "error": body.error}).scalar()
    if not updated:
        raise HTTPException(404, "Intento no encontrado.")
    db.commit()
    return {"ok": True, "estado": estado}


@router.get("/finanzas/intentos-cobro")
def listar_intentos(request: Request, db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    _require_admin(request)
    rows = db.execute(text("""
        SELECT i.*,e.nombre estudiante,c.nombre concepto
        FROM intentos_cobro i JOIN estudiantes e ON e.id=i.estudiante_id AND e.tenant_id=i.tenant_id
        JOIN pensiones p ON p.id=i.obligacion_id AND p.tenant_id=i.tenant_id
        JOIN conceptos_pago c ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
        WHERE i.tenant_id::text=:tenant ORDER BY i.created_at DESC LIMIT 500
    """), {"tenant": tenant}).mappings().all()
    return [_intento_dict(x) for x in rows]


@router.get("/finanzas/pagos")
def listar_pagos(request: Request, db: Session = Depends(get_db), _=Depends(get_usuario_actual)):
    tenant = _tenant(request)
    _require_admin(request)
    rows = db.execute(text("""
        SELECT pg.id,pg.estudiante_id,e.nombre estudiante,c.nombre concepto,pg.monto_pagado,
          pg.moneda,pg.metodo_pago,pg.provider,pg.external_payment_id,pg.external_reference,
          pg.estado,pg.fecha_pago,pg.source,pg.creado_en
        FROM pagos pg JOIN estudiantes e ON e.id=pg.estudiante_id AND e.tenant_id=pg.tenant_id
        JOIN pensiones p ON p.id=pg.pension_id AND p.tenant_id=pg.tenant_id
        JOIN conceptos_pago c ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
        WHERE pg.tenant_id::text=:tenant ORDER BY pg.fecha_pago DESC,pg.id DESC LIMIT 500
    """), {"tenant": tenant}).mappings().all()
    return [{**dict(x), "monto_pagado": float(x["monto_pagado"]), "fecha_pago": _iso(x["fecha_pago"]), "creado_en": _iso(x["creado_en"])} for x in rows]


@router.get("/finanzas/integraciones/estado")
def integraciones_estado(request: Request, _=Depends(get_usuario_actual)):
    _require_admin(request)
    provider = os.getenv("WHATSAPP_PROVIDER", "").upper()
    whatsapp_ok = provider in {"EVOLUTION", "WPPCONNECT"} and bool(os.getenv("EVOLUTION_API_URL") if provider == "EVOLUTION" else os.getenv("WPPCONNECT_URL"))
    return {
        "whatsapp": {"estado": "CONECTADO" if whatsapp_ok else "DESCONECTADO", "provider": provider or None, "instance": os.getenv("EVOLUTION_INSTANCE") if whatsapp_ok and provider == "EVOLUTION" else None},
        "n8n": "ACTIVO" if os.getenv("N8N_BASE_URL") else "ERROR",
        "mercado_pago": "CONFIGURADO" if os.getenv("MERCADOPAGO_ACCESS_TOKEN") and os.getenv("MERCADOPAGO_WEBHOOK_SECRET") else "NO CONFIGURADO",
        "apisperu": "CONFIGURADO" if os.getenv("APISPERU_TOKEN") else "NO CONFIGURADO",
    }


@router.get("/finanzas/integraciones/whatsapp/resolver")
def resolver_whatsapp(telefono: str = Query(min_length=6, max_length=40), db: Session = Depends(get_db), _=Depends(_require_integration)):
    normalized = "".join(ch for ch in telefono if ch.isdigit())
    rows = db.execute(text("""
        SELECT a.tenant_id,a.id apoderado_id,a.nombre apoderado,ea.estudiante_id,e.username estudiante,
               ea.principal
        FROM apoderados a JOIN estudiante_apoderado ea
          ON ea.apoderado_id=a.id AND ea.tenant_id=a.tenant_id AND ea.activo IS TRUE
        JOIN usuarios e ON e.id=ea.estudiante_id AND e.tenant_id=ea.tenant_id
        WHERE a.activo IS TRUE AND regexp_replace(COALESCE(a.telefono,''),'[^0-9]','','g')=:telefono
        ORDER BY ea.principal DESC,e.username,ea.estudiante_id
    """), {"telefono": normalized}).mappings().all()
    if not rows:
        raise HTTPException(404, "Teléfono no asociado canónicamente.")
    tenants = {str(x["tenant_id"]) for x in rows}
    if len(tenants) != 1:
        raise HTTPException(409, "Teléfono ambiguo entre instituciones.")
    return {"tenant_id": str(rows[0]["tenant_id"]), "apoderado_id": rows[0]["apoderado_id"], "requiere_selector": len(rows) > 1,
            "estudiantes": [{"id": x["estudiante_id"], "nombre": x["estudiante"], "principal": x["principal"]} for x in rows]}


def validar_firma_mercadopago(x_signature: str, x_request_id: str, data_id: str, secret: str) -> bool:
    parts = {}
    for item in x_signature.split(","):
        key, sep, value = item.strip().partition("=")
        if sep:
            parts[key] = value
    ts, received = parts.get("ts"), parts.get("v1")
    if not ts or not received or not ts.isdigit():
        return False
    # Acepta segundos o milisegundos y limita replay; configurable para simuladores oficiales.
    timestamp = int(ts) / (1000 if len(ts) > 10 else 1)
    tolerance = int(os.getenv("MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS", "300"))
    if tolerance > 0 and abs(time.time() - timestamp) > tolerance:
        return False
    manifest = f"id:{data_id.lower()};request-id:{x_request_id};ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


def _get_payment(payment_id: str) -> dict[str, Any]:
    token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
    if not token:
        raise HTTPException(503, "Mercado Pago no configurado.")
    req = urllib.request.Request(
        f"https://api.mercadopago.com/v1/payments/{payment_id}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("Mercado Pago GET falló payment_id=%s", payment_id)
        raise HTTPException(502, "No fue posible verificar el pago en Mercado Pago.") from exc


def _marcar_evento(db: Session, event_id: uuid.UUID, estado: str, error: Optional[str] = None, tenant: Optional[str] = None) -> None:
    db.execute(text("""
        UPDATE integracion_webhook_eventos SET estado=:estado,error=:error,
          tenant_id=COALESCE(CAST(:tenant AS uuid),tenant_id),
          procesado_at=CASE WHEN :estado='PROCESADO' THEN now() ELSE procesado_at END
        WHERE id=:id
    """), {"id": event_id, "estado": estado, "error": error, "tenant": tenant})
    db.commit()


def _aplicar_pago(db: Session, payment: dict[str, Any], event_id: uuid.UUID) -> dict[str, Any]:
    payment_id = str(payment.get("id", ""))
    external_reference = str(payment.get("external_reference") or "")
    status_mp = str(payment.get("status") or "")
    if status_mp != "approved":
        _marcar_evento(db, event_id, "IGNORADO_NO_APROBADO", f"status={status_mp}")
        return {"resultado": "NO_APROBADO", "payment_id": payment_id, "status": status_mp}
    if not external_reference:
        _marcar_evento(db, event_id, "ERROR_VALIDACION", "external_reference ausente")
        return {"resultado": "EXTERNAL_REFERENCE_INVALIDA", "payment_id": payment_id}
    try:
        locked = db.execute(text("""
            SELECT id FROM intentos_cobro
            WHERE external_reference=:reference FOR UPDATE
        """), {"reference": external_reference}).scalar()
        if not locked:
            db.rollback(); _marcar_evento(db, event_id, "ERROR_VALIDACION", "intento inexistente")
            return {"resultado": "INTENTO_INEXISTENTE", "payment_id": payment_id}
        intento = db.execute(text("""
            SELECT i.*,p.monto::numeric(12,2) monto_original,p.estado obligacion_estado,
              e.nombre estudiante,c.nombre concepto,ap.telefono whatsapp_phone,
              GREATEST(p.monto::numeric(12,2)-COALESCE(SUM(a.monto_aplicado),0),0)::numeric(12,2) saldo
            FROM intentos_cobro i JOIN pensiones p ON p.id=i.obligacion_id AND p.tenant_id=i.tenant_id
            JOIN estudiantes e ON e.id=i.estudiante_id AND e.tenant_id=i.tenant_id
            JOIN conceptos_pago c ON c.id=p.concepto_id AND c.tenant_id=p.tenant_id
            LEFT JOIN apoderados ap ON ap.id=i.apoderado_id AND ap.tenant_id=i.tenant_id
            LEFT JOIN aplicaciones_pago a ON a.obligacion_id=p.id AND a.tenant_id=p.tenant_id
            WHERE i.external_reference=:reference GROUP BY i.id,p.id,e.nombre,c.nombre,ap.telefono
        """), {"reference": external_reference}).mappings().first()
        tenant = str(intento["tenant_id"])
        existing = db.execute(text("""
            SELECT id FROM pagos WHERE tenant_id::text=:tenant AND provider='MERCADO_PAGO'
              AND external_payment_id=:payment LIMIT 1
        """), {"tenant": tenant, "payment": payment_id}).scalar()
        if existing:
            db.rollback(); _marcar_evento(db, event_id, "PROCESADO", tenant=tenant)
            return {"resultado": "IDEMPOTENTE", "pago_id": existing, "payment_id": payment_id}
        received_amount = _money(payment.get("transaction_amount"))
        expected_amount = _money(intento["monto"])
        current_balance = _money(intento["saldo"])
        currency = str(payment.get("currency_id") or "")
        if currency != intento["moneda"] or currency != MONEDA:
            db.execute(text("UPDATE intentos_cobro SET estado='REQUIERE_REVISION',error='MONEDA_INCONSISTENTE',external_payment_id=:payment,updated_at=now() WHERE id=:id"), {"id": intento["id"], "payment": payment_id})
            db.commit(); _marcar_evento(db, event_id, "MONEDA_INCONSISTENTE", tenant=tenant)
            return {"resultado": "MONEDA_INCONSISTENTE", "payment_id": payment_id}
        if received_amount != expected_amount or received_amount != current_balance:
            result = "REQUIERE_REVISION" if received_amount > current_balance else "MONTO_INCONSISTENTE"
            db.execute(text("UPDATE intentos_cobro SET estado=:estado,error=:estado,external_payment_id=:payment,updated_at=now() WHERE id=:id"), {"id": intento["id"], "estado": result, "payment": payment_id})
            db.commit(); _marcar_evento(db, event_id, result, tenant=tenant)
            return {"resultado": result, "payment_id": payment_id}
        approved_at = payment.get("date_approved") or datetime.now(timezone.utc).isoformat()
        try:
            paid_date = datetime.fromisoformat(str(approved_at).replace("Z", "+00:00")).date()
        except ValueError:
            paid_date = date.today()
        pago_id = db.execute(text("""
            INSERT INTO pagos
              (tenant_id,pension_id,estudiante_id,monto_pagado,moneda,metodo_pago,referencia,
               provider,external_payment_id,external_reference,estado,fecha_pago,creado_por,source,creado_en,updated_at)
            VALUES (:tenant,:obligacion,:estudiante,:monto,'PEN','MERCADO_PAGO',:payment,
               'MERCADO_PAGO',:payment,:reference,'APROBADO',:fecha,NULL,'INTEGRACION',now(),now())
            RETURNING id
        """), {"tenant": intento["tenant_id"], "obligacion": intento["obligacion_id"], "estudiante": intento["estudiante_id"],
                 "monto": received_amount, "payment": payment_id, "reference": external_reference, "fecha": paid_date}).scalar_one()
        db.execute(text("""
            INSERT INTO aplicaciones_pago (tenant_id,pago_id,obligacion_id,monto_aplicado)
            VALUES (:tenant,:pago,:obligacion,:monto)
        """), {"tenant": intento["tenant_id"], "pago": pago_id, "obligacion": intento["obligacion_id"], "monto": received_amount})
        saldo_despues = current_balance - received_amount
        db.execute(text("UPDATE pensiones SET estado=:estado WHERE id=:id AND tenant_id=:tenant"),
                   {"estado": "pagado" if saldo_despues == 0 else "parcial", "id": intento["obligacion_id"], "tenant": intento["tenant_id"]})
        db.execute(text("""
            UPDATE intentos_cobro SET estado='PAGADO',external_payment_id=:payment,error=NULL,
              confirmacion_whatsapp_estado='PENDIENTE',updated_at=now() WHERE id=:id
        """), {"id": intento["id"], "payment": payment_id})
        db.commit()
        _marcar_evento(db, event_id, "PROCESADO", tenant=tenant)
        logger.info("Pago aplicado provider=%s payment_id=%s external_reference=%s resultado=APLICADO", PROVIDER, payment_id, external_reference)
        return {"resultado": "APLICADO", "pago_id": pago_id, "payment_id": payment_id,
                "tenant_id": tenant, "intento_id": str(intento["id"]), "estudiante_id": intento["estudiante_id"],
                "estudiante": intento["estudiante"], "concepto": intento["concepto"], "monto": float(received_amount),
                "saldo": float(saldo_despues), "apoderado_id": intento["apoderado_id"], "whatsapp_phone": intento["whatsapp_phone"]}
    except IntegrityError:
        db.rollback()
        # Una carrera contra el UNIQUE externo es éxito idempotente.
        duplicate_tenant = str(intento["tenant_id"]) if "intento" in locals() and intento else None
        duplicate = db.execute(text("""
            SELECT id FROM pagos WHERE tenant_id::text=:tenant
              AND provider='MERCADO_PAGO' AND external_payment_id=:payment LIMIT 1
        """), {"tenant": duplicate_tenant, "payment": payment_id}).scalar() if duplicate_tenant else None
        if duplicate:
            _marcar_evento(db, event_id, "PROCESADO", tenant=duplicate_tenant)
            return {"resultado": "IDEMPOTENTE", "pago_id": duplicate, "payment_id": payment_id}
        _marcar_evento(db, event_id, "ERROR_PROCESAMIENTO", "integridad financiera")
        raise HTTPException(500, "Error transaccional al aplicar el pago.")
    except Exception as exc:
        db.rollback()
        _marcar_evento(db, event_id, "ERROR_PROCESAMIENTO", type(exc).__name__)
        raise


@router.post("/integraciones/mercadopago/webhook")
async def webhook_mercadopago(request: Request, data_id: Optional[str] = Query(None, alias="data.id"), db: Session = Depends(get_db)):
    secret = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "")
    signature = request.headers.get("x-signature", "")
    request_id = request.headers.get("x-request-id", "")
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(400, "JSON inválido.")
    payment_id = str(data_id or (payload.get("data") or {}).get("id") or "")
    if not secret or not payment_id or not request_id or not validar_firma_mercadopago(signature, request_id, payment_id, secret):
        raise HTTPException(401, "Firma Mercado Pago inválida.")
    event_external_id = str(payload.get("id") or f"payment:{payment_id}:{payload.get('action','unknown')}")
    event_id = uuid.uuid4()
    safe_headers = {"x-request-id": request_id, "content-type": request.headers.get("content-type", "")}
    try:
        db.execute(text("""
            INSERT INTO integracion_webhook_eventos
              (id,provider,event_type,external_event_id,payload,headers,estado)
            VALUES (:id,'MERCADO_PAGO',:type,:external,CAST(:payload AS jsonb),CAST(:headers AS jsonb),'RECIBIDO')
        """), {"id": event_id, "type": str(payload.get("action") or payload.get("type") or "payment"), "external": event_external_id,
                 "payload": json.dumps(payload), "headers": json.dumps(safe_headers)})
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.execute(text("SELECT estado FROM integracion_webhook_eventos WHERE provider='MERCADO_PAGO' AND external_event_id=:id"), {"id": event_external_id}).scalar()
        return {"received": True, "duplicate": True, "estado": existing}
    try:
        payment = _get_payment(payment_id)
        result = _aplicar_pago(db, payment, event_id)
        return {"received": True, **result}
    except HTTPException as exc:
        if exc.status_code >= 500:
            _marcar_evento(db, event_id, "ERROR_PROCESAMIENTO", str(exc.detail))
            # El evento quedó durable; 200 evita una tormenta y permite reintento controlado.
            return {"received": True, "resultado": "ERROR_PROCESAMIENTO", "payment_id": payment_id}
        raise


@router.post("/finanzas/integraciones/mercadopago/confirmar")
def confirmar_mercadopago(body: ConfirmacionMP, db: Session = Depends(get_db), _=Depends(_require_integration)):
    event_id = uuid.uuid4()
    external_event_id = f"internal-confirm:{body.payment_id}"
    try:
        db.execute(text("""
            INSERT INTO integracion_webhook_eventos (id,provider,event_type,external_event_id,payload,headers,estado)
            VALUES (:id,'MERCADO_PAGO','internal.confirm',:external,CAST(:payload AS jsonb),'{}'::jsonb,'RECIBIDO')
        """), {"id": event_id, "external": external_event_id, "payload": body.model_dump_json()})
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"resultado": "IDEMPOTENTE", "payment_id": body.payment_id}
    payment = _get_payment(body.payment_id)
    # Los campos recibidos son solo consistencia adicional; la API oficial manda.
    if body.external_reference and body.external_reference != payment.get("external_reference"):
        _marcar_evento(db, event_id, "ERROR_VALIDACION", "external_reference normalizada difiere")
        raise HTTPException(422, "External reference inconsistente.")
    return _aplicar_pago(db, payment, event_id)


def _intento_dict(row) -> dict[str, Any]:
    data = dict(row)
    for key in ("id", "tenant_id"):
        if data.get(key) is not None:
            data[key] = str(data[key])
    data["monto"] = float(data["monto"])
    data["created_at"] = _iso(data.get("created_at"))
    data["updated_at"] = _iso(data.get("updated_at"))
    return data
