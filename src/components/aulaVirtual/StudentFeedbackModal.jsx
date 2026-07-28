export default function StudentFeedbackModal({ block, onClose, onUpdateBlock }) {
  if (!block) return null;

  const marcarComoLeido = () => {
    onUpdateBlock({
      ...block,
      feedbackViewed: true,
      feedbackViewedAt: new Date().toLocaleString(),
    });
  };

  const iniciarNuevoIntento = () => {
    const appliedAt = new Date().toLocaleString();

    const intentoAnterior = {
      id: Date.now(),
      status: block.status,
      progressPercent: block.progressPercent,
      score: block.score,
      completedAt: block.completedAt,
      aiFeedback: block.aiFeedback,
      aiOriginalFeedback: block.aiOriginalFeedback,
      aiGeneratedAt: block.aiGeneratedAt,
      teacherObservation: block.teacherObservation,
      humanReviewedAt: block.humanReviewedAt,
      feedbackSentAt: block.feedbackSentAt,
      feedbackViewedAt: block.feedbackViewedAt,
      teacherDecision: block.teacherDecision,
      teacherDecisionNote: block.teacherDecisionNote,
      teacherDecisionAt: block.teacherDecisionAt,
      appliedAt,
    };

    onUpdateBlock({
      ...block,
      attemptHistory: [intentoAnterior, ...(block.attemptHistory || [])],
      status: "En Inicio",
      progressPercent: 0,
      score: 0,
      completedAt: "",
      aiFeedback: "",
      aiOriginalFeedback: "",
      aiGeneratedAt: "",
      teacherObservation: "",
      humanReviewed: false,
      humanReviewedAt: "",
      feedbackSent: false,
      feedbackSentAt: "",
      feedbackViewed: false,
      feedbackViewedAt: "",
      teacherDecisionApplied: true,
      teacherDecisionAppliedAt: appliedAt,
    });

    onClose();
  };

  const puedeNuevoIntento =
    block.teacherDecision === "Permitir nuevo intento" &&
    block.feedbackViewed &&
    !block.teacherDecisionApplied;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 24px 60px rgba(15,23,42,.28)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg,#eff6ff,#f8fafc)",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 900 }}>
              Vista del estudiante
            </h3>

            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>
              Retroalimentación enviada por el docente
            </p>
          </div>

          <button type="button" onClick={onClose} style={buttonClose}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: "20px", display: "grid", gap: "14px" }}>
          <div
            style={{
              border: "1px solid #dbeafe",
              borderRadius: "16px",
              background: "#eff6ff",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <Badge text={block.tipo || "SCORM"} bg="#eef2ff" color="#4f46e5" />
              <Badge text={block.status || "En Inicio"} bg="#dbeafe" color="#1d4ed8" />
              <Badge text={`${block.score || 0}%`} bg="#fef3c7" color="#92400e" />
              {block.feedbackViewed && <Badge text="Leído" bg="#dcfce7" color="#166534" />}
            </div>

            <h4 style={{ margin: 0, color: "#0f172a", fontSize: "17px", fontWeight: 900 }}>
              {block.titulo}
            </h4>

            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
              Avance: {block.progressPercent || 0}% · Fecha de envío:{" "}
              {block.feedbackSentAt || "Pendiente"}
            </p>

            {block.feedbackViewedAt && (
              <p style={{ margin: "6px 0 0", color: "#047857", fontSize: "12px", fontWeight: 900 }}>
                Revisado por el estudiante: {block.feedbackViewedAt}
              </p>
            )}
          </div>

          <section style={purpleBox}>
            <h4 style={purpleTitle}>Retroalimentación del docente</h4>
            <p style={paragraph}>{block.aiFeedback || "Aún no hay retroalimentación enviada."}</p>
          </section>

          <section style={greenBox}>
            <h4 style={greenTitle}>Observación docente</h4>
            <p style={paragraphGreen}>
              {block.teacherObservation || "Retroalimentación validada por el docente."}
            </p>
          </section>

          {block.teacherDecision && (
            <section
              style={{
                border: "1px solid #fde68a",
                borderRadius: "16px",
                background: "#fffbeb",
                padding: "16px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "#92400e",
                  fontSize: "13px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                Decisión pedagógica docente
              </h4>

              <p style={{ margin: "10px 0 0", color: "#78350f", fontSize: "14px", fontWeight: 900 }}>
                {block.teacherDecision}
              </p>

              <p style={{ margin: "8px 0 0", color: "#475569", fontSize: "13px", lineHeight: 1.6 }}>
                {block.teacherDecisionNote || "Decisión registrada por el docente."}
              </p>

              {block.teacherDecisionAppliedAt && (
                <p style={{ margin: "8px 0 0", color: "#047857", fontSize: "12px", fontWeight: 900 }}>
                  Aplicado: {block.teacherDecisionAppliedAt}
                </p>
              )}
            </section>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={marcarComoLeido}
              disabled={block.feedbackViewed}
              style={{
                ...buttonGreen,
                background: block.feedbackViewed ? "#94a3b8" : "#059669",
                cursor: block.feedbackViewed ? "not-allowed" : "pointer",
              }}
            >
              {block.feedbackViewed ? "Retroalimentación revisada" : "Marcar como revisada"}
            </button>

            {puedeNuevoIntento && (
              <button type="button" onClick={iniciarNuevoIntento} style={buttonBlue}>
                Aplicar nuevo intento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonClose = {
  border: "1px solid #e5e7eb",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#334155",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonGreen = {
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 900,
};

const buttonBlue = {
  border: "none",
  borderRadius: "12px",
  background: "#2563eb",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const purpleBox = {
  border: "1px solid #ddd6fe",
  borderRadius: "16px",
  background: "#faf5ff",
  padding: "16px",
};

const greenBox = {
  border: "1px solid #bbf7d0",
  borderRadius: "16px",
  background: "#ecfdf5",
  padding: "16px",
};

const purpleTitle = {
  margin: 0,
  color: "#6d28d9",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const greenTitle = {
  margin: 0,
  color: "#047857",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const paragraph = {
  margin: "10px 0 0",
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.7,
};

const paragraphGreen = {
  margin: "10px 0 0",
  color: "#166534",
  fontSize: "14px",
  lineHeight: 1.7,
};

function Badge({ text, bg, color }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        background: bg,
        color,
        fontSize: "12px",
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
}
