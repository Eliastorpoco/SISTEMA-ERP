export default function NivelBadge({ nivel }) {
  const cfg = {
    AD: { label:"Logro Destacado", color:"#7c3aed", bg:"#ede9fe" },
    A:  { label:"Logro Esperado",  color:"#059669", bg:"#d1fae5" },
    B:  { label:"En Proceso",      color:"#d97706", bg:"#fef3c7" },
    C:  { label:"Inicio",          color:"#dc2626", bg:"#fee2e2" },
    "En proceso":      { label:"En Proceso",      color:"#d97706", bg:"#fef3c7" },
    "Inicio":          { label:"Inicio",          color:"#dc2626", bg:"#fee2e2" },
    "Logro esperado":  { label:"Logro Esperado",  color:"#059669", bg:"#d1fae5" },
    "Logro destacado": { label:"Logro Destacado", color:"#7c3aed", bg:"#ede9fe" },
  }[nivel] ?? { label: nivel ?? "---", color:"#6b7280", bg:"#f3f4f6" };

  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      padding: "3px 12px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700
    }}>
      {cfg.label}
    </span>
  );
}
