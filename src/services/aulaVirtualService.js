import {
  clearStoredSession,
  getStoredToken,
} from "../api/client";

// seguridad-aula-service-sin-login-demo-v1
const TENANT =
  "00000000-0000-0000-0000-000000000001";

function getApiBase(api) {
  return (
    api ||
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://api.evolonline.online"
  ).replace(/\/$/, "");
}

function crearErrorSesion(
  path,
  message,
  code = "AUTH_REQUIRED"
) {
  const error = new Error(message);
  error.status = 401;
  error.code = code;
  error.path = path;
  return error;
}

function obtenerTokenSesion(
  tokenExterno,
  path
) {
  const token = String(
    tokenExterno ||
      getStoredToken() ||
      ""
  ).replace(/^Bearer\s+/i, "");

  if (token) return token;

  throw crearErrorSesion(
    path,
    "Debes iniciar sesión para acceder al Aula Virtual."
  );
}

function limpiarSesionAulaVirtual() {
  clearStoredSession();

  if (typeof window !== "undefined") {
    localStorage.removeItem(
      "aula_virtual_token"
    );
  }
}

function headers(
  token,
  json = false
) {
  return {
    ...(json
      ? { "Content-Type": "application/json" }
      : {}),
    Authorization: `Bearer ${token}`,
    "X-Tenant": TENANT,
  };
}

async function leerRespuesta(
  response
) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function crearErrorRespuesta(
  response,
  data,
  path,
  fallback
) {
  if (response.status === 401) {
    limpiarSesionAulaVirtual();

    return crearErrorSesion(
      path,
      "Tu sesión expiró. Inicia sesión nuevamente.",
      "SESSION_EXPIRED"
    );
  }

  const message =
    data?.detail ||
    data?.message ||
    data?.error ||
    fallback ||
    `Error HTTP ${response.status}`;

  const error = new Error(message);
  error.status = response.status;
  error.data = data;
  error.path = path;

  return error;
}

async function ejecutarSolicitud(
  api,
  tokenExterno,
  path,
  options = {}
) {
  const apiBase = getApiBase(api);

  const token = obtenerTokenSesion(
    tokenExterno,
    path
  );

  const response = await fetch(
    `${apiBase}${path}`,
    {
      ...options,
      headers: {
        ...headers(
          token,
          Boolean(options.body)
        ),
        ...(options.headers || {}),
      },
    }
  );

  const data = await leerRespuesta(
    response
  );

  if (!response.ok) {
    throw crearErrorRespuesta(
      response,
      data,
      path
    );
  }

  return data;
}

function normalizarBloqueComoTarea(
  bloque = {}
) {
  return {
    ...bloque,
    id: bloque.id,
    titulo:
      bloque.titulo ||
      "Bloque de aprendizaje",
    descripcion:
      bloque.descripcion ||
      "",
    tipo:
      bloque.tipo ||
      "actividad",
    total_entregas: Number(
      bloque.total_entregas || 0
    ),
    evaluadas: Number(
      bloque.evaluadas || 0
    ),
    estado:
      bloque.estado ||
      "Disponible",
    unidad_id:
      bloque.unidad_id ||
      1,
  };
}

export async function listarTareas(
  api,
  token
) {
  const data = await ejecutarSolicitud(
    api,
    token,
    "/aula-virtual/unidades/1/bloques"
  );

  return Array.isArray(data)
    ? data.map(
        normalizarBloqueComoTarea
      )
    : [];
}

export async function listarMisEntregas(
  api,
  token,
  estudianteId = 1
) {
  const data = await ejecutarSolicitud(
    api,
    token,
    `/aula-virtual/mis-entregas/${estudianteId}`
  );

  return Array.isArray(data)
    ? data
    : [];
}

export async function enviarEntrega(
  api,
  token,
  payload
) {
  return ejecutarSolicitud(
    api,
    token,
    "/aula-virtual/entregas",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function resubirEntrega(
  api,
  token,
  entregaId,
  payload
) {
  return ejecutarSolicitud(
    api,
    token,
    `/aula-virtual/entregas/${entregaId}/resubir`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function revisarEntrega(
  api,
  token,
  entregaId,
  payload
) {
  return ejecutarSolicitud(
    api,
    token,
    `/aula-virtual/entregas/${entregaId}/revision-docente`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function reintentarIA(
  api,
  token,
  entregaId
) {
  return ejecutarSolicitud(
    api,
    token,
    `/aula-virtual/entregas/${entregaId}/reintentar-ia`,
    {
      method: "POST",
    }
  );
}
