"""Programación académica canónica V1M-B."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "programacion_horarios_v1mb"
down_revision: Union[str, Sequence[str], None] = "matricula_canonica_minima_v1ka"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "horarios_academicos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asignacion_id", sa.Integer(), nullable=False),
        sa.Column("dia_semana", sa.String(length=16), nullable=False),
        sa.Column("hora_inicio", sa.Time(), nullable=False),
        sa.Column("hora_fin", sa.Time(), nullable=False),
        sa.Column("ambiente", sa.String(length=160), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["asignacion_id"], ["asignaciones_docente.id"], name="fk_horarios_asignacion", ondelete="RESTRICT"),
        sa.CheckConstraint("hora_fin > hora_inicio", name="ck_horarios_intervalo_valido"),
        sa.CheckConstraint("dia_semana IN ('LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO')", name="ck_horarios_dia_semana"),
    )
    op.create_index("ix_horarios_tenant_asignacion_activo", "horarios_academicos", ["tenant_id", "asignacion_id", "activo"])
    op.create_index("ix_horarios_tenant_dia_horas", "horarios_academicos", ["tenant_id", "dia_semana", "hora_inicio", "hora_fin"])


def downgrade() -> None:
    op.drop_index("ix_horarios_tenant_dia_horas", table_name="horarios_academicos")
    op.drop_index("ix_horarios_tenant_asignacion_activo", table_name="horarios_academicos")
    op.drop_table("horarios_academicos")
