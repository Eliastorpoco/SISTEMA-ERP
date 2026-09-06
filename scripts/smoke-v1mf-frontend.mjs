import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.argv[2];
assert(base, 'Usage: node scripts/smoke-v1mf-frontend.mjs <base-url>');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const index = await readFile('dist/index.html', 'utf8');
await Promise.all(['/apoderados', '/comunicaciones', '/incidencias', '/asistencia', '/horarios', '/matricula'].map(async (path) => {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  assert.equal(digest(await response.text()), digest(index), `${path}: deployed index`);
  console.log(`${path}=200`);
}));
const files = await readdir('dist/assets');
const contracts = {
  'ApoderadosComunicacion-': ['Crear apoderado', 'Registrar relación', 'principal', 'parentesco'],
  'ComunicacionApoderado-': ['Comunicar a apoderado', 'SANDBOX', 'PENDIENTE', '/comunicaciones-institucionales', '/apoderados', 'Historial de comunicaci'],
  'IncidenciasAcademicas-': ['INCIDENCIA-', 'ComunicacionApoderado-'],
  'Asistencia-': ['ASISTENCIA-ALERTA-', 'JUSTIFICACION-', 'ComunicacionApoderado-'],
  'Estudiantes-': ['ComunicacionApoderado-'],
};
for (const [prefix, markers] of Object.entries(contracts)) {
  const file = files.find((name) => name.startsWith(prefix) && name.endsWith('.js'));
  assert(file, `Missing build chunk ${prefix}`);
  const source = await readFile(`dist/assets/${file}`, 'utf8');
  for (const marker of markers) assert(source.includes(marker), `${prefix}: missing ${marker}`);
  const response = await fetch(`${base}/assets/${file}`);
  assert.equal(response.status, 200);
  assert.equal(digest(await response.text()), digest(source), `${file}: hash mismatch`);
}
const entry = index.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
const entryResponse = await fetch(`${base}${entry}`);
assert.equal(entryResponse.status, 200);
assert.equal(digest(await entryResponse.text()), digest(await readFile(`dist${entry}`, 'utf8')));
for (const file of ['src/pages/ApoderadosComunicacion.jsx', 'src/components/ComunicacionApoderado.jsx', 'src/services/apoderadosComunicacionService.js']) {
  assert(!/tenant_id|tenantId|X-Tenant/i.test(await readFile(file, 'utf8')), `${file}: tenant comes from backend/JWT`);
}
console.log('V1MF_SERVED_ARTIFACT=PASS; CANONICAL_INTEGRATIONS=PASS; TENANT_HARDCODE_COUNT=0');
