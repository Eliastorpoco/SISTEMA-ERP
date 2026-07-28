export default function ScormReviewEvidence({ block }) {
  if (!block?.aiFeedback) return null;

  const originalIA = block.aiOriginalFeedback || block.aiFeedback;
  const finalDocente = block.aiFeedback;
  const fueEditada = originalIA.trim() !== finalDocente.trim();

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #ddd6fe",
        borderRadius: "14px",
        background: "#faf5ff",
        padding: "14px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h4
          style={{
            margin: 0,
            color: "#6d28d9",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Evidencia IA + corrección humana
        </h4>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Comparación entre la sugerencia inicial de IA y la versión final validada por el docente.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px",
        }}
      >
        <ReviewBox
          title="Versión generada por IA"
          text={originalIA}
          border="#ddd6fe"
          bg="#ffffff"
          color="#6d28d9"
        />

        <ReviewBox
          title="Versión final docente"
          text={finalDocente}
          border="#bbf7d0"
          bg="#ffffff"
          color="#047857"
        />
      </div>

      <div
        style={{
          marginTop: "12px",
          padding: "10px 12px",
          borderRadius: "12px",
          background: fueEditada ? "#eff6ff" : "#ecfdf5",
          border: fueEditada ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
          color: fueEditada ? "#1d4ed8" : "#166534",
          fontSize: "12px",
          fontWeight: 900,
        }}
      >
        {fueEditada
          ? "El docente modificó la sugerencia de IA antes de enviarla al estudiante."
          : "El docente validó la sugerencia de IA sin modificaciones significativas."}
      </div>

      {block.teacherObservation && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
          }}
        >
          <div
            style={{
              color: "#047857",
              fontSize: "12px",
              fontWeight: 900,
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Observación humana del docente
          </div>

          <div
            style={{
              color: "#166534",
              fontSize: "12px",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
            }}
          >
            {block.teacherObservation}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewBox({ title, text, border, bg, color }) {
  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: "14px",
        background: bg,
        padding: "12px",
      }}
    >
      <div
        style={{
          color,
          fontSize: "12px",
          fontWeight: 900,
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#334155",
          fontSize: "12px",
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
    </div>
  );
}
