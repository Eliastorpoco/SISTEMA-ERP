import {
  clearStoredSession,
  getStoredToken,
} from "../api/client";

// seguridad-aula-blocks-sin-login-demo-v2
const API_BASE_URL =
  (import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://api.evolonline.online").replace(/\/$/, "");

const TENANT_ID =
  "00000000-0000-0000-0000-000000000001";

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

function obtenerTokenSesion(path) {
  const token = String(
    getStoredToken() || ""
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

async function leerRespuestaApi(response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function crearErrorApi(
  response,
  data,
  path,
  fallback
) {
  const message =
    data?.message ||
    data?.detail ||
    data?.error ||
    fallback ||
    `Error HTTP ${response.status}`;

  const error = new Error(message);
  error.status = response.status;
  error.data = data;
  error.path = path;

  return error;
}

async function apiRequest(
  path,
  options = {}
) {
  const token = obtenerTokenSesion(path);

  const headers = {
    ...(options.body
      ? { "Content-Type": "application/json" }
      : {}),
    "X-Tenant": TENANT_ID,
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    }
  );

  const data = await leerRespuestaApi(
    response
  );

  if (!response.ok) {
    if (response.status === 401) {
      limpiarSesionAulaVirtual();

      throw crearErrorSesion(
        path,
        "Tu sesión expiró. Inicia sesión nuevamente.",
        "SESSION_EXPIRED"
      );
    }

    const error = crearErrorApi(
      response,
      data,
      path
    );

    console.error(
      "Error API Aula Virtual:",
      {
        path,
        status: response.status,
        data,
      }
    );

    throw error;
  }

  return data;
}

async function apiFileRequest(
  path,
  formData
) {
  const token = obtenerTokenSesion(path);

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: "POST",
      headers: {
        "X-Tenant": TENANT_ID,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const data = await leerRespuestaApi(
    response
  );

  if (!response.ok) {
    if (response.status === 401) {
      limpiarSesionAulaVirtual();

      throw crearErrorSesion(
        path,
        "Tu sesión expiró. Inicia sesión nuevamente.",
        "SESSION_EXPIRED"
      );
    }

    const error = crearErrorApi(
      response,
      data,
      path
    );

    console.error(
      "Error API archivo Aula Virtual:",
      {
        path,
        status: response.status,
        data,
      }
    );

    throw error;
  }

  return data;
}


function prepararBloqueParaApi(block = {}) {
  const payload = {
    ...block,
    id: block.id,
    tipo: block.tipo || "actividad",
    titulo: block.titulo || block.title || "Bloque de aprendizaje",
    descripcion: block.descripcion || block.description || "",
    visible: block.visible !== false,
    orden: Number(block.orden || block.order || 1),
    updatedAt: new Date().toISOString(),
  };

  // Datos exclusivos de la vista estudiante.
  // Nunca deben persistirse en el payload compartido.
  delete payload.studentAttemptHistory;
  delete payload.studentAttemptSummary;
  delete payload.studentLatestFeedback;

  const tiposRecursosAprendizajeApi = [
    "pdf",
    "video",
    "enlace",
    "recurso externo",
    "lectura",
    "presentacion",
    "presentación",
    "imagen",
    "infografia",
    "infografía",
    "guia",
    "guía",
    "documento",
    "material",
    "separata",
    "ficha",
  ];

  const tipoNormalizadoApi = String(payload.tipo || "").trim().toLowerCase();
  const esRecursoApi =
    payload.esRecursoAprendizaje === true ||
    payload.categoriaDidactica === "recurso" ||
    tiposRecursosAprendizajeApi.includes(tipoNormalizadoApi);

  const tieneMaterialRecursoApi = Boolean(
    payload.resourceUrl ||
      payload.url ||
      payload.activityPdfUrl ||
      payload.activityFileUrl ||
      payload.activityFileName
  );

  if (esRecursoApi) {
    Object.assign(payload, {
      categoriaDidactica: "recurso",
      esRecursoAprendizaje: true,
      esActividadEvaluable: false,
      generaIntento: false,
      requiereRevisionDocente: false,
      puntajeMinimo: 0,
      intentosPermitidos: 0,
      activityProgress: 0,
      activityScore: 0,
      formativeScore: 0,
      formativeLevel: "No evaluable",
      nivelLogro: "No evaluable",
      activityCompleted: false,
      activityAttemptHistory: [],
      activityConfigured: tieneMaterialRecursoApi,
      configurado: tieneMaterialRecursoApi,
      activityStatus: tieneMaterialRecursoApi ? "Disponible" : "Pendiente",
      productoEsperado:
        payload.productoEsperado || "Material de aprendizaje revisado por el estudiante.",
      criterioEvaluacion:
        payload.criterioEvaluacion || "Recurso de apoyo pedagógico. No genera calificación.",
    });
  }

  return {
    tipo: payload.tipo,
    titulo: payload.titulo,
    descripcion: payload.descripcion,
    orden: payload.orden,
    visible: payload.visible,
    payload,
  };
}

export async function listarBloquesAulaVirtual(unidadId = 1) {
  // No borrar tokens ni hacer login en cada carga.
  // apiRequest ya se encarga de obtener token y reintentar si corresponde.
  return apiRequest(
    `/aula-virtual/unidades/${unidadId}/bloques?estudiante_username=${encodeURIComponent("estudiante")}`
  );
}

export async function crearBloqueAulaVirtual(unidadId = 1, block = {}) {
  const data = await apiRequest(`/aula-virtual/unidades/${unidadId}/bloques`, {
    method: "POST",
    body: JSON.stringify(prepararBloqueParaApi(block)),
  });

  return data?.bloque || data;
}


function getMaxIntento(historial = []) {
  return Math.max(
    0,
    ...(Array.isArray(historial)
      ? historial.map((item) => Number(item?.intento || 0))
      : [0])
  );
}

function mergeHistorialIntentos(local = [], remoto = []) {
  const map = new Map();

  [...(Array.isArray(remoto) ? remoto : []), ...(Array.isArray(local) ? local : [])].forEach((item) => {
    if (!item) return;
    const key = `${item.intento || ""}-${item.fecha || ""}-${item.estado || ""}-${item.id || ""}`;
    map.set(key, item);
  });

  return Array.from(map.values()).sort(
    (a, b) => Number(b?.intento || 0) - Number(a?.intento || 0)
  );
}

async function obtenerBloqueServidorPorId(id) {
  try {
    const bloques = await listarBloquesAulaVirtual(1);
    return Array.isArray(bloques)
      ? bloques.find((item) => String(item.id) === String(id))
      : null;
  } catch (error) {
    console.warn("No se pudo obtener bloque actual del servidor para fusionar:", error);
    return null;
  }
}

function fusionarBloqueConServidor(local = {}, remoto = null) {
  if (!remoto) return local;

  const historialLocal = local.activityAttemptHistory || [];
  const historialRemoto = remoto.activityAttemptHistory || [];
  const maxLocal = getMaxIntento(historialLocal);
  const maxRemoto = getMaxIntento(historialRemoto);

  const fusionado = {
    ...remoto,
    ...local,
    activityAttemptHistory: mergeHistorialIntentos(historialLocal, historialRemoto),
  };

  // Si el servidor tiene un intento más reciente, se conserva el estado de actividad real
  // y solo se permite actualizar revisión/retroalimentación docente.
  if (maxRemoto > maxLocal) {
    fusionado.activityStatus = remoto.activityStatus;
    fusionado.activityProgress = remoto.activityProgress;
    fusionado.activityScore = remoto.activityScore;
    fusionado.activityCompleted = remoto.activityCompleted;
    fusionado.activityCompletedAt = remoto.activityCompletedAt;
    fusionado.activityStartedAt = remoto.activityStartedAt;
    fusionado.formativeScore = remoto.formativeScore;
    fusionado.formativeLevel = remoto.formativeLevel;
  }

  return fusionado;
}

export async function actualizarBloqueAulaVirtual(block = {}) {
  if (!block.id) {
    return crearBloqueAulaVirtual(1, block);
  }

  try {
    const bloqueServidor = await obtenerBloqueServidorPorId(block.id);
    const bloqueSeguro = fusionarBloqueConServidor(block, bloqueServidor);

    const data = await apiRequest(
      `/aula-virtual/bloques/${encodeURIComponent(block.id)}`,
      {
        method: "PUT",
        body: JSON.stringify(prepararBloqueParaApi(bloqueSeguro)),
      }
    );

    return data?.bloque || data;
  } catch (error) {
    if (error.status === 404) {
      const creado = await crearBloqueAulaVirtual(1, {
        ...block,
        id: undefined,
      });

      return creado;
    }

    throw error;
  }
}

export async function eliminarBloqueAulaVirtual(id) {
  if (!id) {
    throw new Error("No se puede eliminar un bloque sin ID.");
  }

  try {
    return await apiRequest(`/aula-virtual/bloques/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error.status === 404) {
      return { status: "ok", mensaje: "Bloque eliminado localmente" };
    }

    throw error;
  }
}


export async function registrarIntentoBloqueAulaVirtual(bloqueId, payload = {}) {
  if (!bloqueId) {
    throw new Error("No se puede registrar intento sin ID de bloque.");
  }

  return apiRequest(`/aula-virtual/bloques/${encodeURIComponent(bloqueId)}/intentos`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAulaVirtualApiBaseUrl() {
  return API_BASE_URL;
}


export async function subirArchivoDocenteBloque(bloqueId, archivo, datos = {}) {
  if (!bloqueId) {
    throw new Error("No se puede subir archivo sin ID de bloque.");
  }

  if (!archivo) {
    throw new Error("Selecciona un archivo PDF.");
  }

  const formData = new FormData();
  formData.append("archivo", archivo);

  if (datos.titulo) {
    formData.append("titulo", datos.titulo);
  }

  if (datos.descripcion) {
    formData.append("descripcion", datos.descripcion);
  }

  const data = await apiFileRequest(
    `/aula-virtual/bloques/${encodeURIComponent(bloqueId)}/archivo-docente`,
    formData
  );

  return data;
}

export async function entregarEvidenciaRealBloque(bloqueId, archivo, datos = {}) {
  if (!bloqueId) {
    throw new Error("No se puede entregar evidencia sin ID de bloque.");
  }

  if (!archivo) {
    throw new Error("Selecciona un archivo para entregar.");
  }

  const formData = new FormData();
  formData.append("archivo", archivo);
  formData.append("numero_intento", String(datos.numero_intento || datos.intento || 1));
  formData.append("estudiante_username", datos.estudiante_username || datos.estudiante || "estudiante");
  const descripcionEvidencia =
    datos.evidencia_descripcion ||
    datos.descripcion_evidencia ||
    datos.descripcion ||
    datos.comentario ||
    "";

  formData.append("comentario", descripcionEvidencia);
  formData.append("evidencia_descripcion", descripcionEvidencia);
  formData.append("descripcion_evidencia", descripcionEvidencia);

  if (datos.usuario_id) {
    formData.append("usuario_id", String(datos.usuario_id));
  }

  if (datos.puntaje !== undefined) {
    formData.append("puntaje", String(datos.puntaje));
  }

  if (datos.avance !== undefined) {
    formData.append("avance", String(datos.avance));
  }

  if (datos.nivel_logro) {
    formData.append("nivel_logro", datos.nivel_logro);
  }

  const data = await apiFileRequest(
    `/aula-virtual/bloques/${encodeURIComponent(bloqueId)}/entregar-evidencia`,
    formData
  );

  return data;
}

export async function listarEntregasBloqueAulaVirtual(bloqueId) {
  if (!bloqueId) {
    throw new Error("No se puede listar entregas sin ID de bloque.");
  }

  return apiRequest(`/aula-virtual/bloques/${encodeURIComponent(bloqueId)}/entregas`);
}

export async function listarEntregasDetalleBloqueAulaVirtual(bloqueId) {
  if (!bloqueId) {
    throw new Error("No se puede listar entregas detalladas sin ID de bloque.");
  }

  const data = await apiRequest(`/aula-virtual/bloques/${encodeURIComponent(bloqueId)}/entregas-detalle`);
  const lista = Array.isArray(data) ? data : [];

  return lista.map((entrega) => {
    const payload = entrega?.payload || {};
    const comentarioEstudiante =
      entrega.comentario_estudiante ||
      entrega.descripcion_evidencia ||
      entrega.evidencia_descripcion ||
      payload.comentario ||
      payload.descripcion_evidencia ||
      payload.evidencia_descripcion ||
      "";

    return {
      ...entrega,
      comentario_estudiante: comentarioEstudiante,
      descripcion_evidencia: comentarioEstudiante,
      evidencia_descripcion: comentarioEstudiante,
    };
  });
}

export async function registrarRevisionDocenteEntregaAulaVirtual(intentoId, payload = {}) {
  if (!intentoId) {
    throw new Error("No se puede registrar revisión sin ID de entrega/intento.");
  }

  return apiRequest(`/aula-virtual/entregas/${encodeURIComponent(intentoId)}/revision-docente`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function construirUrlArchivoAulaVirtual(url = "") {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}


export async function abrirArchivoAulaVirtual(url = "", nombre = "archivo") {
  if (!url) {
    throw new Error("No hay URL de archivo para abrir.");
  }

  const finalUrl = construirUrlArchivoAulaVirtual(url);
  const token = obtenerTokenSesion(finalUrl);

  // Importante:
  // No usar noopener/noreferrer aquí porque Chrome puede devolver null.
  // Si devuelve null, antes se terminaba usando window.location.href
  // y reemplazaba la página del Aula Virtual.
  const nuevaVentana =
    typeof window !== "undefined"
      ? window.open("about:blank", "_blank")
      : null;

  if (!nuevaVentana) {
    alert("El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para abrir el PDF sin salir del Aula Virtual.");
    return null;
  }

  try {
    nuevaVentana.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Abriendo archivo...</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              color: #1e3a8a;
            }
          </style>
        </head>
        <body>
          <div>Abriendo archivo...</div>
        </body>
      </html>
    `);
    nuevaVentana.document.close();

    const response = await fetch(finalUrl, {
      method: "GET",
      headers: {
        "X-Tenant": TENANT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (!nuevaVentana.closed) {
        nuevaVentana.close();
      }

      if (response.status === 404) {
        alert(
          "El archivo no está disponible en el servidor. Este registro pertenece a una carga anterior al almacenamiento persistente. Vuelve a subir la evidencia o el material."
        );
        return null;
      }

      throw new Error(`No se pudo abrir el archivo (${response.status}).`);
    }

    const blobOriginal = await response.blob();

    const contentType =
      response.headers.get("content-type") ||
      blobOriginal.type ||
      (String(nombre || "").toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    const blob = new Blob([blobOriginal], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);

    // Carga el PDF en la pestaña nueva.
    // No se usa window.location.href en la página actual.
    nuevaVentana.location.href = blobUrl;

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 120000);

    return blobUrl;
  } catch (error) {
    if (nuevaVentana && !nuevaVentana.closed) {
      nuevaVentana.close();
    }

    throw error;
  }
}

// dua-frontend-service-get-v1
export async function obtenerConfiguracionDUABloqueAulaVirtual(bloqueId) {
  const idNormalizado = String(bloqueId ?? "").trim();

  if (!idNormalizado) {
    throw new Error(
      "Se requiere el ID del bloque para consultar la configuración DUA."
    );
  }

  return apiRequest(
    `/aula-virtual/dua/bloques/${encodeURIComponent(idNormalizado)}`,
    {
      method: "GET",
    }
  );
}

// dua-frontend-service-put-v1
export async function guardarConfiguracionDUABloqueAulaVirtual(
  bloqueId,
  payload = {}
) {
  const idNormalizado = String(bloqueId ?? "").trim();

  if (!idNormalizado) {
    throw new Error(
      "Se requiere el ID del bloque para guardar la configuración DUA."
    );
  }

  return apiRequest(
    `/aula-virtual/dua/bloques/${encodeURIComponent(idNormalizado)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

// dua-frontend-service-options-put-v1
export async function guardarOpcionesDUABloqueAulaVirtual(
  bloqueId,
  opciones = []
) {
  const idNormalizado = String(
    bloqueId ?? ""
  ).trim();

  if (!idNormalizado) {
    throw new Error(
      "Se requiere el ID del bloque para guardar las opciones DUA."
    );
  }

  if (!Array.isArray(opciones)) {
    throw new Error(
      "Las opciones DUA deben enviarse como una lista."
    );
  }

  return apiRequest(
    `/aula-virtual/dua/bloques/${encodeURIComponent(
      idNormalizado
    )}/opciones`,
    {
      method: "PUT",
      body: JSON.stringify({
        opciones,
      }),
    }
  );
}

// dua-frontend-service-resources-put-v1
export async function guardarRecursosDUABloqueAulaVirtual(
  bloqueId,
  recursos = []
) {
  const idNormalizado = String(
    bloqueId ?? ""
  ).trim();

  if (!idNormalizado) {
    throw new Error(
      "Se requiere el ID del bloque para guardar los recursos DUA."
    );
  }

  if (!Array.isArray(recursos)) {
    throw new Error(
      "Los recursos DUA deben enviarse como una lista."
    );
  }

  return apiRequest(
    `/aula-virtual/dua/bloques/${encodeURIComponent(
      idNormalizado
    )}/recursos`,
    {
      method: "PUT",
      body: JSON.stringify({
        recursos,
      }),
    }
  );
}

// dua-frontend-service-evidence-formats-put-v1
export async function guardarFormatosEvidenciaDUABloqueAulaVirtual(
  bloqueId,
  formatosEvidencia = []
) {
  const idNormalizado = String(
    bloqueId ?? ""
  ).trim();

  if (!idNormalizado) {
    throw new Error(
      "Se requiere el ID del bloque para guardar los formatos de evidencia DUA."
    );
  }

  if (!Array.isArray(formatosEvidencia)) {
    throw new Error(
      "Los formatos de evidencia DUA deben enviarse como una lista."
    );
  }

  return apiRequest(
    `/aula-virtual/dua/bloques/${encodeURIComponent(
      idNormalizado
    )}/formatos-evidencia`,
    {
      method: "PUT",
      body: JSON.stringify({
        formatos_evidencia:
          formatosEvidencia,
      }),
    }
  );
}
