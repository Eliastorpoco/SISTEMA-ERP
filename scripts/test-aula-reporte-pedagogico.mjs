import assert from "node:assert/strict";
import {
  buildConsolidadoCalificacionesParams,
  formatearPuntaje,
  mapReporteApiError,
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

for (const invalid of [
  { page: 0 },
  { page: "" },
  { pageSize: 201 },
  { pageSize: "" },
  { usuarioId: -1 },
  { unidadId: 1.5 },
  { estadoCalificacion: "pendiente" },
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
  resumen: { promedio_definitivo: null },
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
    },
  ],
};

assert.equal(formatearPuntaje(fixture.resumen.promedio_definitivo), "—");
assert.equal(fixture.resultados.length, 1);
assert.deepEqual(fixture.resultados[0], {
  intento_id: 131,
  numero_intento: 17,
  revision_id: 10,
  puntaje_final: 95,
  nivel_final: "Logro Destacado",
  decision_final: "Aprobado",
  estado_publicacion: "publicada",
  es_definitiva: true,
  fuente_calificacion: "revision_docente",
});

console.log("Pruebas lógicas Reporte Pedagógico Aula Virtual: OK");
