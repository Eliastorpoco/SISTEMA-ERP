export default function ScormTraceability({ block }) {
  const eventos = [
    {
      titulo: "IA generó retroalimentación",
      fecha: block.aiGeneratedAt,
      estado: Boolean(block.aiGeneratedAt),
      descripcion: "La inteligencia artificial generó una sugerencia inicial según el nivel de logro.",
    },
    {
      titulo: "Docente revisó y corrigió",
      fecha: block.humanReviewedAt,
      estado: Boolean(block.humanReviewedAt),
      descripcion: "El docente validó, ajustó o corrigió la retroalimentación antes del envío.",
    },
    {
      titulo: "Retroalimentación enviada",
      fecha: block.feedbackSentAt,
      estado: Boolean(block.feedbackSentAt),
      descripcion: "La retroalimentación validada fue enviada al estudiante.",
    },
    {
      titulo: "Estudiante revisó",
      fecha: block.feedbackViewedAt,
      estado: Boolean(block.feedbackViewedAt),
      descripcion: "El estudiante abrió y marcó como revisada la retroalimentación recibida.",
    },
  ];

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        background: "#ffffff",
        padding: "14px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h4
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Trazabilidad IA + revisión humana
        </h4>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Registro del ciclo de evaluación, corrección docente y lectura del estudiante.
        </p>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {eventos.map((evento, index) => (
          <div
            key={evento.titulo}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr",
              gap: "10px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "999px",
                display: "grid",
                placeItems: "center",
                background: evento.estado ? "#dcfce7" : "#f1f5f9",
                color: evento.estado ? "#166534" : "#64748b",
                fontSize: "12px",
                fontWeight: 900,
                border: evento.estado ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              }}
            >
              {evento.estado ? "✓" : index + 1}
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "10px",
                background: evento.estado ? "#f8fafc" : "#ffffff",
              }}
            >
              <div
                style={{
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
              >
                {evento.titulo}
              </div>

              <div
                style={{
                  marginTop: "3px",
                  color: "#64748b",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                {evento.descripcion}
              </div>

              <div
                style={{
                  marginTop: "5px",
                  color: evento.estado ? "#047857" : "#94a3b8",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                {evento.fecha || "Pendiente"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
