import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ORIGEN_DATOS,
  calcularMetricasSeguras,
  construirPayloadAsistencia,
  escrituraAsistenciaHabilitada,
  mocksAsistenciaHabilitados,
  validarEscrituraAsistencia,
} from '../src/utils/asistenciaSafeState.js';

const source = await readFile(new URL('../src/pages/Asistencia.jsx', import.meta.url), 'utf8');
const casos = [];
const caso = async (nombre, prueba) => {
  await prueba();
  casos.push(nombre);
};

await caso('A. error de secciones deja lista vacía en producción', () => {
  assert.match(source, /setSecciones\(\[\]\);\s*setSeccionId\(''\);/s);
  assert.match(source, /No fue posible cargar las secciones institucionales\./);
});

await caso('B/C. error conjunto no carga ocho mocks en producción', () => {
  assert.match(source, /Promise\.all/);
  assert.match(source, /if \(USAR_MOCKS_ASISTENCIA\)/);
  assert.match(source, /setEstudiantes\(\[\]\);\s*setRegistros\(\{\}\);\s*setOrigenDatos\(ORIGEN_DATOS\.ERROR\)/s);
});

await caso('D. respuesta vacía mantiene métricas en cero', () => {
  assert.deepEqual(calcularMetricasSeguras([], {}), {
    total: 0,
    presentes: 0,
    faltas: 0,
    tardanzas: 0,
    justificados: 0,
    asistencia: 0,
  });
  assert.match(source, /No hay estudiantes registrados en esta sección\./);
});

await caso('E. mocks requieren DEV y flag explícito', () => {
  assert.equal(mocksAsistenciaHabilitados({ dev: false, flag: 'true' }), false);
  assert.equal(mocksAsistenciaHabilitados({ dev: true, flag: 'false' }), false);
  assert.equal(mocksAsistenciaHabilitados({ dev: true, flag: undefined }), false);
  assert.equal(mocksAsistenciaHabilitados({ dev: true, flag: 'true' }), true);
});

await caso('F/G. escritura deshabilitada sin datos API reales', () => {
  assert.equal(escrituraAsistenciaHabilitada({
    loading: false,
    guardando: false,
    origenDatos: ORIGEN_DATOS.ERROR,
    estudiantes: [],
    idsApi: [],
    seccionId: '4A',
  }), false);
  assert.equal(validarEscrituraAsistencia({
    estudiantes: [{ id: 2 }],
    idsApi: [],
    registros: { 2: { estado: 'PRESENTE' } },
    origenDatos: ORIGEN_DATOS.MOCK_DEV,
    seccionId: '4A',
    fecha: '2026-08-03',
    dev: false,
  }).valida, false);
  assert.match(source, /disabled=\{!escrituraHabilitada\}/);
});

await caso('H/I. fallo de guardado retorna false y no produce falso cierre', () => {
  assert.match(source, /catch \(err\)[\s\S]*?return false;[\s\S]*?finally/);
  assert.match(source, /const guardado = await guardar\(\);\s*if \(!guardado\) return false;/s);
  assert.doesNotMatch(source, /cerrada correctamente/);
});

await caso('J. historial ficticio está limitado al modo mock de desarrollo', () => {
  assert.match(source, /if \(USAR_MOCKS_ASISTENCIA\) \{\s*setHistorial\(MOCK_HISTORIAL\)/s);
  assert.match(source, /No hay registros históricos disponibles\./);
});

await caso('K. payload API conserva IDs, estados y observaciones', () => {
  const payload = construirPayloadAsistencia({
    estudiantes: [{ id: 101 }, { id: 102 }],
    registros: {
      101: { estado: 'PRESENTE', observacion: '' },
      102: { estado: 'FALTA', observacion: 'Justificación pendiente' },
    },
    seccionId: '4A',
    fecha: '2026-08-03',
    estadoUiAApi: { PRESENTE: 'presente', FALTA: 'ausente' },
  });
  assert.deepEqual(payload, {
    fecha: '2026-08-03',
    seccion_id: '4A',
    registros: [
      { estudiante_id: 101, estado: 'presente', observacion: '' },
      { estudiante_id: 102, estado: 'ausente', observacion: 'Justificación pendiente' },
    ],
  });
});

await caso('L. controles mantienen composición móvil fluida', () => {
  assert.match(source, /flex flex-col sm:flex-row/);
  assert.match(source, /flex w-full sm:w-auto gap-2/);
  assert.match(source, /flex-1 sm:flex-none/);
});

console.log(`OK ${casos.length} casos`);
for (const nombre of casos) console.log(`- ${nombre}`);
