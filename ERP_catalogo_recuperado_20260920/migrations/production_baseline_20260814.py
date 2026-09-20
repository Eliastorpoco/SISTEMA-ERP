"""Production schema baseline for the canonical migration line.

This revision records the already-existing production schema as of
2026-08-14. It deliberately does not create tables, alter columns, execute
historical migrations, or make a fresh database buildable from zero.
"""

revision = "production_baseline_20260814"
down_revision = None
branch_labels = ("production",)
depends_on = None


def upgrade() -> None:
    """No-op: production schema already exists and is verified separately."""


def downgrade() -> None:
    """No-op: a baseline must never delete production structure."""
