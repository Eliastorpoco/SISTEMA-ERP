"""Núcleo académico mínimo canónico para Aula Virtual V1J-D.

Esta migración crea únicamente la identidad académica necesaria para
representar una asignación docente: curso, sección, periodo y docente.
No crea matrículas, no crea una tabla docentes y no vincula unidades.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "nucleo_academico_minimo_v1jd"
down_revision: Union[str, Sequence[str], None] = "secuencia_unidades_v1ja"
branch_labels = None
depends_on = None


def _timestamps():
    return (
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )


def upgrade() -> None:
    # tenant_id usa UUID, compatible con usuarios.tenant_id. No se crea FK
    # hacia tenants porque tenants.id es varchar en producción.
    op.create_table(
        "cursos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("codigo", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "codigo", name="uq_cursos_tenant_codigo"),
    )

    op.create_table(
        "periodos_academicos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("anio", sa.Integer(), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        sa.CheckConstraint("fecha_fin >= fecha_inicio", name="ck_periodos_fechas_validas"),
        sa.UniqueConstraint("tenant_id", "nombre", "anio", name="uq_periodos_tenant_nombre_anio"),
    )

    op.create_table(
        "grados",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("nivel", sa.Text(), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        sa.UniqueConstraint("tenant_id", "nombre", name="uq_grados_tenant_nombre"),
    )

    op.create_table(
        "secciones_academicas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("grado_id", sa.Integer(), nullable=False),
        sa.Column("periodo_id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        sa.ForeignKeyConstraint(["grado_id"], ["grados.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["periodo_id"], ["periodos_academicos.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "tenant_id", "periodo_id", "grado_id", "nombre",
            name="uq_secciones_academicas_tenant_periodo_grado_nombre",
        ),
    )

    op.create_table(
        "asignaciones_docente",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("docente_id", sa.Integer(), nullable=False),
        sa.Column("curso_id", sa.Integer(), nullable=False),
        sa.Column("seccion_id", sa.Integer(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_timestamps(),
        sa.ForeignKeyConstraint(["docente_id"], ["usuarios.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["curso_id"], ["cursos.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["seccion_id"], ["secciones_academicas.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint(
            "tenant_id", "docente_id", "curso_id", "seccion_id",
            name="uq_asignaciones_docente_tenant_docente_curso_seccion",
        ),
    )


def downgrade() -> None:
    op.drop_table("asignaciones_docente")
    op.drop_table("secciones_academicas")
    op.drop_table("grados")
    op.drop_table("periodos_academicos")
    op.drop_table("cursos")
