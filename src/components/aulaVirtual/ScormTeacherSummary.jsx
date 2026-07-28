export default function ScormTeacherSummary({ block }) {
  const historial = block.attemptHistory || [];
  const totalIntentosRegistrados = historial.length + 1;

  const items = [
    {
      label: "Intento actual",
      value: `Intento ${totalIntentosRegistrados}`,
      note: "Oportunidad activa del estudiante",
    },
    {
      label: "Historial",
      value: `${historial.length} intento(s) previo(s)`,
      note: "Intentos conservados antes de reiniciar",
    },
    {
      label: "Nivel actual",
      value: block.status || "En Inicio",
      note: `Avance ${block.progressPercent || 0}% · Puntaje ${block.score || 0}%`,
    },
    {
      label: "Retroalimentación",
      value: block.feedbackSent
        ? block.feedbackViewed
          ? "Leída por estudiante"
          : "Enviada"
        : block.humanReviewed
        ? "Validada por docente"
        : block.aiFeedback
        ? "Generada por IA"
        : "Pendiente",
      note: block.feedbackViewedAt || block.feedbackSentAt || block.humanReviewedAt || block.aiGeneratedAt || "Sin fecha",
    },
    {
      label: "Decisión docente",
      value: block.teacherDecision || "Pendiente",
      note: block.teacherDecisionAt || "Sin registrar",
    },
  ];

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #bfdbfe",
        borderRadius: "14px",
        background: "#eff6ff",
        padding: "14px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h4
          style={{
            margin: 0,
            color: "#1e3a8a",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Resumen docente del seguimiento
        </h4>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Vista rápida del estado del paquete SCORM, retroalimentación, revisión humana y decisiones pedagógicas.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "10px",
        }}
      >
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid #dbeafe",
              borderRadius: "12px",
              background: "#ffffff",
              padding: "12px",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 900,
                marginBottom: "5px",
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                color: "#1e3a8a",
                fontSize: "13px",
                fontWeight: 900,
                marginBottom: "5px",
              }}
            >
              {item.value}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
