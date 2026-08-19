import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BadgeDollarSign, CreditCard, FileClock, Landmark, Link2, ReceiptText, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('es-PE') : '—';
const roleOf = (user) => String(user?.role || '').toUpperCase();

const BADGES = {
  APROBADO: 'bg-emerald-100 text-emerald-800', PAGADO: 'bg-emerald-100 text-emerald-800',
  LINK_GENERADO: 'bg-blue-100 text-blue-800', CREADO: 'bg-slate-100 text-slate-700',
  PENDIENTE: 'bg-amber-100 text-amber-800', PARCIAL: 'bg-amber-100 text-amber-800',
  RECHAZADO: 'bg-red-100 text-red-800', ERROR: 'bg-red-100 text-red-800',
  REQUIERE_REVISION: 'bg-orange-100 text-orange-800', MONTO_INCONSISTENTE: 'bg-orange-100 text-orange-800',
};

function Badge({ value }) {
  const normalized = String(value || '—').toUpperCase();
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${BADGES[normalized] || 'bg-slate-100 text-slate-700'}`}>{normalized.replaceAll('_', ' ')}</span>;
}

function Empty({ children = 'Sin registros.' }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{children}</div>;
}

function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>;
}

function Table({ columns, rows, render }) {
  if (!rows?.length) return <Empty />;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((x) => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{rows.map(render)}</tbody></table></div>;
}

const Cell = ({ children, className = '' }) => <td className={`border-t border-slate-100 px-4 py-3 ${className}`}>{children}</td>;

export default function Finanzas() {
  const { user } = useAuth();
  const role = roleOf(user);
  const student = role === 'ESTUDIANTE';
  const tabs = useMemo(() => student ? ['Estado de cuenta'] : ['Dashboard', 'Conceptos', 'Obligaciones', 'Pagos', 'Intentos de cobro', 'Estado de cuenta', 'Integraciones'], [student]);
  const [tab, setTab] = useState(tabs[0]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const now = new Date();
      let response;
      if (tab === 'Dashboard') response = await client.get(`/finanzas/dashboard?anio=${now.getFullYear()}&mes=${now.getMonth() + 1}`);
      else if (tab === 'Conceptos') response = await client.get('/finanzas/conceptos');
      else if (tab === 'Obligaciones') response = await client.get('/finanzas/obligaciones');
      else if (tab === 'Pagos') response = await client.get('/finanzas/pagos');
      else if (tab === 'Intentos de cobro') response = await client.get('/finanzas/intentos-cobro');
      else if (tab === 'Integraciones') response = await client.get('/finanzas/integraciones/estado');
      else if (student) response = await client.get('/finanzas/mi-estado-cuenta');
      else if (studentId) response = await client.get(`/finanzas/estudiantes/${studentId}/estado-cuenta`);
      else { setData(null); return; }
      setData(response.data);
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.detail || 'No fue posible cargar la información financiera.');
    } finally { setLoading(false); }
  }, [student, studentId, tab]);

  useEffect(() => { load(); }, [load]);

  return <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800"><ShieldCheck className="h-4 w-4" />FINANZAS V1N</div><h1 className="text-3xl font-black text-slate-950">{student ? 'Mi estado de cuenta' : 'Gestión financiera'}</h1><p className="mt-1 text-sm text-slate-600">Saldos derivados de obligaciones y aplicaciones de pago canónicas.</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </header>

      {!student && <nav className="flex gap-2 overflow-x-auto pb-1">{tabs.map((x) => <button key={x} onClick={() => { setTab(x); setData(null); }} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${tab === x ? 'bg-slate-950 text-white' : 'border bg-white text-slate-600'}`}>{x}</button>)}</nav>}
      <ErrorBox error={error} />
      {loading && <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Cargando…</div>}
      {!loading && tab === 'Dashboard' && <Dashboard data={data} />}
      {!loading && tab === 'Conceptos' && <Conceptos rows={data} />}
      {!loading && tab === 'Obligaciones' && <Obligaciones rows={data} />}
      {!loading && tab === 'Pagos' && <Pagos rows={data} />}
      {!loading && tab === 'Intentos de cobro' && <Intentos rows={data} />}
      {!loading && tab === 'Integraciones' && <Integraciones data={data} />}
      {!loading && tab === 'Estado de cuenta' && <EstadoCuenta data={data} student={student} studentId={studentId} setStudentId={setStudentId} load={load} />}
    </div>
  </div>;
}

function Dashboard({ data }) {
  const p = data?.pensiones || {}; const c = data?.cobranza || {};
  const cards = [
    ['Cobrado', money(c.monto_cobrado), Landmark, 'text-emerald-700 bg-emerald-50'],
    ['Pendiente', money(p.pendientes?.monto), FileClock, 'text-amber-700 bg-amber-50'],
    ['Vencido', money(p.vencidas?.monto), AlertCircle, 'text-red-700 bg-red-50'],
    ['Tasa de cobranza', `${Number(c.tasa_pct || 0).toFixed(1)}%`, BadgeDollarSign, 'text-indigo-700 bg-indigo-50'],
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, tone]) => <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-xl p-2 ${tone}`}>{createElement(Icon, { className: 'h-5 w-5' })}</div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></article>)}</div>;
}

function Conceptos({ rows }) {
  return <Table columns={['Concepto', 'Descripción', 'Monto base', 'Estado']} rows={rows} render={(x) => <tr key={x.id}><Cell className="font-bold">{x.nombre}</Cell><Cell>{x.descripcion || '—'}</Cell><Cell>{money(x.monto_default)}</Cell><Cell><Badge value={x.activo ? 'ACTIVO' : 'INACTIVO'} /></Cell></tr>} />;
}

function Obligaciones({ rows }) {
  return <Table columns={['Estudiante', 'Concepto', 'Periodo', 'Monto original', 'Saldo', 'Estado']} rows={rows} render={(x) => <tr key={x.id}><Cell className="font-bold">{x.estudiante}</Cell><Cell>{x.concepto}</Cell><Cell>{String(x.mes).padStart(2, '0')}/{x.anio}</Cell><Cell>{money(x.monto_original)}</Cell><Cell className="font-black">{money(x.saldo)}</Cell><Cell><Badge value={Number(x.saldo) === 0 ? 'PAGADO' : x.estado} /></Cell></tr>} />;
}

function Pagos({ rows }) {
  return <Table columns={['Estudiante', 'Concepto', 'Monto', 'Medio', 'Provider', 'Estado', 'Fecha', 'Referencia externa']} rows={rows} render={(x) => <tr key={x.id}><Cell className="font-bold">{x.estudiante}</Cell><Cell>{x.concepto}</Cell><Cell>{money(x.monto_pagado)}</Cell><Cell>{x.metodo_pago}</Cell><Cell>{x.provider || 'ERP'}</Cell><Cell><Badge value={x.estado} /></Cell><Cell>{date(x.fecha_pago)}</Cell><Cell className="max-w-52 truncate" title={x.external_payment_id || ''}>{x.external_payment_id || '—'}</Cell></tr>} />;
}

function Intentos({ rows }) {
  return <Table columns={['Estudiante', 'Obligación', 'Monto', 'Provider', 'External reference', 'Preference', 'Estado', 'Fecha', 'Payment ID']} rows={rows} render={(x) => <tr key={x.id}><Cell className="font-bold">{x.estudiante}</Cell><Cell>{x.concepto}</Cell><Cell>{money(x.monto)}</Cell><Cell>{x.provider}</Cell><Cell className="max-w-48 truncate" title={x.external_reference}>{x.external_reference}</Cell><Cell className="max-w-40 truncate">{x.preference_id || '—'}</Cell><Cell><Badge value={x.estado} /></Cell><Cell>{date(x.created_at)}</Cell><Cell>{x.external_payment_id || '—'}</Cell></tr>} />;
}

function EstadoCuenta({ data, student, studentId, setStudentId, load }) {
  return <section className="space-y-4">
    {!student && <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex max-w-lg gap-2 rounded-2xl border bg-white p-4"><input type="number" min="1" required value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="ID del estudiante" className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm" /><button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Consultar</button></form>}
    {data && <><div className="grid gap-4 sm:grid-cols-3"><Summary label="Estudiante" value={data.estudiante?.nombre} icon={Users} /><Summary label="Total pendiente" value={money(data.total_pendiente)} icon={CreditCard} /><Summary label="Próximo vencimiento" value={date(data.vencimiento_proximo)} icon={ReceiptText} /></div><Obligaciones rows={(data.obligaciones || []).map((x) => ({ ...x, id: x.obligacion_id, estudiante: data.estudiante?.nombre }))} /><h2 className="pt-2 text-lg font-black">Últimos pagos</h2><Table columns={['Concepto', 'Monto', 'Medio', 'Provider', 'Estado', 'Fecha']} rows={data.pagos} render={(x, index) => <tr key={`${x.fecha_pago}-${index}`}><Cell>{x.concepto}</Cell><Cell>{money(x.monto)}</Cell><Cell>{x.metodo_pago}</Cell><Cell>{x.provider || 'ERP'}</Cell><Cell><Badge value={x.estado} /></Cell><Cell>{date(x.fecha_pago)}</Cell></tr>} /></>}
    {!data && !studentId && !student && <Empty>Ingresa un estudiante para consultar su estado de cuenta.</Empty>}
  </section>;
}

function Summary({ label, value, icon: Icon }) {
  return <article className="rounded-2xl border bg-white p-5">{createElement(Icon, { className: 'mb-3 h-5 w-5 text-indigo-600' })}<p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value || '—'}</p></article>;
}

function Integraciones({ data }) {
  if (!data) return <Empty />;
  const cards = [
    ['WhatsApp', data.whatsapp?.estado, data.whatsapp?.provider || 'Sin proveedor', Link2],
    ['n8n', data.n8n, 'Orquestación', RefreshCw],
    ['Mercado Pago', data.mercado_pago, 'Checkout Pro', CreditCard],
    ['APIsPERU', data.apisperu, 'Validación documental', ShieldCheck],
  ];
  return <div className="grid gap-4 sm:grid-cols-2">{cards.map(([name, state, detail, Icon]) => <article key={name} className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2">{createElement(Icon, { className: 'h-5 w-5' })}</div><div><h3 className="font-black">{name}</h3><p className="text-xs text-slate-500">{detail}</p></div></div><Badge value={state} /></div></article>)}</div>;
}
