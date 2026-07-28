import BlockTitle from "./BlockTitle";

export default function FeedbackBlock() {
  const recomendaciones = [
    {
      titulo: "Retroalimentación automática",
      descripcion:
        "La IA analiza la evidencia del estudiante y genera comentarios personalizados.",
      accion: "Generar",
    },
    {
      titulo: "Recomendaciones de mejora",
      descripcion:
        "Sugiere actividades de refuerzo según el nivel de logro alcanzado.",
      accion: "Sugerir",
    },
    {
      titulo: "Validación docente",
      descripcion:
        "El docente revisa, ajusta y aprueba la retroalimentación antes de enviarla.",
      accion: "Revisar",
    },
  ];

  return (
    <section
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "16px",
        background: "linear-gradient(135deg,#eff6ff,#eef2ff)",
        padding: "16px",
      }}
    >
      <BlockTitle
        title="Retroalimentación y mejora continua"
        subtitle="Seguimiento inteligente del aprendizaje con apoyo de IA"
      />

      <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
        {recomendaciones.map((item, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "12px",
              alignItems: "center",
              padding: "14px",
              border: "1px solid #dbeafe",
              borderRadius: "14px",
              background: "#ffffff",
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
                {item.titulo}
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

            <button
              type="button"
              style={{
                border: "none",
                borderRadius: "12px",
                background: "#2563eb",
                color: "#ffffff",
                padding: "10px 14px",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {item.accion}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
