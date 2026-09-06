import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.argv[2];
assert(base, 'Usage: node scripts/smoke-v1md-r1.mjs <base-url>');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const expectedIndex = await readFile('dist/index.html', 'utf8');
await Promise.all(['/asistencia', '/horarios', '/matricula', '/incidencias'].map(async (path) => {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  assert.equal(digest(await response.text()), digest(expectedIndex), `${path}: candidate index`);
  console.log(`${path}=200`);
}));
const files = await readdir('dist/assets');
const asistencia = files.find((file) => /^Asistencia-.*\.js$/.test(file));
assert(asistencia, 'The canonical Asistencia page must be included in the build');
const source = await readFile(`dist/assets/${asistencia}`, 'utf8');
for (const marker of ['Justificar', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'JUSTIFICADO', 'PROYECCION_TECNICA_NO_OFICIAL_V1MD', '/asistencia-academica/justificaciones', '/revision', '/asistencia-academica/alertas']) {
  assert(source.includes(marker), `Missing deployed contract: ${marker}`);
}
const indexAsset = expectedIndex.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
for (const asset of [indexAsset, `/assets/${asistencia}`]) {
  const response = await fetch(`${base}${asset}`);
  assert.equal(response.status, 200);
  assert.equal(digest(await response.text()), digest(await readFile(`dist${asset}`, 'utf8')));
}
for (const file of ['src/pages/Asistencia.jsx', 'src/components/JustificacionesAsistencia.jsx', 'src/services/asistenciaAcademicaService.js']) {
  assert(!/tenant_id|tenantId|X-Tenant/i.test(await readFile(file, 'utf8')), `${file}: tenant must come from backend/JWT`);
}
console.log('V1MD_SERVED_ARTIFACT=PASS; CANONICAL_ROUTE=PASS; TENANT_HARDCODE_COUNT=0');
