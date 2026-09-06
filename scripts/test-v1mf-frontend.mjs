import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
  const panel = await server.ssrLoadModule('/src/components/ComunicacionApoderado.jsx');
  const { default: service, errorComunicacion } = await server.ssrLoadModule('/src/services/apoderadosComunicacionService.js');
  const { default: client } = await server.ssrLoadModule('/src/api/client.js');
  const render = (role, Component, props) => renderToStaticMarkup(React.createElement(AuthContext.Provider, { value: { user: { role } } }, React.createElement(Component, props)));
  const origin = { estudianteId: 21, estudianteNombre: 'Estudiante de prueba', origen: 'INCIDENCIA', referencia: 'INCIDENCIA-31' };
  for (const role of ['ADMIN', 'DIRECTOR', 'DOCENTE']) assert(render(role, panel.default, origin).includes('Comunicar a apoderado'));
  assert.equal(render('ESTUDIANTE', panel.default, origin), '');
  assert.equal(render('ESTUDIANTE', panel.ConsultarApoderados, origin), '');
  assert.equal(render('DOCENTE', panel.default, { ...origin, referencia: '' }), '');
  const html = render('DOCENTE', panel.HistorialComunicacion, { rows: [{ id: 1, asunto: 'Seguimiento', created_at: '2026-09-06', estudiante_username: 'Estudiante de prueba', apoderado_nombre: 'Apoderado de prueba', apoderado_email: 'privado@example.org', documento: 'NO-MOSTRAR', telefono: 'NO-MOSTRAR', origen: 'INCIDENCIA', referencia_origen: 'INCIDENCIA-31', canal: 'EMAIL', estado: 'PENDIENTE', modo_envio: 'SANDBOX', actor_username: 'Docente', historial: [{ estado: 'PENDIENTE', actor_id: 7, fecha: '2026-09-06', detalle: 'Creada sin envío externo' }] }] });
  for (const label of ['Seguimiento', 'Apoderado de prueba', 'INCIDENCIA-31', 'PENDIENTE', 'SANDBOX', 'Docente', 'Creada sin envío externo']) assert(html.includes(label));
  assert(!html.includes('privado@example.org') && !html.includes('NO-MOSTRAR'));
  assert(render('DOCENTE', panel.HistorialComunicacion, { rows: [] }).includes('No hay comunicaciones'));
  assert(render('DOCENTE', panel.ApoderadosEstudiante, { estudianteId: 21 }).includes('Cargando apoderados'));
  const calls = [];
  client.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, payload: config.data ? JSON.parse(config.data) : null });
    return { status: 200, data: [], headers: {}, config };
  };
  await service.crearApoderado({ nombre: 'Prueba', documento: 'Prueba', email: 'test@example.org' });
  await service.editarApoderado(9, { activo: false });
  await service.relaciones(21);
  await service.relacionar(21, { apoderado_id: 9, parentesco: 'MADRE', principal: true, activo: true });
  await service.crearComunicacion({ estudiante_id: 21, apoderado_id: 9, origen: 'INCIDENCIA', referencia_origen: 'INCIDENCIA-31', asunto: 'Prueba', mensaje: 'Prueba', canal: 'EMAIL' });
  await service.comunicaciones({ estudiante_id: 21 });
  assert.deepEqual(calls.map((call) => [call.method, call.url]), [['post', '/apoderados'], ['patch', '/apoderados/9'], ['get', '/estudiantes/21/apoderados'], ['post', '/estudiantes/21/apoderados'], ['post', '/comunicaciones-institucionales'], ['get', '/comunicaciones-institucionales']]);
  for (const call of calls) assert(!('tenant_id' in (call.payload || {})) && !('estado' in (call.payload || {})) && !('modo_envio' in (call.payload || {})));
  assert(errorComunicacion({ response: { data: { detail: { code: 'COMUNICACION_ORIGEN_DUPLICADA' } } } }).includes('Ya existe'));
  console.log('V1MF_UI_FOCAL=PASS; ROLE_GATES=PASS; HISTORY_PRIVACY=PASS; LOADING_EMPTY_ERROR=PASS; SERVICE_CONTRACT=PASS; EXTERNAL_REQUESTS=0');
} finally { await server.close(); }
