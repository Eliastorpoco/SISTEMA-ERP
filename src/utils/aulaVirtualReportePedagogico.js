const ESTADOS_CALIFICACION = new Set([
  "todas",
  "definitiva",
  "provisional",
]);

function enteroPositivoOpcional(valor, nombre) {
  if (valor === undefined || valor === null || valor === "") return undefined;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new TypeError(`${nombre} debe ser un entero positivo.`);
  }

  return numero;
}

function enteroPositivoRequerido(valor, nombre) {
  const numero = Number(valor);
  if (
    valor === "" ||
    valor === null ||
    valor === undefined ||
    !Number.isInteger(numero) ||
    numero <= 0
  ) {
    throw new TypeError(`${nombre} debe ser un entero positivo.`);
  }

  return numero;
}

export function buildConsolidadoCalificacionesParams({
  unidadId,
  bloqueId,
  usuarioId,
  estudianteUsername,
  estadoCalificacion = "todas",
  page = 1,
  pageSize = 50,
} = {}) {
  const pagina = enteroPositivoRequerido(page, "page");
  const tamanioPagina = enteroPositivoRequerido(pageSize, "pageSize");
  const unidad = enteroPositivoOpcional(unidadId, "unidadId");
  const usuario = enteroPositivoOpcional(usuarioId, "usuarioId");
  const bloque = typeof bloqueId === "string" ? bloqueId.trim() : "";
  const username =
    typeof estudianteUsername === "string" ? estudianteUsername.trim() : "";

  if (tamanioPagina > 200) {
    throw new TypeError("pageSize debe estar entre 1 y 200.");
  }

  if (!ESTADOS_CALIFICACION.has(estadoCalificacion)) {
    throw new TypeError(
      "estadoCalificacion debe ser todas, definitiva o provisional."
    );
  }

  return {
    ...(unidad !== undefined ? { unidad_id: unidad } : {}),
    ...(bloque ? { bloque_id: bloque } : {}),
    ...(usuario !== undefined ? { usuario_id: usuario } : {}),
    ...(username ? { estudiante_username: username } : {}),
    estado_calificacion: estadoCalificacion,
    page: pagina,
    page_size: tamanioPagina,
  };
}

export function formatearPuntaje(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";

  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";

  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 2,
  }).format(numero);
}

export function obtenerPublicacionVisual(estado) {
  const configuracion = {
    publicada: { label: "Publicada", variant: "success" },
    provisional: { label: "Provisional", variant: "warning" },
    pendiente_publicacion: {
      label: "Pendiente de publicación",
      variant: "info",
    },
  };

  return configuracion[estado] || {
    label: estado || "—",
    variant: "neutral",
  };
}

export function mapReporteApiError(error) {
  const status = error?.response?.status ?? error?.status;
  const detail = error?.response?.data?.detail ?? error?.data?.detail;
  const code =
    detail && typeof detail === "object"
      ? detail.code
      : error?.response?.data?.code ?? error?.data?.code;

  if (status === 401) {
    return {
      status,
      message: "Sesión expirada.",
      retryable: false,
    };
  }

  if (status === 403) {
    return {
      status,
      message: "No tienes permiso para consultar este consolidado.",
      retryable: false,
    };
  }

  if (status === 404 && code === "AULA_TENANT_MAPPING_NOT_FOUND") {
    return {
      status,
      code,
      message: "El tenant actual no está vinculado con Aula Virtual.",
      retryable: false,
    };
  }

  if (status === 409 && code === "AULA_TENANT_MAPPING_AMBIGUOUS") {
    return {
      status,
      code,
      message:
        "Existe más de una vinculación activa para Aula Virtual. Requiere revisión administrativa.",
      retryable: false,
    };
  }

  if (status === 422) {
    return {
      status,
      message: "Revisa los filtros enviados.",
      retryable: false,
    };
  }

  return {
    status,
    message: "No se pudo cargar el reporte pedagógico.",
    retryable: true,
  };
}
