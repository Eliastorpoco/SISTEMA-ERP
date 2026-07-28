import Card from "../ui/LegacyCard";
import Badge from "../ui/LegacyBadge";

export default function RightLearningPanel() {
  return (
    <div style={{ display:"grid", gap:12 }}>
      <Card style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:900, color:"#111827", marginBottom:8 }}>
          Administración del curso
        </div>
        <p style={{ fontSize:12, color:"#6b7280", lineHeight:1.5, margin:0 }}>
          Configuración, matrícula, grupos y seguimiento académico.
        </p>
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:900, color:"#111827", marginBottom:8 }}>
          Usuarios en línea
        </div>
        <Badge variant="success">3 conectados</Badge>
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:12, fontWeight:900, color:"#111827", marginBottom:8 }}>
          Alertas de calificación
        </div>
        <p style={{ fontSize:12, color:"#6b7280", lineHeight:1.5, margin:0 }}>
          2 entregas requieren revisión docente.
        </p>
      </Card>
    </div>
  );
}
