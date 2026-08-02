import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';
import {
  calcularMetricasAsistencia,
  cargarReporteDashboard,
  crearParametrosReporte,
} from '../utils/dashboardAsistencia';

const MOCK_REPORTE = [
  { nombre: 'García Quispe Ana',     seccion: '4A', estado: 'presente',    fecha: '2026-05-10' },
  { nombre: 'Mamani Torres Luis',    seccion: '4A', estado: 'falta',     fecha: '2026-05-10' },
  { nombre: 'Flores Chávez Rosa',    seccion: '4A', estado: 'tardanza',    fecha: '2026-05-10' },
  { nombre: 'Quispe Huanca Carlos',  seccion: '4A', estado: 'presente',    fecha: '2026-05-10' },
  { nombre: 'Condori Apaza María',   seccion: '4A', estado: 'presente',    fecha: '2026-05-10' },
  { nombre: 'Huanca Ríos Pedro',     seccion: '4A', estado: 'justificado', fecha: '2026-05-10' },
  { nombre: 'Ccallo Mamani Luz',     seccion: '4B', estado: 'presente',    fecha: '2026-05-10' },
  { nombre: 'Ticona Colque Jorge',   seccion: '4B', estado: 'falta',     fecha: '2026-05-10' },
  { nombre: 'Apaza Cusi Delia',      seccion: '4B', estado: 'presente',    fecha: '2026-05-10' },
  { nombre: 'Ramos Vargas Julio',    seccion: '4B', estado: 'tardanza',    fecha: '2026-05-10' },
];

const USAR_MOCKS_DESARROLLO =
  import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_USE_MOCKS === 'true';

export default function Dashboard() {
  const { user } = useAuth();
  const [reporte, setReporte] = useState([]);
  const [seccion, setSeccion] = useState('TODAS');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [reporteError, setReporteError] = useState('');

  const seccionesDisponibles = user?.isAdmin
    ? ['4A', '4B', '5A', '5B']
    : user?.secciones || [];

  useEffect(() => {
    client
      .get('/mi-dashboard')
      .then(() => setDashboardError(''))
      .catch(() => {
        setDashboardError('No se pudo cargar el resumen del Dashboard.');
      })
  }, [user]);

  useEffect(() => {
    let active = true;
    const params = crearParametrosReporte({ fecha, seccion });

    cargarReporteDashboard({
      request: (config) => client.get('/reporte-asistencia', config),
      params,
      esDocente: user?.isDocente,
      secciones: user?.secciones || [],
      usarMocksDesarrollo: USAR_MOCKS_DESARROLLO,
      mocks: MOCK_REPORTE,
    })
      .then((data) => {
        if (!active) return;
        setReporte(data);
        setReporteError('');
      })
      .catch(() => {
        if (!active) return;
        console.error('[EduERP] No se pudo cargar el reporte de asistencia.');
        setReporte([]);
        setReporteError(
          'No se pudo cargar la asistencia. Verifica tu conexión e inténtalo nuevamente.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [seccion, fecha, user]);

  const {
    total,
    presentes,
    ausentes,
    tardanzas,
    justificados,
    porcentaje: pct,
  } = calcularMetricasAsistencia(reporte);
  const error = dashboardError || reporteError;
  const maxVal = Math.max(presentes, ausentes, tardanzas, justificados, 1);
  const CHART_H = 200;

  const bars = [
    { label: 'Presentes', value: presentes, color: '#1D9E75', light: '#E1F5EE', initials: 'P' },
    { label: 'Faltas', value: ausentes, color: '#E24B4A', light: '#FCEBEB', initials: 'F' },
    { label: 'Tardanzas', value: tardanzas, color: '#EF9F27', light: '#FFF3DC', initials: 'T' },
    { label: 'Justificados', value: justificados, color: '#378ADD', light: '#E6F1FB', initials: 'J' },
  ];

  const yTicks = () => {
    const step = Math.max(Math.ceil(maxVal / 5), 1);
    const ticks = [];
    for (let i = 0; i <= 5; i++) ticks.push(i * step);
    return ticks;
  };

  const filtroTexto = () => {
    const sec = seccion === 'TODAS' ? 'Todas las secciones' : `Sección ${seccion}`;
    const fec = fecha ? `Fecha: ${fecha}` : 'Desde inicio de clases';
    return `${sec} · ${fec} · ${total} registros`;
  };

  return (
    <div className="max-w-7xl mx-auto font-sans">
      {/* Encabezado azul */}
      <div className="bg-[#1a4a8a] rounded-xl mb-6 p-4 md:px-6 md:py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Titulo */}
          <div>
            <div className="text-white text-base font-semibold">
              Sistema de Asistencia Escolar
            </div>
            <div className="text-[#a8c4e8] text-xs mt-0.5">
              Bienvenido, {user?.username} — Rol: {user?.role}
            </div>
          </div>

          {/* Controles */}
          <div className="grid grid-cols-2 md:flex md:items-end gap-2 md:gap-3">
            {(user?.isAdmin || user?.isDocente) && (
              <div>
                <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Sección</div>
                <select
                  value={seccion}
                  onChange={(e) => {
                    setLoading(true);
                    setReporteError('');
                    setSeccion(e.target.value);
                    setFecha('');
                  }}
                  className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm font-medium bg-white cursor-pointer"
                >
                  <option value="TODAS">Todas</option>
                  {user?.isAdmin && (
                    <>
                      <option value="4A">4A</option>
                      <option value="4B">4B</option>
                      <option value="5A">5A</option>
                      <option value="5B">5B</option>
                    </>
                  )}
                  {user?.isDocente &&
                    seccionesDisponibles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Fecha</div>
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  setLoading(true);
                  setReporteError('');
                  setFecha(e.target.value);
                }}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm"
              />
            </div>

            {(fecha || (user?.isAdmin && seccion !== 'TODAS')) && (
              <button
                onClick={() => {
                  setLoading(true);
                  setReporteError('');
                  setFecha('');
                  if (user?.isAdmin) setSeccion('TODAS');
                }}
                className="col-span-2 md:col-span-1 h-9 px-3 rounded-md border border-[#a8c4e8] bg-transparent text-white text-xs cursor-pointer hover:bg-white/10 active:scale-95 transition"
              >
                Ver todo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words"
        >
          {error}
        </div>
      )}

      {/* Tarjeta destacada + 4 tarjetas de estados */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_repeat(4,1fr)] gap-2.5 mb-6">
        {/* Tarjeta destacada */}
        <div
          className="rounded-lg px-4 py-3 text-white"
          style={{
            background: 'linear-gradient(135deg, #1a4a8a 0%, #378ADD 100%)',
          }}
        >
          <div className="text-[11px] opacity-85 uppercase tracking-wider">
            {user?.isAdmin
              ? seccion === 'TODAS'
                ? 'Total General'
                : `Sección ${seccion}`
              : seccion === 'TODAS'
              ? `${user?.username} - Todas sus secciones`
              : `${user?.username} - Sección ${seccion}`}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-3xl font-bold leading-tight">{total}</div>
            <div className="text-xs opacity-85">registros</div>
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            <strong className="text-sm">{pct(presentes)}%</strong> asistencia{' '}
            {fecha ? 'del día' : 'acumulada'}
          </div>
        </div>

        {/* 4 tarjetas de estados - 2x2 en movil, fila en desktop */}
        <div className="grid grid-cols-2 lg:contents gap-2.5">
          {bars.map((bar) => (
            <div
              key={bar.label}
              className="bg-white rounded-lg px-4 py-3 border"
              style={{
                borderTop: `4px solid ${bar.color}`,
                borderColor: `${bar.color}22`,
              }}
            >
              <div className="text-[11px] text-gray-600 uppercase tracking-wider">
                {bar.label}
              </div>
              <div
                className="text-3xl font-bold leading-tight mt-1"
                style={{ color: bar.color }}
              >
                {bar.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {pct(bar.value)}% del total
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3">
          <div>
            <div className="text-[15px] font-semibold text-[#1a4a8a]">
              Resultado por estado de asistencia
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{filtroTexto()}</div>
          </div>

          {/* Leyenda */}
          <div className="flex gap-3 flex-wrap">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="text-[11px] text-gray-600">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Cargando...</p>
        ) : total === 0 ? (
          <div
            className="min-h-[252px] flex items-center justify-center px-4 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-gray-500">
              {reporteError
                ? 'No fue posible mostrar los registros de asistencia.'
                : 'No hay registros de asistencia para los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="flex items-stretch">
            {/* Eje Y con valores */}
            <div className="flex flex-col justify-between pr-2 pb-[52px] min-w-[28px] md:min-w-[36px]">
              {[...yTicks()].reverse().map((t) => (
                <div
                  key={t}
                  className="text-[10px] md:text-[11px] text-gray-400 text-right"
                >
                  {t}
                </div>
              ))}
            </div>

            {/* Área del gráfico */}
            <div className="flex-1 relative">
              {/* Líneas horizontales punteadas */}
              <div
                className="absolute top-0 left-0 right-0 flex flex-col justify-between pointer-events-none"
                style={{ bottom: '52px' }}
              >
                {yTicks().map((t) => (
                  <div key={t} className="border-t border-dashed border-gray-200 w-full" />
                ))}
              </div>

              {/* Barras */}
              <div
                className="grid grid-cols-4 gap-3 md:gap-6 items-end relative z-10"
                style={{ height: `${CHART_H + 52}px` }}
              >
                {bars.map((bar) => {
                  const h = maxVal > 0 ? Math.max((bar.value / maxVal) * CHART_H, 8) : 8;
                  return (
                    <div
                      key={bar.label}
                      className="flex flex-col items-center justify-end h-full"
                    >
                      {/* Círculo superior con inicial - oculto en móvil */}
                      <div
                        className="hidden md:flex w-11 h-11 rounded-full items-center justify-center text-base font-extrabold mb-1.5"
                        style={{
                          background: bar.light,
                          border: `3px solid ${bar.color}`,
                          color: bar.color,
                          boxShadow: `0 2px 8px ${bar.color}44`,
                        }}
                      >
                        {bar.initials}
                      </div>

                      {/* Valor numérico */}
                      <div
                        className="text-xs md:text-[13px] font-bold mb-1"
                        style={{ color: bar.color }}
                      >
                        {bar.value}
                      </div>

                      {/* Barra */}
                      <div
                        className="w-3/4 md:w-2/3 rounded-t-md transition-[height] duration-700"
                        style={{
                          height: `${h}px`,
                          background: `linear-gradient(180deg, ${bar.color}cc 0%, ${bar.color} 100%)`,
                          boxShadow: `0 -2px 12px ${bar.color}44`,
                        }}
                      />

                      {/* Base */}
                      <div className="h-0.5 w-full bg-gray-200" />

                      {/* Etiqueta inferior */}
                      <div className="mt-2 text-center">
                        <div
                          className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mx-auto mb-1"
                          style={{
                            background: bar.light,
                            border: `2px solid ${bar.color}44`,
                          }}
                        >
                          <span
                            className="text-sm md:text-lg font-extrabold"
                            style={{ color: bar.color }}
                          >
                            {bar.initials}
                          </span>
                        </div>
                        <div className="text-[10px] md:text-[11px] text-gray-600 font-medium">
                          {bar.label}
                        </div>
                        <div className="text-[10px] md:text-[11px] text-gray-400">
                          {pct(bar.value)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
