"""Asistencia académica canónica V1M-C."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "asistencia_academica_v1mc"
down_revision: Union[str, Sequence[str], None] = "programacion_horarios_v1mb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sesiones_asistencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("horario_id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("estado", sa.String(length=16), nullable=False, server_default="ABIERTA"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["horario_id"], ["horarios_academicos.id"], name="fk_sesion_asistencia_horario", ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "horario_id", "fecha", name="uq_sesion_asistencia_horario_fecha"),
        sa.CheckConstraint("estado IN ('ABIERTA','CERRADA')", name="ck_sesion_asistencia_estado"),
    )
    op.create_index("ix_sesion_asistencia_tenant_fecha", "sesiones_asistencia", ["tenant_id", "fecha"])
    op.create_table(
        "asistencias_academicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sesion_id", sa.Integer(), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(length=16), nullable=False),
        sa.Column("hora_registro", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.Column("registrado_por", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["sesion_id"], ["sesiones_asistencia.id"], name="fk_asistencia_academica_sesion", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["estudiante_id"], ["usuarios.id"], name="fk_asistencia_academica_estudiante", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registrado_por"], ["usuarios.id"], name="fk_asistencia_academica_registrador", ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "sesion_id", "estudiante_id", name="uq_asistencia_academica_sesion_estudiante"),
        sa.CheckConstraint("estado IN ('PRESENTE','TARDANZA','AUSENTE','JUSTIFICADO')", name="ck_asistencia_academica_estado"),
    )
    op.create_index("ix_asistencia_academica_tenant_estudiante", "asistencias_academicas", ["tenant_id", "estudiante_id"])


def downgrade() -> None:
    op.drop_index("ix_asistencia_academica_tenant_estudiante", table_name="asistencias_academicas")
    op.drop_table("asistencias_academicas")
    op.drop_index("ix_sesion_asistencia_tenant_fecha", table_name="sesiones_asistencia")
    op.drop_table("sesiones_asistencia")
