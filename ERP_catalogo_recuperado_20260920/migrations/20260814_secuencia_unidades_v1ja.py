"""secuencia estructural de unidades V1J-A.

La columna es nullable para conservar unidades históricas sin reinterpretar
su secuencia pedagógica. No realiza backfill.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "secuencia_unidades_v1ja"
down_revision: Union[str, Sequence[str], None] = "rubrica_estructurada_v1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "aula_unidades_aprendizaje",
        sa.Column("orden", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_aula_unidades_orden_positivo",
        "aula_unidades_aprendizaje",
        "orden IS NULL OR orden > 0",
    )
    op.create_index(
        "uq_aula_unidades_tenant_curso_orden",
        "aula_unidades_aprendizaje",
        ["tenant_id", "curso_id", "orden"],
        unique=True,
        postgresql_where=sa.text(
            "curso_id IS NOT NULL AND orden IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_aula_unidades_tenant_curso_orden",
        table_name="aula_unidades_aprendizaje",
    )
    op.drop_constraint(
        "ck_aula_unidades_orden_positivo",
        "aula_unidades_aprendizaje",
        type_="check",
    )
    op.drop_column("aula_unidades_aprendizaje", "orden")
