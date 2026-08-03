export const ORIGEN_DATOS = Object.freeze({
  API: 'api',
  MOCK_DEV: 'mock-dev',
  VACIO: 'vacio',
  ERROR: 'error',
});

export const ESTADOS_ASISTENCIA_VALIDOS = Object.freeze([
  'PRESENTE',
  'FALTA',
  'TARDANZA',
  'JUSTIFICADO',
]);

export function mocksAsistenciaHabilitados({ dev, flag }) {
  return dev === true && flag === 'true';
}

export function esIdEstudianteRealValido(id) {
  return Number.isInteger(id) && id > 0;
}

export function calcularMetricasSeguras(estudiantes = [], registros = {}) {
  const lista = Array.isArray(estudiantes) ? estudiantes : [];
  const valores = lista.map((estudiante) => registros[estudiante.id]).filter(Boolean);
  const total = lista.length;
  const presentes = valores.filter((registro) => registro.estado === 'PRESENTE').length;
  const faltas = valores.filter((registro) => registro.estado === 'FALTA').length;
  const tardanzas = valores.filter((registro) => registro.estado === 'TARDANZA').length;
  const justificados = valores.filter((registro) => registro.estado === 'JUSTIFICADO').length;
  const asistencia = total > 0 ? Math.round((presentes / total) * 100) : 0;

  return { total, presentes, faltas, tardanzas, justificados, asistencia };
}

export function validarEscrituraAsistencia({
  estudiantes,
  idsApi,
  registros,
  origenDatos,
  seccionId,
  fecha,
  dev,
}) {
  if (origenDatos !== ORIGEN_DATOS.API) {
    return { valida: false, mensaje: 'No se puede guardar asistencia sin datos institucionales válidos.' };
  }
  if (dev !== true && origenDatos === ORIGEN_DATOS.MOCK_DEV) {
    return { valida: false, mensaje: 'Los datos de demostración no pueden guardarse en producción.' };
  }
  if (!seccionId || !fecha) {
    return { valida: false, mensaje: 'Selecciona una sección y una fecha válidas.' };
  }
  if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
    return { valida: false, mensaje: 'No hay estudiantes institucionales para guardar.' };
  }

  const idsPermitidos = new Set(Array.isArray(idsApi) ? idsApi : []);
  for (const estudiante of estudiantes) {
    if (!esIdEstudianteRealValido(estudiante?.id) || !idsPermitidos.has(estudiante.id)) {
      return { valida: false, mensaje: 'La lista contiene identificadores de estudiante no válidos.' };
    }
    if (!ESTADOS_ASISTENCIA_VALIDOS.includes(registros?.[estudiante.id]?.estado)) {
      return { valida: false, mensaje: 'Todos los estudiantes deben tener un estado de asistencia válido.' };
    }
  }

  return { valida: true, mensaje: '' };
}

export function construirPayloadAsistencia({
  estudiantes,
  registros,
  seccionId,
  fecha,
  estadoUiAApi,
}) {
  return {
    fecha,
    seccion_id: seccionId,
    registros: estudiantes.map((estudiante) => ({
      estudiante_id: estudiante.id,
      estado: estadoUiAApi[registros[estudiante.id].estado],
      observacion: registros[estudiante.id].observacion ?? '',
    })),
  };
}

export function escrituraAsistenciaHabilitada({
  loading,
  guardando,
  origenDatos,
  estudiantes,
  idsApi,
  seccionId,
}) {
  if (loading || guardando || origenDatos !== ORIGEN_DATOS.API || !seccionId) return false;
  if (!Array.isArray(estudiantes) || estudiantes.length === 0) return false;
  const idsPermitidos = new Set(Array.isArray(idsApi) ? idsApi : []);
  return estudiantes.every(
    (estudiante) => esIdEstudianteRealValido(estudiante?.id) && idsPermitidos.has(estudiante.id),
  );
}
