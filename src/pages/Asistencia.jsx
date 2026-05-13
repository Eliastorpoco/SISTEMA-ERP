import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

/**
 * Asistencia.jsx — ERP Educativo Multi-Tenant
 *
 * Funcionalidades:
 * - Selección de sección y período académico
 * - Registro diario de asistencia por estudiante (PRESENTE / TALTA / TARDANZA / JUSTIFICADO)
 * - Guardado masivo en una sola llamada a la API
 * - Resumen KPI del día
 * - Historial mensual (tabla)
 *
 * Endpoints consumidos (Laravel API REST):
 *   GET  /asistencia/secciones          → lista secciones del docente/institución
 *   GET  /asistencia/estudiantes?seccion_id=&periodo_id=
 *   GET  /asistencia/registro?seccion_id=&fecha=   → asistencias ya registradas
 *   POST /asistencia/registro/masivo    → { fecha, registros: [{estudiante_id, estado, observacion}] }
 *   GET  /asistencia/historial?seccion_id=&mes=&anio=
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

const ESTADOS = [
  { key: 'PRESENTE',    label: 'P',  full: 'Presente',    color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'FALTA',       label: 'F',  full: 'Falta',       color: 'bg-red-100 text-red-700 border-red-300'             },
  { key: 'TARDANZA',    label: 'T',  full: 'Tardanza',    color: 'bg-amber-100 text-amber-700 border-amber-300'       },
  { key: 'JUSTIFICADO', label: 'J',  full: 'Justificado', color: 'bg-indigo-100 text-indigo-700 border-indigo-300'    },
];

// Backend → UI (el backend guarda en minúscula, 'ausente' no 'falta')
const ESTADO_API_A_UI = {
  'presente':    'PRESENTE',
  'ausente':     'FALTA',
  'falta':       'FALTA',
  'tardanza':    'TARDANZA',
  'justificado': 'JUSTIFICADO',
  'justified':   'JUSTIFICADO',
  'PRESENTE':    'PRESENTE',
  'AUSENTE':     'FALTA',
  'FALTA':       'FALTA',
  'TARDANZA':    'TARDANZA',
  'JUSTIFICADO': 'JUSTIFICADO',
};

// UI → Backend
const ESTADO_UI_A_API = {
  'PRESENTE':    'presente',
  'FALTA':       'ausente',
  'TARDANZA':    'tardanza',
  'JUSTIFICADO': 'justificado',
};

const hoy = () => new Date().toISOString().split('T')[0];

const MOCK_SECCIONES = [
  { id: '4A', nombre: '4A' },
  { id: '4B', nombre: '4B' },
  { id: '5A', nombre: '5A' },
  { id: '5B', nombre: '5B' },
];

const MOCK_ESTUDIANTES = [
  { id: 2,  nombre: 'Lucia Quispe Mamani',   seccion: '4A' },
  { id: 3,  nombre: 'Carlos Huanca Flores',  seccion: '4A' },
  { id: 4,  nombre: 'Sofia Condori Rivera',  seccion: '4A' },
  { id: 5,  nombre: 'Andres Tapia Ccallo',   seccion: '4A' },
  { id: 6,  nombre: 'Valeria Chavez Quispe', seccion: '4A' },
  { id: 7,  nombre: 'Diego Mamani Torres',   seccion: '4A' },
  { id: 8,  nombre: 'Gabriela Apaza Luna',   seccion: '4A' },
  { id: 9,  nombre: 'Mateo Huallpa Cusi',    seccion: '4A' },
];

const MOCK_HISTORIAL = [
  { fecha: '2026-05-10', seccion: '4A', presentes: 6, faltas: 1, tardanzas: 1, justificados: 0 },
  { fecha: '2026-05-09', seccion: '4A', presentes: 7, faltas: 0, tardanzas: 1, justificados: 0 },
  { fecha: '2026-05-08', seccion: '4A', presentes: 8, faltas: 0, tardanzas: 0, justificados: 0 },
  { fecha: '2026-05-07', seccion: '4A', presentes: 6, faltas: 2, tardanzas: 0, justificados: 0 },
  { fecha: '2026-05-06', seccion: '4A', presentes: 7, faltas: 0, tardanzas: 1, justificados: 0 },
];

const meses = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// ─── Subcomponentes ───────────────────────────────────────────────────────────

const EstadoBtn = ({ estado, selected, onChange }) => {
  const info = ESTADOS.find((e) => e.key === estado);
  return (
    <button
      onClick={() => onChange(estado)}
      title={info?.full}
      className={`
        w-10 h-10 sm:w-9 sm:h-9 rounded-xl sm:rounded-lg
        text-sm sm:text-xs font-bold border
        transition-all duration-100 active:scale-95
        ${selected ? info?.color : 'bg-white text-gray-300 border-gray-200 hover:border-gray-400'}
      `}
    >
      {info?.label}
    </button>
  );
};

const KpiPill = ({ label, value, color }) => {
  const cls = {
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gray:   'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${cls[color]}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Asistencia() {
  useAuth();

  // Filtros
  const [secciones,  setSecciones]  = useState([]);
  const [seccionId,  setSeccionId]  = useState('');
  const [fecha,      setFecha]      = useState(hoy());

  // Estudiantes y registros
  const [estudiantes, setEstudiantes] = useState([]);
  const [registros,   setRegistros]   = useState({}); // { [estudiante_id]: { estado, observacion } }

  // Historial
  const [historial, setHistorial] = useState([]);
  const [histMes,   setHistMes]   = useState(new Date().getMonth() + 1);
  const [histAnio,  setHistAnio]  = useState(new Date().getFullYear());

  // UI
  const [loadingSecciones,  setLoadingSecciones]  = useState(true);
  const [loadingEstudiantes,setLoadingEstudiantes] = useState(false);
  const [loadingHistorial,  setLoadingHistorial]  = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [diaCerrado,  setDiaCerrado]  = useState(false);
  const [error,       setError]       = useState(null);
  const [exito,       setExito]       = useState(null);
  const [tab,         setTab]         = useState('registro'); // 'registro' | 'historial'

  // ── Carga inicial: secciones ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await client.get('/asistencia/secciones');
        const data = res.data ?? [];
        console.log('[EduERP] Secciones recibidas:', data.map((s) => ({
          id:     s.id,
          nombre: s.nombre ?? s.seccion ?? s.name,
        })));
        setSecciones(data);
        if (data.length > 0) {
          // Guardar el nombre/string, nunca el id numérico
          const primerNombre = data[0].nombre ?? data[0].seccion ?? data[0].name ?? String(data[0].id);
          setSeccionId(primerNombre);
        }
      } catch {
        console.warn('[EduERP-DEV] API secciones no disponible, usando mock');
        setSecciones(MOCK_SECCIONES);
        setSeccionId('4A');
      } finally {
        setLoadingSecciones(false);
      }
    })();
  }, []);

  // ── Cargar estudiantes + registro guardado del día ────────────────
  const cargarRegistro = useCallback(async () => {
    if (!seccionId) return;
    setLoadingEstudiantes(true);
    setDiaCerrado(false);
    setError(null);
    setExito(null);
    try {
      console.log('[EduERP] Cargando registro:', { seccionId, fecha });

      const [resEst, resReg] = await Promise.all([
        client.get(`/asistencia/estudiantes?seccion_id=${seccionId}`),
        client.get(`/asistencia/registro?seccion_id=${seccionId}&fecha=${fecha}`),
      ]);

      const estData = resEst.data ?? [];
      const regData = resReg.data ?? [];

      console.log('[EduERP] Estudiantes recibidos:', estData.length, estData[0]);
      console.log('[EduERP] Registros del día recibidos:', regData.length, regData);

      setEstudiantes(estData);

      // ¿Ya hay registros guardados para este día?
      const yaRegistrado = regData.length > 0;
      setDiaCerrado(yaRegistrado);
      console.log('[EduERP] ¿Día ya registrado?', yaRegistrado);

      // Construir mapa — traducir estado backend → UI
      const mapa = {};
      regData.forEach((r) => {
        const estadoRaw  = r.estado ?? 'presente';
        const estadoNorm = ESTADO_API_A_UI[estadoRaw] ?? ESTADO_API_A_UI[estadoRaw.toLowerCase()] ?? estadoRaw.toUpperCase();
        console.log('[EduERP] Mapeando estado:', estadoRaw, '→', estadoNorm);
        mapa[r.estudiante_id] = {
          estado:      estadoNorm,
          observacion: r.observacion ?? '',
        };
      });

      // Estudiantes sin registro → default 'PRESENTE'
      estData.forEach((e) => {
        if (!mapa[e.id]) {
          mapa[e.id] = { estado: 'PRESENTE', observacion: '' };
        }
      });

      console.log('[EduERP] Mapa final de estados:', mapa);
      setRegistros(mapa);
    } catch (err) {
      console.error('[EduERP] Error cargarRegistro:', {
        status:  err?.response?.status,
        url:     err?.config?.url,
        data:    err?.response?.data,
        message: err?.message,
      });
      console.warn('[EduERP-DEV] API no disponible, usando estudiantes mock');
      setEstudiantes(MOCK_ESTUDIANTES);
      const mapa = {};
      MOCK_ESTUDIANTES.forEach((e) => {
        mapa[e.id] = { estado: 'PRESENTE', observacion: '' };
      });
      setRegistros(mapa);
    } finally {
      setLoadingEstudiantes(false);
    }
  }, [seccionId, fecha]);

  useEffect(() => { cargarRegistro(); }, [cargarRegistro]);

  // ── Cargar historial ──────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'historial' || !seccionId) return;
    (async () => {
      setLoadingHistorial(true);
      try {
        const res = await client.get(
          `/asistencias?seccion=${seccionId}&mes=${histMes}&anio=${histAnio}`
        );
        setHistorial(res.data ?? []);
      } catch (err) {
        console.warn('[EduERP-DEV] API historial no disponible, usando mock', err);
        setHistorial(MOCK_HISTORIAL);
      } finally {
        setLoadingHistorial(false);
      }
    })();
  }, [tab, seccionId, histMes, histAnio]);

  // ── Cambiar estado de un estudiante ───────────────────────────────
  const setEstado = (estudianteId, estado) => {
    setRegistros((prev) => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], estado },
    }));
  };

  const setObservacion = (estudianteId, obs) => {
    setRegistros((prev) => ({
      ...prev,
      [estudianteId]: { ...prev[estudianteId], observacion: obs },
    }));
  };

  // ── Marcar todos como un estado ───────────────────────────────────
  const marcarTodos = (estado) => {
    const nuevo = {};
    estudiantes.forEach((e) => {
      nuevo[e.id] = { estado, observacion: registros[e.id]?.observacion ?? '' };
    });
    setRegistros(nuevo);
  };

  // ── Guardar ───────────────────────────────────────────────────────
  const guardar = async () => {
    if (!seccionId) return;
    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      console.log('[EduERP] Enviando POST con:', {
        seccion_id:       seccionId,
        tipo:             typeof seccionId,
        fecha,
        n_registros:      estudiantes.length,
        primer_estudiante: estudiantes[0]?.id,
        primer_estado:    registros[estudiantes[0]?.id]?.estado,
      });
      const payload = {
        fecha,
        seccion_id: seccionId,
        registros: estudiantes.map((e) => {
          const estadoUI  = registros[e.id]?.estado ?? 'PRESENTE';
          const estadoAPI = ESTADO_UI_A_API[estadoUI] ?? estadoUI.toLowerCase();
          return {
            estudiante_id: e.id,
            estado:        estadoAPI,
            observacion:   registros[e.id]?.observacion ?? '',
          };
        }),
      };
      console.log('[EduERP] Payload a enviar:', payload);
      const res = await client.post('/asistencia/registro/masivo', payload);
      console.log('[EduERP] Respuesta guardar:', res.data);
      const data = res.data ?? {};
      setExito(
        data.mensaje ??
        `${data.registros_guardados ?? estudiantes.length} registros guardados.`
      );
      setDiaCerrado(true);
    } catch (err) {
      const detalle =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        `Error ${err?.response?.status ?? ''}: No se pudo guardar la asistencia.`;
      setError(detalle);
      console.error('[EduERP] Error guardar:', {
        status: err?.response?.status,
        data:   err?.response?.data,
      });
    } finally {
      setGuardando(false);
    }
  };

  // ── Cerrar día ────────────────────────────────────────────────────
  const cerrarDia = async () => {
    await guardar();
    setDiaCerrado(true);
    setExito(
      `✅ Asistencia del ${fecha} cerrada correctamente. ` +
      `${presentes}/${total} estudiantes presentes.`
    );
  };

  // ── KPIs calculados ───────────────────────────────────────────────
  const total      = estudiantes.length;
  const presentes  = Object.values(registros).filter((r) => r.estado === 'PRESENTE').length;
  const faltas     = Object.values(registros).filter((r) => r.estado === 'FALTA').length;
  const tardanzas  = Object.values(registros).filter((r) => r.estado === 'TARDANZA').length;
  const justif     = Object.values(registros).filter((r) => r.estado === 'JUSTIFICADO').length;
  const pct        = total > 0 ? Math.round((presentes / total) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Asistencia</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro diario por sección</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key: 'registro',  label: 'Registro' },
            { key: 'historial', label: 'Historial' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros comunes */}
      <div className="flex flex-wrap items-center gap-3">
        {loadingSecciones ? (
          <div className="h-9 w-40 bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <select
            value={secciones.find((s) => (s.nombre ?? s.seccion ?? s.name) === seccionId)?.id ?? seccionId}
            onChange={(e) => {
              const sec    = secciones.find((s) => String(s.id) === e.target.value);
              const nombre = sec?.nombre ?? sec?.seccion ?? sec?.name ?? e.target.value;
              setSeccionId(nombre);
            }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Seleccionar sección...</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre ?? s.seccion ?? s.grado}
              </option>
            ))}
          </select>
        )}

        {tab === 'registro' && (
          <input
            type="date"
            value={fecha}
            max={hoy()}
            onChange={(e) => setFecha(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        )}

        {tab === 'historial' && (
          <>
            <select
              value={histMes}
              onChange={(e) => setHistMes(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {meses.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={histAnio}
              onChange={(e) => setHistAnio(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          ❌ {error}
        </div>
      )}
      {exito && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-700 text-sm">
          ✅ {exito}
        </div>
      )}

      {/* ═══ TAB: REGISTRO ════════════════════════════════════════════ */}
      {tab === 'registro' && (
        <>
          {/* KPI del día */}
          {!loadingEstudiantes && total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiPill label="Total"     value={total}    color="gray"   />
              <KpiPill label="Presentes" value={presentes} color="green"  />
              <KpiPill label="Faltas"    value={faltas}    color="red"    />
              <KpiPill label="Tardanzas" value={tardanzas} color="amber"  />
              <KpiPill label="Asistencia%" value={`${pct}%`} color="indigo" />
            </div>
          )}

          {loadingEstudiantes ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex gap-2">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
              <p className="text-gray-400 text-sm">
                {seccionId ? 'No hay estudiantes en esta sección.' : 'Selecciona una sección para continuar.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Acciones rápidas */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">
                  Marcar todos:
                </span>
                {ESTADOS.map((e) => (
                  <button
                    key={e.key}
                    onClick={() => marcarTodos(e.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm ${e.color}`}
                  >
                    {e.full}
                  </button>
                ))}
              </div>

              {/* Badge día ya registrado */}
              {diaCerrado && (
                <div className="px-5 py-2.5 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2 text-sm text-emerald-700 font-medium">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                    <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
                  </svg>
                  Asistencia registrada — puedes corregirla
                </div>
              )}

              {/* Lista de estudiantes */}
              <div className="divide-y divide-gray-50">
                {estudiantes.map((est, idx) => {
                  const reg = registros[est.id] ?? { estado: 'presente', observacion: '' };
                  const nombre = est.nombre_completo ?? `${est.nombre ?? ''} ${est.apellido ?? ''}`.trim();
                  return (
                    <div
                      key={est.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      {/* Número + nombre */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 text-xs text-gray-400 font-mono text-right flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate">{nombre}</span>
                        {est.codigo && (
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0">{est.codigo}</span>
                        )}
                      </div>

                      {/* Botones de estado */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-9 sm:ml-0">
                        {ESTADOS.map((e) => (
                          <EstadoBtn
                            key={e.key}
                            estado={e.key}
                            selected={reg.estado === e.key}
                            onChange={(s) => setEstado(est.id, s)}
                          />
                        ))}
                      </div>

                      {/* Observación (solo si no es presente) */}
                      {reg.estado !== 'presente' && (
                        <input
                          type="text"
                          value={reg.observacion}
                          onChange={(ev) => setObservacion(est.id, ev.target.value)}
                          placeholder="Observación..."
                          maxLength={120}
                          className="text-xs border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-gray-700 sm:max-w-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer — dos botones */}
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">
                    {presentes}/{total} presentes · {pct}% asistencia
                  </p>
                  {diaCerrado && (
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">
                      ✓ Asistencia del día guardada
                    </p>
                  )}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  {/* Guardar / Actualizar — acción secundaria */}
                  <button
                    onClick={guardar}
                    disabled={guardando || estudiantes.length === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-300 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {guardando ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Guardando...
                      </>
                    ) : diaCerrado ? '✏️ Actualizar' : '💾 Borrador'}
                  </button>
                  {/* Cerrar día — acción principal */}
                  <button
                    onClick={cerrarDia}
                    disabled={guardando || estudiantes.length === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {diaCerrado ? '✅ Cerrada' : '🔒 Cerrar día'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: HISTORIAL ═══════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loadingHistorial ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex gap-2">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : historial.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No hay registros de asistencia para este período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">Fecha</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">Sección</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">Presentes</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">Faltas</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">Tardanzas</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.map((h, i) => {
                    const tot = (h.presentes ?? 0) + (h.faltas ?? 0) + (h.tardanzas ?? 0) + (h.justificados ?? 0);
                    const pctH = tot > 0 ? Math.round(((h.presentes ?? 0) / tot) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-800">{h.fecha}</td>
                        <td className="px-5 py-3 text-gray-600">{h.seccion ?? h.nombre ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            {h.presentes ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {h.faltas ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            {h.tardanzas ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-16">
                              <div
                                className="bg-indigo-500 h-1.5 rounded-full"
                                style={{ width: `${pctH}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-8">{pctH}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
