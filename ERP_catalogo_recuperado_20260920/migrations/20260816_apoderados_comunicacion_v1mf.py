"""Apoderados y comunicación institucional V1M-F."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "apoderados_comunicacion_v1mf"
down_revision: Union[str, Sequence[str], None] = "incidencias_tutoria_v1me"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "apoderados",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=240), nullable=False),
        sa.Column("documento", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("telefono", sa.String(length=40), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("tenant_id", "documento", name="uq_apoderado_tenant_documento"),
    )
    op.create_index("ix_apoderado_tenant_activo", "apoderados", ["tenant_id", "activo"])
    op.create_table(
        "estudiante_apoderado",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("apoderado_id", sa.Integer(), nullable=False),
        sa.Column("parentesco", sa.String(length=40), nullable=False),
        sa.Column("principal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["estudiante_id"], ["usuarios.id"], name="fk_relacion_apoderado_estudiante", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["apoderado_id"], ["apoderados.id"], name="fk_relacion_apoderado", ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "estudiante_id", "apoderado_id", name="uq_estudiante_apoderado"),
    )
    op.create_index("uq_estudiante_apoderado_principal", "estudiante_apoderado", ["tenant_id", "estudiante_id"], unique=True, postgresql_where=sa.text("principal IS TRUE AND activo IS TRUE"))
    op.create_table(
        "comunicaciones_institucionales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("apoderado_id", sa.Integer(), nullable=False),
        sa.Column("origen", sa.String(length=24), nullable=False),
        sa.Column("referencia_origen", sa.String(length=160), nullable=False),
        sa.Column("asunto", sa.String(length=240), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="PENDIENTE"),
        sa.Column("modo_envio", sa.String(length=20), nullable=False, server_default="SANDBOX"),
        sa.Column("creado_por", sa.Integer(), nullable=False),
        sa.Column("enviado_at", sa.DateTime(), nullable=True),
        sa.Column("leido_at", sa.DateTime(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("historial", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["estudiante_id"], ["usuarios.id"], name="fk_comunicacion_estudiante", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["apoderado_id"], ["apoderados.id"], name="fk_comunicacion_apoderado", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["creado_por"], ["usuarios.id"], name="fk_comunicacion_actor", ondelete="RESTRICT"),
        sa.CheckConstraint("origen IN ('ASISTENCIA','JUSTIFICACION','INCIDENCIA','TUTORIA','ACADEMICO','MANUAL')", name="ck_comunicacion_origen"),
        sa.CheckConstraint("canal IN ('EMAIL')", name="ck_comunicacion_canal"),
        sa.CheckConstraint("estado IN ('PENDIENTE','ENVIADA','ENTREGADA','LEIDA','ERROR')", name="ck_comunicacion_estado"),
        sa.CheckConstraint("modo_envio IN ('SANDBOX','REAL')", name="ck_comunicacion_modo"),
        sa.UniqueConstraint("tenant_id", "apoderado_id", "origen", "referencia_origen", name="uq_comunicacion_destino_origen"),
    )
    op.create_index("ix_comunicacion_tenant_estudiante_estado", "comunicaciones_institucionales", ["tenant_id", "estudiante_id", "estado"])


def downgrade() -> None:
    op.drop_index("ix_comunicacion_tenant_estudiante_estado", table_name="comunicaciones_institucionales")
    op.drop_table("comunicaciones_institucionales")
    op.drop_index("uq_estudiante_apoderado_principal", table_name="estudiante_apoderado")
    op.drop_table("estudiante_apoderado")
    op.drop_index("ix_apoderado_tenant_activo", table_name="apoderados")
    op.drop_table("apoderados")
