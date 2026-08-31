export const ESTADOS_INCIDENCIA = ['ABIERTA', 'EN_SEGUIMIENTO', 'CERRADA'];
export const TIPOS_INCIDENCIA = ['CONVIVENCIA', 'ASISTENCIA', 'ACADEMICA', 'TUTORIA'];

export function filtrosApiIncidencias(filtros = {}) {
  const result = {};
  for (const key of ['estudiante_id', 'seccion_id']) {
    if (filtros[key] !== '' && filtros[key] !== null && filtros[key] !== undefined) result[key] = Number(filtros[key]);
  }
  for (const key of ['tipo', 'estado']) {
    if (filtros[key]) result[key] = String(filtros[key]).trim().toUpperCase();
  }
  return result;
}

export function detalleErrorIncidencias(error, fallback = 'No se pudo completar la operación.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.code) return detail.code === 'TRANSICION_INVALIDA' ? 'La transición de estado no está permitida.' : detail.code;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(' · ');
  return fallback;
}

export function siguienteEstado(estado) {
  if (estado === 'ABIERTA') return 'EN_SEGUIMIENTO';
  if (estado === 'EN_SEGUIMIENTO') return 'CERRADA';
  return null;
}

export function etiqueta(value) {
  return String(value || '—').replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
