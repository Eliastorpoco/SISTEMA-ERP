import BlockTitle from "./BlockTitle";

export default function RubricBlock() {
  const criterios = [
    {
      criterio: "Comprensión del problema",
      descripcion: "Identifica los datos, la pregunta y la situación matemática planteada.",
      peso: "25%",
    },
    {
      criterio: "Uso de procedimientos",
      descripcion: "Aplica operaciones con fracciones de manera ordenada y pertinente.",
      peso: "30%",
    },
    {
      criterio: "Justificación de respuestas",
      descripcion: "Explica el procedimiento utilizado y sustenta su respuesta.",
      peso: "25%",
    },
    {
      criterio: "Presentación de la evidencia",
      descripcion: "Entrega su trabajo de forma clara, completa y organizada.",
      peso: "20%",
    },
  ];

  const niveles = ["Inicio", "Proceso", "Logrado", "Destacado"];

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        background: "#ffffff",
        padding: "16px",
      }}
    >
      <BlockTitle
        title="Rúbrica de evaluación"
        subtitle="Criterios para valorar la evidencia del estudiante"
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginTop: "14px",
          marginBottom: "12px",
        }}
      >
        {niveles.map((nivel) => (
          <span
            key={nivel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "999px",
              background: "#eef2ff",
              color: "#4338ca",
              fontSize: "11px",
              fontWeight: 900,
            }}
          >
            {nivel}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {criterios.map((item, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px",
              gap: "12px",
              alignItems: "center",
              padding: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#f8fafc",
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                {item.criterio}
              </h4>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {item.descripcion}
              </p>
            </div>

            <span
              style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: "999px",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "12px",
                fontWeight: 900,
                padding: "8px 10px",
              }}
            >
              {item.peso}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
