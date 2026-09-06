import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import asistenciaAcademicaService from '../services/asistenciaAcademicaService';
import JustificacionesAsistencia from '../components/JustificacionesAsistencia';

const ESTADOS = [
  ['PRESENTE', 'P', 'bg-emerald-100 text-emerald-700 border-emerald-300'],
  ['TARDANZA', 'T', 'bg-amber-100 text-amber-700 border-amber-300'],
  ['AUSENTE', 'A', 'bg-red-100 text-red-700 border-red-300'],
  ['JUSTIFICADO', 'J', 'bg-indigo-100 text-indigo-700 border-indigo-300'],
];
const hoy = () => new Date().toISOString().slice(0, 10);
const roleOf = (user) => String(user?.role || '').toUpperCase();
const errorText = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : detail?.message || fallback;
};
const nombreSeccion = (item) => item.seccion_nombre || item.seccion || item.nombre || `Sección ${item.seccion_id}`;
const horarioLabel = (item) => `${item.dia_semana || ''} ${String(item.hora_inicio || '').slice(0, 5)}–${String(item.hora_fin || '').slice(0, 5)} · ${item.curso_nombre || ''}`;

function EstadoButton({ estado, actual, onChange }) {
  const item = ESTADOS.find(([key]) => key === estado);
  return <button type="button" title={estado} onClick={() => onChange(estado)} className={`h-9 w-9 rounded-lg border text-xs font-bold ${actual === estado ? item[2] : 'border-gray-200 bg-white text-gray-300 hover:border-gray-400'}`}>{item[1]}</button>;
}

function Kpi({ label, value, color = 'gray' }) {
  const colors = { gray: 'bg-gray-50 text-gray-700', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', indigo: 'bg-indigo-50 text-indigo-700' };
  return <div className={`rounded-xl border border-gray-100 p-3 ${colors[color]}`}><div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</div><div className="text-xl font-bold">{value}</div></div>;
}

export default function Asistencia() {
  const { user } = useAuth();
  const role = roleOf(user);
  const estudiante = role === 'ESTUDIANTE';
  const puedeEscribir = ['DOCENTE', 'ADMIN', 'DIRECTOR'].includes(role);
  const [horarios, setHorarios] = useState([]);
  const [horarioId, setHorarioId] = useState('');
  const [seccionId, setSeccionId] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [sesion, setSesion] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [registros, setRegistros] = useState({});
  const [historial, setHistorial] = useState([]);
  const [tab, setTab] = useState('registro');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const actualizarMiAsistencia = async () => setHistorial(await asistenciaAcademicaService.miAsistencia());

  const secciones = useMemo(() => {
    const map = new Map();
    horarios.forEach((item) => { if (item.seccion_id != null) map.set(String(item.seccion_id), { id: String(item.seccion_id), nombre: nombreSeccion(item) }); });
    return [...map.values()];
  }, [horarios]);
  const horariosDeSeccion = useMemo(() => horarios.filter((item) => String(item.seccion_id) === String(seccionId) && item.activo !== false), [horarios, seccionId]);

  const cargarEstudiantes = useCallback(async () => {
    if (!horarioId || !fecha || estudiante) return;
    setLoading(true); setError(''); setExito('');
    try {
      const sesiones = await asistenciaAcademicaService.listarSesiones({ horario_id: Number(horarioId), fecha });
      const actual = sesiones[0] || await asistenciaAcademicaService.crearSesion({ horario_id: Number(horarioId), fecha });
      const data = await asistenciaAcademicaService.obtenerEstudiantes(actual.id);
      const lista = Array.isArray(data.estudiantes) ? data.estudiantes : [];
      const mapa = {};
      lista.forEach((item) => { mapa[item.estudiante_id] = { estado: item.estado || 'PRESENTE', observacion: item.observacion || '' }; });
      setSesion(data.sesion || actual); setEstudiantes(lista); setRegistros(mapa);
    } catch (err) {
      setSesion(null); setEstudiantes([]); setRegistros({}); setError(errorText(err, 'No fue posible cargar la sesión canónica de asistencia.'));
    } finally { setLoading(false); }
  }, [estudiante, fecha, horarioId]);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        if (estudiante) return;
        const data = await asistenciaAcademicaService.listarHorarios();
        if (!activo) return;
        setHorarios(data);
        const queryHorario = new URLSearchParams(window.location.search).get('horario_id');
        const inicial = data.find((item) => String(item.id) === queryHorario) || data.find((item) => item.activo !== false) || data[0];
        if (inicial) { setHorarioId(String(inicial.id)); setSeccionId(String(inicial.seccion_id)); }
      } catch (err) { if (activo) setError(errorText(err, 'No fue posible cargar los horarios asignados.')); }
      finally { if (activo) setLoading(false); }
    })();
    return () => { activo = false; };
  }, [estudiante]);

  useEffect(() => { cargarEstudiantes(); }, [cargarEstudiantes]);

  useEffect(() => {
    if (!estudiante || tab !== 'registro') return;
    setLoading(true); setError('');
    asistenciaAcademicaService.miAsistencia().then(setHistorial).catch((err) => { setHistorial([]); setError(errorText(err, 'No fue posible cargar mi asistencia.')); }).finally(() => setLoading(false));
  }, [estudiante, tab]);

  const cargarHistorial = useCallback(async () => {
    if (estudiante || !seccionId) return;
    setLoading(true); setError('');
    try {
      const sesiones = await asistenciaAcademicaService.listarSesiones({ seccion_id: Number(seccionId) });
      const delMes = sesiones.filter((item) => { const d = new Date(`${item.fecha}T00:00:00`); return d.getMonth() + 1 === mes && d.getFullYear() === anio; });
      const justificaciones = await asistenciaAcademicaService.listarJustificaciones({ estado: 'APROBADA' });
      const aprobadas = new Set(justificaciones.map((item) => item.asistencia_id));
      const filas = await Promise.all(delMes.map(async (item) => {
        const data = await asistenciaAcademicaService.obtenerEstudiantes(item.id);
        const estados = (data.estudiantes || []).map((row) => aprobadas.has(row.asistencia_id) ? 'JUSTIFICADO' : row.estado);
        return { id: item.id, fecha: item.fecha, seccion: item.seccion_nombre, curso: item.curso_nombre, presentes: estados.filter((x) => x === 'PRESENTE').length, tardanzas: estados.filter((x) => x === 'TARDANZA').length, ausentes: estados.filter((x) => x === 'AUSENTE').length, justificados: estados.filter((x) => x === 'JUSTIFICADO').length };
      }));
      setHistorial(filas);
    } catch (err) { setHistorial([]); setError(errorText(err, 'No fue posible cargar el historial canónico.')); }
    finally { setLoading(false); }
  }, [anio, estudiante, mes, seccionId]);
  useEffect(() => { if (tab === 'historial') cargarHistorial(); }, [cargarHistorial, tab]);

  const guardar = async () => {
    if (!sesion?.id || !estudiantes.length || !puedeEscribir) return;
    setGuardando(true); setError(''); setExito('');
    try {
      await Promise.all(estudiantes.map((item) => asistenciaAcademicaService.guardarAsistencia(sesion.id, { estudiante_id: item.estudiante_id, estado: registros[item.estudiante_id]?.estado || 'PRESENTE', observacion: registros[item.estudiante_id]?.observacion || null })));
      setExito(`${estudiantes.length} registros guardados.`);
    } catch (err) { setError(errorText(err, 'No se pudo guardar la asistencia.')); }
    finally { setGuardando(false); }
  };

  const metricas = useMemo(() => {
    const values = estudiantes.map((item) => registros[item.estudiante_id]?.estado);
    const presentes = values.filter((x) => x === 'PRESENTE').length;
    return { total: values.length, presentes, tardanzas: values.filter((x) => x === 'TARDANZA').length, ausentes: values.filter((x) => x === 'AUSENTE').length, justificados: values.filter((x) => x === 'JUSTIFICADO').length, pct: values.length ? Math.round((presentes / values.length) * 100) : 0 };
  }, [estudiantes, registros]);

  if (estudiante) return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6"><h1 className="text-2xl font-bold text-gray-900">Mi asistencia</h1>{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{loading ? <p>Cargando…</p> : historial.length === 0 ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No hay registros de asistencia.</p> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Fecha', 'Curso', 'Estado efectivo', 'Horario'].map((x) => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{historial.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.fecha}</td><td className="p-3">{row.curso_nombre || '—'}</td><td className="p-3 font-semibold">{row.estado_efectivo || row.estado}<span className="block text-xs font-normal text-gray-500">Original: {row.estado_original || row.estado}</span></td><td className="p-3">{row.hora_inicio ? `${String(row.hora_inicio).slice(0, 5)}–${String(row.hora_fin).slice(0, 5)}` : '—'}</td></tr>)}</tbody></table></div>}<JustificacionesAsistencia estudiante asistencias={historial} onChanged={actualizarMiAsistencia} /></div>;

  return <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">Asistencia</h1><p className="text-sm text-gray-500">Sección · horario · sesión · matrícula activa</p></div><div className="flex gap-1 rounded-xl bg-gray-100 p-1">{[['registro', 'Registro'], ['historial', 'Historial']].map(([key, label]) => <button type="button" key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? 'bg-white shadow-sm' : 'text-gray-500'}`}>{label}</button>)}</div></div>
    <div className="flex flex-wrap gap-3"><select value={seccionId} onChange={(e) => { setSeccionId(e.target.value); const next = horarios.find((x) => String(x.seccion_id) === e.target.value && x.activo !== false); setHorarioId(next ? String(next.id) : ''); }} className="rounded-xl border px-3 py-2 text-sm"><option value="">Seleccionar sección…</option>{secciones.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>{tab === 'registro' && <><select value={horarioId} onChange={(e) => setHorarioId(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="">Seleccionar horario…</option>{horariosDeSeccion.map((item) => <option key={item.id} value={item.id}>{horarioLabel(item)}</option>)}</select><input type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" /></>}{tab === 'historial' && <><select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm">{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm">{[2025, 2026].map((year) => <option key={year}>{year}</option>)}</select></>}</div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{exito && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{exito}</div>}
    {tab === 'historial' ? <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Fecha', 'Sección/curso', 'Presentes', 'Tardanzas', 'Ausentes', 'Justificados'].map((x) => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{historial.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.fecha}</td><td className="p-3">{row.seccion || '—'} · {row.curso || '—'}</td><td className="p-3">{row.presentes}</td><td className="p-3">{row.tardanzas}</td><td className="p-3">{row.ausentes}</td><td className="p-3">{row.justificados}</td></tr>)}</tbody></table>{!loading && !historial.length && <p className="p-8 text-center text-gray-500">No hay registros históricos disponibles.</p>}</div> : loading ? <p className="p-8 text-center text-gray-500">Cargando sesión…</p> : !horarioId ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No hay un horario activo disponible para tu usuario.</p> : !estudiantes.length ? <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500">No hay estudiantes con matrícula activa en esta sesión.</p> : <><div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Kpi label="Total" value={metricas.total} /><Kpi label="Presentes" value={metricas.presentes} color="green" /><Kpi label="Tardanzas" value={metricas.tardanzas} color="amber" /><Kpi label="Ausentes" value={metricas.ausentes} color="red" /><Kpi label="Asistencia" value={`${metricas.pct}%`} color="indigo" /></div><div className="overflow-hidden rounded-xl border bg-white"><div className="divide-y">{estudiantes.map((item) => { const registro = registros[item.estudiante_id] || {}; return <div key={item.estudiante_id} className="flex flex-wrap items-center gap-3 p-4"><div className="min-w-48 flex-1 font-medium">{item.username || `Estudiante ${item.estudiante_id}`}</div><div className="flex gap-1">{ESTADOS.map(([estado]) => <EstadoButton key={estado} estado={estado} actual={registro.estado} onChange={(value) => setRegistros((prev) => ({ ...prev, [item.estudiante_id]: { ...prev[item.estudiante_id], estado: value } }))} />)}</div><input value={registro.observacion || ''} onChange={(e) => setRegistros((prev) => ({ ...prev, [item.estudiante_id]: { ...prev[item.estudiante_id], observacion: e.target.value } }))} placeholder="Observación…" className="min-w-48 flex-1 rounded-lg border px-3 py-2 text-sm" /></div>; })}</div><div className="flex justify-end border-t bg-gray-50 p-4"><button type="button" disabled={guardando || !puedeEscribir} onClick={guardar} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar asistencia'}</button></div></div></>}
    {puedeEscribir && <JustificacionesAsistencia estudiante={false} onChanged={tab === 'historial' ? cargarHistorial : undefined} />}
  </div>;
}
