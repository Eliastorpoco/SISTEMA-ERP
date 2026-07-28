import BlockTitle from "./BlockTitle";

export default function OutcomeBlock() {
  return (
    <div style={{
      background:"#f0fdf4",
      border:"1px solid #bbf7d0",
      borderRadius:14,
      padding:14
    }}>
      <BlockTitle
        title="Resultado esperado"
        subtitle="Evidencia observable del aprendizaje"
      />
      <p style={{ margin:0, fontSize:13, color:"#166534", lineHeight:1.6 }}>
        El estudiante resuelve situaciones problemáticas, explica su procedimiento y justifica sus respuestas.
      </p>
    </div>
  );
}
