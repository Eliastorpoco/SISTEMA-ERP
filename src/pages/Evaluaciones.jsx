import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import service, { errorEvaluacion } from '../services/evaluacionesService';

// Recovery source: academic-core 7b6f0ce, server results without fallback records.
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const names = { AD: 'Logro destacado', A: 'Logro esperado', B: 'En proceso', C: 'Inicio' };
function Message({ children }) { return <p className="rounded-xl border bg-white p-6 text-sm text-gray-500">{children}</p>; }

function Resultados({ evaluacion, writer }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null);
  const load = useCallback(async () => {
    const [data, estudiantes] = await Promise.all([service.resultados(evaluacion.id), writer ? service.estudiantes(evaluacion.id) : Promise.resolve([])]);
    setResult({ ...data, estudiantes });
    setDraft(Object.fromEntries(data.resultados.map((row) => [row.estudiante_id, { nivel_logro: row.nivel_logro, puntaje: row.puntaje ?? '', retroalimentacion: row.retroalimentacion || '' }])));
  }, [evaluacion.id, writer]);
  useEffect(() => { load().catch((err) => setError(errorEvaluacion(err))); }, [load]);
  const change = (id, key, value) => setDraft((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  const guardar = async (event, student) => {
    event.preventDefault(); if (saving !== null) return;
    setSaving(student.estudiante_id); setError(''); setSuccess('');
    const value = draft[student.estudiante_id] || {};
    try {
      await service.guardar(evaluacion.id, { estudiante_id: student.estudiante_id, nivel_logro: value.nivel_logro, puntaje: value.puntaje === '' || value.puntaje == null ? null : Number(value.puntaje), retroalimentacion: value.retroalimentacion?.trim() || null });
      const data = await service.resultados(evaluacion.id);
      setResult((current) => ({ ...current, ...data }));
      setSuccess(`Resultado guardado para ${student.username}.`);
    } catch (err) { setError(errorEvaluacion(err)); } finally { setSaving(null); }
  };
  return <section className="space-y-4 rounded-xl border bg-white p-4">
    <h2 className="text-xl font-bold">{evaluacion.titulo}</h2>
    <p className="text-sm text-gray-600">{evaluacion.periodo_nombre} · {evaluacion.seccion_nombre} · {evaluacion.curso_nombre} · {evaluacion.competencia_nombre}</p>
    <p className="text-sm text-gray-500">Docente: {evaluacion.docente_username} · Fecha: {evaluacion.fecha_aplicacion}</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{success && <p role="status" className="text-emerald-700">{success}</p>}
    {!result ? !error && <Message>Cargando resultados…</Message> : <>
      {writer && <section className="space-y-3"><h3 className="font-semibold">Estudiantes con matrícula activa</h3>
        {!result.estudiantes.length && <Message>No hay estudiantes elegibles en esta sección.</Message>}
        {result.estudiantes.map((student) => { const value = draft[student.estudiante_id] || {}; return <form key={student.matricula_id} onSubmit={(event) => guardar(event, student)} className="space-y-3 rounded-lg border p-3">
          <p className="font-semibold">{student.username}</p><div className="grid gap-3 md:grid-cols-3">
            <label>Nivel<select required value={value.nivel_logro || ''} onChange={(event) => change(student.estudiante_id, 'nivel_logro', event.target.value)} className={input}><option value="">Selecciona nivel</option>{result.niveles.map((level) => <option key={level} value={level}>{level} · {names[level]}</option>)}</select></label>
            <label>Puntaje opcional (0–20)<input type="number" min={0} max={20} step="0.01" value={value.puntaje ?? ''} onChange={(event) => change(student.estudiante_id, 'puntaje', event.target.value)} className={input} /></label>
            <label>Retroalimentación<textarea maxLength={8000} value={value.retroalimentacion || ''} onChange={(event) => change(student.estudiante_id, 'retroalimentacion', event.target.value)} className={input} /></label>
          </div><button type="submit" disabled={saving !== null || !value.nivel_logro} className={button}>{saving === student.estudiante_id ? 'Guardando…' : 'Guardar resultado'}</button>
        </form>; })}
      </section>}
      <h3 className="font-semibold">Resultados registrados</h3>
      {!result.resultados.length ? <Message>No hay resultados registrados.</Message> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['Estudiante', 'Nivel', 'Puntaje', 'Retroalimentación', 'Revisor / fecha'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{result.resultados.map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-semibold">{row.estudiante}</td><td className="p-3">{row.nivel_logro || 'No registrado'}</td><td className="p-3">{row.puntaje ?? '—'}</td><td className="whitespace-pre-wrap break-words p-3">{row.retroalimentacion || '—'}</td><td className="p-3">{row.revisor} · {row.updated_at}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}

export default function Evaluaciones() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const writer = ['ADMIN', 'DIRECTOR', 'DOCENTE'].includes(role);
  const admin = ['ADMIN', 'DIRECTOR'].includes(role);
  const [rows, setRows] = useState([]);
  const [catalogos, setCatalogos] = useState({ asignaciones: [], competencias: [] });
  const [selected, setSelected] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('evaluacion_id') || '');
  const [asignacionId, setAsignacionId] = useState('');
  const [competenciaId, setCompetenciaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nombreCompetencia, setNombreCompetencia] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const [evaluaciones, cat] = await Promise.all([service.listar(), writer ? service.catalogos() : Promise.resolve({ asignaciones: [], competencias: [] })]);
    setRows(evaluaciones); setCatalogos(cat);
    setSelected((current) => evaluaciones.some((row) => row.id === current) ? current : evaluaciones[0]?.id || '');
  }, [writer]);
  useEffect(() => { load().catch((err) => setError(errorEvaluacion(err))).finally(() => setLoading(false)); }, [load]);
  useEffect(() => { const url = new URL(window.location.href); if (selected) url.searchParams.set('evaluacion_id', selected); else url.searchParams.delete('evaluacion_id'); window.history.replaceState(null, '', url); }, [selected]);
  const assignment = catalogos.asignaciones.find((row) => String(row.id) === asignacionId);
  const competencies = catalogos.competencias.filter((row) => row.curso_id === assignment?.curso_id);
  const current = rows.find((row) => row.id === selected);
  const create = async (event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      const item = await service.crear({ asignacion_id: Number(asignacionId), competencia_id: competenciaId, titulo: titulo.trim(), fecha_aplicacion: fecha });
      await load(); setSelected(item.id); setTitulo('');
    } catch (err) { setError(errorEvaluacion(err)); } finally { setSaving(false); }
  };
  const createCompetence = async () => {
    if (!assignment || !nombreCompetencia.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const item = await service.competencia({ curso_id: assignment.curso_id, nombre: nombreCompetencia.trim() });
      await load(); setCompetenciaId(item.id); setNombreCompetencia('');
    } catch (err) { setError(errorEvaluacion(err)); } finally { setSaving(false); }
  };
  return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6"><h1 className="text-2xl font-black">Evaluaciones</h1>
    <p className="text-sm text-gray-500">Periodo · sección/curso · competencia · matrícula activa · resultado</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <Message>Cargando evaluaciones…</Message> : <>
      {writer && <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer font-semibold">Nueva evaluación por competencia</summary>
        <form onSubmit={create} className="mt-4 space-y-3"><label className="block">Periodo / sección / curso<select required value={asignacionId} onChange={(event) => { setAsignacionId(event.target.value); setCompetenciaId(''); }} className={input}><option value="">Selecciona una asignación activa</option>{catalogos.asignaciones.map((row) => <option key={row.id} value={row.id}>{row.periodo_nombre} · {row.seccion_nombre} · {row.curso_nombre}</option>)}</select></label>
          {!catalogos.asignaciones.length && <Message>No hay asignaciones académicas activas dentro de tu alcance.</Message>}
          <label className="block">Competencia<select required disabled={!assignment} value={competenciaId} onChange={(event) => setCompetenciaId(event.target.value)} className={input}><option value="">Selecciona competencia del curso</option>{competencies.map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}</select></label>
          {assignment && !competencies.length && <Message>No hay competencias registradas para este curso.{!admin && ' Solicita su registro a Administración.'}</Message>}
          {admin && assignment && <div className="space-y-2 rounded-lg bg-gray-50 p-3"><label className="block">Registrar competencia del curso<input maxLength={200} value={nombreCompetencia} onChange={(event) => setNombreCompetencia(event.target.value)} className={input} /></label><button type="button" disabled={saving || !nombreCompetencia.trim()} onClick={createCompetence} className={button}>Registrar competencia</button></div>}
          <label className="block">Título<input required maxLength={250} value={titulo} onChange={(event) => setTitulo(event.target.value)} className={input} /></label>
          <label className="block">Fecha de aplicación<input required type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className={input} /></label>
          <button type="submit" disabled={saving || !competenciaId || !titulo.trim()} className={button}>Crear evaluación</button>
        </form>
      </details>}
      {!rows.length ? <Message>No hay evaluaciones registradas dentro de tu alcance.</Message> : <label className="block">Evaluación<select value={selected} onChange={(event) => setSelected(event.target.value)} className={input}>{rows.map((row) => <option key={row.id} value={row.id}>{row.periodo_nombre} · {row.seccion_nombre} · {row.curso_nombre} · {row.competencia_nombre} · {row.titulo}</option>)}</select></label>}
      {current && <Resultados key={`${current.id}-${role}`} evaluacion={current} writer={writer} />}
    </>}
  </main>;
}
