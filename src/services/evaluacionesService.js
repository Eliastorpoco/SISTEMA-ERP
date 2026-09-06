import client from '../api/client';
export const errorEvaluacion = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((item) => item.msg).join(' · ') : 'No fue posible completar la operación de evaluación.';
};
export default {
  async listar() { return (await client.get('/evaluaciones')).data; },
  async catalogos() { return (await client.get('/evaluaciones/catalogos')).data; },
  async competencia(payload) { return (await client.post('/evaluaciones/competencias', payload)).data; },
  async crear(payload) { return (await client.post('/evaluaciones', payload)).data; },
  async resultados(id) { return (await client.get(`/evaluaciones/${id}/resultados`)).data; },
  async estudiantes(id) { return (await client.get(`/evaluaciones/${id}/estudiantes`)).data; },
  async guardar(id, payload) { return (await client.put(`/evaluaciones/${id}/resultados`, payload)).data; },
};
