"""Isolated HTTP/SQL harness for the recovered P1 contract and exact migration."""
import importlib.util
import sys
import types
from datetime import date
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


engine = create_engine('postgresql+psycopg2://eval:eval@127.0.0.1/eval')
schema = 'focal_' + uuid4().hex
with engine.begin() as con:
    con.execute(text(f'CREATE SCHEMA {schema}'))
engine.dispose()
engine = create_engine('postgresql+psycopg2://eval:eval@127.0.0.1/eval', connect_args={'options': f'-csearch_path={schema}'})
t1, t2 = str(uuid4()), str(uuid4())
with engine.begin() as con:
    for statement in [
        'CREATE TABLE alembic_version (version_num varchar(32) PRIMARY KEY)',
        "INSERT INTO alembic_version VALUES ('v1q_mora_calendario_expand')",
        'CREATE TABLE tenants (id varchar(36) PRIMARY KEY)',
        'CREATE TABLE usuarios (id integer PRIMARY KEY, tenant_id uuid, username text, role text)',
        'CREATE TABLE cursos (id integer PRIMARY KEY, tenant_id uuid, nombre text, activo boolean)',
        'CREATE TABLE periodos_academicos (id integer PRIMARY KEY, tenant_id uuid, nombre text, activo boolean)',
        'CREATE TABLE secciones_academicas (id integer PRIMARY KEY, tenant_id uuid, nombre text, periodo_id integer, activo boolean)',
        'CREATE TABLE asignaciones_docente (id integer PRIMARY KEY, tenant_id uuid, docente_id integer, curso_id integer, seccion_id integer, activo boolean)',
        'CREATE TABLE matriculas (id integer PRIMARY KEY, tenant_id uuid, estudiante_id integer, seccion_id integer, activo boolean)',
    ]:
        con.execute(text(statement))
    for tenant, offset in [(t1, 0), (t2, 100)]:
        con.execute(text('INSERT INTO tenants VALUES (CAST(:t AS uuid))'), {'t': tenant})
        for local_id, role in [(1, 'ESTUDIANTE'), (2, 'ESTUDIANTE'), (3, 'DOCENTE'), (4, 'DOCENTE'), (5, 'ADMIN'), (6, 'DIRECTOR'), (7, 'ESTUDIANTE'), (8, 'ESTUDIANTE')]:
            con.execute(text('INSERT INTO usuarios VALUES (:id,CAST(:t AS uuid),:name,:role)'), {'id': offset+local_id, 't': tenant, 'name': f'user{offset+local_id}', 'role': role})
        for i in [1, 2]:
            params = {'t': tenant, 'id': offset+i, 'docente': offset+i+2}
            for statement in [
                "INSERT INTO cursos VALUES (:id,CAST(:t AS uuid),'Curso '||:id,true)",
                "INSERT INTO periodos_academicos VALUES (:id,CAST(:t AS uuid),'Periodo '||:id,true)",
                "INSERT INTO secciones_academicas VALUES (:id,CAST(:t AS uuid),'Seccion '||:id,:id,true)",
                'INSERT INTO asignaciones_docente VALUES (:id,CAST(:t AS uuid),:docente,:id,:id,true)',
            ]:
                con.execute(text(statement), params)
        for local_id, student, section, active in [(1, 1, 1, True), (2, 2, 1, True), (3, 7, 1, False), (4, 8, 2, True)]:
            con.execute(text('INSERT INTO matriculas VALUES (:id,CAST(:t AS uuid),:student,:section,:active)'), {'id': offset+local_id, 't': tenant, 'student': offset+student, 'section': offset+section, 'active': active})

migration = module('migration_runner', '/app/backend_evaluacion/migrate.py')
migration.apply(engine)
migration.apply(engine)  # Already-applied path must preserve the head and data.


def get_db():
    with Session(engine) as db:
        yield db


stub = types.ModuleType('app.db.database')
stub.get_db = get_db
sys.modules['app.db.database'] = stub
c = module('evaluaciones_controller', '/app/controllers/evaluaciones_controller.py')
app = FastAPI()
app.include_router(c.router)


@app.middleware('http')
async def isolated_identity(request, call_next):
    request.state.tenant_id = request.headers['test-tenant']
    request.state.current_user = {'sub': request.headers['test-user']}
    return await call_next(request)


client = TestClient(app)


def call(method, path, body=None, actor=5, tenant=t1, status=200):
    response = client.request(method, '/evaluaciones' + path, json=body, headers={'test-tenant': tenant, 'test-user': f'user{actor}'})
    assert response.status_code == status, (method, path, response.status_code, response.text)
    return response.json()


competence = call('POST', '/competencias', {'curso_id': 1, 'nombre': 'Competencia recuperada'}, status=201)
foreign = call('POST', '/competencias', {'curso_id': 101, 'nombre': 'Competencia B'}, actor=105, tenant=t2, status=201)
other_course = call('POST', '/competencias', {'curso_id': 2, 'nombre': 'Competencia otro curso'}, actor=6, status=201)
assert len(call('GET', '/catalogos', actor=3)['asignaciones']) == 1
assert len(call('GET', '/catalogos', actor=5)['asignaciones']) == 2
assert all(row['curso_id'] == 1 for row in call('GET', '/catalogos', actor=3)['competencias'])
call('POST', '/competencias', {'curso_id': 101, 'nombre': 'Cruce'}, status=422)
body = {'asignacion_id': 1, 'competencia_id': competence['id'], 'titulo': 'Evaluación focal', 'fecha_aplicacion': date.today().isoformat()}
evaluation = call('POST', '', body, actor=3, status=201)
assert evaluation['tenant_id'] == t1 and evaluation['periodo_id'] == evaluation['seccion_id'] == evaluation['curso_id'] == 1
call('POST', '', body, actor=4, status=403)
call('POST', '', body, actor=1, status=403)
call('POST', '', {**body, 'competencia_id': foreign['id']}, status=422)
call('POST', '', {**body, 'competencia_id': other_course['id']}, status=422)
call('POST', '', {**body, 'asignacion_id': 101}, status=404)
call('POST', '', {**body, 'tenant_id': t2}, status=422)
path = '/' + evaluation['id']
eligible = call('GET', path + '/estudiantes', actor=3)
assert {row['estudiante_id'] for row in eligible} == {1, 2}
call('GET', path + '/estudiantes', actor=4, status=403)
call('GET', path + '/estudiantes', actor=1, status=403)
result_body = {'estudiante_id': 1, 'nivel_logro': 'B', 'puntaje': 12, 'retroalimentacion': 'Resultado focal'}
first = call('PUT', path + '/resultados', result_body, actor=3)
assert first['tenant_id'] == t1 and first['matricula_id'] == 1 and first['creado_por'] == 3
second = call('PUT', path + '/resultados', {**result_body, 'nivel_logro': 'A', 'puntaje': 16}, actor=6)
assert first['id'] == second['id'] and second['actualizado_por'] == 6 and second['creado_por'] == 3
call('PUT', path + '/resultados', {**result_body, 'estudiante_id': 2}, actor=5)
for student in [7, 8, 101]:
    call('PUT', path + '/resultados', {**result_body, 'estudiante_id': student}, status=422)
call('PUT', path + '/resultados', result_body, actor=4, status=403)
call('PUT', path + '/resultados', result_body, actor=1, status=403)
call('PUT', path + '/resultados', {**result_body, 'nivel_logro': 'OTRO'}, status=422)
call('PUT', path + '/resultados', {**result_body, 'puntaje': 21}, status=422)
call('GET', path + '/resultados', actor=4, status=403)
call('GET', path + '/resultados', actor=105, tenant=t2, status=404)
call('GET', path + '/resultados', actor=7, status=404)
own = call('GET', path + '/resultados', actor=1)['resultados']
assert len(own) == 1 and own[0]['estudiante_id'] == 1 and own[0]['nivel_logro'] == 'A'
for actor in [5, 6, 3]:
    assert len(call('GET', path + '/resultados', actor=actor)['resultados']) == 2
assert call('GET', '', actor=105, tenant=t2) == []
assert call('GET', '', actor=4) == []
assert len(call('GET', '', actor=1)) == 1
with engine.begin() as con:
    con.execute(text('UPDATE matriculas SET activo=false WHERE id=1'))
call('PUT', path + '/resultados', result_body, actor=3, status=422)
assert call('GET', path + '/resultados', actor=1)['resultados'][0]['nivel_logro'] == 'A'
with Session(engine) as db:
    assert db.execute(text('SELECT count(*) FROM resultados_evaluacion WHERE tenant_id::text<>:t'), {'t': t1}).scalar_one() == 0
    assert db.execute(text('SELECT version_num FROM alembic_version')).scalar_one() == 'evaluacion_competencia_p1'
print('EVAL_FOCAL_PASS=sí; ADMIN_DIRECTOR=PASS; DOCENTE=PASS; ESTUDIANTE_PROPIO=PASS; MATRICULA=PASS; COMPETENCIA_CURSO_SECCION_TENANT=PASS; CREATE_UPDATE=PASS; READ_REFRESH=PASS; CROSS_TENANT_ROWS=0; TAXONOMIA=AD/A/B/C')
