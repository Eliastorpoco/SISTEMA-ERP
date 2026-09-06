import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = process.argv[2];
assert(base, 'Provide frontend base URL');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const index = await readFile('dist/index.html', 'utf8');
await Promise.all(['/evaluaciones', '/matricula', '/asistencia', '/horarios', '/incidencias'].map(async (path) => {
  const response = await fetch(base + path);
  assert.equal(response.status, 200); assert.equal(hash(await response.text()), hash(index));
  console.log(path + '=200');
}));
const file = (await readdir('dist/assets')).find((name) => /^Evaluaciones-.*\.js$/.test(name));
assert(file);
const source = await readFile('dist/assets/' + file, 'utf8');
for (const marker of ['Guardar resultado', '/evaluaciones', 'competencia_id', 'nivel_logro', 'matricula_id']) assert(source.includes(marker));
assert(!/Segundo Tenant|X-Tenant|tenant_id|Prueba Tenant|integracion-ia/.test(source));
for (const path of ['/assets/' + file, index.match(/src="([^\"]+\.js)"/)[1]]) {
  const response = await fetch(base + path); assert.equal(response.status, 200);
  assert.equal(hash(await response.text()), hash(await readFile('dist' + path, 'utf8')));
}
console.log('EVAL_SERVED_ARTIFACT=PASS; SEGUNDO_TENANT_VISIBLE=no; TENANT_HARDCODE_COUNT=0');
