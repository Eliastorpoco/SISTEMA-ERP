"""Nucleo financiero e integraciones V1N."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "finanzas_integraciones_v1n"
down_revision: Union[str, Sequence[str], None] = "apoderados_comunicacion_v1mf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "intentos_cobro",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("obligacion_id", sa.Integer(), nullable=False),
        sa.Column("apoderado_id", sa.Integer(), nullable=True),
        sa.Column("monto", sa.Numeric(12, 2), nullable=False),
        sa.Column("moneda", sa.String(3), nullable=False, server_default="PEN"),
        sa.Column("provider", sa.String(40), nullable=False, server_default="MERCADO_PAGO"),
        sa.Column("external_reference", sa.String(180), nullable=False),
        sa.Column("estado", sa.String(40), nullable=False, server_default="CREADO"),
        sa.Column("preference_id", sa.String(180), nullable=True),
        sa.Column("checkout_url", sa.Text(), nullable=True),
        sa.Column("external_payment_id", sa.String(180), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("confirmacion_whatsapp_estado", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["estudiante_id"], ["estudiantes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["obligacion_id"], ["pensiones.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["apoderado_id"], ["apoderados.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("external_reference", name="uq_intento_external_reference"),
        sa.CheckConstraint("monto > 0", name="ck_intento_monto_positivo"),
        sa.CheckConstraint("moneda = 'PEN'", name="ck_intento_moneda_pen"),
    )
    op.create_index("ix_intento_tenant_estado", "intentos_cobro", ["tenant_id", "estado"])
    op.create_index("ix_intento_tenant_estudiante", "intentos_cobro", ["tenant_id", "estudiante_id"])

    op.create_table(
        "integracion_webhook_eventos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("external_event_id", sa.String(180), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("headers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("estado", sa.String(50), nullable=False, server_default="RECIBIDO"),
        sa.Column("procesado_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("provider", "external_event_id", name="uq_webhook_provider_evento"),
    )
    op.create_index("ix_webhook_estado_created", "integracion_webhook_eventos", ["estado", "created_at"])

    op.add_column("pagos", sa.Column("estudiante_id", sa.Integer(), nullable=True))
    op.add_column("pagos", sa.Column("moneda", sa.String(3), nullable=False, server_default="PEN"))
    op.add_column("pagos", sa.Column("provider", sa.String(40), nullable=True))
    op.add_column("pagos", sa.Column("external_payment_id", sa.String(180), nullable=True))
    op.add_column("pagos", sa.Column("external_reference", sa.String(180), nullable=True))
    op.add_column("pagos", sa.Column("estado", sa.String(40), nullable=False, server_default="APROBADO"))
    op.add_column("pagos", sa.Column("source", sa.String(40), nullable=False, server_default="USUARIO"))
    op.add_column("pagos", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")))
    op.create_foreign_key("fk_pago_estudiante", "pagos", "estudiantes", ["estudiante_id"], ["id"], ondelete="RESTRICT")
    op.create_unique_constraint(
        "uq_pago_tenant_provider_external",
        "pagos",
        ["tenant_id", "provider", "external_payment_id"],
    )
    op.execute("""
        UPDATE pagos p SET estudiante_id = pe.estudiante_id
        FROM pensiones pe
        WHERE pe.id = p.pension_id AND pe.tenant_id = p.tenant_id
    """)

    op.create_table(
        "aplicaciones_pago",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("pago_id", sa.Integer(), nullable=False),
        sa.Column("obligacion_id", sa.Integer(), nullable=False),
        sa.Column("monto_aplicado", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["pago_id"], ["pagos.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["obligacion_id"], ["pensiones.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "pago_id", "obligacion_id", name="uq_aplicacion_pago_obligacion"),
        sa.CheckConstraint("monto_aplicado > 0", name="ck_aplicacion_monto_positivo"),
    )
    op.create_index("ix_aplicacion_tenant_obligacion", "aplicaciones_pago", ["tenant_id", "obligacion_id"])
    op.execute("""
        INSERT INTO aplicaciones_pago (tenant_id, pago_id, obligacion_id, monto_aplicado)
        SELECT p.tenant_id, p.id, p.pension_id,
               LEAST(p.monto_pagado::numeric(12,2), pe.monto::numeric(12,2))
        FROM pagos p JOIN pensiones pe
          ON pe.id = p.pension_id AND pe.tenant_id = p.tenant_id
        WHERE p.monto_pagado > 0
        ON CONFLICT DO NOTHING
    """)

    op.create_table(
        "integraciones_tenant",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("config_publica", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("secret_ref", sa.String(180), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "provider", name="uq_integracion_tenant_provider"),
    )


def downgrade() -> None:
    op.drop_table("integraciones_tenant")
    op.drop_index("ix_aplicacion_tenant_obligacion", table_name="aplicaciones_pago")
    op.drop_table("aplicaciones_pago")
    op.drop_constraint("uq_pago_tenant_provider_external", "pagos", type_="unique")
    op.drop_constraint("fk_pago_estudiante", "pagos", type_="foreignkey")
    for column in ("updated_at", "source", "estado", "external_reference", "external_payment_id", "provider", "moneda", "estudiante_id"):
        op.drop_column("pagos", column)
    op.drop_index("ix_webhook_estado_created", table_name="integracion_webhook_eventos")
    op.drop_table("integracion_webhook_eventos")
    op.drop_index("ix_intento_tenant_estudiante", table_name="intentos_cobro")
    op.drop_index("ix_intento_tenant_estado", table_name="intentos_cobro")
    op.drop_table("intentos_cobro")
