"""Vínculo canónico unidad de aprendizaje -> asignación docente V1J-E.

La relación es nullable para conservar unidades legacy sin reinterpretarlas.
No realiza backfill y mantiene curso_id como campo legacy.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "vinculo_unidad_asignacion_v1je"
down_revision: Union[str, Sequence[str], None] = "nucleo_academico_minimo_v1jd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "aula_unidades_aprendizaje",
        sa.Column("asignacion_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_aula_unidades_asignacion_docente",
        "aula_unidades_aprendizaje",
        "asignaciones_docente",
        ["asignacion_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "uq_aula_unidades_tenant_asignacion_orden",
        "aula_unidades_aprendizaje",
        ["tenant_id", "asignacion_id", "orden"],
        unique=True,
        postgresql_where=sa.text(
            "asignacion_id IS NOT NULL AND orden IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_aula_unidades_tenant_asignacion_orden",
        table_name="aula_unidades_aprendizaje",
    )
    op.drop_constraint(
        "fk_aula_unidades_asignacion_docente",
        "aula_unidades_aprendizaje",
        type_="foreignkey",
    )
    op.drop_column("aula_unidades_aprendizaje", "asignacion_id")
