import { useState } from "react";

export default function ModalEntrega({
  tarea,
  token,
  api,
  h5pActivities = {},
  onClose,
  onSuccess
}) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const tieneH5P = !!h5pActivities[tarea?.id];

  const entregar = async () => {
    if (!texto.trim()) {
      setError("Escribe tu respuesta antes de entregar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = await fetch(`${api}/aula-virtual/entregas`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${token}`,
          "X-Tenant":"institucion-default"
        },
        body: JSON.stringify({
          tarea_id: tarea.id,
          estudiante_id: 1,
          texto,
          tipo: tieneH5P ? "h5p_texto" : "texto"
        })
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? "Error al entregar");

      setResultado(data);
      setTimeout(() => { onSuccess?.(); }, 2500);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!tarea) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:50,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:660,
        maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>

        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f3f4f6",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          background:"linear-gradient(135deg,#ede9fe,#eff6ff)",
          position:"sticky", top:0, zIndex:1 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
              textTransform:"uppercase", marginBottom:4 }}>{tarea.curso_nombre}</div>
            <div style={{ fontWeight:800, fontSize:16, color:"#111827" }}>{tarea.titulo}</div>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", fontSize:22,
              color:"#6b7280", cursor:"pointer" }}>x</button>
        </div>

        <div style={{ padding:24, display:"grid", gap:16 }}>
          {tarea.instrucciones && (
            <div style={{ background:"#fffbeb", border:"1px solid #fde68a",
              borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#92400e",
                textTransform:"uppercase", marginBottom:8 }}>Instrucciones</div>
              <p style={{ fontSize:13, color:"#92400e", lineHeight:1.7, margin:0 }}>
                {tarea.instrucciones}
              </p>
            </div>
          )}

          {tieneH5P && (
            <div style={{ border:"1px solid #e5e7eb", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", background:"#fef3c7",
                fontSize:12, fontWeight:700, color:"#92400e" }}>
                Actividad H5P Interactiva
              </div>
              <iframe src={h5pActivities[tarea.id]} width="100%" height="380"
                style={{ border:"none", display:"block" }}
                title="Actividad H5P" allowFullScreen />
            </div>
          )}

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#374151",
              textTransform:"uppercase", letterSpacing:"0.06em",
              display:"block", marginBottom:8 }}>
              Tu respuesta {tieneH5P ? "/ reflexión sobre la actividad" : ""}
            </label>
            <textarea value={texto} rows={6}
              onChange={e => setTexto(e.target.value)}
              placeholder={tieneH5P
                ? "Describe qué aprendiste en la actividad H5P, cómo llegaste a las respuestas..."
                : "Escribe tu respuesta aquí. Explica tu razonamiento paso a paso..."}
              style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12,
                padding:"12px 14px", fontSize:14, resize:"vertical", outline:"none",
                lineHeight:1.6 }} />
            <div style={{ fontSize:11, color:"#9ca3af", textAlign:"right", marginTop:4 }}>
              {texto.length} caracteres
            </div>
          </div>

          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca",
              borderRadius:12, padding:"12px 16px", color:"#dc2626", fontSize:13 }}>
              Error: {error}
            </div>
          )}

          {resultado && (
            <div style={{ background:"#d1fae5", border:"1px solid #6ee7b7",
              borderRadius:12, padding:"16px 20px" }}>
              <div style={{ fontWeight:700, color:"#065f46", fontSize:14 }}>
                ¡Entrega enviada exitosamente!
              </div>
              <div style={{ fontSize:12, color:"#065f46", marginTop:4 }}>
                MEFA-IAH está evaluando tu respuesta con Claude...
              </div>
            </div>
          )}

          {!resultado && (
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={onClose}
                style={{ padding:"10px 20px", borderRadius:12,
                  border:"1px solid #e5e7eb", background:"#fff",
                  color:"#374151", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Cancelar
              </button>
              <button onClick={entregar} disabled={loading}
                style={{ padding:"10px 24px", borderRadius:12, border:"none",
                  background:loading?"#818cf8":"#4f46e5", color:"#fff",
                  fontSize:13, fontWeight:700,
                  cursor:loading?"not-allowed":"pointer",
                  display:"flex", alignItems:"center", gap:8 }}>
                {loading ? "Enviando..." : "Enviar y Evaluar con IA"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
