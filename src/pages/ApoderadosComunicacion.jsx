import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import service, { errorComunicacion } from '../services/apoderadosComunicacionService';
import { cargarCatalogosIncidencias } from '../services/incidenciasService';
import { ApoderadosEstudiante, HistorialComunicacion } from '../components/ComunicacionApoderado';

const blank = { nombre: '', documento: '', email: '', telefono: '', activo: true };
const control = 'w-full rounded-lg border bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

export default function ApoderadosComunicacion() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const manage = ['ADMIN', 'DIRECTOR'].includes(role);
  const allowed = manage || role === 'DOCENTE';
  const [apoderados, setApoderados] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [apoderadoId, setApoderadoId] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [principal, setPrincipal] = useState(false);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const cargar = useCallback(async () => {
    const [guardians, catalogos, comunicaciones] = await Promise.all([manage ? service.apoderados() : Promise.resolve([]), cargarCatalogosIncidencias(), service.comunicaciones()]);
    setApoderados(guardians); setEstudiantes(catalogos.estudiantes || []); setHistorial(comunicaciones);
  }, [manage]);
  useEffect(() => {
    if (!allowed) { setLoading(false); return; }
    cargar().catch((err) => setError(errorComunicacion(err))).finally(() => setLoading(false));
  }, [allowed, cargar]);
  const guardar = async (event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const { documento, ...changes } = form;
      const payload = { ...changes, nombre: changes.nombre.trim(), email: changes.email.trim(), telefono: changes.telefono?.trim() || null };
      if (editing) await service.editarApoderado(editing, payload);
      else await service.crearApoderado({ ...payload, documento: documento.trim() });
      setForm(null); setEditing(null); setSuccess('Apoderado guardado.'); await cargar(); setRefresh((n) => n + 1);
    } catch (err) { setError(errorComunicacion(err)); } finally { setSaving(false); }
  };
  const relacionar = async (event) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await service.relacionar(Number(estudianteId), { apoderado_id: Number(apoderadoId), parentesco: parentesco.trim(), principal, activo: true });
      setSuccess('Relación registrada.'); setRefresh((n) => n + 1); setApoderadoId(''); setParentesco(''); setPrincipal(false);
    } catch (err) { setError(errorComunicacion(err)); } finally { setSaving(false); }
  };
  if (!allowed) return <p className="p-6">No tienes acceso a la gestión de apoderados.</p>;
  return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6"><h1 className="text-2xl font-bold">Apoderados y comunicación institucional</h1>
    <p className="text-sm text-slate-500">Comunicaciones EMAIL / SANDBOX. Sin envío externo. Puedes registrar comunicaciones desde una incidencia, asistencia o justificación.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{success}</p>}
    {loading ? <p>Cargando apoderados y comunicaciones…</p> : <>
      {manage && <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex justify-between gap-3"><h2 className="text-xl font-semibold">Gestión de Apoderados</h2><button type="button" disabled={saving} className={button} onClick={() => { setEditing(null); setForm({ ...blank }); }}>Crear apoderado</button></div>
        {!apoderados.length && <p>No hay apoderados registrados.</p>}
        {apoderados.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-3"><span>{row.nombre} · {row.activo ? 'Activo' : 'Inactivo'}</span><button type="button" disabled={saving} onClick={() => { setEditing(row.id); setForm({ nombre: row.nombre, documento: row.documento, email: row.email, telefono: row.telefono || '', activo: row.activo }); }} className="rounded-lg border px-3 py-2 text-sm">Editar</button></div>)}
        {form && <form onSubmit={guardar} className="space-y-3 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold">{editing ? 'Editar apoderado' : 'Nuevo apoderado'}</h3>
          {[['nombre', 'Nombre', 'text', 240], ['documento', 'Documento', 'text', 80], ['email', 'Email', 'email', 320], ['telefono', 'Teléfono', 'tel', 40]].map(([key, label, type, max]) => <label key={key} className="block">{label}<input required={key !== 'telefono'} disabled={key === 'documento' && !!editing} type={type} maxLength={max} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={control} /></label>)}
          <label className="flex gap-2"><input type="checkbox" checked={form.activo} onChange={(event) => setForm({ ...form, activo: event.target.checked })} />Activo</label>
          <div className="flex gap-3"><button type="submit" disabled={saving || !form.nombre.trim() || !form.documento.trim()} className={button}>Guardar apoderado</button><button type="button" disabled={saving} onClick={() => setForm(null)}>Cancelar</button></div>
        </form>}
      </section>}
      <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="text-xl font-semibold">Estudiante → Apoderado</h2>
        <label className="block">Estudiante con matrícula activa<select value={estudianteId} onChange={(event) => setEstudianteId(event.target.value)} className={control}><option value="">Selecciona estudiante</option>{estudiantes.map((row) => <option key={row.id} value={row.id}>{row.nombre || row.username}</option>)}</select></label>
        {!estudiantes.length && <p>No hay estudiantes con matrícula activa dentro de tu alcance.</p>}
        {estudianteId && <ApoderadosEstudiante key={estudianteId} estudianteId={Number(estudianteId)} refresh={refresh} />}
        {manage && estudianteId && <form onSubmit={relacionar} className="space-y-3"><h3 className="font-semibold">Relacionar apoderado</h3><label className="block">Apoderado activo<select required value={apoderadoId} onChange={(event) => setApoderadoId(event.target.value)} className={control}><option value="">Selecciona apoderado</option>{apoderados.filter((row) => row.activo).map((row) => <option key={row.id} value={row.id}>{row.nombre}</option>)}</select></label>
          <label className="block">Parentesco<input required maxLength={40} value={parentesco} onChange={(event) => setParentesco(event.target.value)} className={control} /></label><label className="flex gap-2"><input type="checkbox" checked={principal} onChange={(event) => setPrincipal(event.target.checked)} />Apoderado principal</label>
          <button type="submit" disabled={saving || !apoderadoId || !parentesco.trim()} className={button}>Registrar relación</button>
        </form>}
      </section>
      <HistorialComunicacion rows={estudianteId ? historial.filter((row) => String(row.estudiante_id) === estudianteId) : historial} />
    </>}
  </main>;
}
