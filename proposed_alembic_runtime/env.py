import os
from alembic import context
from sqlalchemy import create_engine, pool

config = context.config

def ejecutar(connection):
    context.configure(
        connection=connection,
        target_metadata=None,
        version_table="alembic_version",
        version_table_schema="public",
        transactional_ddl=True,
    )
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    raise RuntimeError("Este entorno requiere una conexión online.")

connection = config.attributes.get("connection")
if connection is not None:
    ejecutar(connection)
else:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL es obligatoria.")
    engine = create_engine(
        url,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 5},
    )
    try:
        with engine.connect() as connection:
            ejecutar(connection)
    finally:
        engine.dispose()
