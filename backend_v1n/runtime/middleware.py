"""
ERP Educativo Multi-Tenant — middleware.py
Adaptado al stack real: SQLAlchemy + python-jose + ServiceFactory.
Coloca este archivo en: /home/diegoferre/api-v2/middleware.py
"""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict
from typing import Callable, Optional

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

PUBLIC_PATHS: set[str] = {
    "/claude/analyze",
    "/integracion-ia/claude/analyze",
        "/integracion-ia/evaluaciones",
        "/integracion-ia/n8n/callback",
        "/integracion-ia/n8n/webhook",
        "/integracion-ia/ollama/analyze",
    "/", "/health", "/docs", "/redoc", "/openapi.json",
    "/auth/register", "/auth/login",
    "/webhooks/whatsapp", "/webhooks/twilio",
    "/integraciones/mercadopago/webhook",
}

def _is_public(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    for prefix in ("/static/", "/favicon"):
        if path.startswith(prefix):
            return True
    return False

def _json_error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "code": code, "message": message},
    )


# ==============================================================================
# 1. TENANT MIDDLEWARE
# ==============================================================================

class TenantMiddleware(BaseHTTPMiddleware):
    """
    Decodifica el JWT en cada request e inyecta en request.state:
        - tenant_id      (uuid.UUID)
        - institucion_id (uuid.UUID)
        - current_user   (dict con payload completo)
    Usa el mismo JWT_SECRET que JWTTokenService.
    """

    def __init__(self, app: ASGIApp, jwt_secret: str, algorithm: str = "HS256"):
        super().__init__(app)
        self.jwt_secret = jwt_secret
        self.algorithm  = algorithm

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)
        # El registro conserva el auto-registro legacy cuando no trae
        # credenciales, pero debe consumir un Bearer JWT cuando se usa para
        # crear roles privilegiados.  Antes esta ruta siempre quedaba sin
        # current_user, incluso con Authorization presente.
        if _is_public(request.url.path) and not (
            request.url.path == "/auth/register" and self._extract_token(request)
        ):
            request.state.tenant_id      = None
            request.state.institucion_id = None
            request.state.current_user   = None
            return await call_next(request)

        token = self._extract_token(request)
        if not token:
            return _json_error(401, "UNAUTHORIZED", "Token de autenticación no proporcionado.")

        payload = self._decode(token)
        if payload is None:
            return _json_error(401, "INVALID_TOKEN", "Token inválido o expirado.")

        request.state.current_user   = payload
        request.state.tenant_id      = self._to_uuid(payload.get("tenant_id"))
        request.state.institucion_id = self._to_uuid(payload.get("institucion_id"))
        return await call_next(request)

    def _extract_token(self, request: Request) -> Optional[str]:
        auth = request.headers.get("Authorization", "")

        # seguridad-auth-header-no-log-v1

        if auth.lower().startswith("bearer "):
            return auth[7:].strip()

        return request.cookies.get("access_token")

    def _decode(self, token: str) -> Optional[dict]:
        try:
            from jose import jwt
            return jwt.decode(token, self.jwt_secret, algorithms=[self.algorithm])
        except Exception as exc:
            logger.warning("Token inválido en TenantMiddleware: %s", exc)
            return None

    @staticmethod
    def _to_uuid(value: Optional[str]) -> Optional[uuid.UUID]:
        if not value:
            return None
        try:
            return uuid.UUID(str(value))
        except ValueError:
            return None


# ==============================================================================
# 2. SECURITY HEADERS
# ==============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    HEADERS = {
        "X-Content-Type-Options":    "nosniff",
        "X-Frame-Options":           "DENY",
        "X-XSS-Protection":          "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Referrer-Policy":           "strict-origin-when-cross-origin",
        "Permissions-Policy":        "geolocation=(), microphone=(), camera=()",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        for header, value in self.HEADERS.items():
            response.headers[header] = value
        return response


# ==============================================================================
# 3. RATE LIMIT
# ==============================================================================

import asyncio
_store: dict = defaultdict(lambda: {"count": 0, "window_start": 0.0})
_lock = asyncio.Lock()
RATE_LIMITS = {
    "login":  (10,  60),
    "ip":     (200, 60),
    "tenant": (500, 60),
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        now  = time.time()
        ip   = request.client.host if request.client else "unknown"
        kind = "login" if "login" in request.url.path else "ip"
        max_r, win = RATE_LIMITS[kind]

        if await self._limited(f"{kind}:{ip}", max_r, win, now):
            return _json_error(429, "RATE_LIMIT", f"Límite: {max_r} req/min.")

        tenant_id = getattr(request.state, "tenant_id", None)
        if tenant_id:
            t_max, t_win = RATE_LIMITS["tenant"]
            if await self._limited(f"tenant:{tenant_id}", t_max, t_win, now):
                return _json_error(429, "TENANT_RATE_LIMIT", "Límite por institución alcanzado.")

        return await call_next(request)

    async def _limited(self, key: str, max_r: int, win: int, now: float) -> bool:
        try:
            from app.core.redis_client import get_redis
            r = await get_redis()
            pipe = r.pipeline()
            rkey = f"rl:{key}"
            await pipe.incr(rkey)
            await pipe.expire(rkey, win)
            results = await pipe.execute()
            return results[0] > max_r
        except Exception:
            # Fallback a dict en memoria si Redis no está disponible
            async with _lock:
                rec = _store[key]
                if now - rec["window_start"] > win:
                    rec["count"] = 0
                    rec["window_start"] = now
                rec["count"] += 1
                return rec["count"] > max_r


# ==============================================================================
# 4. AUDIT
# ==============================================================================

_SKIP_METHODS  = {"GET", "HEAD", "OPTIONS"}
_SKIP_PREFIXES = ("/health", "/docs", "/redoc", "/openapi", "/static")

class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method in _SKIP_METHODS:
            return await call_next(request)
        if any(request.url.path.startswith(p) for p in _SKIP_PREFIXES):
            return await call_next(request)

        start    = time.perf_counter()
        response = await call_next(request)
        ms       = round((time.perf_counter() - start) * 1000, 1)

        user      = getattr(request.state, "current_user", None) or {}
        tenant_id = getattr(request.state, "tenant_id", "—")

        logger.info(
            "AUDIT | %s %s | status=%s | user=%s | rol=%s | tenant=%s | ms=%s",
            request.method, request.url.path, response.status_code,
            user.get("sub", "anon"), user.get("role", "—"), tenant_id, ms,
        )
        return response


# ==============================================================================
# 5. TIMING
# ==============================================================================

class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start    = time.perf_counter()
        response = await call_next(request)
        ms       = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Process-Time-Ms"] = str(ms)
        return response


# ==============================================================================
# 6. ERROR HANDLER
# ==============================================================================

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception("Error no manejado | %s %s | %s",
                             request.method, request.url.path, exc)
            return _json_error(500, "INTERNAL_ERROR",
                               "Error interno del servidor. Contacte al administrador.")


# ==============================================================================
# 7. HELPERS
# ==============================================================================

def get_tenant_id(request: Request) -> Optional[uuid.UUID]:
    """
    Usa en controllers:
        tenant_id = get_tenant_id(request)
    """
    return getattr(request.state, "tenant_id", None)

def require_tenant(request: Request) -> uuid.UUID:
    tid = get_tenant_id(request)
    if not tid:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Tenant no autenticado.")
    return tid


# ==============================================================================
# 8. RLS SQL — ejecutar una vez en PostgreSQL como superusuario
# ==============================================================================

RLS_SETUP_SQL = """
ALTER TABLE usuarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

ALTER TABLE usuarios    FORCE ROW LEVEL SECURITY;
ALTER TABLE estudiantes FORCE ROW LEVEL SECURITY;
ALTER TABLE asistencias FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON usuarios
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON estudiantes
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY tenant_isolation ON asistencias
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE OR REPLACE FUNCTION set_tenant(tid uuid) RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tid::text, true);
END;
$$ LANGUAGE plpgsql;
"""


# ==============================================================================
# 9. REGISTRO PRINCIPAL
# ==============================================================================

def registrar_middlewares(app, jwt_secret: str, algorithm: str = "HS256") -> None:
    """
    Llamar en main.py:
        from middleware import registrar_middlewares
        registrar_middlewares(app, jwt_secret=os.getenv("JWT_SECRET"))

    Orden de ejecución (inverso al de registro):
        1. ErrorHandler
        2. SecurityHeaders
        3. Timing
        4. RateLimit
        5. Tenant   ← inyecta tenant del JWT
        6. Audit
    """
    app.add_middleware(AuditMiddleware)
    app.add_middleware(TenantMiddleware, jwt_secret=jwt_secret, algorithm=algorithm)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(TimingMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(ErrorHandlerMiddleware)
