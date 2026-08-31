import assert from 'node:assert/strict';
import fs from 'node:fs';
import { detalleErrorIncidencias, etiqueta, filtrosApiIncidencias, siguienteEstado } from '../src/utils/incidencias.js';

assert.deepEqual(filtrosApiIncidencias({ estudiante_id: '2', seccion_id: '3', tipo: 'tutoria', estado: 'abierta' }), { estudiante_id: 2, seccion_id: 3, tipo: 'TUTORIA', estado: 'ABIERTA' });
assert.deepEqual(filtrosApiIncidencias({}), {});
assert.equal(siguienteEstado('ABIERTA'), 'EN_SEGUIMIENTO');
assert.equal(siguienteEstado('EN_SEGUIMIENTO'), 'CERRADA');
assert.equal(siguienteEstado('CERRADA'), null);
assert.equal(etiqueta('EN_SEGUIMIENTO'), 'En seguimiento');
assert.equal(detalleErrorIncidencias({ response: { data: { detail: 'Controlado' } } }), 'Controlado');
assert.equal(detalleErrorIncidencias({ response: { data: { detail: { code: 'TRANSICION_INVALIDA' } } } }), 'La transición de estado no está permitida.');

const page = fs.readFileSync(new URL('../src/pages/IncidenciasAcademicas.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/services/incidenciasService.js', import.meta.url), 'utf8');
assert.match(page, /data-testid="incidencias-loading"/);
assert.match(page, /data-testid="incidencias-empty"/);
assert.match(page, /Nueva incidencia/);
assert.match(page, /data-testid="incidencia-create-form"/);
assert.match(page, /data-testid="accion-form"/);
assert.match(page, /Iniciar seguimiento/);
assert.match(page, /Cerrar incidencia/);
assert.match(page, /role="alert"/);
assert.match(app, /roles: \[Rol\.DIRECTOR, Rol\.ADMIN, Rol\.DOCENTE, Rol\.ESTUDIANTE\]/);
assert.doesNotMatch(service, /tenant_id|institucion_id/);
assert.doesNotMatch(page, /En construcción|Este módulo está en desarrollo|window\.prompt|window\.alert/);
assert.match(service, /client\.post\('\/incidencias-academicas'/);
assert.match(service, /\/estado/);

console.log('INC_V1_FRONTEND_TESTS=21/21');
