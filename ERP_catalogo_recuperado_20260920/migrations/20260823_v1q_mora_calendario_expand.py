"""V1Q expand: calendario de vencimientos sin backfill."""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "v1q_mora_calendario_expand"
down_revision: Union[str, Sequence[str], None] = "finanzas_integraciones_v1n"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("tenants", sa.Column("timezone_iana", sa.Text(), nullable=True))
    op.add_column("conceptos_pago", sa.Column("dia_vencimiento_default", sa.SmallInteger(), nullable=True))
    op.create_check_constraint("ck_conceptos_pago_dia_vencimiento_default", "conceptos_pago", "dia_vencimiento_default IS NULL OR dia_vencimiento_default BETWEEN 1 AND 28")
    op.add_column("pensiones", sa.Column("fecha_vencimiento", sa.Date(), nullable=True))

def downgrade() -> None:
    raise RuntimeError("V1Q operational rollback is application rollback; destructive downgrade is disabled")
