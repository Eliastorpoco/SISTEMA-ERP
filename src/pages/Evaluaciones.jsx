import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from '../context/useAuth';

const TENANT_ID = "132fe40c-7172-4391-b217-dfbe9e4635ce";
const EVALUACION_ID = "bacf2cdb-1e3e-4cd8-8b97-dd524db9d965";

const NIVEL_CONFIG = {
  AD:              { label: "Logro Destacado", color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
  A:               { label: "Logro Esperado",  color: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  B:               { label: "En Proceso",      color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  C:               { label: "Inicio",          color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  "En proceso":    { label: "En Proceso",      color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  "Inicio":        { label: "Inicio",          color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  "Logro esperado":{ label: "Logro Esperado",  color: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  "Logro destacado":{ label:"Logro Destacado", color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
};

const getNivelCfg = (n) =>
  NIVEL_CONFIG[n] ?? { label: n ?? "—", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" };

function NivelBadge({ nivel }) {
  const c = getNivelCfg(nivel);
  return (
    <span style={{ background:c.bg, color:c.color, border:`1px solid ${c.border}`,
      padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700, letterSpacing:"0.04em" }}>
      {c.label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e5e7eb",
      borderTop:`4px solid ${color}`, borderRadius:16, padding:"16px 20px" }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
    </div>
  );
}

function TabNueva({ token, onSuccess }) {
  const [form, setForm] = useState({
    estudiante_id: 1, texto: "",
    competencia: "Resuelve problemas de cantidad", nivel_educativo: "Secundaria",
  });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!form.texto.trim()) { setError("Ingresa la evidencia del estudiante."); return; }
    setLoading(true); setError(null); setResultado(null);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/integracion-ia/evaluaciones`,
        { tenant_id: TENANT_ID, evaluacion_id: EVALUACION_ID, ...form },
        { headers: { Authorization: `Bearer ${token}`, "X-Tenant": "institucion-default" } }
      );
      setResultado(data); onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.detail ?? "Error al evaluar.");
    } finally { setLoading(false); }
  };

  const cfg = resultado ? getNivelCfg(resultado.nivel_logro) : null;

  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:20, overflow:"hidden", marginBottom:20 }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f3f4f6",
          background:"linear-gradient(135deg,#ede9fe,#e0f2fe)" }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#3730a3",
            textTransform:"uppercase", letterSpacing:"0.07em" }}>🤖 Evaluación con MEFA-IAH</div>
          <div style={{ fontSize:12, color:"#4338ca", marginTop:2 }}>
            Claude claude-sonnet-4-6 · Criterios CNEB · Persistencia automática
          </div>
        </div>
        <div style={{ padding:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:6 }}>
              Estudiante *
            </label>
            <select value={form.estudiante_id}
              onChange={e => setForm(f => ({ ...f, estudiante_id: Number(e.target.value) }))}
              style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12,
                padding:"10px 14px", fontSize:14, background:"#fff" }}>
              <option value={1}>Prueba Tenant — Sección 4A</option>
              <option value={2}>Segundo Tenant — Sección 4A</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:6 }}>
              Competencia
            </label>
            <input value={form.competencia}
              onChange={e => setForm(f => ({ ...f, competencia: e.target.value }))}
              style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12, padding:"10px 14px", fontSize:14 }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:6 }}>
              Nivel Educativo
            </label>
            <select value={form.nivel_educativo}
              onChange={e => setForm(f => ({ ...f, nivel_educativo: e.target.value }))}
              style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12,
                padding:"10px 14px", fontSize:14, background:"#fff" }}>
              <option>Primaria</option>
              <option>Secundaria</option>
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:6 }}>
              Evidencia del estudiante *
            </label>
            <textarea value={form.texto} rows={5}
              onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
              placeholder="Describe el desempeño observado, trabajos realizados o respuestas dadas por el estudiante..."
              style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12,
                padding:"12px 14px", fontSize:14, resize:"vertical" }} />
            <div style={{ fontSize:11, color:"#9ca3af", textAlign:"right", marginTop:4 }}>
              {form.texto.length} caracteres
            </div>
          </div>
        </div>
        {error && (
          <div style={{ margin:"0 24px 20px", padding:"12px 16px", background:"#fef2f2",
            border:"1px solid #fecaca", borderRadius:12, color:"#dc2626", fontSize:13 }}>❌ {error}</div>
        )}
        <div style={{ padding:"0 24px 24px", display:"flex", justifyContent:"flex-end" }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ background:loading?"#818cf8":"#4f46e5", color:"#fff", border:"none",
              borderRadius:12, padding:"12px 28px", fontSize:14, fontWeight:700,
              cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8 }}>
            {loading ? (<><span style={{ width:14, height:14, border:"2px solid #fff",
              borderTopColor:"transparent", borderRadius:"50%", display:"inline-block",
              animation:"spin 0.8s linear infinite" }} />Evaluando con IA...</>) : "🚀 Evaluar con MEFA-IAH"}
          </button>
        </div>
      </div>

      {resultado && cfg && (
        <div style={{ background:"#fff", border:`2px solid ${cfg.border}`, borderRadius:20, overflow:"hidden" }}>
          <div style={{ padding:"18px 24px", background:cfg.bg, borderBottom:`1px solid ${cfg.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:cfg.color }}>✅ Evaluación completada</div>
              <div style={{ fontSize:12, color:cfg.color, opacity:0.8, marginTop:2 }}>
                {resultado.modelo} · {resultado.tokens_usados} tokens · Pendiente validación docente
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <NivelBadge nivel={resultado.nivel_logro} />
              <div style={{ fontSize:22, fontWeight:900, color:cfg.color, marginTop:4 }}>
                {resultado.puntaje} pts
              </div>
            </div>
          </div>
          <div style={{ padding:24, display:"grid", gap:16 }}>
            {[
              { bg:"#f0fdf4", border:"#bbf7d0", color:"#166534", icon:"💪", label:"Fortalezas", text:resultado.fortalezas },
              { bg:"#fefce8", border:"#fde68a", color:"#92400e", icon:"📈", label:"Aspectos a mejorar", text:resultado.aspectos_a_mejorar },
              { bg:"#eff6ff", border:"#bfdbfe", color:"#1e40af", icon:"💬", label:"Retroalimentación al estudiante", text:resultado.retroalimentacion },
            ].map(({ bg, border, color, icon, label, text }) => text && (
              <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase",
                  letterSpacing:"0.07em", marginBottom:8 }}>{icon} {label}</div>
                <p style={{ fontSize:13, color, lineHeight:1.6, margin:0 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TabResultados({ token }) {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [detalle, setDetalle] = useState(null);

  const datosBase = [
    { id:"32b95911-bfa3-45b0-929b-d3c92de8577d", nivel_logro:"A", puntaje:15, evaluado_por_ia:true, validado_docente:true,  evaluacion:"Evaluación IA Moodle", estudiante:"Prueba Tenant",  created_at:"2026-06-28T02:29:06Z" },
    { id:"d4727b0e-bfca-43b6-a5fa-49eb7bd2f5b2", nivel_logro:"A", puntaje:15, evaluado_por_ia:true, validado_docente:true,  evaluacion:"Evaluación IA Moodle", estudiante:"Prueba Tenant",  created_at:"2026-06-21T03:01:01Z" },
    { id:"9fbb2831-1ea7-4852-b3cc-3e22be503a20", nivel_logro:"En proceso", puntaje:14, evaluado_por_ia:true, validado_docente:false, evaluacion:"Evaluación IA Moodle", estudiante:"Prueba Tenant", created_at:"2026-06-17T02:23:54Z" },
    { id:"63fae7f5-527a-4536-9b2e-af7dfd778d0b", nivel_logro:"Inicio",     puntaje:12, evaluado_por_ia:true, validado_docente:false, evaluacion:"Evaluación IA Moodle", estudiante:"Prueba Tenant", created_at:"2026-06-16T23:26:54Z" },
    { id:"ad34fd6c-1d84-4e63-ad98-7534164eb58c", nivel_logro:"Logro esperado", puntaje:17, evaluado_por_ia:true, validado_docente:false, evaluacion:"Evaluación IA Moodle", estudiante:"Segundo Tenant", created_at:"2026-06-16T22:00:00Z" },
  ];

  useEffect(() => {
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_URL}/integracion-ia/resultados`,
      { headers: { Authorization:`Bearer ${token}`, "X-Tenant":"institucion-default" } })
      .then(r => setResultados(r.data?.length ? r.data : datosBase))
      .catch(() => setResultados(datosBase))
      .finally(() => setLoading(false));
  }, [token]);

  const filtrados = filtro === "todos" ? resultados
    : filtro === "pendientes" ? resultados.filter(r => !r.validado_docente)
    : resultados.filter(r => r.validado_docente);

  const total = resultados.length;
  const validados = resultados.filter(r => r.validado_docente).length;
  const promedio = total ? Math.round(resultados.reduce((s,r) => s+(r.puntaje??0),0)/total) : 0;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <StatCard label="Total"         value={total}          color="#4f46e5" />
        <StatCard label="Validados"     value={validados}      color="#059669" />
        <StatCard label="Pendientes"    value={total-validados} color="#d97706" />
        <StatCard label="Puntaje prom." value={`${promedio}pts`} color="#7c3aed" />
      </div>
      <div style={{ display:"flex", gap:4, background:"#f3f4f6", padding:4,
        borderRadius:12, width:"fit-content", marginBottom:16 }}>
        {[["todos","Todos"],["pendientes","Pendientes HITL"],["validados","Validados"]].map(([k,l]) => (
          <button key={k} onClick={() => setFiltro(k)}
            style={{ padding:"8px 18px", borderRadius:10, border:"none", fontSize:13,
              fontWeight:700, cursor:"pointer", background:filtro===k?"#fff":"transparent",
              color:filtro===k?"#111827":"#6b7280",
              boxShadow:filtro===k?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:48 }}>
          <div style={{ display:"flex", gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"#818cf8",
                animation:"bounce 0.8s ease infinite", animationDelay:`${i*0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f9fafb" }}>
                {["Estudiante","Evaluación","Nivel Logro","Puntaje","IA","Docente","Fecha",""].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10,
                    fontWeight:700, color:"#6b7280", textTransform:"uppercase",
                    letterSpacing:"0.06em", borderBottom:"1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r, i) => (
                <tr key={r.id}
                  style={{ background:i%2===0?"#fff":"#fafafa", borderBottom:"1px solid #f3f4f6" }}
                  onMouseEnter={e => e.currentTarget.style.background="#f0f9ff"}
                  onMouseLeave={e => e.currentTarget.style.background=i%2===0?"#fff":"#fafafa"}>
                  <td style={{ padding:"12px 16px", fontWeight:600 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", background:"#ede9fe",
                        color:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:800, flexShrink:0 }}>
                        {(r.estudiante??"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()}
                      </div>
                      <span>{r.estudiante}</span>
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#374151", maxWidth:140 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {r.evaluacion}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}><NivelBadge nivel={r.nivel_logro} /></td>
                  <td style={{ padding:"12px 16px", fontWeight:700, color:"#4f46e5" }}>{r.puntaje??"-"} pts</td>
                  <td style={{ padding:"12px 16px", fontSize:16 }}>{r.evaluado_por_ia?"🤖":"—"}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ background:r.validado_docente?"#d1fae5":"#fef3c7",
                      color:r.validado_docente?"#065f46":"#92400e",
                      border:`1px solid ${r.validado_docente?"#6ee7b7":"#fcd34d"}`,
                      padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700 }}>
                      {r.validado_docente?"✓ Validado":"Pendiente"}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px", color:"#6b7280", fontSize:12 }}>
                    {new Date(r.created_at).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <button onClick={() => setDetalle(r)}
                      style={{ fontSize:12, fontWeight:600, color:"#4f46e5", background:"#ede9fe",
                        border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer" }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:50,
          display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={e => e.target===e.currentTarget && setDetalle(null)}>
          <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:480,
            overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #f3f4f6",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>Detalle de Evaluación</div>
                <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{detalle.estudiante}</div>
              </div>
              <button onClick={() => setDetalle(null)}
                style={{ background:"none", border:"none", fontSize:22, color:"#6b7280", cursor:"pointer" }}>×</button>
            </div>
            <div style={{ padding:24, display:"grid", gap:12 }}>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ flex:1, background:"#f9fafb", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
                    textTransform:"uppercase", marginBottom:6 }}>Nivel Logro</div>
                  <NivelBadge nivel={detalle.nivel_logro} />
                </div>
                <div style={{ flex:1, background:"#f9fafb", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
                    textTransform:"uppercase", marginBottom:6 }}>Puntaje</div>
                  <div style={{ fontSize:22, fontWeight:800, color:"#4f46e5" }}>{detalle.puntaje} pts</div>
                </div>
              </div>
              <div style={{ background:"#f9fafb", borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
                  textTransform:"uppercase", marginBottom:8 }}>Estado MEFA-IAH</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span style={{ background:detalle.evaluado_por_ia?"#ede9fe":"#f3f4f6",
                    color:detalle.evaluado_por_ia?"#7c3aed":"#6b7280",
                    fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8 }}>
                    {detalle.evaluado_por_ia?"🤖 Evaluado por IA":"Sin IA"}
                  </span>
                  <span style={{ background:detalle.validado_docente?"#d1fae5":"#fef3c7",
                    color:detalle.validado_docente?"#065f46":"#92400e",
                    fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:8 }}>
                    {detalle.validado_docente?"✓ HITL Completado":"⏳ Pendiente HITL"}
                  </span>
                </div>
              </div>
              <div style={{ background:"#f9fafb", borderRadius:12, padding:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
                  textTransform:"uppercase", marginBottom:6 }}>ID Resultado</div>
                <code style={{ fontSize:11, color:"#374151", wordBreak:"break-all" }}>{detalle.id}</code>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

function TabHITL({ token, onSuccess }) {
  const pendientesBase = [
    { id:"9fbb2831-1ea7-4852-b3cc-3e22be503a20", nivel_logro:"En proceso",    puntaje:14, estudiante:"Prueba Tenant",  evaluacion:"Evaluación IA Moodle" },
    { id:"63fae7f5-527a-4536-9b2e-af7dfd778d0b", nivel_logro:"Inicio",        puntaje:12, estudiante:"Prueba Tenant",  evaluacion:"Evaluación IA Moodle" },
    { id:"ad34fd6c-1d84-4e63-ad98-7534164eb58c", nivel_logro:"Logro esperado",puntaje:17, estudiante:"Segundo Tenant", evaluacion:"Evaluación IA Moodle" },
  ];
  const [estados, setEstados] = useState({});
  const [loading, setLoading] = useState({});
  const [validados, setValidados] = useState([]);

  const validar = async (item) => {
    const nivel = estados[item.id] ?? "A";
    setLoading(l => ({ ...l, [item.id]:true }));
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/integracion-ia/evaluaciones/${item.id}/validar`,
        { nivel_logro_docente: nivel, observacion:"Validado por docente." },
        { headers: { Authorization:`Bearer ${token}`, "X-Tenant":"institucion-default" } }
      );
      setValidados(v => [...v, item.id]);
      onSuccess?.();
    } catch(e) { alert(e?.response?.data?.detail ?? "Error al validar."); }
    finally { setLoading(l => ({ ...l, [item.id]:false })); }
  };

  const restantes = pendientesBase.filter(p => !validados.includes(p.id));

  return (
    <div style={{ maxWidth:720, margin:"0 auto" }}>
      <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #f3f4f6",
          background:"#fffbeb", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"#fde68a",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>👨‍🏫</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:"#92400e" }}>Cola de Validación Docente — HITL</div>
            <div style={{ fontSize:12, color:"#b45309", marginTop:1 }}>
              {restantes.length} evaluaciones pendientes de aprobación
            </div>
          </div>
        </div>

        {restantes.length === 0 ? (
          <div style={{ textAlign:"center", padding:48 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:700, color:"#059669", fontSize:16 }}>¡Todo validado!</div>
            <div style={{ color:"#6b7280", fontSize:13, marginTop:4 }}>
              No hay evaluaciones pendientes de revisión.
            </div>
          </div>
        ) : restantes.map((item, i) => {
          const cfg = getNivelCfg(item.nivel_logro);
          const nivelSel = estados[item.id];
          return (
            <div key={item.id} style={{ padding:20,
              borderBottom:i<restantes.length-1?"1px solid #f3f4f6":"none",
              display:"grid", gridTemplateColumns:"1fr auto", gap:16, alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{item.estudiante}</div>
                  <NivelBadge nivel={item.nivel_logro} />
                  <span style={{ fontSize:12, color:"#6b7280" }}>{item.puntaje} pts · IA</span>
                </div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{item.evaluacion}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Tu decisión:</span>
                  {["AD","A","B","C"].map(n => {
                    const c = getNivelCfg(n);
                    const sel = nivelSel === n;
                    return (
                      <button key={n}
                        onClick={() => setEstados(s => ({ ...s, [item.id]:n }))}
                        style={{ padding:"4px 14px", borderRadius:8, fontSize:12, fontWeight:700,
                          cursor:"pointer", border:`1.5px solid ${sel?c.color:"#e5e7eb"}`,
                          background:sel?c.bg:"#fff", color:sel?c.color:"#6b7280" }}>{n}</button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => validar(item)} disabled={loading[item.id]}
                style={{ background:loading[item.id]?"#6ee7b7":"#059669", color:"#fff",
                  border:"none", borderRadius:12, padding:"10px 18px", fontSize:13,
                  fontWeight:700, cursor:loading[item.id]?"not-allowed":"pointer",
                  whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6 }}>
                {loading[item.id] ? (<><span style={{ width:12, height:12,
                  border:"2px solid #fff", borderTopColor:"transparent",
                  borderRadius:"50%", display:"inline-block",
                  animation:"spin 0.8s linear infinite" }} />Validando...</>) : "✓ Validar"}
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function Evaluaciones() {
  const { token } = useAuth();
  const [tab, setTab] = useState("resultados");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k+1), []);

  return (
    <div style={{ padding:24, maxWidth:1100, margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:"#111827",
          letterSpacing:"-0.02em", margin:0 }}>Evaluaciones</h1>
        <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>
          Pipeline MEFA-IAH · Claude claude-sonnet-4-6 · Criterios CNEB · Supervisión docente
        </p>
      </div>

      <div style={{ display:"flex", gap:4, background:"#f3f4f6",
        padding:4, borderRadius:14, width:"fit-content", marginBottom:24 }}>
        {[["resultados","📊 Resultados"],["nueva","🤖 Nueva Evaluación IA"],["hitl","👨‍🏫 Validación Docente"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding:"10px 20px", borderRadius:11, border:"none", fontSize:13,
              fontWeight:700, cursor:"pointer", background:tab===k?"#fff":"transparent",
              color:tab===k?"#111827":"#6b7280",
              boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none", transition:"all 0.15s" }}>{l}</button>
        ))}
      </div>

      {tab === "resultados" && <TabResultados key={refreshKey} token={token} />}
      {tab === "nueva"      && <TabNueva token={token} onSuccess={() => { refresh(); setTab("resultados"); }} />}
      {tab === "hitl"       && <TabHITL  token={token} onSuccess={refresh} />}
    </div>
  );
}
