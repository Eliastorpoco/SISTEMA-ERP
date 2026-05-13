import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

const PIE_COLORS = {
  'Presentes':    '#10b981',
  'Faltas':       '#ef4444',
  'Ausentes':     '#ef4444',   // alias para respuestas antiguas del backend
  'Tardanzas':    '#f59e0b',
  'Justificados': '#6366f1',
  'presente':     '#10b981',
  'ausente':      '#ef4444',
  'tardanza':     '#f59e0b',
  'justificado':  '#6366f1',
};

const mockTendencia7Dias = () => {
  const hoy = new Date();
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    dias.push({
      fecha:      d.toISOString().split('T')[0],
      porcentaje: Math.floor(Math.random() * 13) + 82,
    });
  }
  return dias;
};

const MOCK_DASHBOARD = {
  total_estudiantes: 64,
  asistencia_hoy: 87,
  tardanzas_mes: 23,
  inasistencias_mes: 18,
  detalle: [
    { seccion: '4A', total: 16, presentes: 15, porcentaje: 94 },
    { seccion: '4B', total: 16, presentes: 13, porcentaje: 81 },
    { seccion: '5A', total: 16, presentes: 14, porcentaje: 88 },
    { seccion: '5B', total: 16, presentes: 12, porcentaje: 75 },
  ],
};

const MOCK_KPI = {
  por_seccion: [
    { seccion: '4A', porcentaje: 94 },
    { seccion: '4B', porcentaje: 81 },
    { seccion: '5A', porcentaje: 88 },
    { seccion: '5B', porcentaje: 75 },
  ],
  presentes: 54,
  ausentes: 6,
  tardanzas: 4,
  justificados: 0,
  tasa_asistencia: 87,
  tendencia_7_dias: [
    { fecha: '2026-05-05', porcentaje: 89 },
    { fecha: '2026-05-06', porcentaje: 85 },
    { fecha: '2026-05-07', porcentaje: 91 },
    { fecha: '2026-05-08', porcentaje: 84 },
    { fecha: '2026-05-09', porcentaje: 88 },
    { fecha: '2026-05-10', porcentaje: 92 },
    { fecha: '2026-05-11', porcentaje: 87 },
  ],
};

const StatCard = ({ label, value, sub, color = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

export default function KPIDirectivo() {
  useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resDash, resKpi] = await Promise.all([
          client.get('/dashboard/directivo'),
          client.get('/dashboard/kpi/asistencia'),
        ]);

        const rawDash = resDash.data ?? {};
        const rawKpi  = resKpi.data  ?? {};

        // asistencia_hoy puede venir como número o como objeto { tasa_asistencia, tardanza, ... }
        const hoy   = rawDash.asistencia_hoy;
        const isObj = hoy != null && typeof hoy === 'object';

        const normalDash = {
          total_estudiantes: rawDash.total_estudiantes ?? rawDash.estudiantes ?? rawDash.total ?? 0,
          asistencia_hoy:    isObj ? hoy.tasa_asistencia        : (hoy ?? rawDash.tasa_asistencia ?? rawDash.porcentaje_hoy ?? 0),
          tardanzas_mes:     isObj ? hoy.tardanza                : (rawDash.tardanzas_mes    ?? rawDash.tardanzas    ?? 0),
          inasistencias_mes: isObj ? hoy.ausente                 : (rawDash.inasistencias_mes ?? rawDash.ausentes    ?? rawDash.faltas ?? 0),
          detalle:           rawDash.detalle ?? [],
        };

        const totalEst   = rawDash.total_estudiantes ?? 0;
        const overallPct = isObj ? (hoy.tasa_asistencia ?? 0) : (hoy ?? 0);

        const normalKpi = {
          por_seccion: (rawKpi.por_seccion ?? []).map((s) => ({
            seccion:    s.seccion,
            porcentaje: s.porcentaje != null
              ? s.porcentaje
              : (s.total != null && totalEst > 0
                  ? Math.round((s.total / totalEst) * overallPct)
                  : 0),
          })),
          distribucion: rawKpi.distribucion ?? [
            { name: 'Presentes',    value: rawKpi.presentes                   ?? 0 },
            { name: 'Faltas',       value: rawKpi.faltas ?? rawKpi.ausentes   ?? 0 },
            { name: 'Tardanzas',    value: rawKpi.tardanzas                   ?? 0 },
            { name: 'Justificados', value: rawKpi.justificados                ?? 0 },
          ],
          tendencia_7_dias: rawKpi.tendencia_7_dias?.length > 0
            ? rawKpi.tendencia_7_dias
            : mockTendencia7Dias(),
        };

        setDashboard(normalDash);
        setKpi(normalKpi);
      } catch (err) {
        console.warn('[EduERP-DEV] API no disponible, usando datos mock en PanelDirectorKPI', err);
        setDashboard(MOCK_DASHBOARD);
        setKpi(MOCK_KPI);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const tendencia = useMemo(() => kpi?.tendencia_7_dias ?? [], [kpi]);

  const alertas = useMemo(() => {
    const lista = [];
    const detalle = dashboard?.detalle?.length
      ? dashboard.detalle
      : (kpi?.por_seccion ?? []);

    detalle.forEach((sec) => {
      const pct    = sec.porcentaje ?? sec.porcentaje_asistencia ?? 0;
      const nombre = sec.seccion ?? sec.nombre ?? 'Sección';

      if (pct < 75) {
        lista.push({
          nivel:   'critico',
          seccion: nombre,
          pct,
          msg: `Asistencia crítica: ${pct}% — Riesgo alto de deserción`,
        });
      } else if (pct < 85) {
        lista.push({
          nivel:   'advertencia',
          seccion: nombre,
          pct,
          msg: `Asistencia baja: ${pct}% — Requiere seguimiento`,
        });
      }
    });

    return lista.sort((a, b) => a.pct - b.pct);
  }, [dashboard, kpi]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          <p className="font-semibold">Error al cargar</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const stats   = dashboard || {};
  const kpiData = kpi || {};

  const barData = kpiData.por_seccion ?? kpiData.secciones ?? [];

  const pieData = (kpiData.distribucion ?? kpiData.estados ?? [
    { name: 'Presentes',    value: kpiData.presentes                           ?? 0 },
    { name: 'Faltas',       value: kpiData.faltas ?? kpiData.ausentes          ?? 0 },
    { name: 'Tardanzas',    value: kpiData.tardanzas                           ?? 0 },
    { name: 'Justificados', value: kpiData.justificados                        ?? 0 },
  ]).filter((d) => d.value > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel Directivo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Indicadores clave de asistencia institucional</p>
        </div>
        <span className="hidden md:inline-flex items-center gap-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          En vivo
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Estudiantes"
          value={stats.total_estudiantes}
          sub="Matriculados activos"
          color="indigo"
        />
        <StatCard
          label="Asistencia Hoy"
          value={stats.asistencia_hoy != null ? `${stats.asistencia_hoy}%` : null}
          sub="Promedio institucional"
          color="green"
        />
        <StatCard
          label="Tardanzas"
          value={stats.tardanzas_mes}
          sub="Este mes"
          color="amber"
        />
        <StatCard
          label="Inasistencias"
          value={stats.inasistencias_mes}
          sub="Este mes"
          color="red"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* BarChart — asistencia por sección */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">
            Asistencia por Sección
          </h2>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
              Sin datos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="seccion"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="porcentaje"
                  name="Asistencia"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* PieChart — distribución estados */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">
            Distribución
          </h2>
          {pieData.every((d) => !d.value) ? (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">
              Sin datos disponibles
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        PIE_COLORS[entry.name] ??
                        PIE_COLORS[entry.name?.toLowerCase()] ??
                        ['#10b981', '#ef4444', '#f59e0b', '#6366f1'][i % 4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, '']} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: '11px', color: PIE_COLORS[value] ?? '#6b7280' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabla detalle si viene de la API */}
      {Array.isArray(stats.detalle) && stats.detalle.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Detalle por Sección</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(stats.detalle[0]).map((k) => (
                    <th key={k} className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3 tracking-wider">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.detalle.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-5 py-3 text-gray-700">{val ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LineChart — Tendencia 7 días */}
      {tendencia.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Tendencia — Últimos 7 Días
            </h2>
            <span className="text-xs text-gray-400">% asistencia diaria</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tendencia} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (!v) return '';
                  const d = new Date(v + 'T12:00:00');
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis
                domain={[80, 100]}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Asistencia']}
                labelFormatter={(l) => new Date(l).toLocaleDateString('es-PE')}
              />
              <ReferenceLine
                y={85}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'Mín 85%', fill: '#ef4444', fontSize: 10, position: 'right' }}
              />
              <Line
                type="monotone"
                dataKey="porcentaje"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#4f46e5' }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alertas de Deserción Escolar */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
            Alertas de Deserción Escolar
          </h2>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`flex items-start sm:items-center gap-3 p-3 rounded-xl border text-sm ${
                  a.nivel === 'critico'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className="text-base flex-shrink-0 mt-0.5 sm:mt-0">
                  {a.nivel === 'critico' ? '🔴' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Sección {a.seccion}</p>
                  <p className={`text-xs truncate ${
                    a.nivel === 'critico' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {a.msg}
                  </p>
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${
                  a.nivel === 'critico' ? 'text-red-600' : 'text-amber-700'
                }`}>
                  {a.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
