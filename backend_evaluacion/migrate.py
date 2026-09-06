"""Transactional runner for the recovered migration when Alembic CLI is absent."""
import importlib.util
from pathlib import Path
from sqlalchemy import text


def definition():
    path = Path(__file__).parent / 'alembic/versions_production/20260906_evaluacion_competencia_p1.py'
    spec = importlib.util.spec_from_file_location('p1_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def apply(engine):
    migration = definition()
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text('LOCK TABLE alembic_version IN EXCLUSIVE MODE'))
        heads = connection.execute(text('SELECT version_num FROM alembic_version')).scalars().all()
        if heads == [migration.revision]:
            print('HEAD=' + migration.revision)
            return
        if heads != [migration.down_revision]:
            raise RuntimeError('Unexpected Alembic head; no schema changes applied')
        for statement in migration.STATEMENTS:
            connection.execute(text(statement))
        connection.execute(text('UPDATE alembic_version SET version_num=:new WHERE version_num=:old'), {'new': migration.revision, 'old': migration.down_revision})
    print('MIGRATION_PASS; HEAD=' + migration.revision)


if __name__ == '__main__':
    from app.db.database import engine
    apply(engine)
