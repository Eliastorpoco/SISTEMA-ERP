import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildConsolidadoCalificacionesParams,
  debeMostrarAlertaCalidad,
  formatearPuntaje,
  mapReporteApiError,
  normalizarConsolidadoCalificaciones,
  normalizarResultadoReporte,
  normalizarResumenReporte,
  obtenerPublicacionVisual,
} from "../src/utils/aulaVirtualReportePedagogico.js";

const params = buildConsolidadoCalificacionesParams({
  unidadId: 4,
  bloqueId: "  evidencia-d5a4a437f009 ",
  usuarioId: 2,
  estudianteUsername: " ",
  estadoCalificacion: "definitiva",
  page: 2,
  pageSize: 100,
});

assert.deepEqual(params, {
  unidad_id: 4,
  bloque_id: "evidencia-d5a4a437f009",
  usuario_id: 2,
  estado_calificacion: "definitiva",
  page: 2,
  page_size: 100,
});
assert.equal("tenant" in params, false);
assert.equal("tenant_id" in params, false);
assert.equal("X-Tenant" in params, false);
assert.equal("role" in params, false);
assert.equal("rol" in params, false);

const defaults = buildConsolidadoCalificacionesParams();
assert.deepEqual(defaults, {
  estado_calificacion: "todas",
  page: 1,
  page_size: 50,
});

for (const calidadIdentidad of [
  "todas",
  "identificadas",
  "sin_vincular",
]) {
  const filtro = buildConsolidadoCalificacionesParams({ calidadIdentidad });
  assert.equal(filtro.calidad_identidad, calidadIdentidad);
}
assert.equal(
  "calidad_identidad" in
    buildConsolidadoCalificacionesParams({ calidadIdentidad: "" }),
  false
);
assert.equal(
  "calidad_identidad" in
    buildConsolidadoCalificacionesParams({ calidadIdentidad: undefined }),
  false
);

for (const invalid of [
  { page: 0 },
  { page: "" },
  { pageSize: 201 },
  { pageSize: "" },
  { usuarioId: -1 },
  { unidadId: 1.5 },
  { estadoCalificacion: "pendiente" },
  { calidadIdentidad: "ambigua" },
]) {
  assert.throws(() => buildConsolidadoCalificacionesParams(invalid), TypeError);
}

assert.equal(formatearPuntaje(null), "—");
assert.equal(formatearPuntaje(0), "0");
assert.equal(formatearPuntaje(95.126), "95.13");
assert.equal(formatearPuntaje(null), "—");

assert.equal(obtenerPublicacionVisual("publicada").label, "Publicada");
assert.equal(obtenerPublicacionVisual("provisional").label, "Provisional");
assert.equal(
  obtenerPublicacionVisual("pendiente_publicacion").label,
  "Pendiente de publicación"
);

assert.equal(
  mapReporteApiError({ response: { status: 403 } }).message,
  "No tienes permiso para consultar este consolidado."
);
assert.equal(
  mapReporteApiError({
    response: {
      status: 404,
      data: { detail: { code: "AULA_TENANT_MAPPING_NOT_FOUND" } },
    },
  }).message,
  "El tenant actual no está vinculado con Aula Virtual."
);
assert.equal(
  mapReporteApiError({
    response: {
      status: 409,
      data: { detail: { code: "AULA_TENANT_MAPPING_AMBIGUOUS" } },
    },
  }).message,
  "Existe más de una vinculación activa para Aula Virtual. Requiere revisión administrativa."
);
assert.equal(
  mapReporteApiError({ response: { status: 422 } }).message,
  "Revisa los filtros enviados."
);

const fixture = {
  resumen: {
    estudiantes: 58,
    estudiantes_identificados: 1,
    registros_sin_vincular: 57,
    usuarios_sin_estudiante: 0,
    usernames_inferidos: 0,
    promedio_definitivo: null,
  },
  resultados: [
    {
      intento_id: 131,
      numero_intento: 17,
      revision_id: 10,
      puntaje_final: 95,
      nivel_final: "Logro Destacado",
      decision_final: "Aprobado",
      estado_publicacion: "publicada",
      es_definitiva: true,
      fuente_calificacion: "revision_docente",
      estudiante_id: 2,
      identidad_tipo: "estudiante_vinculado",
      vinculado: true,
    },
    {
      intento_id: 4,
      identidad_estudiante: "i:4",
      estudiante_nombre: null,
      estudiante_username: null,
      estudiante_id: null,
      identidad_tipo: "sin_vincular",
      vinculado: false,
    },
  ],
};

const normalizado = normalizarConsolidadoCalificaciones(fixture);
assert.equal(formatearPuntaje(normalizado.resumen.promedio_definitivo), "—");
assert.equal(normalizado.resumen.estudiantes, 58);
assert.equal(normalizado.resumen.estudiantes_identificados, 1);
assert.equal(normalizado.resumen.registros_sin_vincular, 57);
assert.equal(normalizado.resumen.usuarios_sin_estudiante, 0);
assert.equal(normalizado.resumen.usernames_inferidos, 0);
assert.equal(normalizado.resultados.length, 2);
assert.deepEqual(normalizado.resultados[0], {
  intento_id: 131,
  numero_intento: 17,
  revision_id: 10,
  puntaje_final: 95,
  nivel_final: "Logro Destacado",
  decision_final: "Aprobado",
  estado_publicacion: "publicada",
  es_definitiva: true,
  fuente_calificacion: "revision_docente",
  estudiante_id: 2,
  identidad_tipo: "estudiante_vinculado",
  vinculado: true,
});
assert.equal(normalizado.resultados[1].identidad_estudiante, "i:4");
assert.equal(normalizado.resultados[1].estudiante_id, null);
assert.equal(normalizado.resultados[1].identidad_tipo, "sin_vincular");
assert.equal(normalizado.resultados[1].vinculado, false);

const fallbackV1 = normalizarResumenReporte({ estudiantes: 8 });
assert.equal(fallbackV1.estudiantes_identificados, 8);
assert.equal(fallbackV1.registros_sin_vincular, 0);
assert.equal(fallbackV1.usuarios_sin_estudiante, 0);
assert.equal(fallbackV1.usernames_inferidos, 0);
assert.equal(normalizarResultadoReporte({ vinculado: "true" }).vinculado, false);
assert.equal(normalizarResultadoReporte({ vinculado: true }).vinculado, true);
assert.equal(debeMostrarAlertaCalidad(fixture.resumen), true);
assert.equal(debeMostrarAlertaCalidad({ registros_sin_vincular: 0 }), false);

const pagina = readFileSync(
  new URL("../src/pages/ReportePedagogicoAulaVirtual.jsx", import.meta.url),
  "utf8"
);
const servicio = readFileSync(
  new URL("../src/services/aulaVirtualReportesService.js", import.meta.url),
  "utf8"
);
const utilidad = readFileSync(
  new URL("../src/utils/aulaVirtualReportePedagogico.js", import.meta.url),
  "utf8"
);

for (const texto of [
  "Estudiantes identificados",
  "Registros sin vincular",
  "Calidad de identidad",
  "Registro sin vincular",
  "Intento técnico #",
  "Usuario sin ficha de estudiante",
  "Identidad por username",
  "Se conservan para trazabilidad",
]) {
  assert.equal(pagina.includes(texto), true, texto);
}
assert.equal(pagina.includes('label: "Estudiantes"'), false);
assert.match(pagina, /calidadIdentidad:\s*"todas"/);
assert.match(pagina, /const filtros = \{ \.\.\.INITIAL_FILTERS \}/);
assert.match(pagina, /debeMostrarAlertaCalidad\(resumen\)/);

const codigoAuditado = `${pagina}\n${servicio}\n${utilidad}`;
assert.equal(codigoAuditado.includes("X-Tenant"), false);
assert.equal(codigoAuditado.includes("tenant_id"), false);
assert.equal(
  servicio.includes('"/aula-virtual/reportes/calificaciones"'),
  true
);

console.log("Pruebas lógicas Reporte Pedagógico Aula Virtual: OK");
