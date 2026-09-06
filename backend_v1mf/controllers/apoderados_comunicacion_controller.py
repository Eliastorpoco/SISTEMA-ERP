from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(tags=["Apoderados y Comunicación Institucional"])
ORIGENES={"ASISTENCIA","JUSTIFICACION","INCIDENCIA","TUTORIA","ACADEMICO","MANUAL"}
ESTADOS={"PENDIENTE","ENVIADA","ENTREGADA","LEIDA","ERROR"}


class ApoderadoCreate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    nombre:str; documento:str; email:EmailStr; telefono:Optional[str]=None; activo:bool=True


class ApoderadoUpdate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    nombre:Optional[str]=None; email:Optional[EmailStr]=None; telefono:Optional[str]=None; activo:Optional[bool]=None


class RelacionCreate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    apoderado_id:int; parentesco:str="APODERADO"; principal:bool=False; activo:bool=True


class ComunicacionCreate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    estudiante_id:int; apoderado_id:int; origen:str; referencia_origen:str; asunto:str; mensaje:str; canal:str="EMAIL"
    @field_validator("origen")
    @classmethod
    def origen_valido(cls,value):
        value=value.strip().upper().replace("Ó","O")
        if value not in ORIGENES: raise ValueError("Origen no permitido.")
        return value
    @field_validator("canal")
    @classmethod
    def canal_valido(cls,value):
        if value.strip().upper()!="EMAIL": raise ValueError("Solo EMAIL está habilitado en sandbox institucional.")
        return "EMAIL"
    @field_validator("referencia_origen","asunto","mensaje")
    @classmethod
    def texto_valido(cls,value):
        value=value.strip()
        if not value or len(value)>8000: raise ValueError("Texto obligatorio o demasiado extenso.")
        return value


class EstadoComunicacionUpdate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    estado:str; detalle:Optional[str]=None
    @field_validator("estado")
    @classmethod
    def estado_valido(cls,value):
        value=value.strip().upper()
        if value not in ESTADOS: raise ValueError("Estado no permitido.")
        return value


def _contexto(request:Request,db:Session):
    tenant=str(getattr(request.state,"tenant_id","") or ""); payload=getattr(request.state,"current_user",None) or {}; username=str(payload.get("sub") or "").strip()
    row=db.execute(text("SELECT id,UPPER(role) role FROM usuarios WHERE tenant_id::text=:tenant AND LOWER(username)=LOWER(:username) LIMIT 1"),{"tenant":tenant,"username":username}).mappings().first() if tenant and username else None
    if not row: raise HTTPException(status_code=403,detail="Usuario no pertenece al tenant autenticado.")
    return tenant,str(row["role"]),int(row["id"])


def _seccion_estudiante(db,tenant,estudiante_id):
    row=db.execute(text("SELECT m.seccion_id,s.periodo_id FROM matriculas m JOIN secciones_academicas s ON s.id=m.seccion_id AND s.tenant_id=m.tenant_id WHERE m.tenant_id::text=:tenant AND m.estudiante_id=:id AND m.activo IS TRUE LIMIT 1"),{"tenant":tenant,"id":estudiante_id}).mappings().first()
    if not row: raise HTTPException(status_code=422,detail="Estudiante sin matrícula activa.")
    return int(row["seccion_id"]),int(row["periodo_id"])


def _docente_alcanza(db,tenant,actor_id,seccion_id):
    return db.execute(text("SELECT 1 FROM asignaciones_docente WHERE tenant_id::text=:tenant AND docente_id=:actor AND seccion_id=:seccion AND activo IS TRUE LIMIT 1"),{"tenant":tenant,"actor":actor_id,"seccion":seccion_id}).first() is not None


def _autorizar_estudiante(db,tenant,role,actor_id,estudiante_id,gestion=False):
    seccion_id,_=_seccion_estudiante(db,tenant,estudiante_id)
    if role in {"ADMIN","DIRECTOR"}: return seccion_id
    if not gestion and role=="DOCENTE" and _docente_alcanza(db,tenant,actor_id,seccion_id): return seccion_id
    raise HTTPException(status_code=403,detail="Sin alcance sobre el estudiante.")


SELECT_APODERADO="""SELECT a.*,COALESCE((SELECT json_agg(json_build_object('id',ea.id,'estudiante_id',ea.estudiante_id,'parentesco',ea.parentesco,'principal',ea.principal,'activo',ea.activo) ORDER BY ea.id) FROM estudiante_apoderado ea WHERE ea.tenant_id=a.tenant_id AND ea.apoderado_id=a.id),'[]'::json) relaciones FROM apoderados a"""


@router.get("/apoderados")
def listar_apoderados(request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR","DOCENTE"}: raise HTTPException(status_code=403,detail="Rol no autorizado.")
    filtro="a.tenant_id::text=:tenant"
    if role=="DOCENTE": filtro+=" AND EXISTS (SELECT 1 FROM estudiante_apoderado ea JOIN matriculas m ON m.tenant_id=ea.tenant_id AND m.estudiante_id=ea.estudiante_id AND m.activo IS TRUE JOIN asignaciones_docente ad ON ad.tenant_id=m.tenant_id AND ad.seccion_id=m.seccion_id AND ad.docente_id=:actor AND ad.activo IS TRUE WHERE ea.tenant_id=a.tenant_id AND ea.apoderado_id=a.id AND ea.activo IS TRUE)"
    return [dict(x) for x in db.execute(text(SELECT_APODERADO+" WHERE "+filtro+" ORDER BY a.nombre,a.id"),{"tenant":tenant,"actor":actor}).mappings().all()]


@router.post("/apoderados",status_code=201)
def crear_apoderado(body:ApoderadoCreate,request:Request,db:Session=Depends(get_db)):
    tenant,role,_=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR"}: raise HTTPException(status_code=403,detail="Solo ADMIN/DIRECTOR gestiona apoderados.")
    try:
        row=db.execute(text("INSERT INTO apoderados (tenant_id,nombre,documento,email,telefono,activo) VALUES (CAST(:tenant AS uuid),:nombre,:documento,:email,:telefono,:activo) RETURNING id"),{"tenant":tenant,**body.model_dump(mode="json")}).first(); db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(status_code=409,detail={"code":"APODERADO_DOCUMENTO_DUPLICADO"})
    return dict(db.execute(text(SELECT_APODERADO+" WHERE a.tenant_id::text=:tenant AND a.id=:id"),{"tenant":tenant,"id":row[0]}).mappings().first())


@router.patch("/apoderados/{apoderado_id}")
def actualizar_apoderado(apoderado_id:int,body:ApoderadoUpdate,request:Request,db:Session=Depends(get_db)):
    tenant,role,_=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR"}: raise HTTPException(status_code=403,detail="Solo ADMIN/DIRECTOR gestiona apoderados.")
    changes=body.model_dump(exclude_unset=True,mode="json")
    if changes: db.execute(text("UPDATE apoderados SET "+", ".join(f"{x}=:{x}" for x in changes)+",updated_at=now() WHERE tenant_id::text=:tenant AND id=:id"),{**changes,"tenant":tenant,"id":apoderado_id}); db.commit()
    row=db.execute(text(SELECT_APODERADO+" WHERE a.tenant_id::text=:tenant AND a.id=:id"),{"tenant":tenant,"id":apoderado_id}).mappings().first()
    if not row: raise HTTPException(status_code=404,detail="Apoderado no encontrado.")
    return dict(row)


@router.get("/estudiantes/{estudiante_id}/apoderados")
def apoderados_estudiante(estudiante_id:int,request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db); _autorizar_estudiante(db,tenant,role,actor,estudiante_id,gestion=False)
    rows=db.execute(text("""SELECT ea.id relacion_id,ea.estudiante_id,ea.parentesco,ea.principal,ea.activo,a.id apoderado_id,a.nombre,a.documento,a.email,a.telefono,a.activo apoderado_activo FROM estudiante_apoderado ea JOIN apoderados a ON a.id=ea.apoderado_id AND a.tenant_id=ea.tenant_id WHERE ea.tenant_id::text=:tenant AND ea.estudiante_id=:id ORDER BY ea.principal DESC,ea.id"""),{"tenant":tenant,"id":estudiante_id}).mappings().all(); return [dict(x) for x in rows]


@router.post("/estudiantes/{estudiante_id}/apoderados",status_code=201)
def relacionar_apoderado(estudiante_id:int,body:RelacionCreate,request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db); _autorizar_estudiante(db,tenant,role,actor,estudiante_id,gestion=True)
    if not db.execute(text("SELECT 1 FROM apoderados WHERE tenant_id::text=:tenant AND id=:id AND activo IS TRUE"),{"tenant":tenant,"id":body.apoderado_id}).first(): raise HTTPException(status_code=422,detail="Apoderado no disponible en el tenant.")
    try:
        row=db.execute(text("INSERT INTO estudiante_apoderado (tenant_id,estudiante_id,apoderado_id,parentesco,principal,activo) VALUES (CAST(:tenant AS uuid),:estudiante,:apoderado_id,:parentesco,:principal,:activo) RETURNING id"),{"tenant":tenant,"estudiante":estudiante_id,**body.model_dump()}).first(); db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(status_code=409,detail={"code":"RELACION_APODERADO_DUPLICADA_O_PRINCIPAL_EXISTENTE"})
    return {"id":row[0],"estudiante_id":estudiante_id,**body.model_dump()}


SELECT_COMUNICACION="""SELECT c.*,e.username estudiante_username,a.nombre apoderado_nombre,a.email apoderado_email,u.username actor_username FROM comunicaciones_institucionales c JOIN usuarios e ON e.id=c.estudiante_id AND e.tenant_id=c.tenant_id JOIN apoderados a ON a.id=c.apoderado_id AND a.tenant_id=c.tenant_id JOIN usuarios u ON u.id=c.creado_por AND u.tenant_id=c.tenant_id"""


def _validar_origen(db,tenant,body):
    if body.origen=="INCIDENCIA":
        if not body.referencia_origen.startswith("INCIDENCIA-"): raise HTTPException(status_code=422,detail="Referencia de incidencia inválida.")
        try: ref=int(body.referencia_origen.split("-",1)[1])
        except ValueError: raise HTTPException(status_code=422,detail="Referencia de incidencia inválida.")
        row=db.execute(text("SELECT estudiante_id FROM incidencias_academicas WHERE tenant_id::text=:tenant AND id=:id LIMIT 1"),{"tenant":tenant,"id":ref}).first()
        if not row or int(row[0])!=body.estudiante_id: raise HTTPException(status_code=422,detail="La incidencia no corresponde al estudiante.")


@router.post("/comunicaciones-institucionales",status_code=201)
def crear_comunicacion(body:ComunicacionCreate,request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db); _autorizar_estudiante(db,tenant,role,actor,body.estudiante_id,gestion=False); _validar_origen(db,tenant,body)
    relation=db.execute(text("SELECT 1 FROM estudiante_apoderado ea JOIN apoderados a ON a.id=ea.apoderado_id AND a.tenant_id=ea.tenant_id WHERE ea.tenant_id::text=:tenant AND ea.estudiante_id=:estudiante AND ea.apoderado_id=:apoderado AND ea.activo IS TRUE AND a.activo IS TRUE LIMIT 1"),{"tenant":tenant,"estudiante":body.estudiante_id,"apoderado":body.apoderado_id}).first()
    if not relation: raise HTTPException(status_code=422,detail="El destinatario no es apoderado activo del estudiante.")
    try:
        row=db.execute(text("""INSERT INTO comunicaciones_institucionales (tenant_id,estudiante_id,apoderado_id,origen,referencia_origen,asunto,mensaje,canal,estado,modo_envio,creado_por,historial) VALUES (CAST(:tenant AS uuid),:estudiante_id,:apoderado_id,:origen,:referencia_origen,:asunto,:mensaje,:canal,'PENDIENTE','SANDBOX',:actor,jsonb_build_array(jsonb_build_object('estado','PENDIENTE','actor_id',:actor,'fecha',now(),'detalle','Creada en sandbox; sin envío externo'))) RETURNING id"""),{"tenant":tenant,"actor":actor,**body.model_dump()}).first(); db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(status_code=409,detail={"code":"COMUNICACION_ORIGEN_DUPLICADA"})
    return dict(db.execute(text(SELECT_COMUNICACION+" WHERE c.tenant_id::text=:tenant AND c.id=:id"),{"tenant":tenant,"id":row[0]}).mappings().first())


def _scope_comunicaciones(role,actor):
    if role=="DOCENTE": return "EXISTS (SELECT 1 FROM matriculas m JOIN asignaciones_docente ad ON ad.tenant_id=m.tenant_id AND ad.seccion_id=m.seccion_id AND ad.docente_id=:actor AND ad.activo IS TRUE WHERE m.tenant_id=c.tenant_id AND m.estudiante_id=c.estudiante_id AND m.activo IS TRUE)"
    return "TRUE"


@router.get("/comunicaciones-institucionales")
def listar_comunicaciones(request:Request,estudiante_id:Optional[int]=Query(None,gt=0),origen:Optional[str]=None,referencia_origen:Optional[str]=None,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR","DOCENTE"}: raise HTTPException(status_code=403,detail="Rol no autorizado.")
    rows=db.execute(text(SELECT_COMUNICACION+" WHERE c.tenant_id::text=:tenant AND (:estudiante IS NULL OR c.estudiante_id=:estudiante) AND (:origen IS NULL OR c.origen=:origen) AND (:referencia IS NULL OR c.referencia_origen=:referencia) AND "+_scope_comunicaciones(role,actor)+" ORDER BY c.created_at DESC,c.id DESC"),{"tenant":tenant,"actor":actor,"estudiante":estudiante_id,"origen":origen,"referencia":referencia_origen}).mappings().all(); return [dict(x) for x in rows]


@router.get("/comunicaciones-institucionales/reportes")
def reporte_comunicaciones(request:Request,estudiante_id:Optional[int]=Query(None,gt=0),db:Session=Depends(get_db)):
    rows=listar_comunicaciones(request,estudiante_id,None,None,db); estados={x:sum(r["estado"]==x for r in rows) for x in ESTADOS}; return {"dashboard":{"pendientes":estados["PENDIENTE"],"enviadas":estados["ENVIADA"],"entregadas":estados["ENTREGADA"],"leidas":estados["LEIDA"],"errores":estados["ERROR"]},"filas":rows}


@router.get("/comunicaciones-institucionales/{comunicacion_id}")
def detalle_comunicacion(comunicacion_id:int,request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR","DOCENTE"}: raise HTTPException(status_code=403,detail="Rol no autorizado.")
    row=db.execute(text(SELECT_COMUNICACION+" WHERE c.tenant_id::text=:tenant AND c.id=:id AND "+_scope_comunicaciones(role,actor)+" LIMIT 1"),{"tenant":tenant,"actor":actor,"id":comunicacion_id}).mappings().first()
    if not row: raise HTTPException(status_code=404,detail="Comunicación no encontrada.")
    return dict(row)


@router.patch("/comunicaciones-institucionales/{comunicacion_id}/estado")
def actualizar_estado(comunicacion_id:int,body:EstadoComunicacionUpdate,request:Request,db:Session=Depends(get_db)):
    tenant,role,actor=_contexto(request,db)
    if role not in {"ADMIN","DIRECTOR"}: raise HTTPException(status_code=403,detail="Solo ADMIN/DIRECTOR actualiza estados de entrega.")
    db.execute(text("""UPDATE comunicaciones_institucionales SET estado=:estado,enviado_at=CASE WHEN :estado IN ('ENVIADA','ENTREGADA','LEIDA') THEN COALESCE(enviado_at,now()) ELSE enviado_at END,leido_at=CASE WHEN :estado='LEIDA' THEN now() ELSE leido_at END,error=CASE WHEN :estado='ERROR' THEN :detalle ELSE error END,historial=historial||jsonb_build_array(jsonb_build_object('estado',:estado,'actor_id',:actor,'fecha',now(),'detalle',:detalle)),updated_at=now() WHERE tenant_id::text=:tenant AND id=:id"""),{"estado":body.estado,"detalle":body.detalle,"actor":actor,"tenant":tenant,"id":comunicacion_id}); db.commit(); return detalle_comunicacion(comunicacion_id,request,db)
