"""
Punto de entrada — cablea todo con factories.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.redis_client import get_redis, close_redis
from app.core.tenant import tenant_middleware
from infrastructure.database import SQLDatabaseConnection
from infrastructure.orm_models import Base
from middleware import registrar_middlewares

from controllers.controllers import (
    AuthController,
    EstudianteController,
    AsistenciaController,
    ReporteController,
)
from controllers.notification_controller import NotificacionController
from controllers.kpi_controller import KPIController
from controllers.finanzas_controller import FinanzasController
from controllers import finanzas_integraciones_controller
from controllers.ia_config_controller import IAConfigController
from controllers import (
    aula_virtual_controller,
    aula_virtual_dua_controller,
    aula_virtual_reportes_controller,
    asignaciones_docente_controller,
    cursos_controller,
    docentes_controller,
    estudiantes_controller,
    grados_controller,
    instituciones_controller,
    integracion_ia_controller,
    matriculas_controller,
    niveles_educativos_controller,
    periodos_academicos_controller,
    horarios_academicos_controller,
    asistencia_academica_controller,
    incidencias_academicas_controller,
    apoderados_comunicacion_controller,
    permisos_controller,
    rol_permisos_controller,
    roles_controller,
    secciones_controller,
    tenants_controller,
    usuario_roles_controller,
    usuarios_controller,
)

db = SQLDatabaseConnection.get_instance()
Base.metadata.create_all(bind=db.engine)


@asynccontextmanager
async def lifespan(app):
    r = await get_redis()
    await r.ping()
    print("Redis conectado")
    yield
    await close_redis()


app = FastAPI(
    title="API Asistencia Escolar",
    description="Arquitectura en capas con SOLID + DI + Factories + Multi-Tenant",
    version="2.0.0",
    lifespan=lifespan,
)


# ===== CORS EVOLONLINE =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://evolonline.online",
        "https://www.evolonline.online",
        "https://api.evolonline.online",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ===== FIN CORS EVOLONLINE =====



app.middleware("http")(tenant_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Desarrollo local
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:3000",
        "https://localhost:3000",
        # Acceso directo por IP
        "http://72.60.48.36:5173",
        "https://72.60.48.36:5173",
        "http://72.60.48.36:3000",
        "https://72.60.48.36:3000",
        # Producción — ajustar si el frontend tiene su propio subdominio
        "https://evolonline.online",
        "https://www.evolonline.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_middlewares(app, jwt_secret=os.getenv("JWT_SECRET", "cambiar-en-produccion"))

auth_controller         = AuthController()
estudiante_controller   = EstudianteController()
asistencia_controller   = AsistenciaController()
reporte_controller      = ReporteController()
notificacion_controller = NotificacionController()
kpi_controller          = KPIController()
finanzas_controller     = FinanzasController()
ia_config_controller   = IAConfigController()


# ===== COMPATIBILIDAD AULA VIRTUAL FRONTEND =====
@app.get("/aula-virtual/tareas")
async def aula_virtual_tareas_compat():
    """
    Endpoint temporal de compatibilidad para el frontend antiguo.
    La nueva ruta UML real usa:
    /aula-virtual/unidades/{unidad_id}/bloques
    """
    return []
# ===== FIN COMPATIBILIDAD AULA VIRTUAL =====

app.include_router(auth_controller.router,         prefix="/auth",            tags=["Autenticacion"])
app.include_router(asistencia_controller.router,                               tags=["Asistencia"])
app.include_router(reporte_controller.router,                                  tags=["Reportes"])
app.include_router(notificacion_controller.router, prefix="/notificaciones",   tags=["Notificaciones"])
app.include_router(kpi_controller.router,          prefix="/dashboard",        tags=["Dashboard KPIs"])
app.include_router(finanzas_controller.router,     prefix="/finanzas",         tags=["Finanzas"])
app.include_router(finanzas_integraciones_controller.router, tags=["Finanzas V1N"])
app.include_router(estudiantes_controller.router)
app.include_router(roles_controller.router)
app.include_router(permisos_controller.router)
app.include_router(rol_permisos_controller.router)
app.include_router(usuario_roles_controller.router)
app.include_router(tenants_controller.router)
app.include_router(instituciones_controller.router)
app.include_router(niveles_educativos_controller.router)
app.include_router(docentes_controller.router)
app.include_router(matriculas_controller.router)
app.include_router(asignaciones_docente_controller.router)
app.include_router(cursos_controller.router)
app.include_router(aula_virtual_controller.router)
app.include_router(aula_virtual_reportes_controller.router)

# ===== DUA API V1: CONFIGURACIÓN POR BLOQUE =====
# Marcador: dua-api-v1-router-registration-v1
app.include_router(aula_virtual_dua_controller.router)
# ===== FIN DUA API V1 =====
app.include_router(secciones_controller.router)
app.include_router(grados_controller.router)
app.include_router(periodos_academicos_controller.router)
app.include_router(horarios_academicos_controller.router)
app.include_router(asistencia_academica_controller.router)
app.include_router(incidencias_academicas_controller.router)
app.include_router(apoderados_comunicacion_controller.router)
app.include_router(usuarios_controller.router)
app.include_router(integracion_ia_controller.router)
app.include_router(ia_config_controller.router, prefix="/ia", tags=["IA Config"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def home():
    return {"mensaje": "API Asistencia v2.0 - arquitectura SOLID + Multi-Tenant"}

# ── Handler HTTP exceptions con CORS garantizado ─────────────────────────────
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException

CORS_ORIGINS_LIST = [
    "http://72.60.48.36:3000",
    "http://72.60.48.36",
    "http://localhost:3000",
    "https://evolonline.online",
]

@app.exception_handler(StarletteHTTPException)
async def http_exception_cors_handler(request, exc):
    from fastapi.responses import JSONResponse
    origin = request.headers.get("origin", "*")
    allowed = origin if origin in CORS_ORIGINS_LIST else "*"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin":      allowed,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods":     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            "Access-Control-Allow-Headers":     "*",
        }
    )


# ===== CORS GLOBAL AULA VIRTUAL DEFINITIVO =====
from starlette.responses import Response as _AulaCorsResponse

_AULA_CORS_ALLOWED_ORIGINS = {
    "https://evolonline.online",
    "https://www.evolonline.online",
    "https://api.evolonline.online",
    "http://evolonline.online",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://72.60.48.36",
    "http://72.60.48.36:3000",
}

@app.middleware("http")
async def _aula_virtual_force_cors(request, call_next):
    origin = request.headers.get("origin")
    allow_origin = origin if origin in _AULA_CORS_ALLOWED_ORIGINS else "https://evolonline.online"

    cors_headers = {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": request.headers.get(
            "access-control-request-headers",
            "Authorization,Content-Type,X-Tenant"
        ),
        "Access-Control-Expose-Headers": "*",
        "Access-Control-Max-Age": "86400",
    }

    if request.method == "OPTIONS":
        return _AulaCorsResponse(status_code=204, headers=cors_headers)

    response = await call_next(request)

    for key, value in cors_headers.items():
        response.headers[key] = value

    return response
# ===== FIN CORS GLOBAL AULA VIRTUAL DEFINITIVO =====
