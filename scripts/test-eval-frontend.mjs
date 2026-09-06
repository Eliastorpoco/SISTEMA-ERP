import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
  const { default: Evaluaciones } = await server.ssrLoadModule('/src/pages/Evaluaciones.jsx');
  const { default: service } = await server.ssrLoadModule('/src/services/evaluacionesService.js');
  const { default: client } = await server.ssrLoadModule('/src/api/client.js');
  for (const role of ['ADMIN', 'DIRECTOR', 'DOCENTE', 'ESTUDIANTE']) {
    const html = renderToStaticMarkup(React.createElement(AuthContext.Provider, { value: { user: { role } } }, React.createElement(Evaluaciones)));
    assert(html.includes('Evaluaciones') && html.includes('Cargando evaluaciones'));
    assert(!html.includes('Segundo Tenant') && !html.includes('tenant_id'));
  }
  const calls = [];
  client.defaults.adapter = async (config) => { calls.push(config); return { status: 200, data: [], headers: {}, config }; };
  await service.listar(); await service.catalogos();
  await service.competencia({ curso_id: 1, nombre: 'Competencia de prueba' });
  await service.crear({ asignacion_id: 1, competencia_id: 'id-aislado', titulo: 'Prueba', fecha_aplicacion: '2026-09-06' });
  await service.estudiantes('id-aislado'); await service.resultados('id-aislado');
  await service.guardar('id-aislado', { estudiante_id: 1, nivel_logro: 'A', puntaje: 16 });
  assert.deepEqual(calls.map((call) => [call.method, call.url]), [['get', '/evaluaciones'], ['get', '/evaluaciones/catalogos'], ['post', '/evaluaciones/competencias'], ['post', '/evaluaciones'], ['get', '/evaluaciones/id-aislado/estudiantes'], ['get', '/evaluaciones/id-aislado/resultados'], ['put', '/evaluaciones/id-aislado/resultados']]);
  for (const file of ['src/pages/Evaluaciones.jsx', 'src/services/evaluacionesService.js']) {
    const source = await readFile(file, 'utf8');
    assert(!/Segundo Tenant|TENANT_ID|tenant_id|X-Tenant|localStorage|integracion-ia/.test(source));
  }
  const routes = await readFile('src/App.jsx', 'utf8');
  assert(/path: 'evaluaciones'.*Rol.DIRECTOR.*Rol.ADMIN.*Rol.DOCENTE.*Rol.ESTUDIANTE/.test(routes));
  console.log('EVAL_FRONTEND_FOCAL=PASS; SEGUNDO_TENANT_VISIBLE=no; TENANT_HARDCODE_COUNT=0; SERVICE_CONTRACT=PASS; ROLE_ROUTE=PASS; EXTERNAL_REQUESTS=0');
} finally { await server.close(); }
