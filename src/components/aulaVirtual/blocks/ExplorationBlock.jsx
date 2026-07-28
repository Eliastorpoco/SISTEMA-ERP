import BlockTitle from "./BlockTitle";

export default function ExplorationBlock() {
  return (
    <div style={{
      background:"#fffbeb",
      border:"1px solid #fde68a",
      borderRadius:14,
      padding:14
    }}>
      <BlockTitle
        title="Exploración"
        subtitle="Activación de saberes previos y recursos introductorios"
      />
      <p style={{ margin:0, fontSize:13, color:"#92400e", lineHeight:1.6 }}>
        El docente puede incorporar videos, lecturas, preguntas detonadoras o recursos interactivos.
      </p>
    </div>
  );
}
