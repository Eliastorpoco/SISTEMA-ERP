"""Matrícula canónica mínima V1K-A.

La matrícula vincula únicamente la identidad canónica de usuarios con una
sección académica. El periodo se deriva desde la sección y no se toca la
tabla legacy ``estudiantes``.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "matricula_canonica_minima_v1ka"
down_revision: Union[str, Sequence[str], None] = "vinculo_unidad_asignacion_v1je"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "matriculas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("estudiante_id", sa.Integer(), nullable=False),
        sa.Column("seccion_id", sa.Integer(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["estudiante_id"], ["usuarios.id"],
            name="fk_matriculas_estudiante_usuario", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["seccion_id"], ["secciones_academicas.id"],
            name="fk_matriculas_seccion", ondelete="RESTRICT",
        ),
    )
    op.create_index(
        "uq_matriculas_tenant_estudiante_seccion_activa",
        "matriculas",
        ["tenant_id", "estudiante_id", "seccion_id"],
        unique=True,
        postgresql_where=sa.text("activo IS TRUE"),
    )
    op.create_index(
        "ix_matriculas_tenant_estudiante_activo",
        "matriculas",
        ["tenant_id", "estudiante_id", "activo"],
    )
    op.create_index(
        "ix_matriculas_tenant_seccion_activo",
        "matriculas",
        ["tenant_id", "seccion_id", "activo"],
    )


def downgrade() -> None:
    op.drop_index("ix_matriculas_tenant_seccion_activo", table_name="matriculas")
    op.drop_index("ix_matriculas_tenant_estudiante_activo", table_name="matriculas")
    op.drop_index("uq_matriculas_tenant_estudiante_seccion_activa", table_name="matriculas")
    op.drop_table("matriculas")
