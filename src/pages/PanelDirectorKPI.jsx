import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

const C = {
  verde: '#1D9E75',
  verdeL: '#E1F5EE',
  rojo: '#E24B4A',
  rojoL: '#FCEBEB',
  naranja: '#EF9F27',
  naranjaL: '#FFF3DC',
  azul: '#378ADD',
  azulL: '#E6F1FB',
  primario: '#1a4a8a',
  gris: '#667085',
};

const BARS = [
  {
    key: 'presentes',
    label: 'Presentes',
    initials: 'P',
    color: C.verde,
    light: C.verdeL,
  },
  {
    key: 'ausentes',
    label: 'Faltas',
    initials: 'F',
    color: C.rojo,
    light: C.rojoL,
  },
  {
    key: 'tardanzas',
    label: 'Tardanzas',
    initials: 'T',
    color: C.naranja,
    light: C.naranjaL,
  },
  {
    key: 'justificados',
    label: 'Justif.',
    initials: 'J',
    color: C.azul,
    light: C.azulL,
  },
];

const PIE_C = [
  C.verde,
  C.rojo,
  C.naranja,
  C.azul,
];

const sourceInitial = {
  asistencia: 'loading',
  institucional: 'loading',
  evaluaciones: 'loading',
  incidencias: 'loading',
  aprendizaje: 'loading',
};

function mostrarNumero(value) {
  return value === null || value === undefined
    ? '—'
    : value;
}

function mostrarPromedio(value, emptyLabel) {
  return value === null || value === undefined
    ? emptyLabel
    : value;
}

function FuenteCard({
  titulo,
  valor,
  detalle,
  color = C.primario,
}) {
  return (
    <div
      className="bg-white rounded-lg px-4 py-3 border border-gray-100"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="text-[11px] text-gray-500 uppercase tracking-wider">
        {titulo}
      </div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color }}
      >
        {valor}
      </div>
      {detalle ? (
        <div className="text-xs text-gray-400 mt-1">
          {detalle}
        </div>
      ) : null}
    </div>
  );
}

export default function PanelDirectorKPI() {
  const [registros, setRegistros] = useState([]);

  const [institucional, setInstitucional] = useState(null);
  const [evaluaciones, setEvaluaciones] = useState(null);
  const [incidencias, setIncidencias] = useState(null);
  const [aprendizaje, setAprendizaje] = useState(null);

  const [fuentes, setFuentes] = useState(sourceInitial);

  const [loading, setLoading] = useState(true);
  const [hora, setHora] = useState('');

  const [seccion, setSeccion] = useState('TODAS');
  const [fecha, setFecha] = useState('');
  const [secciones, setSecciones] = useState([]);

  const cargar = async () => {
    setLoading(true);

    setFuentes({
      asistencia: 'loading',
      institucional: 'loading',
      evaluaciones: 'loading',
      incidencias: 'loading',
      aprendizaje: 'loading',
    });

    const params = {};

    if (seccion !== 'TODAS') {
      params.seccion = seccion;
    }

    if (fecha) {
      params.fecha = fecha;
    }

    const resultados = await Promise.allSettled([
      client.get('/reporte-asistencia', { params }),
      client.get('/dashboard/directivo'),
      client.get('/dashboard/kpi/evaluaciones'),
      client.get('/dashboard/kpi/incidencias'),
      client.get('/dashboard/kpi/aprendizaje'),
    ]);

    const [
      asistenciaResult,
      institucionalResult,
      evaluacionesResult,
      incidenciasResult,
      aprendizajeResult,
    ] = resultados;

    const nextSources = {
      asistencia: asistenciaResult.status === 'fulfilled' ? 'ok' : 'error',
      institucional: institucionalResult.status === 'fulfilled' ? 'ok' : 'error',
      evaluaciones: evaluacionesResult.status === 'fulfilled' ? 'ok' : 'error',
      incidencias: incidenciasResult.status === 'fulfilled' ? 'ok' : 'error',
      aprendizaje: aprendizajeResult.status === 'fulfilled' ? 'ok' : 'error',
    };

    if (asistenciaResult.status === 'fulfilled') {
      const rows = Array.isArray(asistenciaResult.value.data)
        ? asistenciaResult.value.data
        : [];

      setRegistros(rows);

      const nombres = rows
        .map((row) => row.seccion || row.seccion_nombre)
        .filter(Boolean);

      setSecciones((prev) => (
        [...new Set([...prev, ...nombres])]
          .sort((a, b) => String(a).localeCompare(String(b)))
      ));
    } else {
      setRegistros([]);
    }

    if (institucionalResult.status === 'fulfilled') {
      setInstitucional(institucionalResult.value.data || {});
    } else {
      setInstitucional(null);
    }

    if (evaluacionesResult.status === 'fulfilled') {
      setEvaluaciones(evaluacionesResult.value.data || {});
    } else {
      setEvaluaciones(null);
    }

    if (incidenciasResult.status === 'fulfilled') {
      setIncidencias(incidenciasResult.value.data || {});
    } else {
      setIncidencias(null);
    }

    if (aprendizajeResult.status === 'fulfilled') {
      setAprendizaje(aprendizajeResult.value.data || {});
    } else {
      setAprendizaje(null);
    }

    setFuentes(nextSources);
    setHora(new Date().toLocaleTimeString('es-PE'));
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // cargar depende deliberadamente de los filtros visibles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, fecha]);

  const tots = useMemo(() => {
    const total = {
      presentes: 0,
      ausentes: 0,
      tardanzas: 0,
      justificados: 0,
      total: 0,
      pct: 0,
    };

    registros.forEach((row) => {
      total.total += 1;

      if (row.estado === 'presente') {
        total.presentes += 1;
      } else if (row.estado === 'falta') {
        total.ausentes += 1;
      } else if (row.estado === 'tardanza') {
        total.tardanzas += 1;
      } else if (row.estado === 'justificado') {
        total.justificados += 1;
      }
    });

    total.pct = total.total > 0
      ? Math.round((total.presentes / total.total) * 100)
      : 0;

    return total;
  }, [registros]);

  const pct = (value) => (
    tots.total > 0
      ? Math.round((value / tots.total) * 100)
      : 0
  );

  const maxVal = Math.max(
    tots.presentes,
    tots.ausentes,
    tots.tardanzas,
    tots.justificados,
    1,
  );

  const yTicks = () => {
    const step = Math.max(
      Math.ceil(maxVal / 5),
      1,
    );

    return Array.from(
      { length: 6 },
      (_, index) => index * step,
    );
  };

  const pieData = useMemo(
    () => BARS
      .map((bar) => ({
        name: bar.label,
        value: tots[bar.key],
      }))
      .filter((item) => item.value > 0),
    [tots],
  );

  const porSeccion = useMemo(() => {
    const map = {};

    registros.forEach((row) => {
      const key = row.seccion
        || row.seccion_nombre
        || 'Sin sección';

      if (!map[key]) {
        map[key] = {
          seccion: key,
          presentes: 0,
          ausentes: 0,
          tardanzas: 0,
          total: 0,
        };
      }

      map[key].total += 1;

      if (row.estado === 'presente') {
        map[key].presentes += 1;
      }

      if (row.estado === 'falta') {
        map[key].ausentes += 1;
      }

      if (row.estado === 'tardanza') {
        map[key].tardanzas += 1;
      }
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        pct: item.total > 0
          ? Math.round(
              (item.presentes / item.total) * 100,
            )
          : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [registros]);

  const tendencia = useMemo(() => {
    const map = {};

    registros.forEach((row) => {
      const key = row.fecha
        ? row.fecha.slice(0, 10)
        : 'Sin fecha';

      if (!map[key]) {
        map[key] = {
          fecha: key,
          presentes: 0,
          total: 0,
        };
      }

      map[key].total += 1;

      if (row.estado === 'presente') {
        map[key].presentes += 1;
      }
    });

    return Object.values(map)
      .filter((item) => item.fecha !== 'Sin fecha')
      .map((item) => ({
        fecha: item.fecha.slice(5),
        pct: item.total > 0
          ? Math.round(
              (item.presentes / item.total) * 100,
            )
          : 0,
      }))
      .sort(
        (a, b) => a.fecha.localeCompare(b.fecha),
      )
      .slice(-14);
  }, [registros]);

  const ranking = useMemo(() => {
    const map = {};

    registros.forEach((row) => {
      const key = row.estudiante_id
        || row.estudiante
        || 'N/A';

      const nombre = row.nombre_completo
        || row.estudiante_nombre
        || row.nombre
        || key;

      if (!map[key]) {
        map[key] = {
          nombre,
          faltas: 0,
        };
      }

      if (row.estado === 'falta') {
        map[key].faltas += 1;
      }
    });

    return Object.values(map)
      .filter((item) => item.faltas > 0)
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 5);
  }, [registros]);

  const errores = Object.entries(fuentes)
    .filter(([, status]) => status === 'error')
    .map(([source]) => source);

  const institucionalDisponible = fuentes.institucional === 'ok';
  const evaluacionesDisponible = fuentes.evaluaciones === 'ok';
  const incidenciasDisponible = fuentes.incidencias === 'ok';
  const aprendizajeDisponible = fuentes.aprendizaje === 'ok';
  const asistenciaDisponible = fuentes.asistencia === 'ok';

  const valorInstitucional = (key) => (
    institucionalDisponible
      ? mostrarNumero(institucional?.[key])
      : '—'
  );

  return (
    <div className="max-w-7xl mx-auto font-sans">

      <div
        className="rounded-xl mb-5 px-4 md:px-6 py-3"
        style={{
          background: 'linear-gradient(135deg,#1a4a8a 0%,#378ADD 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-white text-base font-semibold">
              Panel Directivo
            </div>
            <div className="text-[#a8c4e8] text-xs mt-0.5">
              Indicadores canónicos del ERP Educativo
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:items-end gap-2 md:gap-3">

            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">
                Sección
              </div>

              <select
                value={seccion}
                onChange={(event) => {
                  setSeccion(event.target.value);
                  setFecha('');
                }}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm font-medium bg-white cursor-pointer text-[#1a4a8a]"
              >
                <option value="TODAS">
                  Todas
                </option>

                {secciones.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">
                Fecha
              </div>

              <input
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm text-[#1a4a8a]"
              />
            </div>

            {(fecha || seccion !== 'TODAS') ? (
              <button
                onClick={() => {
                  setFecha('');
                  setSeccion('TODAS');
                }}
                className="h-9 px-3 rounded-md border border-[#a8c4e8] bg-transparent text-white text-xs cursor-pointer hover:bg-white/10 transition"
              >
                Ver todo
              </button>
            ) : null}

            <button
              onClick={cargar}
              className="h-9 px-3 rounded-md border border-[#a8c4e8] bg-transparent text-white text-xs cursor-pointer hover:bg-white/10 transition"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>
      </div>

      {errores.length > 0 ? (
        <div className="mb-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Algunas fuentes no están disponibles:
          {' '}
          {errores.join(', ')}.
          {' '}
          No se sustituyen por datos simulados.
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">

        <div
          className="col-span-2 lg:col-span-1 rounded-lg px-4 py-3 text-white"
          style={{
            background: 'linear-gradient(135deg,#1a4a8a 0%,#378ADD 100%)',
          }}
        >
          <div className="text-xs opacity-80 uppercase tracking-wider">
            Asistencia
          </div>

          <div className="text-4xl font-bold mt-1">
            {asistenciaDisponible
              ? `${tots.pct}%`
              : '—'}
          </div>

          <div className="text-xs opacity-80 mt-0.5">
            {asistenciaDisponible
              ? `${tots.presentes} de ${tots.total} presentes`
              : 'Fuente no disponible'}
          </div>
        </div>

        {BARS.map((bar) => (
          <div
            key={bar.key}
            className="bg-white rounded-lg px-4 py-3 border"
            style={{
              borderTop: `4px solid ${bar.color}`,
            }}
          >
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">
              {bar.label}
            </div>

            <div
              className="text-3xl font-bold mt-1"
              style={{ color: bar.color }}
            >
              {asistenciaDisponible
                ? tots[bar.key]
                : '—'}
            </div>

            <div className="text-xs text-gray-400 mt-0.5">
              {asistenciaDisponible
                ? `${pct(tots[bar.key])}% del total`
                : 'No disponible'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

        <FuenteCard
          titulo="Estudiantes"
          valor={valorInstitucional('total_estudiantes')}
          color={C.primario}
        />

        <FuenteCard
          titulo="Docentes"
          valor={valorInstitucional('total_docentes')}
          color={C.azul}
        />

        <FuenteCard
          titulo="Secciones"
          valor={valorInstitucional('total_secciones')}
          color={C.verde}
        />

        <FuenteCard
          titulo="Cursos"
          valor={valorInstitucional('total_cursos')}
          color={C.naranja}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6">
        <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
          Evaluación de competencias
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FuenteCard
            titulo="Evaluaciones"
            valor={
              evaluacionesDisponible
                ? mostrarNumero(evaluaciones?.total_evaluaciones)
                : '—'
            }
            color={C.primario}
          />

          <FuenteCard
            titulo="Competencias evaluadas"
            valor={
              evaluacionesDisponible
                ? mostrarNumero(evaluaciones?.competencias_evaluadas)
                : '—'
            }
            color={C.azul}
          />

          <FuenteCard
            titulo="Resultados"
            valor={
              evaluacionesDisponible
                ? mostrarNumero(evaluaciones?.total_resultados)
                : '—'
            }
            color={C.verde}
          />

          <FuenteCard
            titulo="Promedio"
            valor={
              evaluacionesDisponible
                ? mostrarPromedio(
                    evaluaciones?.promedio_puntaje,
                    'Sin resultados',
                  )
                : '—'
            }
            detalle={
              evaluacionesDisponible
                ? `${mostrarNumero(
                    evaluaciones?.resultados_validados_docente,
                  )} resultados validados`
                : 'Fuente no disponible'
            }
            color={C.naranja}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6">
        <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
          Incidencias académicas
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <FuenteCard
            titulo="Total"
            valor={
              incidenciasDisponible
                ? mostrarNumero(incidencias?.total_incidencias)
                : '—'
            }
            color={C.primario}
          />

          <FuenteCard
            titulo="Abiertas"
            valor={
              incidenciasDisponible
                ? mostrarNumero(incidencias?.abiertas)
                : '—'
            }
            color={C.rojo}
          />

          <FuenteCard
            titulo="En seguimiento"
            valor={
              incidenciasDisponible
                ? mostrarNumero(incidencias?.en_seguimiento)
                : '—'
            }
            color={C.naranja}
          />

          <FuenteCard
            titulo="Cerradas"
            valor={
              incidenciasDisponible
                ? mostrarNumero(incidencias?.cerradas)
                : '—'
            }
            color={C.verde}
          />

          <FuenteCard
            titulo="Estudiantes con seguimiento"
            valor={
              incidenciasDisponible
                ? mostrarNumero(
                    incidencias?.estudiantes_seguimiento_activo,
                  )
                : '—'
            }
            color={C.azul}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6">
        <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
          Gestión del aprendizaje
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <FuenteCard
            titulo="Unidades"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(aprendizaje?.total_unidades)
                : '—'
            }
            color={C.primario}
          />

          <FuenteCard
            titulo="Bloques"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(aprendizaje?.total_bloques)
                : '—'
            }
            color={C.azul}
          />

          <FuenteCard
            titulo="Actividades"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(aprendizaje?.total_actividades)
                : '—'
            }
            color={C.verde}
          />

          <FuenteCard
            titulo="Intentos"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(aprendizaje?.total_intentos)
                : '—'
            }
            color={C.naranja}
          />

          <FuenteCard
            titulo="Revisiones"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(aprendizaje?.total_revisiones)
                : '—'
            }
            color={C.primario}
          />

          <FuenteCard
            titulo="Estudiantes con intentos"
            valor={
              aprendizajeDisponible
                ? mostrarNumero(
                    aprendizaje?.estudiantes_con_intentos,
                  )
                : '—'
            }
            color={C.azul}
          />

          <FuenteCard
            titulo="Promedio de avance"
            valor={
              aprendizajeDisponible
                ? mostrarPromedio(
                    aprendizaje?.promedio_avance,
                    'Sin intentos',
                  )
                : '—'
            }
            color={C.verde}
          />

          <FuenteCard
            titulo="Promedio de puntaje"
            valor={
              aprendizajeDisponible
                ? mostrarPromedio(
                    aprendizaje?.promedio_puntaje,
                    'Sin intentos',
                  )
                : '—'
            }
            color={C.naranja}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-6">
        <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
          Resultado por estado de asistencia
        </div>

        {!asistenciaDisponible ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            Fuente de asistencia no disponible
          </div>
        ) : tots.total === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            Sin registros de asistencia
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={260}
          >
            <BarChart
              data={BARS.map((bar) => ({
                estado: bar.label,
                total: tots[bar.key],
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="estado"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                ticks={yTicks()}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar
                dataKey="total"
                name="Registros"
                fill={C.primario}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
            Distribución de asistencia
          </div>

          {asistenciaDisponible && pieData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ percent }) => (
                    `${Math.round(percent * 100)}%`
                  )}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_C[index % PIE_C.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-16 text-sm">
              {asistenciaDisponible
                ? 'Sin datos'
                : 'Fuente no disponible'}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
            Asistencia por sección
          </div>

          {asistenciaDisponible && porSeccion.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <BarChart
                data={porSeccion}
                margin={{
                  top: 5,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="seccion"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar
                  dataKey="presentes"
                  name="Presentes"
                  fill={C.verde}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ausentes"
                  name="Faltas"
                  fill={C.rojo}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="tardanzas"
                  name="Tardanzas"
                  fill={C.naranja}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-16 text-sm">
              {asistenciaDisponible
                ? 'Sin datos por sección'
                : 'Fuente no disponible'}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
            Tendencia de asistencia
          </div>

          {asistenciaDisponible && tendencia.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={200}
            >
              <LineChart
                data={tendencia}
                margin={{
                  top: 5,
                  right: 20,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    'Asistencia',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="pct"
                  stroke={C.primario}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: C.primario,
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-16 text-sm">
              {asistenciaDisponible
                ? 'Sin datos históricos'
                : 'Fuente no disponible'}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">
            Estudiantes con más faltas
          </div>

          {asistenciaDisponible && ranking.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">
                    Estudiante
                  </th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-semibold">
                    Faltas
                  </th>
                </tr>
              </thead>

              <tbody>
                {ranking.map((row, index) => (
                  <tr
                    key={`${row.nombre}-${index}`}
                    className="border-t border-gray-100"
                  >
                    <td className="py-2 px-3 text-gray-700 text-xs">
                      {row.nombre}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: row.faltas >= 3
                            ? C.rojoL
                            : C.naranjaL,
                          color: row.faltas >= 3
                            ? C.rojo
                            : C.naranja,
                        }}
                      >
                        {row.faltas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-gray-400 py-10 text-sm">
              {asistenciaDisponible
                ? 'Sin faltas registradas'
                : 'Fuente no disponible'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 flex flex-col md:flex-row md:justify-between gap-1 text-xs text-gray-400 mb-4">
        <span>
          ERP Educativo · Panel Directivo Multi-Tenant
        </span>

        <span>
          {loading
            ? 'Actualizando…'
            : `Última actualización: ${hora || '—'}`}
        </span>
      </div>

    </div>
  );
}
