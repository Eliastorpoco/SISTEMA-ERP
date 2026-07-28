import Card from "../ui/LegacyCard";
import LearningUnit from "./LearningUnit";

export default function LearningSequence({
  tareas,
  loading,
  onVerDetalle,
  h5pActivities = {},
}) {
  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:48, color:"#9ca3af" }}>
        Cargando secuencia de aprendizaje...
      </div>
    );
  }

  if (tareas.length === 0) {
    return (
      <Card style={{ padding:24, textAlign:"center", color:"#9ca3af" }}>
        No hay actividades disponibles.
      </Card>
    );
  }

  return (
    <LearningUnit
      tareas={tareas}
      onVerDetalle={onVerDetalle}
      h5pActivities={h5pActivities}
    />
  );
}
