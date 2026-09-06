import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import service, { errorComunicacion } from '../services/apoderadosComunicacionService';

const control = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';

export function HistorialComunicacion({ rows }) {
  return <section className="space-y-3" aria-label="Historial de comunicación"><h3 className="font-semibold">Historial de comunicación</h3>
    {!rows.length && <p className="text-sm text-slate-500">No hay comunicaciones registradas.</p>}
    {rows.map((row) => <article key={row.id} className="space-y-1 rounded-lg border bg-white p-3 text-sm">
      <p className="font-semibold">{row.asunto}</p>
      <p>{row.created_at} · {row.estudiante_username} → {row.apoderado_nombre}</p>
      <p>{row.origen} · {row.referencia_origen} · {row.canal} · {row.estado} · {row.modo_envio}</p>
      <p>Actor: {row.actor_username}</p>
      <details><summary className="cursor-pointer">Mensaje y trazabilidad</summary><p className="my-2 whitespace-pre-wrap break-words">{row.mensaje}</p>{(row.historial || []).map((entry, index) => <p key={index}>{entry.fecha} · {entry.estado} · Actor {entry.actor_id} · {entry.detalle}</p>)}</details>
    </article>)}
  </section>;
}

export function ApoderadosEstudiante({ estudianteId, refresh = 0 }) {
  const [result, setResult] = useState(null);
  const loading = result?.estudianteId !== estudianteId || result?.refresh !== refresh;
  const rows = loading ? [] : result.rows;
  const error = loading ? '' : result.error;
  useEffect(() => {
    let active = true;
    service.relaciones(estudianteId).then((data) => { if (active) setResult({ estudianteId, refresh, rows: data.filter((row) => row.activo && row.apoderado_activo), error: '' }); })
      .catch((err) => { if (active) setResult({ estudianteId, refresh, rows: [], error: errorComunicacion(err) }); });
    return () => { active = false; };
  }, [estudianteId, refresh]);
  return <section className="space-y-2 rounded-lg border p-3"><h3 className="font-semibold">Apoderados del estudiante</h3>
    {loading ? <p>Cargando apoderados…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : !rows.length ? <p>No tiene apoderados activos relacionados.</p> : rows.map((row) => <p key={row.relacion_id} className="text-sm">{row.principal ? 'Apoderado principal' : 'Otro apoderado activo'}: {row.nombre} · {row.parentesco}</p>)}
  </section>;
}

export function ConsultarApoderados({ estudianteId, estudianteNombre }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!['ADMIN', 'DIRECTOR', 'DOCENTE'].includes(String(user?.role || '').toUpperCase())) return null;
  return <div onClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => setOpen(true)} className="my-2 rounded-lg border px-3 py-2 text-xs font-semibold text-indigo-700">Ver apoderados</button>
    {open && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4"><section role="dialog" aria-modal="true" aria-label={`Apoderados de ${estudianteNombre}`} className="w-full max-w-lg space-y-3 rounded-xl bg-white p-5 text-left">
      <div className="flex justify-between gap-3"><h2 className="font-semibold">{estudianteNombre}</h2><button autoFocus type="button" onClick={() => setOpen(false)}>Cerrar</button></div>
      <ApoderadosEstudiante estudianteId={estudianteId} />
    </section></div>}
  </div>;
}

function FormularioComunicacion({ estudianteId, estudianteNombre, origen, referencia, onClose }) {
  const [relaciones, setRelaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [destinatario, setDestinatario] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const cargar = useCallback(async () => {
    const [relacionesData, comunicaciones] = await Promise.all([service.relaciones(estudianteId), service.comunicaciones({ estudiante_id: estudianteId, origen, referencia_origen: referencia })]);
    const activas = relacionesData.filter((row) => row.activo && row.apoderado_activo);
    setRelaciones(activas); setHistorial(comunicaciones);
    setDestinatario((current) => activas.some((row) => String(row.apoderado_id) === current) ? current : String((activas.find((row) => row.principal) || activas[0])?.apoderado_id || ''));
  }, [estudianteId, origen, referencia]);
  useEffect(() => { cargar().catch((err) => setError(errorComunicacion(err))).finally(() => setLoading(false)); }, [cargar]);
  const submit = async (event) => {
    event.preventDefault();
    if (saving || !destinatario || !asunto.trim() || !mensaje.trim()) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      // Refresh recipient eligibility immediately before persisting; no provider call.
      const current = await service.relaciones(estudianteId);
      if (!current.some((row) => row.activo && row.apoderado_activo && String(row.apoderado_id) === destinatario)) throw new Error('DESTINATARIO_INACTIVO');
      const created = await service.crearComunicacion({ estudiante_id: estudianteId, apoderado_id: Number(destinatario), origen, referencia_origen: referencia, asunto: asunto.trim(), mensaje: mensaje.trim(), canal: 'EMAIL' });
      setHistorial((rows) => [created, ...rows]); setAsunto(''); setMensaje('');
      setSuccess(`Comunicación registrada: ${created.estado} / ${created.modo_envio}. No se realizó envío externo.`);
    } catch (err) { setError(err.message === 'DESTINATARIO_INACTIVO' ? 'El apoderado ya no está activo para este estudiante.' : errorComunicacion(err)); }
    finally { setSaving(false); }
  };
  return <section className="my-3 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4" aria-label="Comunicar a apoderado">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Comunicar a apoderado · {estudianteNombre}</h3><button type="button" disabled={saving} onClick={onClose}>Cerrar</button></div>
    <p className="text-sm">{origen} · {referencia} · EMAIL / SANDBOX. El registro queda PENDIENTE; no se envía correo.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}{success && <p role="status" className="text-emerald-700">{success}</p>}
    {loading ? <p>Cargando destinatarios e historial…</p> : <>
      {!relaciones.length ? <p>No hay un apoderado activo relacionado. Solicita a Administración registrar la relación.</p> : <form onSubmit={submit} className="space-y-3">
        <label className="block">Apoderado<select required value={destinatario} onChange={(event) => setDestinatario(event.target.value)} className={control}>{relaciones.map((row) => <option key={row.relacion_id} value={row.apoderado_id}>{row.nombre} · {row.parentesco}{row.principal ? ' · Principal' : ''}</option>)}</select></label>
        <label className="block">Asunto<input required maxLength={240} value={asunto} onChange={(event) => setAsunto(event.target.value)} className={control} /></label>
        <label className="block">Mensaje<textarea required maxLength={8000} rows={4} value={mensaje} onChange={(event) => setMensaje(event.target.value)} className={control} /></label>
        <button type="submit" className={button} disabled={saving || !asunto.trim() || !mensaje.trim()}>{saving ? 'Registrando…' : 'Registrar comunicación'}</button>
      </form>}
      <HistorialComunicacion rows={historial} />
    </>}
  </section>;
}

export default function ComunicarApoderado(props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!['ADMIN', 'DIRECTOR', 'DOCENTE'].includes(String(user?.role || '').toUpperCase()) || !props.estudianteId || !props.referencia) return null;
  return <div className="my-2" onClick={(event) => event.stopPropagation()}>
    {open ? <FormularioComunicacion key={`${props.estudianteId}-${props.referencia}`} {...props} onClose={() => setOpen(false)} /> : <button type="button" className={button} onClick={() => setOpen(true)}>Comunicar a apoderado</button>}
  </div>;
}
