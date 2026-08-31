from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from controllers.asistencia_academica_controller import reporte_asistencia

router = APIRouter(prefix="/incidencias-academicas", tags=["Incidencias Académicas"])
TIPOS = {"CONVIVENCIA", "ASISTENCIA", "ACADEMICA", "TUTORIA"}
ORIGENES = {"MANUAL", "ASISTENCIA", "AULA_VIRTUAL", "OTRO"}
ESTADOS = {"ABIERTA", "EN_SEGUIMIENTO", "CERRADA"}
TRANSICIONES = {"ABIERTA": {"EN_SEGUIMIENTO"}, "EN_SEGUIMIENTO": {"CERRADA"}, "CERRADA": set()}


def _normalizar(value: str) -> str:
    return value.strip().upper().replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")


class IncidenciaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    estudiante_id: int
    tipo: str
    categoria: str
    descripcion: str
    origen: str = "MANUAL"
    referencia_origen: Optional[str] = None
    responsable_id: int

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, value):
        value = _normalizar(value)
        if value not in TIPOS: raise ValueError("Tipo de incidencia no permitido.")
        return value

    @field_validator("origen")
    @classmethod
    def origen_valido(cls, value):
        value = _normalizar(value)
        if value not in ORIGENES: raise ValueError("Origen de incidencia no permitido.")
        return value

    @field_validator("categoria", "descripcion")
    @classmethod
    def texto_valido(cls, value):
        value = value.strip()
        if not value or len(value) > 4000: raise ValueError("El texto es obligatorio.")
        return value


class AccionTutorialCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tipo: str
    descripcion: str
    fecha: date
    responsable_id: int
    observacion: Optional[str] = None

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, value):
        value = _normalizar(value)
        if value not in {"ENTREVISTA", "ORIENTACION"}: raise ValueError("Tipo de acción tutorial no permitido.")
        return value

    @field_validator("descripcion")
    @classmethod
    def descripcion_valida(cls, value):
        value = value.strip()
        if not value or len(value) > 4000: raise ValueError("La descripción es obligatoria.")
        return value


class EstadoIncidenciaUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    estado: str
    observacion: str

    @field_validator("estado")
    @classmethod
    def estado_valido(cls, value):
        value = _normalizar(value)
        if value not in ESTADOS: raise ValueError("Estado no permitido.")
        return value

    @field_validator("observacion")
    @classmethod
    def observacion_valida(cls, value):
        value = value.strip()
        if not value: raise ValueError("La observación es obligatoria.")
        return value


def _contexto(request: Request, db: Session) -> tuple[str, str, int]:
    tenant_id = str(getattr(request.state, "tenant_id", "") or "")
    payload = getattr(request.state, "current_user", None) or {}
    username = str(payload.get("sub") or "").strip()
    row = db.execute(text("SELECT id, UPPER(role) role FROM usuarios WHERE tenant_id::text=:tenant_id AND LOWER(username)=LOWER(:username) LIMIT 1"), {"tenant_id": tenant_id, "username": username}).mappings().first() if tenant_id and username else None
    if not row: raise HTTPException(status_code=403, detail="Usuario no pertenece al tenant autenticado.")
    return tenant_id, str(row["role"]), int(row["id"])


def _docente_alcanza(db: Session, tenant_id: str, docente_id: int, seccion_id: int) -> bool:
    return db.execute(text("SELECT 1 FROM asignaciones_docente WHERE tenant_id::text=:tenant_id AND docente_id=:docente_id AND seccion_id=:seccion_id AND activo IS TRUE LIMIT 1"), {"tenant_id": tenant_id, "docente_id": docente_id, "seccion_id": seccion_id}).first() is not None


def _autorizar_gestion(db: Session, tenant_id: str, role: str, actor_id: int, seccion_id: int) -> None:
    if role in {"ADMIN", "DIRECTOR"}: return
    if role != "DOCENTE" or not _docente_alcanza(db, tenant_id, actor_id, seccion_id):
        raise HTTPException(status_code=403, detail="El docente no tiene alcance sobre la sección del estudiante.")


def _autorizar_lectura(role: str) -> None:
    if role not in {"ADMIN", "DIRECTOR", "DOCENTE", "ESTUDIANTE"}:
        raise HTTPException(status_code=403, detail="Rol no autorizado para incidencias.")


def _validar_responsable(db: Session, tenant_id: str, responsable_id: int, seccion_id: int) -> None:
    row = db.execute(text("SELECT UPPER(role) role FROM usuarios WHERE tenant_id::text=:tenant_id AND id=:id LIMIT 1"), {"tenant_id": tenant_id, "id": responsable_id}).mappings().first()
    if not row or row["role"] != "DOCENTE" or not _docente_alcanza(db, tenant_id, responsable_id, seccion_id):
        raise HTTPException(status_code=422, detail="El responsable debe ser docente con asignación activa en la sección.")


SELECT_INCIDENCIA = """
 SELECT i.*, e.username estudiante_username, r.username responsable_username,
        s.nombre seccion_nombre, p.nombre periodo_nombre,
        aa.id asistencia_id, aa.estado asistencia_estado_original,
        ja.id justificacion_id, ja.estado justificacion_estado,
        (SELECT row_to_json(x) FROM (SELECT at.id, at.tipo, at.descripcion, at.fecha, at.observacion, at.responsable_id FROM acciones_tutoriales at WHERE at.tenant_id=i.tenant_id AND at.incidencia_id=i.id ORDER BY at.fecha DESC, at.id DESC LIMIT 1) x) ultima_accion
 FROM incidencias_academicas i
 JOIN usuarios e ON e.id=i.estudiante_id AND e.tenant_id=i.tenant_id
 JOIN usuarios r ON r.id=i.responsable_id AND r.tenant_id=i.tenant_id
 JOIN secciones_academicas s ON s.id=i.seccion_id AND s.tenant_id=i.tenant_id
 JOIN periodos_academicos p ON p.id=i.periodo_id AND p.tenant_id=i.tenant_id
 LEFT JOIN asistencias_academicas aa ON i.origen='ASISTENCIA' AND i.referencia_origen=('ASISTENCIA-'||aa.id) AND aa.tenant_id=i.tenant_id
 LEFT JOIN justificaciones_asistencia ja ON ja.asistencia_id=aa.id AND ja.tenant_id=aa.tenant_id
"""


def _incidencia(db: Session, tenant_id: str, incidencia_id: int) -> dict:
    row = db.execute(text(SELECT_INCIDENCIA + " WHERE i.id=:id AND i.tenant_id::text=:tenant_id LIMIT 1"), {"id": incidencia_id, "tenant_id": tenant_id}).mappings().first()
    if not row: raise HTTPException(status_code=404, detail="Incidencia no encontrada en el tenant actual.")
    return dict(row)


def _alcance_origen(db: Session, tenant_id: str, body: IncidenciaCreate) -> tuple[int, int, int]:
    if body.origen == "ASISTENCIA":
        if not body.referencia_origen or not body.referencia_origen.startswith("ASISTENCIA-"):
            raise HTTPException(status_code=422, detail="Referencia de asistencia inválida.")
        try: asistencia_id = int(body.referencia_origen.split("-", 1)[1])
        except ValueError: raise HTTPException(status_code=422, detail="Referencia de asistencia inválida.")
        row = db.execute(text("""
          SELECT aa.estudiante_id, a.seccion_id, s.periodo_id FROM asistencias_academicas aa
          JOIN sesiones_asistencia sa ON sa.id=aa.sesion_id AND sa.tenant_id=aa.tenant_id
          JOIN horarios_academicos h ON h.id=sa.horario_id AND h.tenant_id=sa.tenant_id
          JOIN asignaciones_docente a ON a.id=h.asignacion_id AND a.tenant_id=h.tenant_id
          JOIN secciones_academicas s ON s.id=a.seccion_id AND s.tenant_id=a.tenant_id
          WHERE aa.id=:id AND aa.tenant_id::text=:tenant_id LIMIT 1
        """), {"id": asistencia_id, "tenant_id": tenant_id}).mappings().first()
        if not row or int(row["estudiante_id"]) != body.estudiante_id: raise HTTPException(status_code=422, detail="La referencia no corresponde al estudiante.")
        return int(row["estudiante_id"]), int(row["seccion_id"]), int(row["periodo_id"])
    row = db.execute(text("""
      SELECT m.estudiante_id, m.seccion_id, s.periodo_id FROM matriculas m
      JOIN secciones_academicas s ON s.id=m.seccion_id AND s.tenant_id=m.tenant_id
      WHERE m.tenant_id::text=:tenant_id AND m.estudiante_id=:estudiante_id AND m.activo IS TRUE LIMIT 1
    """), {"tenant_id": tenant_id, "estudiante_id": body.estudiante_id}).mappings().first()
    if not row: raise HTTPException(status_code=422, detail="Estudiante sin matrícula activa.")
    return int(row["estudiante_id"]), int(row["seccion_id"]), int(row["periodo_id"])


def _vista(row: dict, role: str) -> dict:
    if role != "ESTUDIANTE": return row
    return {key: row.get(key) for key in ("id", "tipo", "categoria", "origen", "referencia_origen", "estado", "created_at", "updated_at", "cerrado_at")}


@router.post("", status_code=201)
def crear_incidencia(body: IncidenciaCreate, request: Request, db: Session = Depends(get_db)):
    tenant_id, role, actor_id = _contexto(request, db)
    if role not in {"ADMIN", "DIRECTOR", "DOCENTE"}: raise HTTPException(status_code=403, detail="Rol sin permiso para crear incidencias.")
    estudiante_id, seccion_id, periodo_id = _alcance_origen(db, tenant_id, body)
    _autorizar_gestion(db, tenant_id, role, actor_id, seccion_id)
    _validar_responsable(db, tenant_id, body.responsable_id, seccion_id)
    try:
        row = db.execute(text("""
          INSERT INTO incidencias_academicas (tenant_id,estudiante_id,seccion_id,periodo_id,tipo,categoria,descripcion,origen,referencia_origen,registrado_por,responsable_id,historial)
          VALUES (CAST(:tenant_id AS uuid),:estudiante_id,:seccion_id,:periodo_id,:tipo,:categoria,:descripcion,:origen,:referencia,:actor_id,:responsable_id,
            jsonb_build_array(jsonb_build_object('estado','ABIERTA','observacion','Incidencia registrada','actor_id',:actor_id,'fecha',now()))) RETURNING id
        """), {"tenant_id": tenant_id, "estudiante_id": estudiante_id, "seccion_id": seccion_id, "periodo_id": periodo_id, "tipo": body.tipo, "categoria": body.categoria, "descripcion": body.descripcion, "origen": body.origen, "referencia": body.referencia_origen, "actor_id": actor_id, "responsable_id": body.responsable_id}).first()
        db.commit()
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail={"code":"INCIDENCIA_ORIGEN_DUPLICADO"})
    return _incidencia(db, tenant_id, int(row[0]))


def _filtros_scope(role: str):
    filtros = ["i.tenant_id::text=:tenant_id", "(:estado IS NULL OR i.estado=:estado)", "(:tipo IS NULL OR i.tipo=:tipo)", "(:estudiante_id IS NULL OR i.estudiante_id=:estudiante_id)", "(:seccion_id IS NULL OR i.seccion_id=:seccion_id)", "(:periodo_id IS NULL OR i.periodo_id=:periodo_id)"]
    if role == "DOCENTE": filtros.append("EXISTS (SELECT 1 FROM asignaciones_docente ad WHERE ad.tenant_id=i.tenant_id AND ad.docente_id=:actor_id AND ad.seccion_id=i.seccion_id AND ad.activo IS TRUE)")
    if role == "ESTUDIANTE": filtros.append("i.estudiante_id=:actor_id")
    return filtros


@router.get("")
def listar_incidencias(request: Request, estado: Optional[str] = None, tipo: Optional[str] = None, estudiante_id: Optional[int] = Query(None, gt=0), seccion_id: Optional[int] = Query(None, gt=0), periodo_id: Optional[int] = Query(None, gt=0), db: Session = Depends(get_db)):
    tenant_id, role, actor_id = _contexto(request, db)
    _autorizar_lectura(role)
    estado = _normalizar(estado) if estado else None
    if estado and estado not in ESTADOS: raise HTTPException(status_code=422, detail="Estado no permitido.")
    tipo = _normalizar(tipo) if tipo else None
    if tipo and tipo not in TIPOS: raise HTTPException(status_code=422, detail="Tipo no permitido.")
    if role == "ESTUDIANTE" and estudiante_id not in {None, actor_id}: raise HTTPException(status_code=403, detail="El estudiante solo consulta sus incidencias.")
    params={"tenant_id":tenant_id,"actor_id":actor_id,"estado":estado,"tipo":tipo,"estudiante_id":estudiante_id,"seccion_id":seccion_id,"periodo_id":periodo_id}
    rows=db.execute(text(SELECT_INCIDENCIA+" WHERE "+" AND ".join(_filtros_scope(role))+" ORDER BY i.created_at DESC,i.id DESC"),params).mappings().all()
    return [_vista(dict(row), role) for row in rows]


@router.get("/reportes")
def reporte_incidencias(request: Request, estado: Optional[str] = None, tipo: Optional[str] = None, estudiante_id: Optional[int] = Query(None, gt=0), seccion_id: Optional[int] = Query(None, gt=0), periodo_id: Optional[int] = Query(None, gt=0), db: Session = Depends(get_db)):
    tenant_id, role, actor_id = _contexto(request, db)
    _autorizar_lectura(role)
    estado = _normalizar(estado) if estado else None
    tipo = _normalizar(tipo) if tipo else None
    if estado and estado not in ESTADOS: raise HTTPException(status_code=422, detail="Estado no permitido.")
    if tipo and tipo not in TIPOS: raise HTTPException(status_code=422, detail="Tipo no permitido.")
    if role == "ESTUDIANTE" and estudiante_id not in {None, actor_id}: raise HTTPException(status_code=403, detail="El estudiante solo consulta su reporte.")
    params={"tenant_id":tenant_id,"actor_id":actor_id,"estado":estado,"tipo":tipo,"estudiante_id":estudiante_id,"seccion_id":seccion_id,"periodo_id":periodo_id}
    filtros=_filtros_scope(role)
    rows=[dict(row) for row in db.execute(text(SELECT_INCIDENCIA+" WHERE "+" AND ".join(filtros)+" ORDER BY i.created_at DESC"),params).mappings().all()]
    dashboard={"abiertas":sum(x["estado"]=="ABIERTA" for x in rows),"en_seguimiento":sum(x["estado"]=="EN_SEGUIMIENTO" for x in rows),"cerradas":sum(x["estado"]=="CERRADA" for x in rows),"asistencia":sum(x["tipo"]=="ASISTENCIA" for x in rows),"academicas":sum(x["tipo"]=="ACADEMICA" for x in rows),"convivencia":sum(x["tipo"]=="CONVIVENCIA" for x in rows),"tutoria":sum(x["tipo"]=="TUTORIA" for x in rows),"estudiantes_seguimiento_activo":len({x["estudiante_id"] for x in rows if x["estado"]!="CERRADA"})}
    return {"dashboard":dashboard,"filas":[_vista(x,role) for x in rows]}


@router.get("/catalogos")
def catalogos_incidencias(request: Request, db: Session = Depends(get_db)):
    tenant_id, role, actor_id = _contexto(request, db)
    if role not in {"ADMIN", "DIRECTOR", "DOCENTE"}:
        raise HTTPException(status_code=403, detail="Rol sin acceso a catálogos de gestión.")
    docente_scope = actor_id if role == "DOCENTE" else None
    params = {"tenant_id": tenant_id, "docente_scope": docente_scope}
    secciones = db.execute(text("""
      SELECT DISTINCT s.id, s.nombre, s.periodo_id, s.grado_id
      FROM secciones_academicas s
      LEFT JOIN asignaciones_docente ad ON ad.tenant_id=s.tenant_id AND ad.seccion_id=s.id AND ad.activo IS TRUE
      WHERE s.tenant_id::text=:tenant_id AND s.activo IS TRUE
        AND (:docente_scope IS NULL OR ad.docente_id=:docente_scope)
      ORDER BY s.nombre, s.id
    """), params).mappings().all()
    estudiantes = db.execute(text("""
      SELECT DISTINCT u.id, COALESCE(e.nombre,u.username) nombre, u.username, m.seccion_id
      FROM matriculas m
      JOIN usuarios u ON u.id=m.estudiante_id AND u.tenant_id=m.tenant_id
      LEFT JOIN estudiantes e ON e.id=u.id AND e.tenant_id=u.tenant_id
      LEFT JOIN asignaciones_docente ad ON ad.tenant_id=m.tenant_id AND ad.seccion_id=m.seccion_id AND ad.activo IS TRUE
      WHERE m.tenant_id::text=:tenant_id AND m.activo IS TRUE
        AND (:docente_scope IS NULL OR ad.docente_id=:docente_scope)
      ORDER BY nombre, u.id
    """), params).mappings().all()
    responsables = db.execute(text("""
      SELECT DISTINCT u.id, u.username, ad.seccion_id
      FROM usuarios u
      JOIN asignaciones_docente ad ON ad.tenant_id=u.tenant_id AND ad.docente_id=u.id AND ad.activo IS TRUE
      WHERE u.tenant_id::text=:tenant_id AND UPPER(u.role)='DOCENTE'
        AND (:docente_scope IS NULL OR ad.docente_id=:docente_scope)
      ORDER BY u.username, u.id, ad.seccion_id
    """), params).mappings().all()
    return {"estudiantes": list(estudiantes), "secciones": list(secciones), "responsables": list(responsables)}


@router.get("/sugerencias")
def sugerencias(request: Request, db: Session = Depends(get_db)):
    reporte=reporte_asistencia(request,None,None,None,None,db)
    asistencia=[{"estudiante_id":x["estudiante_id"],"asignacion_id":x["asignacion_id"],"alerta":x["alerta"],"accion":"CREAR_INCIDENCIA","requiere_decision_humana":True} for x in reporte["filas"] if x["alerta"] in {"ATENCION","CRITICO"}]
    return {"asistencia":asistencia,"aula_virtual":{"estados_sugeridos":["ACOMPANAMIENTO_REQUERIDO","RETROCESO","ESTANCAMIENTO"],"accion":"CREAR_INCIDENCIA","creacion_automatica":False}}


@router.get("/{incidencia_id}")
def detalle_incidencia(incidencia_id: int, request: Request, db: Session = Depends(get_db)):
    tenant_id, role, actor_id=_contexto(request,db); row=_incidencia(db,tenant_id,incidencia_id)
    _autorizar_lectura(role)
    if role=="DOCENTE": _autorizar_gestion(db,tenant_id,role,actor_id,row["seccion_id"])
    if role=="ESTUDIANTE" and row["estudiante_id"]!=actor_id: raise HTTPException(status_code=403,detail="Incidencia ajena.")
    return _vista(row,role)


@router.post("/{incidencia_id}/acciones", status_code=201)
def crear_accion(incidencia_id:int,body:AccionTutorialCreate,request:Request,db:Session=Depends(get_db)):
    tenant_id,role,actor_id=_contexto(request,db); inc=_incidencia(db,tenant_id,incidencia_id); _autorizar_gestion(db,tenant_id,role,actor_id,inc["seccion_id"]); _validar_responsable(db,tenant_id,body.responsable_id,inc["seccion_id"])
    if inc["estado"]=="CERRADA": raise HTTPException(status_code=409,detail="La incidencia está cerrada.")
    row=db.execute(text("""INSERT INTO acciones_tutoriales (tenant_id,incidencia_id,tipo,descripcion,fecha,responsable_id,observacion) VALUES (CAST(:tenant_id AS uuid),:incidencia_id,:tipo,:descripcion,:fecha,:responsable_id,:observacion) RETURNING id,tipo,descripcion,fecha,responsable_id,observacion,created_at"""),{"tenant_id":tenant_id,"incidencia_id":incidencia_id,**body.model_dump()}).mappings().first(); db.commit(); return dict(row)


@router.get("/{incidencia_id}/acciones")
def listar_acciones(incidencia_id:int,request:Request,db:Session=Depends(get_db)):
    tenant_id,role,actor_id=_contexto(request,db); inc=_incidencia(db,tenant_id,incidencia_id)
    _autorizar_lectura(role)
    if role=="DOCENTE": _autorizar_gestion(db,tenant_id,role,actor_id,inc["seccion_id"])
    if role=="ESTUDIANTE" and inc["estudiante_id"]!=actor_id: raise HTTPException(status_code=403,detail="Incidencia ajena.")
    rows=db.execute(text("SELECT id,tipo,descripcion,fecha,responsable_id,observacion,created_at FROM acciones_tutoriales WHERE tenant_id::text=:tenant_id AND incidencia_id=:id ORDER BY fecha,id"),{"tenant_id":tenant_id,"id":incidencia_id}).mappings().all()
    return [{"id":x["id"],"tipo":x["tipo"],"descripcion":x["descripcion"],"fecha":x["fecha"]} if role=="ESTUDIANTE" else dict(x) for x in rows]


@router.patch("/{incidencia_id}/estado")
def cambiar_estado(incidencia_id:int,body:EstadoIncidenciaUpdate,request:Request,db:Session=Depends(get_db)):
    tenant_id,role,actor_id=_contexto(request,db); inc=_incidencia(db,tenant_id,incidencia_id); _autorizar_gestion(db,tenant_id,role,actor_id,inc["seccion_id"])
    if body.estado not in TRANSICIONES[inc["estado"]]: raise HTTPException(status_code=409,detail={"code":"TRANSICION_INVALIDA","actual":inc["estado"],"destino":body.estado})
    db.execute(text("""UPDATE incidencias_academicas SET estado=:estado, motivo_cierre=CASE WHEN :estado='CERRADA' THEN :observacion ELSE motivo_cierre END, cerrado_at=CASE WHEN :estado='CERRADA' THEN now() ELSE cerrado_at END, historial=historial||jsonb_build_array(jsonb_build_object('estado',:estado,'observacion',:observacion,'actor_id',:actor_id,'fecha',now())),updated_at=now() WHERE id=:id AND tenant_id::text=:tenant_id"""),{"estado":body.estado,"observacion":body.observacion,"actor_id":actor_id,"id":incidencia_id,"tenant_id":tenant_id}); db.commit(); return _incidencia(db,tenant_id,incidencia_id)
