export default function TabsHeader({ tab, setTab }) {
  return (
    <div style={{ display:"flex", gap:4, background:"#f3f4f6",
      padding:4, borderRadius:14, width:"fit-content", marginBottom:24 }}>
      {[["tareas","Tareas"],["entregas","Mis Entregas"]].map(([k,l]) => (
        <button key={k} onClick={() => setTab(k)}
          style={{ padding:"10px 20px", borderRadius:11, border:"none",
            fontSize:13, fontWeight:700, cursor:"pointer",
            background:tab===k?"#fff":"transparent",
            color:tab===k?"#111827":"#6b7280",
            boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
          {l}
        </button>
      ))}
    </div>
  );
}
