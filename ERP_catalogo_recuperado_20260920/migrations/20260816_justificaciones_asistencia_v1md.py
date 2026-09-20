"""Justificaciones de asistencia V1M-D."""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "justificaciones_asistencia_v1md"
down_revision: Union[str, Sequence[str], None] = "asistencia_academica_v1mc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "justificaciones_asistencia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asistencia_id", sa.Integer(), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("motivo", sa.String(length=160), nullable=False),
        sa.Column("detalle", sa.Text(), nullable=False),
        sa.Column("estado", sa.String(length=16), nullable=False, server_default="PENDIENTE"),
        sa.Column("revisado_por", sa.Integer(), nullable=True),
        sa.Column("observacion_revision", sa.Text(), nullable=True),
        sa.Column("revisado_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["asistencia_id"], ["asistencias_academicas.id"], name="fk_justificacion_asistencia", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["estudiante_id"], ["usuarios.id"], name="fk_justificacion_estudiante", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["revisado_por"], ["usuarios.id"], name="fk_justificacion_revisor", ondelete="RESTRICT"),
        sa.UniqueConstraint("tenant_id", "asistencia_id", name="uq_justificacion_asistencia_activa"),
        sa.CheckConstraint("estado IN ('PENDIENTE','APROBADA','RECHAZADA')", name="ck_justificacion_estado"),
    )
    op.create_index("ix_justificacion_tenant_estudiante_estado", "justificaciones_asistencia", ["tenant_id", "estudiante_id", "estado"])


def downgrade() -> None:
    op.drop_index("ix_justificacion_tenant_estudiante_estado", table_name="justificaciones_asistencia")
    op.drop_table("justificaciones_asistencia")
