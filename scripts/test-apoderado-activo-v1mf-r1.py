"""Focal V1MF harness, exclusively against an ephemeral PostgreSQL.

Run in the current/candidate API image with --network container:v1mf-r1-db.
Use --expect-fixed to require the inactive-guardian rejection.
"""
import importlib.util
import sys
import types
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import Index, MetaData, Table, create_engine, text
from sqlalchemy.orm import Session

stub = types.ModuleType('app.db.database')
stub.get_db = lambda: None
sys.modules['app.db.database'] = stub
alembic_stub = types.ModuleType('alembic')
alembic_stub.op = None
sys.modules['alembic'] = alembic_stub


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class MigrationOperations:
    def __init__(self, connection):
        self.connection = connection
        self.metadata = MetaData()
        self.metadata.reflect(connection)

    def create_table(self, name, *definitions):
        Table(name, self.metadata, *definitions).create(self.connection)

    def create_index(self, name, table, columns, **kwargs):
        Index(name, *(self.metadata.tables[table].c[column] for column in columns), **kwargs).create(self.connection)


c = module('active_controller', '/app/controllers/apoderados_comunicacion_controller.py')
migration = module('historical_migration', '/app/alembic/versions_production/20260816_apoderados_comunicacion_v1mf.py')
engine = create_engine('postgresql+psycopg2://v1mf:v1mf@127.0.0.1/v1mf')
# A fresh schema per run keeps baseline and candidate fixtures independent.
schema = 'focal_' + uuid4().hex
with engine.begin() as con:
    con.execute(text(f'CREATE SCHEMA {schema}'))
engine.dispose()
engine = create_engine('postgresql+psycopg2://v1mf:v1mf@127.0.0.1/v1mf', connect_args={'options': f'-csearch_path={schema}'})
t1, t2 = str(uuid4()), str(uuid4())
with engine.begin() as con:
    for statement in [
        'CREATE TABLE usuarios (id integer PRIMARY KEY, tenant_id uuid, username text, role text)',
        'CREATE TABLE secciones_academicas (id integer PRIMARY KEY, tenant_id uuid, periodo_id integer)',
        'CREATE TABLE asignaciones_docente (id integer PRIMARY KEY, tenant_id uuid, docente_id integer, seccion_id integer, activo boolean)',
        'CREATE TABLE matriculas (id integer PRIMARY KEY, tenant_id uuid, seccion_id integer, estudiante_id integer, activo boolean)',
        'CREATE TABLE incidencias_academicas (id integer PRIMARY KEY, tenant_id uuid, estudiante_id integer)',
    ]:
        con.execute(text(statement))
    migration.op = MigrationOperations(con)
    migration.upgrade()
    for tenant, offset in [(t1, 0), (t2, 100)]:
        for local_id, role in [(1, 'ESTUDIANTE'), (2, 'ESTUDIANTE'), (3, 'DOCENTE'), (4, 'DOCENTE'), (5, 'ADMIN'), (6, 'DIRECTOR')]:
            con.execute(text('INSERT INTO usuarios VALUES (:id, CAST(:t AS uuid), :name, :role)'), dict(id=offset+local_id, t=tenant, name=f'user{offset+local_id}', role=role))
        params = dict(t=tenant, id=offset+1, docente=offset+3)
        for statement in [
            'INSERT INTO secciones_academicas VALUES (:id, CAST(:t AS uuid), 1)',
            'INSERT INTO asignaciones_docente VALUES (:id, CAST(:t AS uuid), :docente, :id, true)',
            'INSERT INTO matriculas VALUES (:id, CAST(:t AS uuid), :id, :id, true)',
            'INSERT INTO incidencias_academicas VALUES (:id, CAST(:t AS uuid), :id)',
        ]:
            con.execute(text(statement), params)


def request(actor=5, tenant=t1):
    return SimpleNamespace(state=SimpleNamespace(tenant_id=tenant, current_user={'sub': f'user{actor}'}))


def fails(status, fn, code=None):
    try:
        fn()
    except HTTPException as error:
        assert error.status_code == status, (error.status_code, status)
        if code:
            assert error.detail['code'] == code
    else:
        raise AssertionError(f'Expected HTTP {status}')


with Session(engine) as db:
    def guardian(document, actor=5, tenant=t1):
        return c.crear_apoderado(c.ApoderadoCreate(nombre='Apoderado aislado', documento=document, email='guardian@example.org'), request(actor, tenant), db)

    g = guardian('A')
    other = guardian('B', actor=6)
    foreign = guardian('A', actor=105, tenant=t2)
    relationship = c.RelacionCreate(apoderado_id=g['id'], principal=True)
    c.relacionar_apoderado(1, relationship, request(), db)
    fails(409, lambda: c.relacionar_apoderado(1, relationship, request(), db))
    fails(409, lambda: c.relacionar_apoderado(1, c.RelacionCreate(apoderado_id=other['id'], principal=True), request(), db))
    fails(422, lambda: c.relacionar_apoderado(2, c.RelacionCreate(apoderado_id=other['id']), request(), db))
    fails(403, lambda: guardian('student-forbidden', actor=1))
    fails(403, lambda: c.listar_apoderados(request(1), db))
    assert len(c.listar_apoderados(request(3), db)) == 1
    assert c.listar_apoderados(request(4), db) == []

    def communication(apoderado=g['id'], estudiante=1, origen='INCIDENCIA', referencia='INCIDENCIA-1', actor=5):
        return c.crear_comunicacion(c.ComunicacionCreate(estudiante_id=estudiante, apoderado_id=apoderado, origen=origen, referencia_origen=referencia, asunto='Validación aislada', mensaje='Sin envío externo'), request(actor), db)

    valid = communication(actor=3)
    assert valid['estado'] == 'PENDIENTE' and valid['modo_envio'] == 'SANDBOX'
    assert valid['canal'] == 'EMAIL' and valid['enviado_at'] is None
    assert valid['historial'][0]['estado'] == 'PENDIENTE' and valid['historial'][0]['actor_id'] == 3
    fails(409, lambda: communication(), 'COMUNICACION_ORIGEN_DUPLICADA')
    fails(403, lambda: communication(actor=1))
    fails(403, lambda: communication(actor=4))
    fails(422, lambda: communication(referencia='INCIDENCIA-101'))
    fails(422, lambda: communication(apoderado=other['id'], origen='MANUAL', referencia='no-relacion'))
    fails(422, lambda: communication(apoderado=foreign['id'], origen='MANUAL', referencia='otro-tenant'))
    fails(422, lambda: communication(estudiante=101, origen='MANUAL', referencia='otro-estudiante'))
    c.relacionar_apoderado(1, c.RelacionCreate(apoderado_id=other['id'], activo=False), request(), db)
    fails(422, lambda: communication(apoderado=other['id'], origen='MANUAL', referencia='relacion-inactiva'))
    assert c.listar_comunicaciones(request(4), None, None, None, db) == []
    assert c.listar_comunicaciones(request(105, t2), None, None, None, db) == []
    for actor in [5, 6]:
        assert len(c.listar_comunicaciones(request(actor), None, None, None, db)) == 1

    c.actualizar_apoderado(g['id'], c.ApoderadoUpdate(activo=False), request(), db)
    assert c.detalle_comunicacion(valid['id'], request(), db)['id'] == valid['id']
    count_before = db.execute(text('SELECT count(*) FROM comunicaciones_institucionales')).scalar_one()
    defect = False
    try:
        communication(origen='MANUAL', referencia='guardian-inactivo')
        defect = True
    except HTTPException as error:
        assert error.status_code == 422
        assert error.detail == 'El destinatario no es apoderado activo del estudiante.'
    count_after = db.execute(text('SELECT count(*) FROM comunicaciones_institucionales')).scalar_one()
    assert count_after == count_before + int(defect)
    print('V1MF_DEFECT_CONFIRMED=' + ('sí' if defect else 'no'))
    print('V1MF_INACTIVE_GUARDIAN_BLOCK=' + ('FAIL' if defect else 'PASS'))
    print('V1MF_ACTIVE_GUARDIAN_PASS=PASS; V1MF_RELATION_INACTIVE_BLOCK=PASS; V1MF_TENANT_SCOPE_PASS=PASS; V1MF_CROSS_TENANT_ROWS=0; EXISTING_COMMUNICATION=PASS; FOCAL_REGRESSION=PASS; ENVIO_REAL_EJECUTADO=no')
    if '--expect-fixed' in sys.argv:
        assert not defect, 'Inactive guardian accepted by candidate'
