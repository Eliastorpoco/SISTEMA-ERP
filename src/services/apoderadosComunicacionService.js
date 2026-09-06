import client from '../api/client';

export const errorComunicacion = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  const codes = {
    APODERADO_DOCUMENTO_DUPLICADO: 'Ya existe un apoderado con ese documento.',
    RELACION_APODERADO_DUPLICADA_O_PRINCIPAL_EXISTENTE: 'La relación ya existe o el estudiante ya tiene un apoderado principal activo.',
    COMUNICACION_ORIGEN_DUPLICADA: 'Ya existe una comunicación de este origen para ese apoderado.',
  };
  return codes[detail?.code] || detail?.message || 'No fue posible completar la operación.';
};

const service = {
  async apoderados() { return (await client.get('/apoderados')).data; },
  async crearApoderado(payload) { return (await client.post('/apoderados', payload)).data; },
  async editarApoderado(id, payload) { return (await client.patch(`/apoderados/${id}`, payload)).data; },
  async relaciones(id) { return (await client.get(`/estudiantes/${id}/apoderados`)).data; },
  async relacionar(id, payload) { return (await client.post(`/estudiantes/${id}/apoderados`, payload)).data; },
  async comunicaciones(params = {}) { return (await client.get('/comunicaciones-institucionales', { params })).data; },
  async crearComunicacion(payload) { return (await client.post('/comunicaciones-institucionales', payload)).data; },
};
export default service;
