"""Canonical competence evaluation using recovered historical entity names."""
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.db.database import get_db

router = APIRouter(prefix='/evaluaciones', tags=['EvaluaciónCompetencia'])
NIVELES = ['AD', 'A', 'B', 'C']


class Payload(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class CompetenciaCreate(Payload):
    curso_id: int = Field(gt=0)
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: Optional[str] = Field(default=None, max_length=8000)


class EvaluacionCreate(Payload):
    asignacion_id: int = Field(gt=0)
    competencia_id: UUID
    titulo: str = Field(min_length=1, max_length=250)
    descripcion: Optional[str] = Field(default=None, max_length=8000)
    fecha_aplicacion: date


class ResultadoUpsert(Payload):
    estudiante_id: int = Field(gt=0)
    nivel_logro: str
    puntaje: Optional[Decimal] = Field(default=None, ge=0, le=20, max_digits=4, decimal_places=2)
    retroalimentacion: Optional[str] = Field(default=None, max_length=8000)

    @field_validator('nivel_logro')
    @classmethod
    def nivel_valido(cls, value):
        value = value.upper()
        if value not in NIVELES:
            raise ValueError('Nivel permitido: AD, A, B o C.')
        return value


def contexto(request, db, escritura=False):
    tenant = str(getattr(request.state, 'tenant_id', '') or '')
    username = (getattr(request.state, 'current_user', None) or {}).get('sub')
    row = db.execute(text('SELECT id, UPPER(role) role FROM usuarios WHERE tenant_id::text=:tenant AND LOWER(username)=LOWER(:username) LIMIT 1'), {'tenant': tenant, 'username': username}).mappings().first() if tenant and username else None
    if not row:
        raise HTTPException(403, 'Usuario no pertenece al tenant autenticado.')
    roles = {'ADMIN', 'DIRECTOR', 'DOCENTE'} if escritura else {'ADMIN', 'DIRECTOR', 'DOCENTE', 'ESTUDIANTE'}
    if row['role'] not in roles:
        raise HTTPException(403, 'Rol no autorizado para esta operación.')
    return tenant, row['role'], int(row['id'])


ASIGNACION = """SELECT a.id, a.docente_id, a.curso_id, a.seccion_id,
    s.periodo_id, s.nombre seccion_nombre, c.nombre curso_nombre, p.nombre periodo_nombre
    FROM asignaciones_docente a
    JOIN usuarios d ON d.id=a.docente_id AND d.tenant_id=a.tenant_id AND UPPER(d.role)='DOCENTE'
    JOIN cursos c ON c.id=a.curso_id AND c.tenant_id=a.tenant_id AND c.activo IS TRUE
    JOIN secciones_academicas s ON s.id=a.seccion_id AND s.tenant_id=a.tenant_id AND s.activo IS TRUE
    JOIN periodos_academicos p ON p.id=s.periodo_id AND p.tenant_id=s.tenant_id AND p.activo IS TRUE
    WHERE a.tenant_id::text=:tenant AND a.activo IS TRUE"""


def asignacion(db, tenant, role, actor, assignment_id):
    row = db.execute(text(ASIGNACION + ' AND a.id=:id'), {'tenant': tenant, 'id': assignment_id}).mappings().first()
    if not row:
        raise HTTPException(404, 'Asignación activa no encontrada en el tenant actual.')
    if role == 'DOCENTE' and row['docente_id'] != actor:
        raise HTTPException(403, 'El docente no está asignado al curso y sección.')
    return dict(row)


SELECT_EVALUACION = """SELECT e.*, c.nombre curso_nombre, s.nombre seccion_nombre,
    p.nombre periodo_nombre, k.nombre competencia_nombre, d.username docente_username,
    a.docente_id
    FROM evaluaciones e
    JOIN asignaciones_docente a ON a.id=e.asignacion_id AND a.tenant_id=e.tenant_id
      AND a.curso_id=e.curso_id AND a.seccion_id=e.seccion_id
    JOIN usuarios d ON d.id=a.docente_id AND d.tenant_id=e.tenant_id
    JOIN cursos c ON c.id=e.curso_id AND c.tenant_id=e.tenant_id
    JOIN secciones_academicas s ON s.id=e.seccion_id AND s.tenant_id=e.tenant_id AND s.periodo_id=e.periodo_id
    JOIN periodos_academicos p ON p.id=e.periodo_id AND p.tenant_id=e.tenant_id
    JOIN competencias k ON k.id=e.competencia_id AND k.tenant_id=e.tenant_id AND k.curso_id=e.curso_id"""


def evaluacion(db, tenant, role, actor, evaluation_id, escritura=False):
    row = db.execute(text(SELECT_EVALUACION + ' WHERE e.tenant_id::text=:tenant AND e.id=:id'), {'tenant': tenant, 'id': evaluation_id}).mappings().first()
    if not row:
        raise HTTPException(404, 'Evaluación no encontrada en el tenant actual.')
    if role == 'DOCENTE':
        asignacion(db, tenant, role, actor, row['asignacion_id'])
    if role == 'ESTUDIANTE':
        own = db.execute(text('SELECT 1 FROM resultados_evaluacion WHERE tenant_id::text=:tenant AND evaluacion_id=:id AND estudiante_id=:actor'), {'tenant': tenant, 'id': evaluation_id, 'actor': actor}).first()
        if not own:
            raise HTTPException(404, 'Evaluación no encontrada para el estudiante.')
    if escritura:
        asignacion(db, tenant, role, actor, row['asignacion_id'])
        active = db.execute(text('SELECT 1 FROM competencias WHERE tenant_id::text=:tenant AND id=:id AND activo IS TRUE'), {'tenant': tenant, 'id': row['competencia_id']}).first()
        if not row['activo'] or not active:
            raise HTTPException(409, 'Evaluación o competencia inactiva.')
    return dict(row)


@router.get('/catalogos')
def catalogos(request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db, escritura=True)
    filtro = ' AND a.docente_id=:actor' if role == 'DOCENTE' else ''
    assignments = [dict(row) for row in db.execute(text(ASIGNACION + filtro + ' ORDER BY p.nombre,s.nombre,c.nombre'), {'tenant': tenant, 'actor': actor}).mappings().all()]
    courses = list({row['curso_id'] for row in assignments})
    competencies = [dict(row) for row in db.execute(text('SELECT id,curso_id,nombre,descripcion FROM competencias WHERE tenant_id::text=:tenant AND activo IS TRUE AND curso_id=ANY(:courses) ORDER BY nombre'), {'tenant': tenant, 'courses': courses}).mappings().all()] if courses else []
    return {'asignaciones': assignments, 'competencias': competencies, 'niveles': NIVELES}


@router.post('/competencias', status_code=201)
def crear_competencia(body: CompetenciaCreate, request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db, escritura=True)
    if role not in {'ADMIN', 'DIRECTOR'}:
        raise HTTPException(403, 'Solo ADMIN/DIRECTOR gestiona competencias.')
    if not db.execute(text(ASIGNACION + ' AND a.curso_id=:course'), {'tenant': tenant, 'course': body.curso_id}).first():
        raise HTTPException(422, 'Curso sin asignación académica activa en el tenant.')
    try:
        row = db.execute(text('INSERT INTO competencias (tenant_id,curso_id,nombre,descripcion) VALUES (CAST(:tenant AS uuid),:curso_id,:nombre,:descripcion) RETURNING id,curso_id,nombre,descripcion'), {'tenant': tenant, **body.model_dump()}).mappings().first()
        db.commit()
        return dict(row)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'La competencia ya existe en el curso.')


@router.get('')
def listar_evaluaciones(request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db)
    filters = ['e.tenant_id::text=:tenant']
    if role == 'DOCENTE':
        filters += ['a.docente_id=:actor', 'a.activo IS TRUE', 's.activo IS TRUE', 'p.activo IS TRUE', 'c.activo IS TRUE']
    if role == 'ESTUDIANTE':
        filters.append('EXISTS (SELECT 1 FROM resultados_evaluacion r WHERE r.tenant_id=e.tenant_id AND r.evaluacion_id=e.id AND r.estudiante_id=:actor)')
    return [dict(row) for row in db.execute(text(SELECT_EVALUACION + ' WHERE ' + ' AND '.join(filters) + ' ORDER BY e.fecha_aplicacion DESC,e.created_at DESC'), {'tenant': tenant, 'actor': actor}).mappings().all()]


@router.post('', status_code=201)
def crear_evaluacion(body: EvaluacionCreate, request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db, escritura=True)
    assignment = asignacion(db, tenant, role, actor, body.asignacion_id)
    competence = db.execute(text('SELECT 1 FROM competencias WHERE tenant_id::text=:tenant AND id=:id AND curso_id=:course AND activo IS TRUE'), {'tenant': tenant, 'id': body.competencia_id, 'course': assignment['curso_id']}).first()
    if not competence:
        raise HTTPException(422, 'Competencia no pertenece al curso y tenant de la asignación.')
    row = db.execute(text('''INSERT INTO evaluaciones (tenant_id,curso_id,periodo_id,seccion_id,asignacion_id,competencia_id,titulo,descripcion,fecha_aplicacion,creado_por)
        VALUES (CAST(:tenant AS uuid),:curso_id,:periodo_id,:seccion_id,:asignacion_id,:competencia_id,:titulo,:descripcion,:fecha_aplicacion,:actor) RETURNING id'''), {'tenant': tenant, 'actor': actor, 'curso_id': assignment['curso_id'], 'periodo_id': assignment['periodo_id'], 'seccion_id': assignment['seccion_id'], **body.model_dump()}).scalar_one()
    db.commit()
    return evaluacion(db, tenant, role, actor, row)


@router.get('/{evaluation_id}/estudiantes')
def estudiantes_elegibles(evaluation_id: UUID, request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db, escritura=True)
    item = evaluacion(db, tenant, role, actor, evaluation_id, escritura=True)
    rows = db.execute(text('''SELECT m.id matricula_id,u.id estudiante_id,u.username
        FROM matriculas m JOIN usuarios u ON u.id=m.estudiante_id AND u.tenant_id=m.tenant_id
        WHERE m.tenant_id::text=:tenant AND m.seccion_id=:section AND m.activo IS TRUE
          AND UPPER(u.role)='ESTUDIANTE' ORDER BY u.username'''), {'tenant': tenant, 'section': item['seccion_id']}).mappings().all()
    return [dict(row) for row in rows]


@router.get('/{evaluation_id}/resultados')
def resultados(evaluation_id: UUID, request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db)
    item = evaluacion(db, tenant, role, actor, evaluation_id)
    filtro = ' AND r.estudiante_id=:actor' if role == 'ESTUDIANTE' else ''
    rows = db.execute(text('''SELECT r.*,u.username estudiante,reviewer.username revisor
        FROM resultados_evaluacion r
        JOIN usuarios u ON u.id=r.estudiante_id AND u.tenant_id=r.tenant_id
        JOIN usuarios reviewer ON reviewer.id=r.actualizado_por AND reviewer.tenant_id=r.tenant_id
        JOIN matriculas m ON m.id=r.matricula_id AND m.tenant_id=r.tenant_id
          AND m.estudiante_id=r.estudiante_id AND m.seccion_id=:section
        WHERE r.tenant_id::text=:tenant AND r.evaluacion_id=:id''' + filtro + ' ORDER BY u.username'), {'tenant': tenant, 'id': evaluation_id, 'actor': actor, 'section': item['seccion_id']}).mappings().all()
    return {'evaluacion': item, 'resultados': [dict(row) for row in rows], 'niveles': NIVELES}


@router.put('/{evaluation_id}/resultados')
def guardar_resultado(evaluation_id: UUID, body: ResultadoUpsert, request: Request, db: Session = Depends(get_db)):
    tenant, role, actor = contexto(request, db, escritura=True)
    item = evaluacion(db, tenant, role, actor, evaluation_id, escritura=True)
    enrollment = db.execute(text('''SELECT m.id FROM matriculas m
        JOIN usuarios u ON u.id=m.estudiante_id AND u.tenant_id=m.tenant_id AND UPPER(u.role)='ESTUDIANTE'
        WHERE m.tenant_id::text=:tenant AND m.seccion_id=:section AND m.estudiante_id=:student AND m.activo IS TRUE
        ORDER BY m.id LIMIT 1 FOR SHARE OF m'''), {'tenant': tenant, 'section': item['seccion_id'], 'student': body.estudiante_id}).scalar()
    if not enrollment:
        raise HTTPException(422, 'El estudiante no tiene matrícula activa en la sección de la evaluación.')
    row = db.execute(text('''INSERT INTO resultados_evaluacion
        (tenant_id,evaluacion_id,estudiante_id,matricula_id,nivel_logro,puntaje,retroalimentacion,creado_por,actualizado_por)
        VALUES (CAST(:tenant AS uuid),:evaluation,:estudiante_id,:enrollment,:nivel_logro,:puntaje,:retroalimentacion,:actor,:actor)
        ON CONFLICT (tenant_id,evaluacion_id,estudiante_id) DO UPDATE SET
          matricula_id=EXCLUDED.matricula_id,nivel_logro=EXCLUDED.nivel_logro,puntaje=EXCLUDED.puntaje,
          retroalimentacion=EXCLUDED.retroalimentacion,actualizado_por=EXCLUDED.actualizado_por,updated_at=now()
        RETURNING *'''), {'tenant': tenant, 'evaluation': evaluation_id, 'enrollment': enrollment, 'actor': actor, **body.model_dump()}).mappings().first()
    db.commit()
    return dict(row)
