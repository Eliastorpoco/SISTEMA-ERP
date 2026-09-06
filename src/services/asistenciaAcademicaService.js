import client from '../api/client';

const asistenciaAcademicaService = {
  async listarHorarios() {
    const { data } = await client.get('/horarios-academicos');
    return Array.isArray(data) ? data : [];
  },
  async listarSesiones(params = {}) {
    const { data } = await client.get('/asistencia-academica/sesiones', { params });
    return Array.isArray(data) ? data : [];
  },
  async crearSesion(payload) {
    try {
      const { data } = await client.post('/asistencia-academica/sesiones', payload);
      return data;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const sessionId = typeof detail === 'object' ? detail.sesion_id : null;
      if (error?.response?.status === 409 && sessionId) {
        const sesiones = await asistenciaAcademicaService.listarSesiones({});
        return sesiones.find((session) => Number(session.id) === Number(sessionId)) || { id: sessionId };
      }
      throw error;
    }
  },
  async obtenerEstudiantes(sesionId) {
    const { data } = await client.get(`/asistencia-academica/sesiones/${sesionId}/estudiantes`);
    return data || { sesion: null, estudiantes: [] };
  },
  async guardarAsistencia(sesionId, registro) {
    const { data } = await client.put(`/asistencia-academica/sesiones/${sesionId}/asistencias`, registro);
    return data;
  },
  async miAsistencia(params = {}) {
    const { data } = await client.get('/asistencia-academica/mi-asistencia', { params });
    return Array.isArray(data) ? data : [];
  },
  async reportes(params = {}) {
    const { data } = await client.get('/asistencia-academica/reportes', { params });
    return data || { resumen: {}, filas: [] };
  },
  async crearJustificacion(asistenciaId, payload) {
    const { data } = await client.post(`/asistencia-academica/asistencias/${asistenciaId}/justificaciones`, payload);
    return data;
  },
  async listarJustificaciones(params = {}) {
    const { data } = await client.get('/asistencia-academica/justificaciones', { params });
    return Array.isArray(data) ? data : [];
  },
  async revisarJustificacion(id, payload) {
    const { data } = await client.patch(`/asistencia-academica/justificaciones/${id}/revision`, payload);
    return data;
  },
  async alertas(params = {}) {
    const { data } = await client.get('/asistencia-academica/alertas', { params });
    return data || { filas: [] };
  },
};

export default asistenciaAcademicaService;
