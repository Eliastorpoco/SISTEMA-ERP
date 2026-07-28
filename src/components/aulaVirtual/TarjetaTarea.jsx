import Card from "../ui/LegacyCard";
import Button from "../ui/LegacyButton";
import Badge from "../ui/LegacyBadge";

export default function TarjetaTarea({ tarea, onVerDetalle, h5pActivities = {} }) {
  const vence = tarea.fecha_entrega ? new Date(tarea.fecha_entrega) : null;
  const hoy = new Date();
  const dias = vence ? Math.ceil((vence - hoy) / (1000*60*60*24)) : null;
  const tieneH5P = !!h5pActivities[tarea.id];

  const diasVariant = dias < 3 ? "danger" : dias < 7 ? "warning" : "success";

  return (
    <Card
      style={{
        overflow:"hidden",
        transition:"box-shadow 0.2s"
      }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)"}
    >
      <div style={{
        padding:"16px 20px",
        borderBottom:"1px solid #f3f4f6",
        background:tieneH5P
          ? "linear-gradient(135deg,#fef3c7,#fffbeb)"
          : "linear-gradient(135deg,#eff6ff,#f0f9ff)"
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              {tieneH5P && <Badge variant="warning" style={{ borderRadius:6 }}>H5P</Badge>}
              <span style={{
                fontSize:10,
                fontWeight:700,
                color:"#6b7280",
                textTransform:"uppercase",
                letterSpacing:"0.06em"
              }}>
                {tarea.curso_nombre} - {tarea.curso_codigo}
              </span>
            </div>

            <div style={{
              fontWeight:700,
              fontSize:15,
              color:"#111827",
              lineHeight:1.3
            }}>
              {tarea.titulo}
            </div>
          </div>

          {dias !== null && (
            <Badge variant={diasVariant} style={{
              textAlign:"center",
              borderRadius:10,
              padding:"6px 12px",
              minWidth:48
            }}>
              <div style={{ fontSize:18, fontWeight:900 }}>{dias}</div>
              <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>días</div>
            </Badge>
          )}
        </div>
      </div>

      <div style={{ padding:"14px 20px" }}>
        <p style={{
          fontSize:13,
          color:"#374151",
          lineHeight:1.6,
          margin:"0 0 12px",
          display:"-webkit-box",
          WebkitLineClamp:2,
          WebkitBoxOrient:"vertical",
          overflow:"hidden"
        }}>
          {tarea.descripcion}
        </p>

        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
          <Badge variant="info" style={{ borderRadius:8, fontWeight:600 }}>
            {tarea.competencia?.slice(0,35)}{(tarea.competencia?.length??0)>35?"...":""}
          </Badge>

          <Badge variant="neutral" style={{ borderRadius:8, fontWeight:600 }}>
            {tarea.nivel_educativo}
          </Badge>

          {tarea.fecha_entrega && (
            <Badge variant="neutral" style={{ borderRadius:8, fontWeight:600 }}>
              {new Date(tarea.fecha_entrega).toLocaleDateString("es-PE",{
                day:"2-digit",
                month:"short",
                year:"numeric"
              })}
            </Badge>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:12, color:"#6b7280" }}>
            {tarea.total_entregas > 0
              ? `${tarea.evaluadas}/${tarea.total_entregas} evaluadas`
              : "Sin entregas aún"}
          </div>

          <Button
            onClick={() => onVerDetalle(tarea)}
            style={{ padding:"8px 18px", fontSize:13, fontWeight:700 }}
          >
            {tieneH5P ? "Abrir H5P" : "Entregar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
