import { useCallback, useEffect, useState } from 'react';
import service from '../services/asistenciaAcademicaService';
import ComunicarApoderado from './ComunicacionApoderado';

const estados = { PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada' };
const mensajeError = (error) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : detail?.message || 'No fue posible completar la operación de justificación.';
};
const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm';
const buttonClass = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

export default function JustificacionesAsistencia({ estudiante, asistencias = [], onChanged }) {
  const [justificaciones, setJustificaciones] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [observacion, setObservacion] = useState('');
  const [decision, setDecision] = useState('APROBADA');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [solicitudes, proyeccion] = await Promise.all([service.listarJustificaciones(), service.alertas()]);
      setJustificaciones(solicitudes);
      setAlertas(Array.isArray(proyeccion.filas) ? proyeccion.filas : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { cargar().catch((err) => setError(mensajeError(err))); }, [cargar]);

  const abrir = (row) => {
    setSeleccion(row); setMotivo(''); setDetalle(''); setObservacion('');
    setDecision('APROBADA'); setError(''); setExito('');
  };
  const enviar = async (event) => {
    event.preventDefault();
    if (guardando || !seleccion) return;
    setGuardando(true); setError(''); setExito('');
    try {
      if (estudiante) await service.crearJustificacion(seleccion.id, { motivo: motivo.trim(), detalle: detalle.trim() });
      else await service.revisarJustificacion(seleccion.id, { decision, observacion: observacion.trim() });
      setSeleccion(null);
      setExito(estudiante ? 'Justificación enviada: Pendiente.' : `Revisión registrada: ${estados[decision]}.`);
      await Promise.all([cargar(), onChanged?.()]);
    } catch (err) { setError(mensajeError(err)); }
    finally { setGuardando(false); }
  };
  const pendientes = justificaciones.filter((row) => row.estado === 'PENDIENTE');
  const justificables = asistencias.filter((row) => ['AUSENTE', 'TARDANZA'].includes(row.estado_original || row.estado)
    && !row.justificacion_id && !justificaciones.some((item) => item.asistencia_id === row.id));
  const tarjeta = (row) => <article key={row.id} className="space-y-2 rounded-xl border bg-white p-4 text-sm">
    <p className="font-semibold">{row.estudiante_username} · {row.fecha} · {row.curso_nombre}</p>
    <p>Estado original: {row.estado_original} · Estado efectivo: {row.estado_efectivo}</p>
    <p>Justificación: <strong>{estados[row.estado] || row.estado}</strong></p>
    {!estudiante && <ComunicarApoderado estudianteId={row.estudiante_id} estudianteNombre={row.estudiante_username} origen="JUSTIFICACION" referencia={`JUSTIFICACION-${row.id}`} />}
    <p className="whitespace-pre-wrap break-words"><strong>{row.motivo}</strong> — {row.detalle}</p>
    {row.revisado_at && <p className="whitespace-pre-wrap break-words">Revisión: {row.revisor_username || row.revisado_por} · {row.revisado_at} · {row.observacion_revision}</p>}
    {!estudiante && row.estado === 'PENDIENTE' && <button type="button" onClick={() => abrir(row)} disabled={guardando} className={buttonClass}>Revisar</button>}
  </article>;

  return <section className="space-y-4" aria-label="Justificaciones de asistencia">
    <h2 className="text-xl font-semibold">{estudiante ? 'Mis justificaciones' : 'Justificaciones pendientes'}</h2>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {exito && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{exito}</p>}
    {loading ? <p>Cargando justificaciones…</p> : <>
      {estudiante && justificables.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
        <span>{row.fecha} · {row.curso_nombre} · Estado original: {row.estado_original || row.estado}</span>
        <button type="button" className={buttonClass} onClick={() => abrir(row)} disabled={guardando}>Justificar</button>
      </div>)}
      {(estudiante ? justificaciones : pendientes).map(tarjeta)}
      {!(estudiante ? justificaciones : pendientes).length && <p className="text-sm text-gray-500">{estudiante ? 'No hay justificaciones enviadas.' : 'No hay justificaciones pendientes.'}</p>}
      {!estudiante && justificaciones.some((row) => row.estado !== 'PENDIENTE') && <details><summary className="cursor-pointer font-medium">Revisiones registradas</summary><div className="mt-3 space-y-3">{justificaciones.filter((row) => row.estado !== 'PENDIENTE').map(tarjeta)}</div></details>}
    </>}
    {seleccion && <form onSubmit={enviar} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <h3 className="font-semibold">{estudiante ? 'Justificar asistencia' : 'Revisión de justificación'} · {seleccion.fecha} · {seleccion.curso_nombre}</h3>
      {estudiante ? <>
        <label className="block">Motivo<input autoFocus required maxLength={160} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} /></label>
        <label className="block">Detalle<textarea required maxLength={4000} value={detalle} onChange={(e) => setDetalle(e.target.value)} className={inputClass} /></label>
      </> : <>
        <p className="whitespace-pre-wrap break-words">{seleccion.estudiante_username} · {seleccion.estado_original} · {seleccion.motivo} · {seleccion.detalle}</p>
        <label className="block">Decisión<select value={decision} onChange={(e) => setDecision(e.target.value)} className={inputClass}><option value="APROBADA">Aprobar</option><option value="RECHAZADA">Rechazar</option></select></label>
        <label className="block">Observación de revisión<textarea autoFocus required maxLength={4000} value={observacion} onChange={(e) => setObservacion(e.target.value)} className={inputClass} /></label>
      </>}
      <div className="flex gap-3"><button type="submit" className={buttonClass} disabled={guardando || (estudiante ? !motivo.trim() || !detalle.trim() : !observacion.trim())}>{guardando ? 'Guardando…' : estudiante ? 'Enviar justificación' : decision === 'APROBADA' ? 'Aprobar' : 'Rechazar'}</button><button type="button" disabled={guardando} onClick={() => setSeleccion(null)}>Cancelar</button></div>
    </form>}
    {alertas.length > 0 && <section className="space-y-2 rounded-xl border p-4"><h2 className="text-xl font-semibold">Alertas de asistencia</h2><p className="text-sm text-gray-500">PROYECCION_TECNICA_NO_OFICIAL_V1MD · Solo lectura; no constituye política institucional.</p>{alertas.map((row) => <div key={`${row.estudiante_id}-${row.asignacion_id}`} className="text-sm">Estudiante {row.estudiante_id} · Asignación {row.asignacion_id} · {row.alerta} · Ausencias: {row.ausencias} · Tardanzas: {row.tardanzas} · Asistencia: {row.porcentaje_asistencia}%{!estudiante && <ComunicarApoderado estudianteId={row.estudiante_id} origen="ASISTENCIA" referencia={`ASISTENCIA-ALERTA-${row.estudiante_id}-${row.asignacion_id}`} />}</div>)}</section>}
  </section>;
}
