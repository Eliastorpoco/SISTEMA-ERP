export default function DashboardCards({ stats }) {
  const cards = [
    { label:"Tareas", value:stats.total, color:"#4f46e5" },
    { label:"Con H5P", value:stats.conH5P, color:"#f59e0b" },
    { label:"Entregas", value:stats.entregas, color:"#059669" },
    { label:"Eval. IA", value:stats.evaluadas, color:"#7c3aed" },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
      gap:12, marginBottom:24 }}>
      {cards.map(s => (
        <div key={s.label} style={{ background:"#fff",
          border:"1px solid #e5e7eb", borderTop:`4px solid ${s.color}`,
          borderRadius:16, padding:"16px 20px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
            textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>
            {s.label}
          </div>
          <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
