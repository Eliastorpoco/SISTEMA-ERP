const ESTADOS_CALIFICACION = new Set([
  "todas",
  "definitiva",
  "provisional",
]);

const CALIDADES_IDENTIDAD = new Set([
  "todas",
  "identificadas",
  "sin_vincular",
]);

function enteroNoNegativo(valor, fallback = 0) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0 ? numero : fallback;
}

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
  calidadIdentidad,
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
  const calidad =
    typeof calidadIdentidad === "string" ? calidadIdentidad.trim() : "";

  if (tamanioPagina > 200) {
    throw new TypeError("pageSize debe estar entre 1 y 200.");
  }

  if (!ESTADOS_CALIFICACION.has(estadoCalificacion)) {
    throw new TypeError(
      "estadoCalificacion debe ser todas, definitiva o provisional."
    );
  }

  if (calidad && !CALIDADES_IDENTIDAD.has(calidad)) {
    throw new TypeError(
      "calidadIdentidad debe ser todas, identificadas o sin_vincular."
    );
  }

  return {
    ...(unidad !== undefined ? { unidad_id: unidad } : {}),
    ...(bloque ? { bloque_id: bloque } : {}),
    ...(usuario !== undefined ? { usuario_id: usuario } : {}),
    ...(username ? { estudiante_username: username } : {}),
    estado_calificacion: estadoCalificacion,
    ...(calidad ? { calidad_identidad: calidad } : {}),
    page: pagina,
    page_size: tamanioPagina,
  };
}

export function normalizarResumenReporte(resumen = {}) {
  const legacy = enteroNoNegativo(resumen?.estudiantes);
  const contieneV11 = Object.prototype.hasOwnProperty.call(
    resumen || {},
    "estudiantes_identificados"
  );

  return {
    ...(resumen || {}),
    estudiantes: legacy,
    estudiantes_identificados: contieneV11
      ? enteroNoNegativo(resumen.estudiantes_identificados)
      : legacy,
    registros_sin_vincular: enteroNoNegativo(
      resumen?.registros_sin_vincular
    ),
    usuarios_sin_estudiante: enteroNoNegativo(
      resumen?.usuarios_sin_estudiante
    ),
    usernames_inferidos: enteroNoNegativo(resumen?.usernames_inferidos),
  };
}

export function normalizarResultadoReporte(resultado = {}) {
  return {
    ...(resultado || {}),
    estudiante_id:
      resultado?.estudiante_id === null ||
      resultado?.estudiante_id === undefined
        ? null
        : resultado.estudiante_id,
    identidad_tipo:
      typeof resultado?.identidad_tipo === "string"
        ? resultado.identidad_tipo
        : null,
    vinculado: resultado?.vinculado === true,
  };
}

export function normalizarConsolidadoCalificaciones(respuesta = {}) {
  return {
    ...(respuesta || {}),
    resumen: normalizarResumenReporte(respuesta?.resumen),
    unidades: Array.isArray(respuesta?.unidades)
      ? respuesta.unidades.map(normalizarResumenReporte)
      : [],
    resultados: Array.isArray(respuesta?.resultados)
      ? respuesta.resultados.map(normalizarResultadoReporte)
      : [],
  };
}

export function debeMostrarAlertaCalidad(resumen = {}) {
  return enteroNoNegativo(resumen?.registros_sin_vincular) > 0;
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
