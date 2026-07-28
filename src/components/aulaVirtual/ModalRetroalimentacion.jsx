import NivelBadge from "./NivelBadge";

export default function ModalRetroalimentacion({ detalle, onClose }) {
  if (!detalle) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, maxWidth:620, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid #f3f4f6",
          display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16 }}>Retroalimentación IA</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>
              {detalle.tarea_titulo}
            </div>
          </div>
          <button onClick={onClose}
            style={{ border:"none", background:"transparent", fontSize:22,
              color:"#6b7280", cursor:"pointer" }}>×</button>
        </div>

        <div style={{ padding:22, display:"grid", gap:14 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {detalle.nivel_logro && <NivelBadge nivel={detalle.nivel_logro} />}
            <strong style={{ color:"#4f46e5" }}>
              {detalle.puntaje !== null && detalle.puntaje !== undefined ? `${detalle.puntaje} pts` : "Sin puntaje"}
            </strong>
          </div>

          <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb",
            borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#6b7280",
              textTransform:"uppercase", marginBottom:8 }}>
              Evidencia enviada
            </div>
            <p style={{ margin:0, fontSize:13, color:"#374151", lineHeight:1.6 }}>
              {detalle.texto}
            </p>
          </div>

          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe",
            borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#1d4ed8",
              textTransform:"uppercase", marginBottom:8 }}>
              Retroalimentación
            </div>
            <p style={{ margin:0, fontSize:13, color:"#1e3a8a", lineHeight:1.7 }}>
              {detalle.retroalimentacion || "Sin retroalimentación registrada."}
            </p>
          </div>

          {detalle.observacion_docente && (
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0",
              borderRadius:12, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#166534",
                textTransform:"uppercase", marginBottom:8 }}>
                Observación docente
              </div>
              <p style={{ margin:0, fontSize:13, color:"#166534", lineHeight:1.7 }}>
                {detalle.observacion_docente}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
