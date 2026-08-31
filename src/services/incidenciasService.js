import client from '../api/client';

const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
);

export async function cargarIncidencias(filtros = {}) {
  const { data } = await client.get('/incidencias-academicas/reportes', { params: cleanParams(filtros) });
  return data || { dashboard: {}, filas: [] };
}

export async function cargarCatalogosIncidencias() {
  const { data } = await client.get('/incidencias-academicas/catalogos');
  return data || { estudiantes: [], secciones: [], responsables: [] };
}

export async function crearIncidencia(payload) {
  const { data } = await client.post('/incidencias-academicas', payload);
  return data;
}

export async function cargarDetalleIncidencia(id) {
  const [detalle, acciones] = await Promise.all([
    client.get(`/incidencias-academicas/${id}`),
    client.get(`/incidencias-academicas/${id}/acciones`),
  ]);
  return { detalle: detalle.data, acciones: Array.isArray(acciones.data) ? acciones.data : [] };
}

export async function cambiarEstadoIncidencia(id, estado, observacion) {
  const { data } = await client.patch(`/incidencias-academicas/${id}/estado`, { estado, observacion });
  return data;
}

export async function agregarAccionTutorial(id, payload) {
  const { data } = await client.post(`/incidencias-academicas/${id}/acciones`, payload);
  return data;
}
