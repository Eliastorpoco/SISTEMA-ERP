export default function AulaHeader() {
  return (
    <div style={{ marginBottom:24, display:"flex",
      justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:900, color:"#111827",
          letterSpacing:"-0.02em", margin:0 }}>Aula Virtual</h1>
        <p style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>
          Gestion del Aprendizaje - Tareas - MEFA-IAH - H5P
        </p>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8,
        background:"#f0fdf4", border:"1px solid #bbf7d0",
        borderRadius:12, padding:"8px 16px" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#065f46" }}>
          MEFA-IAH Activo
        </span>
      </div>
    </div>
  );
}
