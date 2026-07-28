import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

const C = {
  verde:'#1D9E75', verdeL:'#E1F5EE',
  rojo:'#E24B4A',  rojoL:'#FCEBEB',
  naranja:'#EF9F27', naranjaL:'#FFF3DC',
  azul:'#378ADD',  azulL:'#E6F1FB',
  primario:'#1a4a8a',
};
const PIE_C = [C.verde, C.rojo, C.naranja, C.azul];
const BARS = [
  { key:'presentes',    label:'Presentes', initials:'P', color:C.verde,   light:C.verdeL },
  { key:'ausentes',     label:'Faltas',    initials:'F', color:C.rojo,    light:C.rojoL  },
  { key:'tardanzas',    label:'Tardanzas', initials:'T', color:C.naranja, light:C.naranjaL },
  { key:'justificados', label:'Justif.',   initials:'J', color:C.azul,    light:C.azulL  },
];
const SECCIONES = ['4A','4B','5A','5B','6A','6B'];

export default function PanelDirectorKPI() {
  const [registros, setRegistros] = useState([]);
  const [kpi,       setKpi]       = useState({ estudiantes:0, docentes:0, cursos:0 });
  const [loading,   setLoading]   = useState(true);
  const [hora,      setHora]      = useState('');
  const [seccion,   setSeccion]   = useState('TODAS');
  const [fecha,     setFecha]     = useState('');

  useEffect(() => { cargar(); }, [seccion, fecha]);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = {};
      if (seccion !== 'TODAS') params.seccion = seccion;
      if (fecha) params.fecha = fecha;
      const [r1, r2] = await Promise.allSettled([
        client.get('/reporte-asistencia', { params }),
        client.get('/dashboard/directivo'),
      ]);
      if (r1.status === 'fulfilled')
        setRegistros(Array.isArray(r1.value.data) ? r1.value.data : []);
      if (r2.status === 'fulfilled') {
        const d = r2.value.data || {};
        setKpi({
          estudiantes: d.total_estudiantes ?? d.estudiantes ?? 0,
          docentes:    d.total_docentes    ?? d.docentes    ?? 0,
          cursos:      d.total_cursos      ?? d.cursos      ?? 0,
        });
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); setHora(new Date().toLocaleTimeString('es-PE')); }
  };

  const tots = useMemo(() => {
    const t = { presentes:0, ausentes:0, tardanzas:0, justificados:0, total:0 };
    registros.forEach(r => {
      t.total++;
      if (r.estado==='presente')    t.presentes++;
      else if (r.estado==='falta')     t.ausentes++;
      else if (r.estado==='tardanza')    t.tardanzas++;
      else if (r.estado==='justificado') t.justificados++;
    });
    t.pct = t.total > 0 ? Math.round((t.presentes/t.total)*100) : 0;
    return t;
  }, [registros]);

  const pct = v => tots.total > 0 ? Math.round((v/tots.total)*100) : 0;
  const maxVal = Math.max(tots.presentes, tots.ausentes, tots.tardanzas, tots.justificados, 1);
  const CHART_H = 200;

  const yTicks = () => {
    const step = Math.max(Math.ceil(maxVal/5), 1);
    return Array.from({length:6}, (_,i) => i*step);
  };

  const pieData = useMemo(() => BARS
    .map(b => ({ name:b.label, value:tots[b.key] }))
    .filter(d => d.value > 0), [tots]);

  const porSeccion = useMemo(() => {
    const m = {};
    registros.forEach(r => {
      const k = r.seccion || r.seccion_nombre || 'Sin sección';
      if (!m[k]) m[k] = { seccion:k, presentes:0, ausentes:0, tardanzas:0, total:0 };
      m[k].total++;
      if (r.estado==='presente')  m[k].presentes++;
      if (r.estado==='falta')   m[k].ausentes++;
      if (r.estado==='tardanza')  m[k].tardanzas++;
    });
    return Object.values(m).map(s => ({
      ...s, pct: s.total>0 ? Math.round((s.presentes/s.total)*100) : 0,
    })).sort((a,b) => b.pct - a.pct);
  }, [registros]);

  const tendencia = useMemo(() => {
    const m = {};
    registros.forEach(r => {
      const f = r.fecha ? r.fecha.slice(0,10) : 'Sin fecha';
      if (!m[f]) m[f] = { fecha:f, presentes:0, total:0 };
      m[f].total++;
      if (r.estado==='presente') m[f].presentes++;
    });
    return Object.values(m)
      .map(d => ({ fecha:d.fecha.slice(5), pct:d.total>0?Math.round((d.presentes/d.total)*100):0 }))
      .sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(-14);
  }, [registros]);

  const ranking = useMemo(() => {
    const m = {};
    registros.forEach(r => {
      const k = r.estudiante_id || r.estudiante || 'N/A';
      const nombre = r.nombre_completo || r.estudiante_nombre || r.nombre || k;
      if (!m[k]) m[k] = { nombre, faltas:0 };
      if (r.estado==='falta') m[k].faltas++;
    });
    return Object.values(m).filter(x=>x.faltas>0).sort((a,b)=>b.faltas-a.faltas).slice(0,5);
  }, [registros]);

  return (
    <div className="max-w-7xl mx-auto font-sans">

      {/* HEADER AZUL */}
      <div className="rounded-xl mb-5 px-4 md:px-6 py-3" style={{background:'linear-gradient(135deg,#1a4a8a 0%,#378ADD 100%)'}}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-white text-base font-semibold">Panel Directivo</div>
            <div className="text-[#a8c4e8] text-xs mt-0.5">Indicadores institucionales en tiempo real — ERP Educativo · MEFA-IAH</div>
          </div>
          <div className="grid grid-cols-2 md:flex md:items-end gap-2 md:gap-3">
            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Sección</div>
              <select value={seccion} onChange={e=>{setSeccion(e.target.value);setFecha('');}}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm font-medium bg-white cursor-pointer text-[#1a4a8a]">
                <option value="TODAS">Todas</option>
                {SECCIONES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[#a8c4e8] text-[10px] mb-1 uppercase">Fecha</div>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
                className="w-full md:w-auto h-9 px-2 rounded-md border-0 text-sm text-[#1a4a8a]"/>
            </div>
            {(fecha || seccion !== 'TODAS') && (
              <button onClick={()=>{setFecha('');setSeccion('TODAS');}}
                className="h-9 px-3 rounded-md border border-[#a8c4e8] bg-transparent text-white text-xs cursor-pointer hover:bg-white/10 transition">
                Ver todo
              </button>
            )}
            <button onClick={cargar}
              className="h-9 px-3 rounded-md border border-[#a8c4e8] bg-transparent text-white text-xs cursor-pointer hover:bg-white/10 transition">
              ↻ Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* KPI FILA 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="col-span-2 lg:col-span-1 rounded-lg px-4 py-3 text-white"
          style={{background:'linear-gradient(135deg,#1a4a8a 0%,#378ADD 100%)'}}>
          <div className="text-xs opacity-80 uppercase tracking-wider">Asistencia hoy</div>
          <div className="text-4xl font-bold mt-1">{tots.pct}%</div>
          <div className="text-xs opacity-80 mt-0.5">{tots.presentes} de {tots.total} presentes</div>
        </div>
        {BARS.map(b => (
          <div key={b.key} className="bg-white rounded-lg px-4 py-3 border"
            style={{borderTop:`4px solid ${b.color}`}}>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">{b.label}</div>
            <div className="text-3xl font-bold mt-1" style={{color:b.color}}>{tots[b.key]}</div>
            <div className="text-xs text-gray-400 mt-0.5">{pct(tots[b.key])}% del total</div>
          </div>
        ))}
      </div>

      {/* KPI FILA 2 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:'Estudiantes', val:kpi.estudiantes||tots.total, color:C.primario, icon:'👥' },
          { label:'Docentes',    val:kpi.docentes,                color:C.azul,     icon:'👨‍🏫' },
          { label:'Cursos',      val:kpi.cursos,                  color:C.naranja,  icon:'📚' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg px-4 py-3 border border-gray-100 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{k.label}</div>
              <div className="text-2xl font-bold" style={{color:k.color}}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* GRÁFICO BARRAS ESTILO DASHBOARD */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-5 gap-2">
          <div>
            <div className="text-[15px] font-semibold text-[#1a4a8a]">Resultado por estado de asistencia</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {seccion !== 'TODAS' ? `Sección ${seccion}` : 'Todas las secciones'} · {tots.total} registros
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {BARS.map(b => (
              <div key={b.key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{background:b.color}}/>
                <span className="text-[11px] text-gray-500">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
        {tots.total === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">Sin registros de asistencia</div>
        ) : (
          <div className="flex items-stretch">
            <div className="flex flex-col justify-between pr-2 pb-[52px] min-w-[28px]">
              {[...yTicks()].reverse().map(t => (
                <div key={t} className="text-[10px] text-gray-400 text-right">{t}</div>
              ))}
            </div>
            <div className="flex-1 relative">
              <div className="absolute top-0 left-0 right-0 flex flex-col justify-between pointer-events-none" style={{bottom:'52px'}}>
                {yTicks().map(t => <div key={t} className="border-t border-dashed border-gray-100 w-full"/>)}
              </div>
              <div className="grid grid-cols-4 gap-4 items-end relative z-10 pb-2" style={{height:`${CHART_H+100}px`}}>
                {BARS.map(bar => {
                  const h = maxVal > 0 ? Math.max((tots[bar.key]/maxVal)*CHART_H, 8) : 8;
                  return (
                    <div key={bar.key} className="flex flex-col items-center justify-end h-full">
                      <div className="hidden md:flex w-11 h-11 rounded-full items-center justify-center text-base font-extrabold mb-1.5"
                        style={{background:bar.light, border:`3px solid ${bar.color}`, color:bar.color, boxShadow:`0 2px 8px ${bar.color}44`}}>
                        {bar.initials}
                      </div>
                      <div className="text-[13px] font-bold mb-1" style={{color:bar.color}}>{tots[bar.key]}</div>
                      <div className="w-3/4 rounded-t-md transition-all duration-700"
                        style={{height:`${h}px`, background:`linear-gradient(180deg,${bar.color}cc 0%,${bar.color} 100%)`, boxShadow:`0 -2px 12px ${bar.color}44`}}/>
                      <div className="h-0.5 w-full bg-gray-200"/>
                      <div className="mt-2 text-center">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-1"
                          style={{background:bar.light, border:`2px solid ${bar.color}44`}}>
                          <span className="text-base font-extrabold" style={{color:bar.color}}>{bar.initials}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium leading-tight">{bar.label}</div>
                        <div className="text-[10px] text-gray-400 leading-tight">{pct(tots[bar.key])}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PIE + SECCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 mt-2">
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">Distribución de asistencia</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                  outerRadius={85} innerRadius={45} paddingAngle={3}
                  label={({percent})=>`${Math.round(percent*100)}%`}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-16 text-sm">Sin datos</div>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">Asistencia por sección</div>
          {porSeccion.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porSeccion} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="seccion" tick={{fontSize:12}}/>
                <YAxis tickFormatter={v=>`${v}`} tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="presentes" name="Presentes" fill={C.verde}   radius={[4,4,0,0]}/>
                <Bar dataKey="ausentes"  name="Faltas"    fill={C.rojo}    radius={[4,4,0,0]}/>
                <Bar dataKey="tardanzas" name="Tardanzas" fill={C.naranja} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-16 text-sm">Sin datos por sección</div>}
        </div>
      </div>

      {/* TENDENCIA + RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">Tendencia — últimos 14 días</div>
          {tendencia.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tendencia} margin={{top:5,right:20,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="fecha" tick={{fontSize:11}}/>
                <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:11}}/>
                <Tooltip formatter={v=>[`${v}%`,'Asistencia']}/>
                <Line type="monotone" dataKey="pct" stroke={C.primario}
                  strokeWidth={2.5} dot={{r:4,fill:C.primario}} activeDot={{r:6}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-gray-400 py-16 text-sm">Sin datos históricos</div>}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="text-[15px] font-semibold text-[#1a4a8a] mb-4">🚨 Más faltas</div>
          {ranking.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Estudiante</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500 font-semibold">Faltas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r,i)=>(
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 px-3 text-gray-700 text-xs">{r.nombre}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{background:r.faltas>=3?C.rojoL:C.naranjaL, color:r.faltas>=3?C.rojo:C.naranja}}>
                        {r.faltas}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="text-center text-gray-400 py-10 text-sm">Sin faltas registradas</div>}
        </div>
      </div>

      {/* FOOTER */}
      <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 flex justify-between items-center text-xs text-gray-400 mb-4">
        <span>📋 ERP Educativo · Marco MEFA-IAH · RVM N° 094-2020-MINEDU</span>
        <span>Sistema Multi-Tenant · Datos en tiempo real</span>
      </div>

    </div>
  );
}
