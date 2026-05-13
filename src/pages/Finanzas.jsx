import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

const hoy    = new Date();
const hoyStr = hoy.toISOString().slice(0, 10);

const MOCK_CONCEPTOS = [
  { id: 1, nombre: 'Pensión',    monto: 350 },
  { id: 2, nombre: 'Matrícula',  monto: 500 },
  { id: 3, nombre: 'Materiales', monto: 120 },
];

const MOCK_REPORTE_FIN = {
  total_esperado:  4900,
  total_cobrado:   1750,
  total_pendiente: 3150,
  por_concepto: [
    { concepto: 'Cobrado',   monto: 1750 },
    { concepto: 'Pendiente', monto: 3150 },
  ],
  pagos: [
    { estudiante: 'García Quispe, Ana',    concepto: 'Pensión Mayo',  monto: 350, estado: 'Pagado',    fecha: '2026-05-02' },
    { estudiante: 'Mamani Torres, Luis',   concepto: 'Pensión Mayo',  monto: 350, estado: 'Pendiente', fecha: '—'          },
    { estudiante: 'Flores Chávez, Rosa',   concepto: 'Matrícula',     monto: 500, estado: 'Pagado',    fecha: '2026-03-15' },
    { estudiante: 'Quispe Huanca, Carlos', concepto: 'Pensión Mayo',  monto: 350, estado: 'Vencido',   fecha: '—'          },
    { estudiante: 'Condori Apaza, María',  concepto: 'Materiales',    monto: 120, estado: 'Pagado',    fecha: '2026-04-20' },
  ],
};

const MOCK_ESTUDIANTES_FIN = [
  { id: 1,  nombre_completo: 'Lucía Quispe Mamani',      seccion: '4A', dni: '75123001' },
  { id: 2,  nombre_completo: 'Carlos Huanca Flores',     seccion: '4A', dni: '75123002' },
  { id: 3,  nombre_completo: 'Sofía Condori Rivera',     seccion: '4A', dni: '75123003' },
  { id: 4,  nombre_completo: 'Andrés Tapia Ccallo',      seccion: '4B', dni: '75123004' },
  { id: 5,  nombre_completo: 'Valeria Chávez Quispe',    seccion: '4B', dni: '75123005' },
  { id: 6,  nombre_completo: 'Diego Mamani Torres',      seccion: '5A', dni: '75123006' },
  { id: 7,  nombre_completo: 'Gabriela Apaza Luna',      seccion: '5A', dni: '75123007' },
  { id: 8,  nombre_completo: 'Mateo Huallpa Cusi',       seccion: '5B', dni: '75123008' },
  { id: 9,  nombre_completo: 'Camila Flores Quispe',     seccion: '5B', dni: '75123009' },
  { id: 10, nombre_completo: 'Sebastián Torres Mamani',  seccion: '4A', dni: '75123010' },
];

const mockPensiones = () => [
  { id: 1, mes: 'Marzo 2026',  concepto: 'Pensión',   monto: 350, estado: 'Pagado',    fecha_pago: '2026-03-05', metodo_pago: 'EFECTIVO',      numero_operacion: ''           },
  { id: 2, mes: 'Abril 2026',  concepto: 'Pensión',   monto: 350, estado: 'Pagado',    fecha_pago: '2026-04-03', metodo_pago: 'YAPE',          numero_operacion: 'OP-042891'  },
  { id: 3, mes: 'Mayo 2026',   concepto: 'Pensión',   monto: 350, estado: 'Pendiente', fecha_pago: null,          metodo_pago: null,            numero_operacion: null         },
  { id: 4, mes: 'Marzo 2026',  concepto: 'Matrícula', monto: 200, estado: 'Pagado',    fecha_pago: '2026-03-01', metodo_pago: 'TRANSFERENCIA', numero_operacion: 'TRF-00123'  },
];

const formatMoney = (n) =>
  n != null
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
    : '—';

const Badge = ({ children, color = 'gray' }) => {
  const cls = {
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    amber:  'bg-amber-100 text-amber-700',
    gray:   'bg-gray-100 text-gray-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls[color]}`}>
      {children}
    </span>
  );
};

const normalizarPago = (p, mapa = {}) => {
  const id = p.estudiante_id ?? p.alumno_id;
  const estudiante =
    p.estudiante_nombre   ??
    p.nombre_estudiante   ??
    p.estudiante          ??
    p.alumno              ??
    p.nombre_alumno       ??
    p.nombre_completo     ??
    p.student_name        ??
    (id ? mapa[id] : null) ??
    (id ? `Estudiante #${id}` : '—');

  const concepto =
    p.concepto_nombre ??
    p.nombre_concepto ??
    p.concepto        ??
    p.descripcion     ??
    p.tipo_pago       ??
    p.tipo            ??
    p.concept         ??
    'Pensión';

  const monto =
    p.monto   ?? p.importe ??
    p.amount  ?? p.total   ?? 0;

  const estado =
    p.estado      ?? p.status       ??
    p.estado_pago ?? p.payment_status ?? '—';

  const fecha =
    p.fecha          ?? p.fecha_pago    ??
    p.payment_date   ?? p.created_at    ??
    p.fecha_registro ?? null;

  return { estudiante, concepto, monto, estado, fecha };
};

const METODOS_PAGO   = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'];
const COLORS         = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];
const NOMBRES_MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const iniciales = (nombre) =>
  nombre.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const formInicial = () => ({
  concepto_id:      '',
  monto:            '',
  metodo_pago:      'EFECTIVO',
  numero_operacion: '',
  mes:              hoy.getMonth() + 1,
  anio:             hoy.getFullYear(),
  fecha:            hoyStr,
  observacion:      '',
});

// ─── Shared: buscador dropdown ───────────────────────────────────────────────
function BuscadorDropdown({ resultados, onSelect }) {
  if (!resultados.length) return null;
  return (
    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {resultados.map((e) => (
        <button
          key={e.id}
          onMouseDown={(ev) => { ev.preventDefault(); onSelect(e); }}
          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center gap-3"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {iniciales(e.nombre_completo)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{e.nombre_completo}</p>
            <p className="text-xs text-gray-400">Sección {e.seccion} · {e.dni}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Shared: card del estudiante seleccionado ─────────────────────────────────
function EstudianteCard({ estudiante, onClear, extra }) {
  return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
        {iniciales(estudiante.nombre_completo)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{estudiante.nombre_completo}</p>
        <p className="text-xs text-gray-500">Sección {estudiante.seccion} · DNI {estudiante.dni}</p>
      </div>
      {extra}
      <button onClick={onClear} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── useBuscador hook ─────────────────────────────────────────────────────────
function useBuscador() {
  const [query,     setQuery]     = useState('');
  const [resultados, setResultados] = useState([]);
  const [open,      setOpen]      = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResultados([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await client.get(`/estudiantes/buscar?q=${encodeURIComponent(query)}`);
        setResultados(res.data ?? []);
      } catch {
        const q = query.toLowerCase();
        setResultados(MOCK_ESTUDIANTES_FIN.filter(
          (e) => e.nombre_completo.toLowerCase().includes(q) || e.dni.includes(q)
        ));
      }
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return { query, setQuery, resultados, open, setOpen, ref, reset: () => { setQuery(''); setResultados([]); setOpen(false); } };
}

// ═════════════════════════════════════════════════════════════════════════════
export default function Finanzas() {
  useAuth();
  const [tab, setTab] = useState('reporte');

  // ── Reporte ──────────────────────────────────────────────────────────────
  const [mes,      setMes]      = useState(hoy.getMonth() + 1);
  const [anio,     setAnio]     = useState(hoy.getFullYear());
  const [reporte,  setReporte]  = useState(null);
  const [conceptos, setConceptos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Registrar Pago ───────────────────────────────────────────────────────
  const [formPago,      setFormPago]      = useState(formInicial);
  const [estudiantePago, setEstudiantePago] = useState(null);
  const [erroresPago,   setErroresPago]   = useState({});
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [exitoPago,     setExitoPago]     = useState(null);
  const busqPago = useBuscador();
  const pendingPreselect  = useRef(null);
  const estudiantesMapRef = useRef({});

  // ── Pensiones ────────────────────────────────────────────────────────────
  const [estudiantePension, setEstudiantePension] = useState(null);
  const [pensiones,         setPensiones]         = useState([]);
  const [loadingPensiones,  setLoadingPensiones]  = useState(false);
  const [modalComprobante,  setModalComprobante]  = useState(null);
  const busqPension = useBuscador();

  // ── Morosos ───────────────────────────────────────────────────────────────
  const [morosos,        setMorosos]        = useState([]);
  const [deudaTotalInst, setDeudaTotalInst] = useState(0);
  const [loadingMorosos, setLoadingMorosos] = useState(false);
  const [totalMorosos,   setTotalMorosos]   = useState(0);
  const [filtroMoroso,   setFiltroMoroso]   = useState('Todos');
  const [ordenMoroso,    setOrdenMoroso]    = useState('deuda_total');
  const [modalNotif,     setModalNotif]     = useState(null);
  const [msgNotif,       setMsgNotif]       = useState('');
  const [enviandoNotif,  setEnviandoNotif]  = useState(false);
  const [resultadoNotif, setResultadoNotif] = useState(null);

  // ── Carga mapa id→nombre de estudiantes (una sola vez) ───────────────────
  useEffect(() => {
    const cargarEstudiantes = async () => {
      try {
        const secciones = ['4A', '4B', '5A', '5B'];
        const todos = [];
        for (const sec of secciones) {
          try {
            const res = await client.get(`/asistencia/estudiantes?seccion_id=${sec}`);
            todos.push(...(res.data ?? []));
          } catch { continue; }
        }
        if (todos.length === 0) {
          const res = await client.get('/estudiantes');
          todos.push(...(res.data ?? []));
        }
        const mapa = {};
        todos.forEach((e) => {
          const nombre =
            (e.nombre_completo ?? `${e.nombre ?? ''} ${e.apellido ?? ''}`.trim()) || null;
          if (e.id && nombre) mapa[e.id] = nombre;
        });
        estudiantesMapRef.current = mapa;
      } catch {
        console.warn('[EduERP-DEV] No se cargó lista de estudiantes para lookup');
      }
    };
    cargarEstudiantes();
  }, []);

  // ── fetchData ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resReporte, resConceptos, resPensionesRes] = await Promise.all([
        client.get(`/finanzas/reporte/mes?mes=${mes}&anio=${anio}`),
        client.get('/finanzas/conceptos'),
        client.get(`/finanzas/pensiones?mes=${mes}&anio=${anio}`).catch(() => ({ data: [] })),
      ]);
      const raw = resReporte.data ?? {};
      const pagosRaw = Array.isArray(resPensionesRes.data) ? resPensionesRes.data : [];

      if (pagosRaw.length > 0) {
        console.warn('[EduERP-DEV] Estructura pago:', JSON.stringify(pagosRaw[0], null, 2));
      }

      const sinNombre = pagosRaw.length > 0 && pagosRaw.every(
        (p) => !p.estudiante_nombre && !p.nombre_estudiante &&
               !p.estudiante && !p.alumno && !p.nombre_completo
      );

      let pagosFinales;
      const mapa = estudiantesMapRef.current;
      if (sinNombre) {
        try {
          const resDetalle = await client.get(
            `/finanzas/pagos/detalle?mes=${mes}&anio=${anio}`
          );
          pagosFinales = (resDetalle.data ?? []).map((p) => normalizarPago(p, mapa));
        } catch {
          pagosFinales = pagosRaw.map((p) => normalizarPago(p, mapa));
        }
      } else {
        pagosFinales = pagosRaw.map((p) => normalizarPago(p, mapa));
      }

      setReporte({
        total_esperado:  raw?.pensiones?.monto_total       ?? raw?.total_esperado  ?? 0,
        total_cobrado:   raw?.cobranza?.monto_cobrado      ?? raw?.total_cobrado   ?? 0,
        total_pendiente: raw?.pensiones?.pendientes?.monto ?? raw?.total_pendiente ?? 0,
        por_concepto: Array.isArray(raw?.por_concepto)
          ? raw.por_concepto
          : [
              { concepto: 'Cobrado',   monto: raw?.cobranza?.monto_cobrado          ?? 0 },
              { concepto: 'Pendiente', monto: raw?.pensiones?.pendientes?.monto      ?? 0 },
              { concepto: 'Vencido',   monto: raw?.pensiones?.vencidas?.monto        ?? 0 },
            ].filter((c) => c.monto > 0),
        pagos: pagosFinales,
      });
      setConceptos(resConceptos.data ?? []);
    } catch (err) {
      console.warn('[EduERP-DEV] API no disponible, usando datos mock en Finanzas', err);
      setReporte(MOCK_REPORTE_FIN);
      setConceptos(MOCK_CONCEPTOS);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── fetchMorosos ──────────────────────────────────────────────────────────
  const fetchMorosos = useCallback(async () => {
    setLoadingMorosos(true);
    try {
      const params = new URLSearchParams();
      if (mes)  params.append('mes',  mes);
      if (anio) params.append('anio', anio);

      const res  = await client.get(`/finanzas/morosos?${params.toString()}`);
      const data = res.data;

      setMorosos(data.morosos        ?? []);
      setDeudaTotalInst(data.deuda_total_inst ?? 0);
      setTotalMorosos(data.total_morosos      ?? 0);

    } catch (err) {
      console.warn('[EduERP-DEV] /finanzas/morosos sin respuesta, mock');
      const MOCK_MOROSOS = [
        {
          nombre_completo: 'Ariana Flores Ticona',
          seccion: '4A', dni: '75123001',
          deuda_total: 700.0, meses_adeudados: 2, ultimo_pago: null, estado: 'Vencido',
          detalle: [
            { concepto: 'Mensualidad', mes: 5, anio: 2026, monto: 350, estado: 'pendiente' },
            { concepto: 'Mensualidad', mes: 4, anio: 2026, monto: 350, estado: 'vencido'   },
          ],
        },
        {
          nombre_completo: 'Carlos Huanca Flores',
          seccion: '4A', dni: '75123002',
          deuda_total: 350.0, meses_adeudados: 1, ultimo_pago: '2026-04-02', estado: 'Vencido',
          detalle: [
            { concepto: 'Mensualidad', mes: 5, anio: 2026, monto: 350, estado: 'vencido' },
          ],
        },
        {
          nombre_completo: 'Camila Flores Quispe',
          seccion: '5B', dni: '75123009',
          deuda_total: 1050.0, meses_adeudados: 3, ultimo_pago: null, estado: 'Vencido',
          detalle: [
            { concepto: 'Mensualidad', mes: 3, anio: 2026, monto: 350, estado: 'vencido' },
            { concepto: 'Mensualidad', mes: 4, anio: 2026, monto: 350, estado: 'vencido' },
            { concepto: 'Mensualidad', mes: 5, anio: 2026, monto: 350, estado: 'vencido' },
          ],
        },
      ];
      setMorosos(MOCK_MOROSOS);
      setDeudaTotalInst(2100.0);
      setTotalMorosos(3);
    } finally {
      setLoadingMorosos(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    if (tab === 'reporte') fetchMorosos();
  }, [mes, anio, tab, fetchMorosos]);

  // ── Reset al cambiar de tab ───────────────────────────────────────────────
  useEffect(() => {
    setExitoPago(null);
    setErroresPago({});
    if (tab === 'registrar') {
      setFormPago(formInicial());
      busqPago.reset();
      if (pendingPreselect.current) {
        setEstudiantePago(pendingPreselect.current);
        busqPago.setQuery(pendingPreselect.current.nombre_completo);
        pendingPreselect.current = null;
      } else {
        setEstudiantePago(null);
      }
    }
    if (tab !== 'pensiones') {
      setModalComprobante(null);
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar pensiones de estudiante ────────────────────────────────────────
  const cargarPensiones = async (estId) => {
    setLoadingPensiones(true);
    setPensiones([]);
    try {
      const res = await client.get(`/finanzas/pensiones/${estId}`);
      setPensiones(res.data ?? []);
    } catch {
      console.warn('[EduERP-DEV] API pensiones no disponible, usando mock');
      setPensiones(mockPensiones(estId));
    } finally {
      setLoadingPensiones(false);
    }
  };

  // ── Registrar pago ────────────────────────────────────────────────────────
  const registrarPago = async () => {
    const errs = {};
    if (!estudiantePago)                                                    errs.estudiante       = 'Selecciona un estudiante';
    if (!formPago.concepto_id)                                              errs.concepto         = 'Selecciona un concepto';
    if (!formPago.monto || Number(formPago.monto) <= 0)                     errs.monto            = 'El monto debe ser mayor a 0';
    if (formPago.metodo_pago !== 'EFECTIVO' && !formPago.numero_operacion.trim())
                                                                            errs.numero_operacion = 'Ingresa el número de operación';
    setErroresPago(errs);
    if (Object.keys(errs).length) return;

    setGuardandoPago(true);
    setExitoPago(null);
    try {
      await client.post('/finanzas/pagos', {
        estudiante_id:    estudiantePago.id,
        concepto_id:      Number(formPago.concepto_id),
        monto:            Number(formPago.monto),
        metodo_pago:      formPago.metodo_pago,
        numero_operacion: formPago.numero_operacion,
        mes:              formPago.mes,
        anio:             formPago.anio,
        fecha:            formPago.fecha,
        observacion:      formPago.observacion,
      });
      setExitoPago(`Pago registrado — ${formatMoney(Number(formPago.monto))} para ${estudiantePago.nombre_completo}`);
      setFormPago(formInicial());
      setEstudiantePago(null);
      busqPago.reset();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Error al registrar el pago.';
      setErroresPago((p) => ({ ...p, _general: msg }));
    } finally {
      setGuardandoPago(false);
    }
  };

  const irARegistrarPago = (est) => {
    pendingPreselect.current = est;
    setTab('registrar');
  };

  // ── Valores calculados reporte ────────────────────────────────────────────
  const totalEsperado  = reporte?.total_esperado  ?? 0;
  const totalCobrado   = reporte?.total_cobrado   ?? 0;
  const totalPendiente = reporte?.total_pendiente ?? (totalEsperado - totalCobrado);
  const porcentaje     = totalEsperado > 0 ? Math.round((totalCobrado / totalEsperado) * 100) : 0;
  const chartData      = Array.isArray(reporte?.por_concepto)
    ? reporte.por_concepto
    : conceptos.map((c) => ({ concepto: c.nombre ?? c, monto: 0 }));
  const pagos          = reporte?.pagos ?? [];

  const listaConceptos = conceptos.length ? conceptos : MOCK_CONCEPTOS;

  // ── Morosos filtrados y ordenados ─────────────────────────────────────────
  const morososFiltrados = useMemo(() => {
    let lista = [...morosos];
    if (filtroMoroso !== 'Todos') {
      lista = lista.filter(
        m => m.estado?.toLowerCase() === filtroMoroso.toLowerCase()
      );
    }
    lista.sort((a, b) => {
      if (ordenMoroso === 'deuda_total' || ordenMoroso === 'meses_adeudados') {
        return (b[ordenMoroso] ?? 0) - (a[ordenMoroso] ?? 0);
      }
      return String(a[ordenMoroso] ?? '').localeCompare(String(b[ordenMoroso] ?? ''));
    });
    return lista;
  }, [morosos, filtroMoroso, ordenMoroso]);

  const abrirModalNotificacion = (moroso) => {
    const meses = moroso.meses_adeudados;
    const deuda = formatMoney(moroso.deuda_total);
    const msg =
      `Estimado apoderado de ${moroso.nombre_completo}, ` +
      `le informamos que registra ${meses} mes${meses > 1 ? 'es' : ''} ` +
      `de pensión pendiente por un total de ${deuda}. ` +
      `Le solicitamos acercarse a tesorería a la brevedad posible. ` +
      `Gracias. — EduERP Institucional`;
    setMsgNotif(msg);
    setModalNotif(moroso);
    setResultadoNotif(null);
  };

  const enviarNotificacion = async () => {
    if (!modalNotif) return;
    setEnviandoNotif(true);
    try {
      await client.post('/notificaciones/masivo', {
        canal:         'whatsapp',
        destino:       'apoderado',
        estudiante_id: modalNotif.id,
        mensaje:       msgNotif,
        asunto:        `Deuda pendiente — ${modalNotif.nombre_completo}`,
      });
      setResultadoNotif({ ok: true, msg: 'Notificación enviada.' });
      setTimeout(() => setModalNotif(null), 1500);
    } catch {
      setResultadoNotif({ ok: false, msg: 'Error al enviar. Intenta de nuevo.' });
    } finally {
      setEnviandoNotif(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finanzas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cobros, pensiones y registros de pago</p>
        </div>
        {tab === 'reporte' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {NOMBRES_MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={fetchData}
              className="text-sm bg-indigo-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
              Actualizar
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'reporte',   label: 'Reporte',         icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
          { key: 'registrar', label: 'Registrar Pago',  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> },
          { key: 'pensiones', label: 'Pensiones',       icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ════════ TAB 1: REPORTE ════════ */}
      {tab === 'reporte' && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex gap-2">
                {[0,1,2].map((i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Esperado</p>
                  <p className="text-2xl font-bold text-indigo-700 mt-1">{formatMoney(totalEsperado)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Cobrado</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{formatMoney(totalCobrado)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">Pendiente</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{formatMoney(totalPendiente)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-center items-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recaudación</p>
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${porcentaje} ${100 - porcentaje}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-700">{porcentaje}%</span>
                  </div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Cobrado por Concepto</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="concepto" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [formatMoney(v), 'Monto']} />
                      <Bar dataKey="monto" radius={[6, 6, 0, 0]} maxBarSize={52}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {pagos.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Detalle de Pagos</h2>
                    <span className="text-xs text-gray-400">{pagos.length} registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Estudiante','Concepto','Monto','Estado','Fecha'].map((h) => (
                            <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pagos.map((p, i) => {
                          const est = (p.estado ?? '').toLowerCase();
                          const bc = est.includes('pag') ? 'green' : est.includes('pend') ? 'amber' : est.includes('venc') ? 'red' : 'gray';
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-5 py-3 font-medium text-gray-800">{p.estudiante ?? p.alumno ?? '—'}</td>
                              <td className="px-5 py-3 text-gray-600">{p.concepto ?? p.tipo ?? '—'}</td>
                              <td className="px-5 py-3 font-semibold text-gray-800">{formatMoney(p.monto ?? p.importe)}</td>
                              <td className="px-5 py-3"><Badge color={bc}>{p.estado ?? '—'}</Badge></td>
                              <td className="px-5 py-3 text-gray-500">{p.fecha ?? p.fecha_pago ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                  <p className="text-gray-400 text-sm">No hay registros de pagos para este período.</p>
                </div>
              )}

              {/* ── SECCIÓN MOROSOS ───────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">

                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-sm font-bold">!</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Estudiantes Morosos
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Pagos vencidos o pendientes que requieren atención
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">
                      {totalMorosos} estudiantes
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                      Total: {formatMoney(deudaTotalInst)}
                    </span>
                  </div>
                </div>

                {/* Filtros rápidos */}
                <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mr-1">
                    Filtrar:
                  </span>
                  {['Todos', 'Vencido', 'Pendiente'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFiltroMoroso(f)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        filtroMoroso === f
                          ? f === 'Vencido'
                            ? 'bg-red-600 text-white border-red-600'
                            : f === 'Pendiente'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Tabla */}
                {loadingMorosos ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex gap-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i}
                          className="w-2.5 h-2.5 rounded-full bg-red-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                ) : morososFiltrados.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-gray-400 text-sm">
                      {filtroMoroso === 'Todos'
                        ? '✅ No hay estudiantes morosos este período.'
                        : `No hay morosos con estado "${filtroMoroso}".`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            { key: 'nombre_completo', label: 'Estudiante'  },
                            { key: 'seccion',         label: 'Sección'     },
                            { key: 'deuda_total',     label: 'Deuda Total' },
                            { key: 'meses_adeudados', label: 'Meses'       },
                            { key: 'ultimo_pago',     label: 'Último Pago' },
                            { key: 'estado',          label: 'Estado'      },
                            { key: 'acciones',        label: 'Acciones'    },
                          ].map(({ key, label }) => (
                            <th
                              key={key}
                              onClick={() => key !== 'acciones' ? setOrdenMoroso(key) : null}
                              className={`text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 tracking-wider whitespace-nowrap ${
                                key !== 'acciones' ? 'cursor-pointer hover:text-gray-700' : ''
                              }`}
                            >
                              {label}
                              {ordenMoroso === key && (
                                <span className="ml-1 text-indigo-500">↓</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {morososFiltrados.map((m, i) => (
                          <tr key={i} className="hover:bg-red-50/30 transition-colors">

                            {/* Estudiante */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {(m.nombre_completo ?? '?')
                                    .split(' ')
                                    .map(p => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 text-sm">{m.nombre_completo}</p>
                                  <p className="text-xs text-gray-400">DNI: {m.dni ?? '—'}</p>
                                </div>
                              </div>
                            </td>

                            {/* Sección */}
                            <td className="px-4 py-3 text-gray-600 text-sm">{m.seccion ?? '—'}</td>

                            {/* Deuda total */}
                            <td className="px-4 py-3">
                              <span className={`font-bold text-sm ${m.deuda_total > 700 ? 'text-red-600' : 'text-amber-600'}`}>
                                {formatMoney(m.deuda_total)}
                              </span>
                            </td>

                            {/* Meses adeudados */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                m.meses_adeudados > 2
                                  ? 'bg-red-100 text-red-700'
                                  : m.meses_adeudados > 1
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {m.meses_adeudados} mes{m.meses_adeudados > 1 ? 'es' : ''}
                              </span>
                            </td>

                            {/* Último pago */}
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {m.ultimo_pago
                                ? new Date(m.ultimo_pago).toLocaleDateString('es-PE')
                                : <span className="text-red-400 font-medium">Nunca</span>
                              }
                            </td>

                            {/* Estado */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                m.estado?.toLowerCase() === 'vencido'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {m.estado}
                              </span>
                            </td>

                            {/* Acciones */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => abrirModalNotificacion(m)}
                                  className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-semibold whitespace-nowrap"
                                  title="Notificar al apoderado"
                                >
                                  💬 Notificar
                                </button>
                                <button
                                  onClick={() => irARegistrarPago(m)}
                                  className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-semibold whitespace-nowrap"
                                  title="Registrar pago"
                                >
                                  💰 Pagar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════ TAB 2: REGISTRAR PAGO ════════ */}
      {tab === 'registrar' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-emerald-50">
            <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Registrar Pago</h2>
            <p className="text-xs text-emerald-600 mt-0.5">Registra el pago de pensión u otro concepto para un estudiante</p>
          </div>

          <div className="p-6">
            {exitoPago && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {exitoPago}
              </div>
            )}
            {erroresPago._general && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{erroresPago._general}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Columna izquierda */}
              <div className="space-y-5">

                {/* Buscador estudiante */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Estudiante *</label>
                  {estudiantePago ? (
                    <EstudianteCard
                      estudiante={estudiantePago}
                      onClear={() => { setEstudiantePago(null); busqPago.reset(); }}
                    />
                  ) : (
                    <div ref={busqPago.ref} className="relative">
                      <input
                        type="text"
                        value={busqPago.query}
                        onChange={(e) => busqPago.setQuery(e.target.value)}
                        onFocus={() => busqPago.query.length >= 2 && busqPago.setOpen(true)}
                        placeholder="Buscar por nombre o DNI..."
                        className={`w-full text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm ${
                          erroresPago.estudiante ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                      {busqPago.open && (
                        <BuscadorDropdown
                          resultados={busqPago.resultados}
                          onSelect={(e) => {
                            setEstudiantePago(e);
                            busqPago.setQuery(e.nombre_completo);
                            busqPago.setOpen(false);
                            setErroresPago((p) => ({ ...p, estudiante: undefined }));
                          }}
                        />
                      )}
                    </div>
                  )}
                  {erroresPago.estudiante && <p className="text-xs text-red-500 mt-1">{erroresPago.estudiante}</p>}
                </div>

                {/* Concepto */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Concepto *</label>
                  <select
                    value={formPago.concepto_id}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const c = listaConceptos.find((x) => x.id === id);
                      setFormPago((p) => ({ ...p, concepto_id: id, monto: c?.monto ?? p.monto }));
                      setErroresPago((p) => ({ ...p, concepto: undefined }));
                    }}
                    className={`w-full text-sm border rounded-xl px-4 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm ${
                      erroresPago.concepto ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Seleccionar concepto...</option>
                    {listaConceptos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  {erroresPago.concepto && <p className="text-xs text-red-500 mt-1">{erroresPago.concepto}</p>}
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Monto (S/.) *</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={formPago.monto}
                    onChange={(e) => { setFormPago((p) => ({ ...p, monto: e.target.value })); setErroresPago((p) => ({ ...p, monto: undefined })); }}
                    placeholder="0.00"
                    className={`w-full text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm ${
                      erroresPago.monto ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {erroresPago.monto && <p className="text-xs text-red-500 mt-1">{erroresPago.monto}</p>}
                </div>

                {/* Mes y Año */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Mes</label>
                    <select value={formPago.mes} onChange={(e) => setFormPago((p) => ({ ...p, mes: Number(e.target.value) }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm">
                      {NOMBRES_MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Año</label>
                    <select value={formPago.anio} onChange={(e) => setFormPago((p) => ({ ...p, anio: Number(e.target.value) }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm">
                      {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-5">

                {/* Método de pago */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Método de pago</label>
                  <div className="flex flex-wrap gap-2">
                    {METODOS_PAGO.map((m) => (
                      <button key={m} onClick={() => setFormPago((p) => ({ ...p, metodo_pago: m }))}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                          formPago.metodo_pago === m
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Número operación (condicional) */}
                {formPago.metodo_pago !== 'EFECTIVO' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Número de operación *</label>
                    <input
                      type="text"
                      value={formPago.numero_operacion}
                      onChange={(e) => { setFormPago((p) => ({ ...p, numero_operacion: e.target.value })); setErroresPago((p) => ({ ...p, numero_operacion: undefined })); }}
                      placeholder="Ej: OP-123456"
                      className={`w-full text-sm border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm ${
                        erroresPago.numero_operacion ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {erroresPago.numero_operacion && <p className="text-xs text-red-500 mt-1">{erroresPago.numero_operacion}</p>}
                  </div>
                )}

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Fecha de pago</label>
                  <input type="date" value={formPago.fecha} max={hoyStr}
                    onChange={(e) => setFormPago((p) => ({ ...p, fecha: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm" />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={formPago.observacion}
                    onChange={(e) => setFormPago((p) => ({ ...p, observacion: e.target.value.slice(0, 200) }))}
                    rows={3} placeholder="Notas adicionales..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{formPago.observacion.length}/200</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
              <button
                onClick={() => { setFormPago(formInicial()); setEstudiantePago(null); busqPago.reset(); setErroresPago({}); setExitoPago(null); }}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all">
                Limpiar
              </button>
              <button onClick={registrarPago} disabled={guardandoPago}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {guardandoPago ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Registrando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Registrar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ TAB 3: PENSIONES ════════ */}
      {tab === 'pensiones' && (
        <div className="space-y-5">

          {/* Buscador */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Buscar Estudiante</h2>
            <div ref={busqPension.ref} className="relative max-w-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={busqPension.query}
                  onChange={(e) => busqPension.setQuery(e.target.value)}
                  onFocus={() => busqPension.query.length >= 2 && busqPension.setOpen(true)}
                  placeholder="Buscar por nombre o DNI..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                />
                <button
                  onClick={() => { if (busqPension.query.length >= 2) busqPension.setOpen((o) => !o); }}
                  className="text-sm bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
                  Buscar
                </button>
              </div>
              {busqPension.open && (
                <BuscadorDropdown
                  resultados={busqPension.resultados}
                  onSelect={(e) => {
                    setEstudiantePension(e);
                    busqPension.setQuery(e.nombre_completo);
                    busqPension.setOpen(false);
                    cargarPensiones(e.id);
                  }}
                />
              )}
            </div>

            {estudiantePension && (
              <div className="mt-4">
                <EstudianteCard
                  estudiante={estudiantePension}
                  onClear={() => { setEstudiantePension(null); busqPension.reset(); setPensiones([]); }}
                  extra={
                    <div className="text-right flex-shrink-0 space-y-0.5 mr-2">
                      <p className="text-xs text-gray-500">
                        Pagado: <span className="font-semibold text-emerald-600">
                          {formatMoney(pensiones.filter((p) => (p.estado ?? '').toLowerCase().includes('pag')).reduce((s, p) => s + (p.monto ?? 0), 0))}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Pendiente: <span className="font-semibold text-amber-600">
                          {formatMoney(pensiones.filter((p) => !(p.estado ?? '').toLowerCase().includes('pag')).reduce((s, p) => s + (p.monto ?? 0), 0))}
                        </span>
                      </p>
                    </div>
                  }
                />
              </div>
            )}
          </div>

          {/* Tabla estado de cuenta */}
          {estudiantePension && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Estado de Cuenta</h2>
                <span className="text-xs text-gray-400">{pensiones.length} registros</span>
              </div>
              {loadingPensiones ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex gap-2">
                    {[0,1,2].map((i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : pensiones.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No hay registros para este estudiante.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Mes','Concepto','Monto','Estado','Fecha Pago','Acciones'].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pensiones.map((p, i) => {
                        const est = (p.estado ?? '').toLowerCase();
                        const bc = est.includes('pag') ? 'green' : est.includes('pend') ? 'amber' : est.includes('venc') ? 'red' : 'gray';
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-800">{p.mes ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-600">{p.concepto ?? '—'}</td>
                            <td className="px-5 py-3 font-semibold text-gray-800">{formatMoney(p.monto)}</td>
                            <td className="px-5 py-3"><Badge color={bc}>{p.estado ?? '—'}</Badge></td>
                            <td className="px-5 py-3 text-gray-500">{p.fecha_pago ?? '—'}</td>
                            <td className="px-5 py-3">
                              {(est.includes('pend') || est.includes('venc')) && (
                                <button onClick={() => irARegistrarPago(estudiantePension)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                                  Registrar Pago
                                </button>
                              )}
                              {est.includes('pag') && (
                                <button onClick={() => setModalComprobante({ ...p, estudiante: estudiantePension })}
                                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline transition-colors">
                                  Ver comprobante
                                </button>
                              )}
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

          {!estudiantePension && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-500 text-sm font-medium">Busca un estudiante para ver su estado de cuenta</p>
              <p className="text-gray-400 text-xs mt-1">Escribe al menos 2 caracteres del nombre o DNI</p>
            </div>
          )}
        </div>
      )}

      {/* ════════ MODAL NOTIFICACIÓN WHATSAPP ════════ */}
      {modalNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalNotif(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">💬 Notificar al apoderado</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalNotif.nombre_completo} · {modalNotif.seccion}
                </p>
              </div>
              <button
                onClick={() => setModalNotif(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Info deuda */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-gray-400">Deuda</p>
                <p className="font-bold text-red-600">{formatMoney(modalNotif.deuda_total)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Meses</p>
                <p className="font-bold text-amber-600">{modalNotif.meses_adeudados}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Estado</p>
                <p className="font-bold text-red-600">{modalNotif.estado}</p>
              </div>
            </div>

            {/* Mensaje editable */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Mensaje (editable)
              </label>
              <textarea
                value={msgNotif}
                onChange={(e) => setMsgNotif(e.target.value)}
                rows={5}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <p className={`text-xs mt-1 text-right font-medium ${
                msgNotif.length > 320 ? 'text-red-500' : msgNotif.length > 160 ? 'text-amber-500' : 'text-gray-400'
              }`}>
                {msgNotif.length} caracteres
                {msgNotif.length > 160 && (
                  <span className="ml-1">⚠ SMS requiere {Math.ceil(msgNotif.length / 160)} partes</span>
                )}
              </p>
            </div>

            {/* Feedback */}
            {resultadoNotif && (
              <div className={`rounded-xl p-3 text-sm font-medium ${
                resultadoNotif.ok
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {resultadoNotif.ok ? '✅' : '❌'} {resultadoNotif.msg}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setModalNotif(null)}
                className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={enviarNotificacion}
                disabled={enviandoNotif || !msgNotif.trim()}
                className="text-sm bg-green-600 text-white font-semibold px-5 py-2 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {enviandoNotif ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Enviando...
                  </>
                ) : '📤 Enviar WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL COMPROBANTE ════════ */}
      {modalComprobante && (
        <>
          <style>{`@media print{body>*{visibility:hidden}#rcpt,#rcpt *{visibility:visible}#rcpt{position:fixed;inset:0;padding:40px}}`}</style>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setModalComprobante(null); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Comprobante de Pago</h3>
                <button onClick={() => setModalComprobante(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div id="rcpt" className="p-6 space-y-4">
                <div className="text-center border-b border-gray-100 pb-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-xl">E</span>
                  </div>
                  <p className="font-bold text-gray-800 text-sm">Institución Educativa</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sistema de Gestión Escolar</p>
                </div>

                <div className="flex justify-center">
                  <span className="border-4 border-emerald-500 text-emerald-600 font-black text-2xl px-6 py-1 rounded-lg tracking-widest" style={{ transform: 'rotate(-8deg)', display: 'inline-block' }}>
                    PAGADO
                  </span>
                </div>

                <dl className="space-y-0 text-sm">
                  {[
                    ['Estudiante',    modalComprobante.estudiante?.nombre_completo ?? '—'],
                    ['Sección',       modalComprobante.estudiante?.seccion ?? '—'],
                    ['Concepto',      modalComprobante.concepto ?? '—'],
                    ['Período',       modalComprobante.mes ?? '—'],
                    ['Monto',         formatMoney(modalComprobante.monto)],
                    ['Método',        modalComprobante.metodo_pago ?? '—'],
                    ['N° Operación',  modalComprobante.numero_operacion || '—'],
                    ['Fecha',         modalComprobante.fecha_pago ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2 border-b border-gray-50">
                      <dt className="text-gray-500 font-medium">{k}</dt>
                      <dd className="font-semibold text-gray-800 text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="px-6 pb-5 flex justify-end gap-3">
                <button onClick={() => setModalComprobante(null)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                  Cerrar
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
