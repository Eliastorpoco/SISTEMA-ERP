"""rubrica estructurada v1a: nucleo de datos

Revision ID: rubrica_estructurada_v1a
Revises: production_baseline_20260814
Create Date: 2026-08-13

This migration is structural only. It does not backfill blocks, criteria,
attempts, reviews, or criterion evaluations.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "rubrica_estructurada_v1a"
down_revision: Union[str, Sequence[str], None] = "production_baseline_20260814"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "aula_bloques_aprendizaje",
        sa.Column("rubrica_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_aula_bloques_rubrica",
        "aula_bloques_aprendizaje",
        "rubricas",
        ["rubrica_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_aula_bloques_tenant_rubrica",
        "aula_bloques_aprendizaje",
        ["tenant_id", "rubrica_id"],
    )

    op.add_column(
        "criterios_rubrica",
        sa.Column("ponderacion", sa.Numeric(7, 4), nullable=True),
    )
    op.add_column(
        "criterios_rubrica",
        sa.Column("orden", sa.Integer(), nullable=True),
    )
    op.add_column(
        "criterios_rubrica",
        sa.Column(
            "descriptores_nivel",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.create_check_constraint(
        "ck_criterios_rubrica_descriptores_objeto",
        "criterios_rubrica",
        "descriptores_nivel IS NULL OR jsonb_typeof(descriptores_nivel) = 'object'",
    )

    op.create_table(
        "aula_evaluaciones_criterio",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.Text(), nullable=False),
        sa.Column("bloque_id", sa.Text(), nullable=False),
        sa.Column("intento_id", sa.BigInteger(), nullable=False),
        sa.Column("revision_id", sa.BigInteger(), nullable=False),
        sa.Column("rubrica_id", sa.Integer(), nullable=False),
        sa.Column("criterio_id", sa.Integer(), nullable=False),
        sa.Column("nivel", sa.String(50), nullable=True),
        sa.Column("puntaje", sa.Numeric(10, 4), nullable=True),
        sa.Column("puntaje_maximo", sa.Numeric(10, 4), nullable=True),
        sa.Column("ponderacion_aplicada", sa.Numeric(10, 4), nullable=True),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.Column(
            "descriptor_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "creado_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "actualizado_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["bloque_id"],
            ["aula_bloques_aprendizaje.id"],
            name="fk_aula_eval_criterio_bloque",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["intento_id"],
            ["aula_bloque_intentos.id"],
            name="fk_aula_eval_criterio_intento",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["revision_id"],
            ["aula_retroalimentaciones_ia.id"],
            name="fk_aula_eval_criterio_revision",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["rubrica_id"],
            ["rubricas.id"],
            name="fk_aula_eval_criterio_rubrica",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["criterio_id"],
            ["criterios_rubrica.id"],
            name="fk_aula_eval_criterio_criterio",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "revision_id",
            "criterio_id",
            name="uq_aula_eval_criterio_tenant_revision_criterio",
        ),
        sa.CheckConstraint(
            "descriptor_snapshot IS NULL OR jsonb_typeof(descriptor_snapshot) = 'object'",
            name="ck_aula_eval_criterio_descriptor_objeto",
        ),
    )
    op.create_index(
        "ix_aula_eval_criterio_tenant_intento",
        "aula_evaluaciones_criterio",
        ["tenant_id", "intento_id"],
    )
    op.create_index(
        "ix_aula_eval_criterio_tenant_bloque",
        "aula_evaluaciones_criterio",
        ["tenant_id", "bloque_id"],
    )
    op.create_index(
        "ix_aula_eval_criterio_tenant_revision",
        "aula_evaluaciones_criterio",
        ["tenant_id", "revision_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_aula_eval_criterio_tenant_revision",
        table_name="aula_evaluaciones_criterio",
    )
    op.drop_index(
        "ix_aula_eval_criterio_tenant_bloque",
        table_name="aula_evaluaciones_criterio",
    )
    op.drop_index(
        "ix_aula_eval_criterio_tenant_intento",
        table_name="aula_evaluaciones_criterio",
    )
    op.drop_table("aula_evaluaciones_criterio")

    op.drop_constraint(
        "ck_criterios_rubrica_descriptores_objeto",
        "criterios_rubrica",
        type_="check",
    )
    op.drop_column("criterios_rubrica", "descriptores_nivel")
    op.drop_column("criterios_rubrica", "orden")
    op.drop_column("criterios_rubrica", "ponderacion")

    op.drop_index(
        "ix_aula_bloques_tenant_rubrica",
        table_name="aula_bloques_aprendizaje",
    )
    op.drop_constraint(
        "fk_aula_bloques_rubrica",
        "aula_bloques_aprendizaje",
        type_="foreignkey",
    )
    op.drop_column("aula_bloques_aprendizaje", "rubrica_id")
