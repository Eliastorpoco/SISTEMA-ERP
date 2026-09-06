"""Focal recovery harness. Run only in an isolated container with the active API image.

Uses an ephemeral PostgreSQL on localhost; never reads production configuration.
"""
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import Index, MetaData, Table, create_engine, text
from sqlalchemy.orm import Session

stub = types.ModuleType('app.db.database')
stub.get_db = lambda: None
sys.modules['app.db.database'] = stub
alembic_stub = types.ModuleType('alembic')
alembic_stub.op = None
sys.modules['alembic'] = alembic_stub


class MigrationOperations:
    """Execute the historical table/index definitions without installing Alembic."""
    def __init__(self, connection):
        self.connection = connection
        self.metadata = MetaData()
        self.metadata.reflect(connection)

    def create_table(self, name, *definitions):
        Table(name, self.metadata, *definitions).create(self.connection)

    def create_index(self, name, table, columns):
        Index(name, *(self.metadata.tables[table].c[column] for column in columns)).create(self.connection)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


c = module('active_controller', '/app/controllers/asistencia_academica_controller.py')
migration = module('historical_migration', '/app/alembic/versions_production/20260816_justificaciones_asistencia_v1md.py')
engine = create_engine('postgresql+psycopg2://v1md:v1md@127.0.0.1/v1md')
t1, t2 = str(uuid4()), str(uuid4())
with engine.begin() as con:
    for statement in [
        'CREATE TABLE usuarios (id integer PRIMARY KEY, tenant_id uuid, username text, role text)',
        'CREATE TABLE cursos (id integer PRIMARY KEY, tenant_id uuid, nombre text)',
        'CREATE TABLE secciones_academicas (id integer PRIMARY KEY, tenant_id uuid, nombre text, periodo_id integer)',
        'CREATE TABLE asignaciones_docente (id integer PRIMARY KEY, tenant_id uuid, docente_id integer, curso_id integer, seccion_id integer)',
        'CREATE TABLE horarios_academicos (id integer PRIMARY KEY, tenant_id uuid, asignacion_id integer, hora_inicio time, hora_fin time, ambiente text)',
        'CREATE TABLE sesiones_asistencia (id integer PRIMARY KEY, tenant_id uuid, horario_id integer, fecha date)',
        'CREATE TABLE asistencias_academicas (id integer PRIMARY KEY, tenant_id uuid, sesion_id integer, estudiante_id integer, estado text, hora_registro timestamp, observacion text)',
        'CREATE TABLE matriculas (id integer PRIMARY KEY, tenant_id uuid, seccion_id integer, estudiante_id integer, activo boolean)',
    ]:
        con.execute(text(statement))
    migration.op = MigrationOperations(con)
    migration.upgrade()
    for tenant, offset in [(t1, 0), (t2, 100)]:
        for local_id, role in [(1, 'ESTUDIANTE'), (2, 'ESTUDIANTE'), (3, 'DOCENTE'), (4, 'DOCENTE'), (5, 'ADMIN'), (6, 'DIRECTOR')]:
            con.execute(text('INSERT INTO usuarios VALUES (:id, CAST(:t AS uuid), :name, :role)'), dict(id=offset+local_id, t=tenant, name=f'user{offset+local_id}', role=role))
        params = dict(t=tenant, id=offset+1, docente=offset+3)
        for statement in [
            "INSERT INTO cursos VALUES (:id, CAST(:t AS uuid), 'Curso aislado')",
            "INSERT INTO secciones_academicas VALUES (:id, CAST(:t AS uuid), 'Sección aislada', 1)",
            'INSERT INTO asignaciones_docente VALUES (:id, CAST(:t AS uuid), :docente, :id, :id)',
            "INSERT INTO horarios_academicos VALUES (:id, CAST(:t AS uuid), :id, '08:00', '09:00', 'Aula')",
            "INSERT INTO sesiones_asistencia VALUES (:id, CAST(:t AS uuid), :id, '2026-09-04')",
            'INSERT INTO matriculas VALUES (:id, CAST(:t AS uuid), :id, :id, true)',
        ]:
            con.execute(text(statement), params)
        for local_id, estado in [(1, 'AUSENTE'), (2, 'TARDANZA'), (3, 'PRESENTE'), (4, 'AUSENTE')]:
            con.execute(text('INSERT INTO asistencias_academicas VALUES (:id, CAST(:t AS uuid), :sesion, :estudiante, :estado, now(), NULL)'), dict(id=offset+local_id, t=tenant, sesion=offset+1, estudiante=offset+1, estado=estado))


def request(actor, tenant=t1):
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
    body = c.JustificacionCreate(motivo='Motivo aislado', detalle='Detalle aislado')
    review = c.JustificacionRevision(decision='APROBADA', observacion='Verificado en aislamiento')
    absent = c.crear_justificacion(1, body, request(1), db)
    late = c.crear_justificacion(2, body, request(1), db)
    assert absent['estado'] == late['estado'] == 'PENDIENTE'
    assert absent['estado_efectivo'] == 'AUSENTE'
    fails(422, lambda: c.crear_justificacion(3, body, request(1), db))
    fails(409, lambda: c.crear_justificacion(1, body, request(1), db), 'JUSTIFICACION_DUPLICADA')
    fails(403, lambda: c.crear_justificacion(4, body, request(2), db))
    fails(403, lambda: c.crear_justificacion(101, body, request(1), db))
    fails(403, lambda: c.revisar_justificacion(absent['id'], review, request(1), db))
    fails(403, lambda: c.revisar_justificacion(absent['id'], review, request(4), db))
    assert c.listar_justificaciones(request(4), None, None, None, db) == []
    approved = c.revisar_justificacion(absent['id'], review, request(3), db)
    approved_late = c.revisar_justificacion(late['id'], review, request(5), db)
    for row, original in [(approved, 'AUSENTE'), (approved_late, 'TARDANZA')]:
        assert row['estado'] == 'APROBADA'
        assert row['estado_original'] == original
        assert row['estado_efectivo'] == 'JUSTIFICADO'
        assert row['revisado_por'] and row['revisado_at'] and row['observacion_revision']
        assert row['incidencia_proyectada']['persistida'] is False
    pending = c.crear_justificacion(4, body, request(1), db)
    rejected = c.revisar_justificacion(pending['id'], c.JustificacionRevision(decision='RECHAZADA', observacion='Revisión aislada'), request(6), db)
    assert rejected['estado_efectivo'] == rejected['estado_original'] == 'AUSENTE'
    original = db.execute(text('SELECT estado FROM asistencias_academicas WHERE id IN (1,2) ORDER BY id')).scalars().all()
    assert original == ['AUSENTE', 'TARDANZA']
    mine = c.mi_asistencia(request(1), None, db)
    assert mine[0]['estado'] in {'JUSTIFICADO', 'PRESENTE', 'AUSENTE'}
    assert {row['id']: row['estado'] for row in mine}[1] == 'JUSTIFICADO'
    assert c.mi_asistencia(request(2), None, db) == []
    fails(403, lambda: c.listar_justificaciones(request(1), None, None, 2, db))
    foreign = c.crear_justificacion(101, body, request(101, t2), db)
    for actor in [5, 6]:
        rows = c.listar_justificaciones(request(actor), None, None, None, db)
        assert len(rows) == 3 and all(row['estudiante_id'] == 1 for row in rows)
        fails(404, lambda: c.revisar_justificacion(foreign['id'], review, request(actor), db))
    alerts = c.alertas_asistencia(request(5), None, None, None, None, db)
    assert alerts['regla'] == 'PROYECCION_TECNICA_NO_OFICIAL_V1MD'
    assert alerts['es_politica_institucional'] is False
    assert all(row['estudiante_id'] == 1 for row in alerts['filas'])
    assert c.alertas_asistencia(request(4), None, None, None, None, db)['filas'] == []
    report = c.reporte_asistencia(request(5), None, None, None, None, db)
    assert report['resumen']['justificados'] == 2
    try:
        c.JustificacionRevision(decision='APROBADA', observacion=' ')
    except ValidationError:
        pass
    else:
        raise AssertionError('Review observation must be required')
    source = Path('/app/controllers/asistencia_academica_controller.py').read_text()
    assert 'UPDATE asistencias_academicas' not in source
    assert 'INSERT INTO incidencias' not in source
print('V1MD_FOCAL_PASS=sí; CREATE_AUSENTE_TARDANZA=PASS; PRESENTE_REJECT=PASS; DUPLICATE_409=PASS; REVIEW=PASS; ORIGINAL_PRESERVED=PASS; EFFECTIVE=JUSTIFICADO; STUDENT_TEACHER_ADMIN_DIRECTOR_SCOPE=PASS; CROSS_TENANT_ROWS=0; ALERTAS_READONLY=PASS')
