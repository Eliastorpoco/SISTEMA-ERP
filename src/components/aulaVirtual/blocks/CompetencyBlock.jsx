import BlockTitle from "./BlockTitle";

export default function CompetencyBlock({ competencia }) {
  return (
    <div style={{
      background:"#f9fafb",
      border:"1px solid #e5e7eb",
      borderRadius:14,
      padding:14
    }}>
      <BlockTitle
        title="Competencia"
        subtitle="Propósito pedagógico de la unidad"
      />
      <p style={{ margin:0, fontSize:13, color:"#374151", lineHeight:1.6 }}>
        {competencia || "Competencia pendiente de asignar."}
      </p>
    </div>
  );
}
