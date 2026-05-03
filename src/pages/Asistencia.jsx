import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';
import { ETIQUETAS_ESTADO } from '../utils/estados';

const ESTADOS = [
  { key: 'presente', color: '#1D9E75', light: '#E1F5EE', icon: '✓' },
  { key: 'ausente', color: '#E24B4A', light: '#FCEBEB', icon: '✗' },
  { key: 'tardanza', color: '#EF9F27', light: '#FFF3DC', icon: '' },
  { key: 'justificado', color: '#378ADD', light: '#E6F1FB', icon: '' },
];

export default function Asistencia() {
  const { user } = useAuth();
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(
    user?.secciones?.[0] || '4A'
  );
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const hoy = new Date().toISOString().split('T')[0];
  const esFechaPasada = fecha < hoy;
  const editable = !esFechaPasada || desbloqueado;

  const seccionesDisponibles = user?.isAdmin
    ? ['4A', '4B', '5A', '5B']
    : user?.secciones || [];

  useEffect(() => {
    if (!seccionSeleccionada) return;

    setCargando(true);
    setDesbloqueado(false);
    setMensaje('');

    Promise.all([
      client.get(`/secciones/${seccionSeleccionada}/estudiantes`),
      client.get('/reporte-asistencia', {
        params: { seccion: seccionSeleccionada, fecha },
      }),
    ])
      .then(([estRes, repRes]) => {
        const lista = estRes.data;
        const registros = repRes.data;

        setEstudiantes(lista);

        const init = {};
        lista.forEach((e) => {
          const reg = registros.find((r) => r.estudiante_id === e.id);
          init[e.id] = reg ? reg.estado : 'presente';
        });
        setAsistencia(init);
      })
      .catch(() => {
        setEstudiantes([]);
        setAsistencia({});
      })
      .finally(() => setCargando(false));
  }, [seccionSeleccionada, fecha]);

  const setEstado = (id, estado) => {
    if (!editable) return;
    setAsistencia((prev) => ({ ...prev, [id]: estado }));
  };

  const guardar = async () => {
    if (!editable) return;
    setGuardando(true);
    setMensaje('');
    try {
      const registros = Object.entries(asistencia).map(([id, estado]) => ({
        estudiante_id: parseInt(id),
        estado,
      }));
      await client.post('/mi-asistencia/lote', {
        seccion: seccionSeleccionada,
        fecha,
        registros,
      });
      setMensaje('ok');
      setDesbloqueado(false);
    } catch {
      setMensaje('error');
    } finally {
      setGuardando(false);
    }
  };

  const conteo = ESTADOS.map((e) => ({
    ...e,
    count: Object.values(asistencia).filter((v) => v === e.key).length,
  }));

  return (
    <div className="max-w-7xl mx-auto">
      {/* Encabezado azul */}
      <div className="bg-[#1a4a8a] rounded-xl mb-6 p-4 md:px-6 md:py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Titulo */}
          <div>
            <div className="text-white text-base md:text-[16px] font-semibold">
              Registrar Asistencia
            </div>
            <div className="text-[#a8c4e8] text-xs mt-0.5">
              {estudiantes.length} estudiantes · {fecha === hoy ? 'Hoy' : fecha}
            </div>
          </div>

          {/* Controles: seccion + fecha + guardar */}
          <div className="grid grid-cols-2 md:flex md:items-end gap-2 md:gap-3">
            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Sección</div>
              <select
                value={seccionSeleccionada}
                onChange={(e) => {
                  setSeccionSeleccionada(e.target.value);
                  setFecha(new Date().toISOString().split('T')[0]);
                  setAsistencia({});
                }}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm font-medium bg-white text-gray-800 cursor-pointer"
              >
                {seccionesDisponibles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Fecha</div>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full md:w-auto h-9 px-2.5 rounded-md border-0 text-sm"
              />
            </div>

            <button
              onClick={guardar}
              disabled={guardando || !editable}
              className={`col-span-2 md:col-span-1 h-9 px-5 rounded-md border-0 text-white text-sm font-semibold transition ${
                !editable
                  ? 'bg-[#7a9fc7] cursor-not-allowed'
                  : guardando
                  ? 'bg-[#9FE1CB] cursor-wait'
                  : 'bg-[#1D9E75] hover:bg-[#178663] cursor-pointer active:scale-95'
              }`}
            >
              {guardando ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Banner fecha pasada */}
      {esFechaPasada && !desbloqueado && (
        <div className="bg-[#FAEEDA] border border-[#EF9F27] text-[#633806] px-4 py-3 rounded-lg text-sm mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="flex-1">
            🔒 Esta asistencia corresponde a un día anterior y está cerrada para edición.
          </span>
          <button
            onClick={() => setDesbloqueado(true)}
            className="h-8 px-3.5 bg-[#EF9F27] hover:bg-[#d48a15] text-white rounded-md text-xs font-semibold cursor-pointer transition active:scale-95 whitespace-nowrap"
          >
            🔓 Desbloquear edición
          </button>
        </div>
      )}

      {esFechaPasada && desbloqueado && (
        <div className="bg-[#E6F1FB] border border-[#378ADD] text-[#0C447C] px-4 py-2.5 rounded-lg text-sm mb-4">
          🔓 Edición desbloqueada. Recuerda guardar los cambios.
        </div>
      )}

      {mensaje === 'ok' && (
        <div className="bg-[#E1F5EE] border border-[#1D9E75] text-[#085041] px-4 py-2.5 rounded-lg text-sm mb-4">
          ✓ Asistencia guardada correctamente para el {fecha}
        </div>
      )}
      {mensaje === 'error' && (
        <div className="bg-[#FCEBEB] border border-[#E24B4A] text-[#791F1F] px-4 py-2.5 rounded-lg text-sm mb-4">
          ✗ Error al guardar. Verifica tu sesión.
        </div>
      )}

      {/* Tarjetas de contadores - 2 cols en movil, 4 en desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
        {conteo.map((e) => (
          <div
            key={e.key}
            className="bg-white rounded-lg px-3.5 py-2.5 border"
            style={{
              borderTop: `4px solid ${e.color}`,
              borderColor: `${e.color}22`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-gray-600 uppercase">
                {ETIQUETAS_ESTADO[e.key]?.texto || e.key}
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: e.light, color: e.color }}
              >
                {e.icon}
              </div>
            </div>
            <div
              className="text-2xl sm:text-[26px] font-bold mt-1"
              style={{ color: e.color }}
            >
              {e.count}
            </div>
            <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${
                    estudiantes.length > 0
                      ? (e.count / estudiantes.length) * 100
                      : 0
                  }%`,
                  background: e.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Lista de estudiantes */}
      <div
        className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${
          !editable ? 'opacity-75' : ''
        }`}
      >
        {/* Header de tabla - solo visible en desktop */}
        <div className="hidden lg:grid bg-gray-50 px-4 py-2.5 border-b border-gray-200 grid-cols-[48px_1fr_320px] gap-3 items-center">
          <div className="text-[11px] text-gray-500 uppercase">#</div>
          <div className="text-[11px] text-gray-500 uppercase">Estudiante</div>
          <div className="text-[11px] text-gray-500 uppercase text-center">Estado</div>
        </div>

        {cargando && (
          <div className="py-8 text-center text-gray-500 text-sm">
            Cargando estudiantes...
          </div>
        )}

        {!cargando && estudiantes.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">
            No hay estudiantes en esta sección
          </div>
        )}

        {!cargando &&
          estudiantes.map((est, i) => {
            const estadoActual = asistencia[est.id] || 'presente';
            const estadoInfo = ESTADOS.find((e) => e.key === estadoActual);
            const initials =
              est.nombre
                ?.split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('') ?? 'ES';

            return (
              <div
                key={est.id}
                className={`
                  px-4 py-3 border-b border-gray-100 last:border-b-0
                  ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  flex flex-col lg:grid lg:grid-cols-[48px_1fr_320px] lg:gap-3 lg:items-center
                  gap-3
                `}
              >
                {/* Mobile: numero + nombre en una fila */}
                <div className="flex items-center gap-3 lg:contents">
                  {/* Numero */}
                  <div className="text-sm text-gray-400 font-medium lg:w-auto w-6">
                    {i + 1}
                  </div>

                  {/* Avatar + nombre */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: estadoInfo.light,
                        border: `2px solid ${estadoInfo.color}44`,
                        color: estadoInfo.color,
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-800 truncate">
                        {est.nombre}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Sección {est.seccion}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de estado - responsive: 2x2 en movil, 4 en linea en desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full lg:w-auto lg:flex lg:justify-center">
                  {ESTADOS.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => setEstado(est.id, e.key)}
                      disabled={!editable}
                      className={`
                        h-9 lg:h-[30px] lg:w-[70px] rounded-md text-[11px] transition
                        ${editable ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'}
                        ${estadoActual === e.key ? 'font-bold border-2' : 'font-normal border'}
                        ${!editable ? 'opacity-60' : ''}
                      `}
                      style={{
                        borderColor:
                          estadoActual === e.key ? e.color : '#e0e0e0',
                        background:
                          estadoActual === e.key ? e.light : 'white',
                        color: estadoActual === e.key ? e.color : '#888',
                      }}
                    >
                      {e.icon} {ETIQUETAS_ESTADO[e.key]?.texto || e.key}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
