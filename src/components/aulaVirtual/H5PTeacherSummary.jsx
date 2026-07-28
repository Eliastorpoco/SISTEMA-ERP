export default function H5PTeacherSummary({ block }) {
  const historial = block.h5pAttemptHistory || [];
  const intentoActual = historial.length + 1;

  const items = [
    {
      label: "Intento actual",
      value: `Intento ${intentoActual}`,
      note: "Actividad H5P activa del estudiante",
    },
    {
      label: "Historial",
      value: `${historial.length} intento(s) previo(s)`,
      note: "Intentos H5P conservados",
    },
    {
      label: "Estado H5P",
      value: block.h5pStatus || "Pendiente",
      note: `Avance ${block.h5pProgress || 0}% · Puntaje ${block.h5pScore || 0}%`,
    },
    {
      label: "Nivel formativo",
      value: block.formativeLevel || "En Inicio",
      note: `Puntaje formativo ${block.formativeScore || 0}%`,
    },
    {
      label: "Retroalimentación",
      value: block.formativeFeedbackSent
        ? "Enviada al estudiante"
        : block.formativeHumanReviewed
        ? "Validada por docente"
        : block.formativeAiFeedback
        ? "Generada por IA"
        : "Pendiente",
      note:
        block.formativeFeedbackSentAt ||
        block.formativeHumanReviewedAt ||
        block.formativeAiGeneratedAt ||
        "Sin fecha",
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
      <h4
        style={{
          margin: 0,
          color: "#1e3a8a",
          fontSize: "13px",
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        Resumen docente del seguimiento H5P
      </h4>

      <p
        style={{
          margin: "4px 0 12px",
          color: "#64748b",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Vista rápida del avance H5P, evaluación formativa, retroalimentación IA y revisión docente.
      </p>

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
            <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
              {item.label}
            </div>

            <div
              style={{
                marginTop: "5px",
                color: "#1e3a8a",
                fontSize: "13px",
                fontWeight: 900,
              }}
            >
              {item.value}
            </div>

            <div
              style={{
                marginTop: "5px",
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
