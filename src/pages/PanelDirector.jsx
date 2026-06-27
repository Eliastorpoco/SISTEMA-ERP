import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';

const COLORES = {
  primario:   '#003876',
  dorado:     '#E8A020',
  verde:      '#1A7A4A',
  rojo:       '#C0392B',
  naranja:    '#E67E22',
  azulClaro:  '#2980B9',
  grisClaro:  '#F4F6F9',
  borde:      '#DDE3EC',
};

const PIE_COLORES = ['#1A7A4A','#C0392B','#E67E22','#2980B9'];

function KPICard({ icono, titulo, valor, sub, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '20px 24px',
      border: `1px solid ${COLORES.borde}`, borderLeft: `5px solid ${color}`,
      display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 180,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: color + '18', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>{icono}</div>
      <div>
        <div style={{ fontSize: 11, color: '#777', textTransform: 'uppercase',
          letterSpacing: 1, marginBottom: 4 }}>{titulo}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{valor}</div>
        {sub && <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Panel({ titulo, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '20px 24px',
      border: `1px solid ${COLORES.borde}`, marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORES.primario,
        marginBottom: 16, paddingBottom: 10,
        borderBottom: `2px solid ${COLORES.grisClaro}` }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${COLORES.borde}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 2px 8px #0001' }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: COLORES.primario }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{p.name.includes('%') ? '%' : ''}</strong>
        </div>
      ))}
    </div>
  );
};

export default function PanelDirector() {
  const [registros,  setRegistros]  = useState([]);
  const [kpiExtra,   setKpiExtra]   = useState({ estudiantes:0, docentes:0, cursos:0, matriculas:0 });
  const [loading,    setLoading]    = useState(true);
  const [actualizado, setActualizado] = useState('');

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resReporte, resDash] = await Promise.allSettled([
        client.get('/reporte-asistencia'),
        client.get('/dashboard/directivo'),
      ]);
      if (resReporte.status === 'fulfilled') {
        setRegistros(Array.isArray(resReporte.value.data) ? resReporte.value.data : []);
      }
      if (resDash.status === 'fulfilled') {
        const d = resDash.value.data;
        setKpiExtra({
          estudiantes: d?.total_estudiantes ?? d?.estudiantes ?? 0,
          docentes:    d?.total_docentes    ?? d?.docentes    ?? 0,
          cursos:      d?.total_cursos      ?? d?.cursos      ?? 0,
          matriculas:  d?.total_matriculas  ?? d?.matriculas  ?? 0,
        });
      }
    } catch (e) {
      console.error('Error PanelDirector:', e);
    } finally {
      setLoading(false);
      setActualizado(new Date().toLocaleTimeString('es-PE'));
    }
  };

  const totales = useMemo(() => {
    const t = { presentes:0, ausentes:0, tardanzas:0, justificados:0, total:0 };
    registros.forEach(r => {
      t.total++;
      if (r.estado === 'presente')    t.presentes++;
      else if (r.estado === 'ausente')     t.ausentes++;
      else if (r.estado === 'tardanza')    t.tardanzas++;
      else if (r.estado === 'justificado') t.justificados++;
    });
    t.pct = t.total > 0 ? Math.round((t.presentes / t.total) * 100) : 0;
    return t;
  }, [registros]);

  const pieData = useMemo(() => [
    { name: 'Presentes',    value: totales.presentes    },
    { name: 'Faltas',       value: totales.ausentes     },
    { name: 'Tardanzas',    value: totales.tardanzas    },
    { name: 'Justificados', value: totales.justificados },
  ].filter(d => d.value > 0), [totales]);

  const porSeccion = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const k = r.seccion || r.seccion_nombre || 'Sin sección';
      if (!map[k]) map[k] = { seccion:k, presentes:0, ausentes:0, tardanzas:0, total:0 };
      map[k].total++;
      if (r.estado === 'presente')  map[k].presentes++;
      if (r.estado === 'ausente')   map[k].ausentes++;
      if (r.estado === 'tardanza')  map[k].tardanzas++;
    });
    return Object.values(map).map(s => ({
      ...s,
      asistencia: s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0,
    })).sort((a,b) => b.asistencia - a.asistencia);
  }, [registros]);

  const tendencia = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const fecha = r.fecha ? r.fecha.slice(0,10) : 'Sin fecha';
      if (!map[fecha]) map[fecha] = { fecha, presentes:0, total:0 };
      map[fecha].total++;
      if (r.estado === 'presente') map[fecha].presentes++;
    });
    return Object.values(map)
      .map(d => ({ fecha: d.fecha.slice(5), pct: d.total>0 ? Math.round((d.presentes/d.total)*100) : 0 }))
      .sort((a,b) => a.fecha.localeCompare(b.fecha))
      .slice(-14);
  }, [registros]);

  const ranking = useMemo(() => {
    const map = {};
    registros.forEach(r => {
      const k = r.estudiante_id || r.estudiante || 'N/A';
      const nombre = r.nombre_completo || r.estudiante_nombre || k;
      if (!map[k]) map[k] = { nombre, faltas:0, total:0 };
      map[k].total++;
      if (r.estado === 'ausente') map[k].faltas++;
    });
    return Object.values(map)
      .sort((a,b) => b.faltas - a.faltas)
      .slice(0, 5);
  }, [registros]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height: 300, color: COLORES.primario, fontSize: 15 }}>
      <span style={{ marginRight: 10 }}>⏳</span> Cargando Panel Directivo...
    </div>
  );

  return (
    <div style={{ padding: '20px 24px', background: COLORES.grisClaro, minHeight: '100vh' }}>

      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom: 24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 6, height: 28, background: COLORES.dorado, borderRadius: 3 }}/>
            <h1 style={{ margin:0, fontSize: 22, fontWeight: 700, color: COLORES.primario }}>
              Panel Directivo
            </h1>
          </div>
          <div style={{ fontSize: 13, color: '#666', marginLeft: 16 }}>
            Indicadores institucionales en tiempo real — ERP Educativo
          </div>
        </div>
        <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
          <div style={{ fontSize: 11, color:'#999' }}>Actualizado: {actualizado}</div>
          <button onClick={cargarTodo} style={{
            background: COLORES.primario, color:'white', border:'none',
            borderRadius: 8, padding:'8px 16px', cursor:'pointer', fontSize: 13,
          }}>↻ Actualizar</button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display:'flex', gap: 16, flexWrap:'wrap', marginBottom: 20 }}>
        <KPICard icono="👥" titulo="Estudiantes"   valor={kpiExtra.estudiantes || totales.total} color={COLORES.primario} sub="Matriculados activos" />
        <KPICard icono="👨‍🏫" titulo="Docentes"     valor={kpiExtra.docentes}    color={COLORES.azulClaro} sub="Personal activo" />
        <KPICard icono="📚" titulo="Cursos"        valor={kpiExtra.cursos}      color={COLORES.dorado}   sub="Programados" />
        <KPICard icono="✅" titulo="Asistencia hoy" valor={`${totales.pct}%`}  color={totales.pct >= 85 ? COLORES.verde : COLORES.rojo} sub={`${totales.presentes} de ${totales.total} presentes`} />
        <KPICard icono="⚠️" titulo="Faltas hoy"    valor={totales.ausentes}     color={COLORES.rojo}     sub="Requieren seguimiento" />
      </div>

      {/* FILA 1: PIE + BARCHART */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap: 20, marginBottom: 20 }}>

        <Panel titulo="📊 Distribución de asistencia">
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    paddingAngle={3} label={({ name, percent }) =>
                      `${Math.round(percent*100)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORES[i % PIE_COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 8 }}>
                {[
                  { label:'Presentes', val: totales.presentes, color: COLORES.verde },
                  { label:'Faltas',    val: totales.ausentes,  color: COLORES.rojo },
                  { label:'Tardanzas', val: totales.tardanzas, color: COLORES.naranja },
                  { label:'Justif.',   val: totales.justificados, color: COLORES.azulClaro },
                ].map((item, i) => (
                  <div key={i} style={{ background: item.color + '12', borderRadius: 8,
                    padding:'8px 12px', borderLeft:`3px solid ${item.color}` }}>
                    <div style={{ fontSize:11, color:'#666' }}>{item.label}</div>
                    <div style={{ fontSize:20, fontWeight:700, color: item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', color:'#aaa', padding: 40 }}>
              Sin registros de asistencia hoy
            </div>
          )}
        </Panel>

        <Panel titulo="📈 Asistencia por sección">
          {porSeccion.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porSeccion} margin={{ top:10, right:20, left:0, bottom:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="seccion" tick={{ fontSize:12 }} />
                <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fontSize:11 }} />
                <Tooltip content={<TooltipCustom />} />
                <Legend />
                <Bar dataKey="presentes" name="Presentes"  fill={COLORES.verde}   radius={[4,4,0,0]} />
                <Bar dataKey="ausentes"  name="Faltas"     fill={COLORES.rojo}    radius={[4,4,0,0]} />
                <Bar dataKey="tardanzas" name="Tardanzas"  fill={COLORES.naranja} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:'center', color:'#aaa', padding: 60 }}>
              Sin datos por sección disponibles
            </div>
          )}
        </Panel>
      </div>

      {/* FILA 2: TENDENCIA + RANKING */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 20 }}>

        <Panel titulo="📉 Tendencia de asistencia — últimos 14 días">
          {tendencia.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tendencia} margin={{ top:10, right:20, left:0, bottom:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="fecha" tick={{ fontSize:11 }} />
                <YAxis domain={[60,100]} tickFormatter={v=>`${v}%`} tick={{ fontSize:11 }} />
                <Tooltip formatter={v=>[`${v}%`, 'Asistencia']} />
                <Line type="monotone" dataKey="pct" stroke={COLORES.primario}
                  strokeWidth={2.5} dot={{ r:4, fill:COLORES.primario }}
                  activeDot={{ r:6 }} name="Asistencia %" />
                <CartesianGrid strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:'center', color:'#aaa', padding: 60 }}>
              Sin datos históricos disponibles
            </div>
          )}
        </Panel>

        <Panel titulo="🚨 Estudiantes con más faltas">
          {ranking.length > 0 ? (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background: COLORES.grisClaro }}>
                  <th style={{ padding:'8px 10px', textAlign:'left', color:'#555', fontWeight:600 }}>Estudiante</th>
                  <th style={{ padding:'8px 10px', textAlign:'center', color:'#555', fontWeight:600 }}>Faltas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${COLORES.borde}` }}>
                    <td style={{ padding:'8px 10px', color:'#333' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%',
                          background: i===0 ? COLORES.rojo : COLORES.borde,
                          color: i===0 ? 'white':'#666',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                        <span style={{ fontSize:12 }}>{r.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 10px', textAlign:'center' }}>
                      <span style={{ background: r.faltas >= 3 ? COLORES.rojo+'18' : COLORES.naranja+'18',
                        color: r.faltas >= 3 ? COLORES.rojo : COLORES.naranja,
                        padding:'2px 10px', borderRadius:12, fontWeight:700, fontSize:13 }}>
                        {r.faltas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign:'center', color:'#aaa', padding:40, fontSize:13 }}>
              Sin registros de faltas
            </div>
          )}
        </Panel>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop:20, padding:'12px 20px', background:'white',
        borderRadius:10, border:`1px solid ${COLORES.borde}`,
        display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:12, color:'#888' }}>
        <span>📋 ERP Educativo — Marco MEFA-IAH · RVM N° 094-2020-MINEDU</span>
        <span>Sistema Multi-Tenant · Datos en tiempo real</span>
      </div>

    </div>
  );
}
