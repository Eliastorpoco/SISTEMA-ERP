"""Tutoría e incidencias institucionales V1M-E."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "incidencias_tutoria_v1me"
down_revision: Union[str, Sequence[str], None] = "justificaciones_asistencia_v1md"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "incidencias_academicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("seccion_id", sa.Integer(), nullable=False),
        sa.Column("periodo_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("categoria", sa.String(length=160), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("origen", sa.String(length=24), nullable=False),
        sa.Column("referencia_origen", sa.String(length=160), nullable=True),
        sa.Column("estado", sa.String(length=24), nullable=False, server_default="ABIERTA"),
        sa.Column("registrado_por", sa.Integer(), nullable=False),
        sa.Column("responsable_id", sa.Integer(), nullable=False),
        sa.Column("historial", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("motivo_cierre", sa.Text(), nullable=True),
        sa.Column("cerrado_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["estudiante_id"], ["usuarios.id"], name="fk_incidencia_estudiante", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["seccion_id"], ["secciones_academicas.id"], name="fk_incidencia_seccion", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["periodo_id"], ["periodos_academicos.id"], name="fk_incidencia_periodo", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registrado_por"], ["usuarios.id"], name="fk_incidencia_registrador", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["responsable_id"], ["usuarios.id"], name="fk_incidencia_responsable", ondelete="RESTRICT"),
        sa.CheckConstraint("tipo IN ('CONVIVENCIA','ASISTENCIA','ACADEMICA','TUTORIA')", name="ck_incidencia_tipo"),
        sa.CheckConstraint("origen IN ('MANUAL','ASISTENCIA','AULA_VIRTUAL','OTRO')", name="ck_incidencia_origen"),
        sa.CheckConstraint("estado IN ('ABIERTA','EN_SEGUIMIENTO','CERRADA')", name="ck_incidencia_estado"),
    )
    op.create_index("ix_incidencia_tenant_seccion_periodo_estado", "incidencias_academicas", ["tenant_id", "seccion_id", "periodo_id", "estado"])
    op.create_index("uq_incidencia_origen_referencia", "incidencias_academicas", ["tenant_id", "origen", "referencia_origen"], unique=True, postgresql_where=sa.text("referencia_origen IS NOT NULL"))
    op.create_table(
        "acciones_tutoriales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("incidencia_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=24), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("responsable_id", sa.Integer(), nullable=False),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["incidencia_id"], ["incidencias_academicas.id"], name="fk_accion_tutorial_incidencia", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["responsable_id"], ["usuarios.id"], name="fk_accion_tutorial_responsable", ondelete="RESTRICT"),
        sa.CheckConstraint("tipo IN ('ENTREVISTA','ORIENTACION')", name="ck_accion_tutorial_tipo"),
    )
    op.create_index("ix_accion_tutorial_tenant_incidencia_fecha", "acciones_tutoriales", ["tenant_id", "incidencia_id", "fecha"])


def downgrade() -> None:
    op.drop_index("ix_accion_tutorial_tenant_incidencia_fecha", table_name="acciones_tutoriales")
    op.drop_table("acciones_tutoriales")
    op.drop_index("uq_incidencia_origen_referencia", table_name="incidencias_academicas")
    op.drop_index("ix_incidencia_tenant_seccion_periodo_estado", table_name="incidencias_academicas")
    op.drop_table("incidencias_academicas")
