export function crearParametrosReporte({ fecha = '', seccion = 'TODAS' } = {}) {
  const params = {};
  if (fecha) params.fecha = fecha;
  if (seccion && seccion !== 'TODAS') params.seccion = seccion;
  return params;
}

export function calcularMetricasAsistencia(reporte = []) {
  const registros = Array.isArray(reporte) ? reporte : [];
  const total = registros.length;
  const presentes = registros.filter((registro) => registro.estado === 'presente').length;
  const ausentes = registros.filter((registro) => registro.estado === 'falta').length;
  const tardanzas = registros.filter((registro) => registro.estado === 'tardanza').length;
  const justificados = registros.filter(
    (registro) => registro.estado === 'justificado',
  ).length;
  const porcentaje = (valor) => (total > 0 ? Math.round((valor / total) * 100) : 0);

  return { total, presentes, ausentes, tardanzas, justificados, porcentaje };
}

export async function cargarReporteDashboard({
  request,
  params,
  esDocente = false,
  secciones = [],
  usarMocksDesarrollo = false,
  mocks = [],
}) {
  const response = await request({ params });
  let data = Array.isArray(response?.data) ? response.data : [];

  if (esDocente) {
    data = data.filter((registro) => secciones.includes(registro.seccion));
  }

  if (data.length === 0 && usarMocksDesarrollo) {
    return mocks;
  }

  return data;
}
