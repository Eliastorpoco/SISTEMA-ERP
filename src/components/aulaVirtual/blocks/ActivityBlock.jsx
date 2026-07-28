import Badge from "../../ui/LegacyBadge";
import Button from "../../ui/LegacyButton";
import BlockTitle from "./BlockTitle";

function LearningActivity({ tarea, index, onVerDetalle, h5pActivities }) {
  const tieneH5P = !!h5pActivities[tarea.id];

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"34px minmax(0,1fr) 120px",
      gap:12,
      alignItems:"start",
      padding:"12px 0",
      borderBottom:"1px solid #f3f4f6"
    }}>
      <div style={{
        width:30,
        height:30,
        borderRadius:999,
        background:"#eef2ff",
        color:"#4f46e5",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        fontWeight:900,
        fontSize:12
      }}>
        {index + 1}
      </div>

      <div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:5 }}>
          {tieneH5P && <Badge variant="warning">H5P</Badge>}
          <Badge variant="neutral">{tarea.nivel_educativo}</Badge>
          <Badge variant="info">
            {tarea.competencia?.slice(0,34)}{(tarea.competencia?.length ?? 0) > 34 ? "..." : ""}
          </Badge>
        </div>

        <div style={{ fontSize:14, fontWeight:900, color:"#111827", marginBottom:4 }}>
          {tarea.titulo}
        </div>

        <p style={{ margin:0, fontSize:12, color:"#4b5563", lineHeight:1.6 }}>
          {tarea.descripcion}
        </p>

        <div style={{ marginTop:6, fontSize:11, color:"#9ca3af" }}>
          {tarea.total_entregas > 0
            ? `${tarea.evaluadas}/${tarea.total_entregas} evaluadas`
            : "Sin entregas aún"}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Button onClick={() => onVerDetalle(tarea)}>
          {tieneH5P ? "Abrir H5P" : "Entregar"}
        </Button>
      </div>
    </div>
  );
}

export default function ActivityBlock({
  tareas,
  onVerDetalle,
  h5pActivities = {},
}) {
  return (
    <div style={{
      background:"#fff",
      border:"1px solid #e5e7eb",
      borderRadius:14,
      padding:"14px 16px"
    }}>
      <BlockTitle
        title="Construcción y evidencias"
        subtitle="Actividades, H5P, tareas y productos del estudiante"
      />

      {tareas.map((tarea, index) => (
        <LearningActivity
          key={tarea.id}
          tarea={tarea}
          index={index}
          onVerDetalle={onVerDetalle}
          h5pActivities={h5pActivities}
        />
      ))}
    </div>
  );
}
