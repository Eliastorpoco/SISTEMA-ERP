export default function ModalResubida({
  resubida,
  textoResubida,
  setTextoResubida,
  procesando,
  onClose,
  onSubmit
}) {
  if (!resubida) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:18, maxWidth:620, width:"100%",
        boxShadow:"0 20px 60px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid #f3f4f6",
          display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:900, fontSize:16 }}>Resubir evidencia</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>
              {resubida.tarea_titulo}
            </div>
          </div>
          <button onClick={onClose}
            style={{ border:"none", background:"transparent", fontSize:22,
              color:"#6b7280", cursor:"pointer" }}>×</button>
        </div>

        <div style={{ padding:22, display:"grid", gap:14 }}>
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca",
            borderRadius:12, padding:14, color:"#991b1b", fontSize:13, lineHeight:1.6 }}>
            <strong>Motivo:</strong> {resubida.motivo_rechazo || "El docente solicitó una nueva evidencia."}
          </div>

          <textarea value={textoResubida} rows={7}
            onChange={e => setTextoResubida(e.target.value)}
            placeholder="Escribe aquí tu nueva evidencia. Explica mejor tu procedimiento y justifica tu respuesta..."
            style={{ width:"100%", border:"1px solid #e5e7eb", borderRadius:12,
              padding:"12px 14px", fontSize:14, resize:"vertical", outline:"none",
              lineHeight:1.6 }} />

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={onClose}
              style={{ padding:"10px 20px", borderRadius:12,
                border:"1px solid #e5e7eb", background:"#fff",
                color:"#374151", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={onSubmit} disabled={procesando===resubida.id}
              style={{ padding:"10px 24px", borderRadius:12, border:"none",
                background:procesando===resubida.id?"#818cf8":"#4f46e5",
                color:"#fff", fontSize:13, fontWeight:800,
                cursor:procesando===resubida.id?"not-allowed":"pointer" }}>
              {procesando===resubida.id ? "Resubiendo..." : "Enviar nueva evidencia"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
