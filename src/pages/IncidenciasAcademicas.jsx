import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Plus, X } from 'lucide-react';

import { useAuth } from '../context/useAuth';
import ComunicarApoderado from '../components/ComunicacionApoderado';
import {
  agregarAccionTutorial,
  cambiarEstadoIncidencia,
  cargarCatalogosIncidencias,
  cargarDetalleIncidencia,
  cargarIncidencias,
  crearIncidencia,
} from '../services/incidenciasService';
import {
  detalleErrorIncidencias,
  etiqueta,
  filtrosApiIncidencias,
  siguienteEstado,
  TIPOS_INCIDENCIA,
} from '../utils/incidencias';

const EMPTY_FILTERS = { estudiante_id: '', seccion_id: '', tipo: '', estado: '' };
const EMPTY_FORM = { estudiante_id: '', tipo: 'TUTORIA', categoria: '', descripcion: '', responsable_id: '', origen: 'MANUAL', referencia_origen: '' };
const EMPTY_ACTION = { tipo: 'ORIENTACION', descripcion: '', fecha: new Date().toISOString().slice(0, 10), responsable_id: '', observacion: '' };

const stateTone = {
  ABIERTA: 'bg-blue-50 text-blue-700',
  EN_SEGUIMIENTO: 'bg-amber-50 text-amber-700',
  CERRADA: 'bg-emerald-50 text-emerald-700',
};

function Select({ label, value, onChange, children, disabled = false, testId }) {
  return <label className="block min-w-0">
    {label && <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>}
    <select data-testid={testId} aria-label={label} value={value} onChange={onChange} disabled={disabled} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
      {children}
    </select>
  </label>;
}

function Card({ label, value, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700' };
  return <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <div className={`mt-3 inline-flex min-h-10 items-center rounded-xl px-3 text-xl font-bold ${tones[tone]}`}>{value || 0}</div>
  </article>;
}

function Modal({ title, children, onClose, width = 'max-w-xl' }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      {children}
    </section>
  </div>;
}

function NuevaIncidencia({ catalogos, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedStudent = catalogos.estudiantes.find((item) => String(item.id) === String(form.estudiante_id));
  const responsables = catalogos.responsables.filter((item) => !selectedStudent || Number(item.seccion_id) === Number(selectedStudent.seccion_id));
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value, ...(key === 'estudiante_id' ? { responsable_id: '' } : {}) }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.estudiante_id || !form.categoria.trim() || !form.descripcion.trim() || !form.responsable_id) {
      setError('Completa estudiante, categoría, descripción y responsable.');
      return;
    }
    if (form.origen === 'ASISTENCIA' && !form.referencia_origen.trim()) {
      setError('El origen Asistencia requiere una referencia ASISTENCIA-ID.');
      return;
    }
    setSaving(true); setError('');
    try {
      const created = await crearIncidencia({
        estudiante_id: Number(form.estudiante_id), tipo: form.tipo, categoria: form.categoria.trim(),
        descripcion: form.descripcion.trim(), origen: form.origen,
        referencia_origen: form.referencia_origen.trim() || null, responsable_id: Number(form.responsable_id),
      });
      await onSaved(created);
    } catch (requestError) { setError(detalleErrorIncidencias(requestError, 'No se pudo crear la incidencia.')); }
    finally { setSaving(false); }
  };

  return <Modal title="Nueva incidencia" onClose={onClose}>
    <form onSubmit={submit} className="space-y-4 p-5" data-testid="incidencia-create-form">
      <Select label="Estudiante" value={form.estudiante_id} onChange={update('estudiante_id')} testId="incidencia-estudiante">
        <option value="">Selecciona un estudiante con matrícula activa</option>
        {catalogos.estudiantes.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.username}</option>)}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tipo" value={form.tipo} onChange={update('tipo')}><option value="CONVIVENCIA">Convivencia</option><option value="ASISTENCIA">Asistencia</option><option value="ACADEMICA">Académica</option><option value="TUTORIA">Tutoría</option></Select>
        <Select label="Origen" value={form.origen} onChange={update('origen')}><option value="MANUAL">Manual</option><option value="ASISTENCIA">Asistencia</option><option value="AULA_VIRTUAL">Aula Virtual</option><option value="OTRO">Otro</option></Select>
      </div>
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Categoría</span><input value={form.categoria} onChange={update('categoria')} maxLength={160} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="Ej. Seguimiento preventivo" /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Descripción</span><textarea value={form.descripcion} onChange={update('descripcion')} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Describe la situación observada" /></label>
      {form.origen === 'ASISTENCIA' && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Referencia de asistencia</span><input value={form.referencia_origen} onChange={update('referencia_origen')} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="ASISTENCIA-123" /></label>}
      <Select label="Responsable" value={form.responsable_id} onChange={update('responsable_id')} disabled={!form.estudiante_id} testId="incidencia-responsable">
        <option value="">Selecciona un docente de la sección</option>
        {responsables.map((item) => <option key={`${item.id}-${item.seccion_id}`} value={item.id}>{item.username}</option>)}
      </Select>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button type="submit" disabled={saving} className="rounded-xl bg-[#1a4a8a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Crear incidencia'}</button></div>
    </form>
  </Modal>;
}

function DetalleIncidencia({ value, catalogos, canManage, onClose, onChanged }) {
  const [detalle, setDetalle] = useState(value);
  const [acciones, setAcciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState({ ...EMPTY_ACTION, responsable_id: String(value.responsable_id || '') });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await cargarDetalleIncidencia(value.id); setDetalle(data.detalle); setAcciones(data.acciones); setError(''); }
    catch (requestError) { setError(detalleErrorIncidencias(requestError, 'No se pudo cargar el detalle.')); }
    finally { setLoading(false); }
  }, [value.id]);
  useEffect(() => { load(); }, [load]);

  const transition = async () => {
    const next = siguienteEstado(detalle.estado);
    if (!next) return;
    const observation = next === 'CERRADA' ? 'Situación atendida y seguimiento concluido.' : 'Se inicia seguimiento de la incidencia.';
    setSaving(true);
    try { setDetalle(await cambiarEstadoIncidencia(detalle.id, next, observation)); await onChanged(next === 'CERRADA' ? 'Incidencia cerrada.' : 'Seguimiento iniciado.'); setError(''); }
    catch (requestError) { setError(detalleErrorIncidencias(requestError)); }
    finally { setSaving(false); }
  };
  const submitAction = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await agregarAccionTutorial(detalle.id, { ...action, responsable_id: Number(action.responsable_id), observacion: action.observacion.trim() || null });
      setActionOpen(false); setAction({ ...EMPTY_ACTION, responsable_id: String(detalle.responsable_id || '') }); await load(); await onChanged('Acción tutorial registrada.');
    } catch (requestError) { setError(detalleErrorIncidencias(requestError, 'No se pudo registrar la acción.')); }
    finally { setSaving(false); }
  };
  const responsables = catalogos.responsables.filter((item) => Number(item.seccion_id) === Number(detalle.seccion_id));

  return <Modal title={`Incidencia #${detalle.id}`} onClose={onClose} width="max-w-3xl">
    <div className="space-y-5 p-5" data-testid="incidencia-detail">
      {loading && <p className="py-8 text-center text-sm text-slate-500">Cargando detalle…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {!loading && <>
        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-slate-400">Categoría</p><p className="font-bold text-slate-800">{detalle.categoria}</p></div><div><p className="text-xs font-semibold text-slate-400">Estado</p><span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${stateTone[detalle.estado]}`}>{etiqueta(detalle.estado)}</span></div><div><p className="text-xs font-semibold text-slate-400">Tipo / origen</p><p className="text-sm text-slate-700">{etiqueta(detalle.tipo)} · {etiqueta(detalle.origen)}</p></div><div><p className="text-xs font-semibold text-slate-400">Sección</p><p className="text-sm text-slate-700">{detalle.seccion_nombre || 'Información reservada'}</p></div></div>
        {canManage && detalle.descripcion && <p className="text-sm leading-6 text-slate-700">{detalle.descripcion}</p>}
        {canManage && <ComunicarApoderado estudianteId={detalle.estudiante_id} estudianteNombre={detalle.estudiante_username} origen="INCIDENCIA" referencia={`INCIDENCIA-${detalle.id}`} />}
        {canManage && detalle.estado !== 'CERRADA' && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setActionOpen((current) => !current)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Agregar acción tutorial</button><button type="button" onClick={transition} disabled={saving} className="rounded-xl bg-[#1a4a8a] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{detalle.estado === 'ABIERTA' ? 'Iniciar seguimiento' : 'Cerrar incidencia'}</button></div>}
        {actionOpen && <form onSubmit={submitAction} className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4" data-testid="accion-form"><div className="grid gap-3 sm:grid-cols-2"><Select label="Tipo de acción" value={action.tipo} onChange={(event) => setAction({ ...action, tipo: event.target.value })}><option value="ORIENTACION">Orientación</option><option value="ENTREVISTA">Entrevista</option></Select><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Fecha</span><input required type="date" value={action.fecha} onChange={(event) => setAction({ ...action, fecha: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label></div><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Descripción</span><textarea required value={action.descripcion} onChange={(event) => setAction({ ...action, descripcion: event.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></label><Select label="Responsable" value={action.responsable_id} onChange={(event) => setAction({ ...action, responsable_id: event.target.value })}>{responsables.map((item) => <option key={`${item.id}-${item.seccion_id}`} value={item.id}>{item.username}</option>)}</Select><div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Registrar acción</button></div></form>}
        <section><h3 className="font-bold text-slate-800">Historial de acciones</h3>{acciones.length ? <div className="mt-3 space-y-2">{acciones.map((item) => <article key={item.id} className="rounded-xl border border-slate-100 p-3 text-sm"><p className="font-bold text-slate-700">{etiqueta(item.tipo)} · {item.fecha}</p><p className="mt-1 text-slate-600">{item.descripcion}</p></article>)}</div> : <p className="mt-2 text-sm text-slate-400">Sin acciones tutoriales registradas.</p>}</section>
      </>}
    </div>
  </Modal>;
}

export default function IncidenciasAcademicas() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const canManage = ['ADMIN', 'DIRECTOR', 'DOCENTE'].includes(role);
  const [report, setReport] = useState({ dashboard: {}, filas: [] });
  const [catalogos, setCatalogos] = useState({ estudiantes: [], secciones: [], responsables: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (current = filters, showLoading = true) => {
    if (showLoading) setLoading(true);
    try { setReport(await cargarIncidencias(filtrosApiIncidencias(current))); setError(''); }
    catch (requestError) { setError(detalleErrorIncidencias(requestError, 'No se pudieron cargar las incidencias.')); }
    finally { if (showLoading) setLoading(false); }
  }, [filters]);
  useEffect(() => { const timer = window.setTimeout(() => load(filters), 200); return () => window.clearTimeout(timer); }, [filters, load]);
  useEffect(() => { if (!canManage) return; cargarCatalogosIncidencias().then(setCatalogos).catch((requestError) => setError(detalleErrorIncidencias(requestError, 'No se pudieron cargar los catálogos.'))); }, [canManage]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3000); };
  const changed = async (message) => { await load(filters, false); notify(message); };
  const created = async (item) => { setCreateOpen(false); await load(filters, false); setSelected(item); notify('Incidencia creada correctamente.'); };
  const updateFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const rows = useMemo(() => Array.isArray(report.filas) ? report.filas : [], [report.filas]);
  const dashboard = report.dashboard || {};

  return <main className="min-h-full bg-slate-50 p-4 md:p-6" data-testid="incidencias-page"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Incidencias</h1><p className="mt-1 text-sm text-slate-500">Seguimiento académico, convivencia y acciones tutoriales.</p></div>{canManage && <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a4a8a] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Nueva incidencia</button>}</header>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Card label="Abiertas" value={dashboard.abiertas} tone="blue" /><Card label="En seguimiento" value={dashboard.en_seguimiento} tone="amber" /><Card label="Cerradas" value={dashboard.cerradas} tone="green" /><Card label="Estudiantes con seguimiento" value={dashboard.estudiantes_seguimiento_activo} tone="violet" /></section>
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Select label="Estudiante" value={filters.estudiante_id} onChange={updateFilter('estudiante_id')} disabled={!canManage}><option value="">Todos los estudiantes</option>{catalogos.estudiantes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select><Select label="Sección" value={filters.seccion_id} onChange={updateFilter('seccion_id')} disabled={!canManage}><option value="">Todas las secciones</option>{catalogos.secciones.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select><Select label="Tipo" value={filters.tipo} onChange={updateFilter('tipo')}><option value="">Todos los tipos</option>{TIPOS_INCIDENCIA.map((item) => <option key={item} value={item}>{etiqueta(item)}</option>)}</Select><Select label="Estado" value={filters.estado} onChange={updateFilter('estado')}><option value="">Todos los estados</option><option value="ABIERTA">Abierta</option><option value="EN_SEGUIMIENTO">En seguimiento</option><option value="CERRADA">Cerrada</option></Select></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {loading && <div data-testid="incidencias-loading" className="flex min-h-56 items-center justify-center text-sm text-slate-500">Cargando incidencias…</div>}
      {!loading && error && <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => load(filters)} className="ml-3 font-bold underline">Reintentar</button></div>}
      {!loading && !error && rows.length === 0 && <div data-testid="incidencias-empty" className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><AlertTriangle className="h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No hay incidencias para estos filtros</p><p className="mt-1 text-sm text-slate-400">La lista se actualizará cuando se registre una incidencia.</p></div>}
      {!loading && !error && rows.length > 0 && <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-100 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Sección</th><th className="px-4 py-3">Responsable</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} data-testid={`incidencia-row-${row.id}`}><td className="px-4 py-3 font-semibold text-slate-800">{row.estudiante_username || 'Mi incidencia'}</td><td className="px-4 py-3 text-slate-600">{etiqueta(row.tipo)}</td><td className="px-4 py-3 text-slate-700">{row.categoria}</td><td className="px-4 py-3 text-slate-600">{row.seccion_nombre || '—'}</td><td className="px-4 py-3 text-slate-600">{row.responsable_username || '—'}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${stateTone[row.estado]}`}>{etiqueta(row.estado)}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleDateString('es-PE') : '—'}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"><Eye className="h-3.5 w-3.5" /> Ver</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>
  {createOpen && <NuevaIncidencia catalogos={catalogos} onClose={() => setCreateOpen(false)} onSaved={created} />}
  {selected && <DetalleIncidencia value={selected} catalogos={catalogos} canManage={canManage} onClose={() => setSelected(null)} onChanged={changed} />}
  {toast && <div role="status" className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg"><CheckCircle2 className="h-4 w-4" /> {toast}</div>}
  </main>;
}
