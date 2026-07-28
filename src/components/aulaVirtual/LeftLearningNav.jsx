import Card from "../ui/LegacyCard";
import Badge from "../ui/LegacyBadge";

const cursos = [
  { id: 1, nombre: "Matemática", codigo: "MAT-001", activo: true },
  { id: 2, nombre: "Comunicación", codigo: "COM-001", activo: false },
  { id: 3, nombre: "Ciencia y Tecnología", codigo: "CYT-001", activo: false },
];

const recursos = [
  "Banco de Objetos",
  "Calendario",
  "Recursos",
  "Rúbricas",
];

export default function LeftLearningNav() {
  return (
    <div style={{ display:"grid", gap:12 }}>
      <Card style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:900, color:"#111827", marginBottom:12 }}>
          Mis cursos
        </div>

        <div style={{ display:"grid", gap:8 }}>
          {cursos.map(curso => (
            <div key={curso.id} style={{
              padding:"10px 12px",
              borderRadius:12,
              background:curso.activo ? "#eef2ff" : "#f9fafb",
              border:curso.activo ? "1px solid #c7d2fe" : "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize:12, fontWeight:800, color:"#111827" }}>
                {curso.nombre}
              </div>
              <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>
                {curso.codigo}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:900, color:"#111827", marginBottom:12 }}>
          Navegación docente
        </div>

        <div style={{ display:"grid", gap:8 }}>
          {recursos.map(item => (
            <div key={item} style={{
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center",
              fontSize:12,
              fontWeight:700,
              color:"#374151",
              padding:"8px 0",
              borderBottom:"1px solid #f3f4f6"
            }}>
              <span>{item}</span>
              {item === "Banco de Objetos" && <Badge variant="info">OA</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
