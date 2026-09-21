"""Refuerza la pertenencia tenant de estudiantes y conceptos en pensiones.

Cambio aditivo: conserva las claves foráneas existentes.
Requiere verificar inconsistencias y planificar bloqueos antes del despliegue.
"""
from alembic import op

revision = "pensiones_tenant_fk_v1"
down_revision = "evaluacion_competencia_p1"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("SET LOCAL lock_timeout = '5s'")
    op.execute("SET LOCAL statement_timeout = '30s'")

    op.execute("""
        ALTER TABLE public.estudiantes
        ADD CONSTRAINT uq_estudiantes_tenant_id_id
        UNIQUE (tenant_id, id)
    """)
    op.execute("""
        ALTER TABLE public.conceptos_pago
        ADD CONSTRAINT uq_conceptos_pago_tenant_id_id
        UNIQUE (tenant_id, id)
    """)
    op.execute("""
        ALTER TABLE public.pensiones
        ADD CONSTRAINT fk_pensiones_tenant_estudiante
        FOREIGN KEY (tenant_id, estudiante_id)
        REFERENCES public.estudiantes (tenant_id, id)
    """)
    op.execute("""
        ALTER TABLE public.pensiones
        ADD CONSTRAINT fk_pensiones_tenant_concepto
        FOREIGN KEY (tenant_id, concepto_id)
        REFERENCES public.conceptos_pago (tenant_id, id)
    """)


def downgrade():
    raise RuntimeError(
        "Reversión automática deshabilitada: retiraría la protección "
        "de integridad entre tenants. Requiere revisión explícita."
    )
