import BlockTitle from "./BlockTitle";

export default function AIEvaluationBlock() {
  return (
    <div style={{
      background:"#eef2ff",
      border:"1px solid #c7d2fe",
      borderRadius:14,
      padding:14
    }}>
      <BlockTitle
        title="Evaluación y retroalimentación IA"
        subtitle="Análisis automatizado, nivel de logro y mejora continua"
      />
      <p style={{ margin:0, fontSize:13, color:"#3730a3", lineHeight:1.6 }}>
        MEFA-IAH evalúa las evidencias, genera retroalimentación y permite validación docente.
      </p>
    </div>
  );
}
