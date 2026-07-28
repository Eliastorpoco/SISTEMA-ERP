import LearningSequence from "./LearningSequence";

export default function TabTareas({
  tareas,
  loading,
  onVerDetalle,
  h5pActivities = {}
}) {
  return (
    <LearningSequence
      tareas={tareas}
      loading={loading}
      onVerDetalle={onVerDetalle}
      h5pActivities={h5pActivities}
    />
  );
}
