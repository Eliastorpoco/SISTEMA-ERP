import { useEffect, useState } from "react";

export default function FormativeEvaluationPanel({ block, onUpdateBlock }) {
  const [feedback, setFeedback] = useState(block.formativeAiFeedback || "");
  const [observation, setObservation] = useState(block.formativeTeacherObservation || "");

  useEffect(() => {
    setFeedback(block.formativeAiFeedback || "");
    setObservation(block.formativeTeacherObservation || "");
  }, [block.formativeAiFeedback, block.formativeTeacherObservation]);

  const nivel = block.formativeLevel || "En Inicio";
  const puntaje = Number(block.formativeScore || 0);

  const generarEvaluacionIA = () => {
    const evidencia = getEvidenceText(block.tipo);
    const nivelCalculado = getLevelByScore(puntaje);

    let texto = "";

    if (nivelCalculado === "Logro Esperado") {
      texto =
        `Has alcanzado el logro esperado en la actividad ${block.tipo}. Tu evidencia muestra comprensión, desarrollo adecuado y cumplimiento del propósito. Para seguir avanzando, puedes profundizar la explicación, comparar estrategias y aplicar lo aprendido en una situación más compleja.`;
    } else if (nivelCalculado === "En Proceso") {
      texto =
        `Te encuentras en proceso en la actividad ${block.tipo}. Tu evidencia muestra avances, pero todavía necesitas fortalecer algunos aspectos. Revisa las indicaciones, mejora la organización de tus ideas, completa los pasos pendientes y vuelve a presentar una versión mejorada.`;
    } else {
      texto =
        `Te encuentras en inicio en la actividad ${block.tipo}. Aún necesitas desarrollar mejor la evidencia solicitada. Revisa el propósito de la actividad, sigue las indicaciones paso a paso y solicita orientación si tienes dudas.`;
    }

    onUpdateBlock({
      ...block,
      formativeEvidence: block.formativeEvidence || evidencia,
      formativeLevel: nivelCalculado,
      formativeScore: puntaje,
      formativeAiOriginalFeedback: texto,
      formativeAiFeedback: texto,
      formativeAiGeneratedAt: new Date().toLocaleString(),
      formativeTeacherObservation: "",
      formativeHumanReviewed: false,
      formativeHumanReviewedAt: "",
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",
    });
  };

  const guardarCorreccionDocente = () => {
    if (!feedback.trim()) return;

    onUpdateBlock({
      ...block,
      formativeAiFeedback: feedback,
      formativeTeacherObservation:
        observation ||
        "Validado por docente. La retroalimentación fue revisada según la evidencia presentada.",
      formativeHumanReviewed: true,
      formativeHumanReviewedAt: new Date().toLocaleString(),
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
    });
  };

  const enviarRetroalimentacion = () => {
    if (!block.formativeAiFeedback || !block.formativeHumanReviewed) return;

    onUpdateBlock({
      ...block,
      formativeFeedbackSent: true,
      formativeFeedbackSentAt: new Date().toLocaleString(),
    });
  };

  const cambiarPuntaje = (value) => {
    const nuevoPuntaje = Number(value);
    const nuevoNivel = getLevelByScore(nuevoPuntaje);

    onUpdateBlock({
      ...block,
      formativeScore: nuevoPuntaje,
      formativeLevel: nuevoNivel,
      formativeAiFeedback: "",
      formativeAiOriginalFeedback: "",
      formativeAiGeneratedAt: "",
      formativeTeacherObservation: "",
      formativeHumanReviewed: false,
      formativeHumanReviewedAt: "",
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",
    });
  };

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #c4b5fd",
        borderRadius: "16px",
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
          Evaluación formativa con IA
        </h4>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Evaluación de la actividad, retroalimentación generada por IA y validación humana docente.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <Info label="Tipo de actividad" value={block.tipo} />
        <Info label="Nivel de logro" value={nivel} />
        <Info label="Puntaje formativo" value={`${puntaje}%`} />
      </div>

      <label style={{ display: "grid", gap: "6px", marginBottom: "12px" }}>
        <span style={labelStyle}>Ajustar puntaje formativo</span>
        <input
          type="range"
          min="0"
          max="100"
          value={puntaje}
          onChange={(e) => cambiarPuntaje(e.target.value)}
        />
      </label>

      <div
        style={{
          border: "1px solid #ddd6fe",
          borderRadius: "14px",
          background: "#ffffff",
          padding: "12px",
          marginBottom: "12px",
        }}
      >
        <div style={sectionTitle}>Evidencia de la actividad</div>
        <div style={textStyle}>{block.formativeEvidence || getEvidenceText(block.tipo)}</div>
      </div>

      <button
        type="button"
        onClick={generarEvaluacionIA}
        style={buttonPurple}
      >
        {block.formativeAiFeedback
          ? "Regenerar retroalimentación IA"
          : "Generar retroalimentación IA"}
      </button>

      {block.formativeAiFeedback && (
        <div
          style={{
            marginTop: "12px",
            border: "1px solid #ddd6fe",
            borderRadius: "14px",
            background: "#ffffff",
            padding: "12px",
          }}
        >
          <div style={sectionTitle}>Retroalimentación IA</div>

          {block.formativeFeedbackSent ? (
            <div style={finalTextBox}>{feedback}</div>
          ) : (
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              style={textareaStyle}
            />
          )}

          <div style={{ ...sectionTitle, color: "#047857", marginTop: "12px" }}>
            Observación docente
          </div>

          {block.formativeFeedbackSent ? (
            <div style={{ ...finalTextBox, borderColor: "#bbf7d0", color: "#166534" }}>
              {observation}
            </div>
          ) : (
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              placeholder="Escribe la validación o corrección humana del docente..."
              style={{
                ...textareaStyle,
                borderColor: "#bbf7d0",
                color: "#166534",
              }}
            />
          )}

          {block.formativeHumanReviewed && (
            <div style={validatedBox}>
              Validado por docente. La retroalimentación fue revisada humanamente.
            </div>
          )}

          <div style={{ marginTop: "10px", display: "grid", gap: "4px" }}>
            {block.formativeAiGeneratedAt && (
              <SmallLine label="Generado por IA" value={block.formativeAiGeneratedAt} />
            )}
            {block.formativeHumanReviewedAt && (
              <SmallLine label="Revisado por docente" value={block.formativeHumanReviewedAt} green />
            )}
            {block.formativeFeedbackSentAt && (
              <SmallLine label="Enviado al estudiante" value={block.formativeFeedbackSentAt} />
            )}
            {block.formativeFeedbackViewedAt && (
              <SmallLine label="Visto por estudiante" value={block.formativeFeedbackViewedAt} green />
            )}
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={guardarCorreccionDocente}
              disabled={block.formativeFeedbackSent}
              style={{
                ...buttonBlue,
                background: block.formativeFeedbackSent ? "#94a3b8" : "#2563eb",
                cursor: block.formativeFeedbackSent ? "not-allowed" : "pointer",
              }}
            >
              {block.formativeFeedbackSent
                ? "Corrección bloqueada"
                : "Guardar corrección docente"}
            </button>

            <button
              type="button"
              onClick={enviarRetroalimentacion}
              disabled={!block.formativeHumanReviewed || block.formativeFeedbackSent}
              style={{
                ...buttonGreen,
                background:
                  !block.formativeHumanReviewed || block.formativeFeedbackSent
                    ? "#94a3b8"
                    : "#059669",
                cursor:
                  !block.formativeHumanReviewed || block.formativeFeedbackSent
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {block.formativeFeedbackSent
                ? "Retroalimentación enviada"
                : !block.formativeHumanReviewed
                ? "Primero validar docente"
                : "Enviar retroalimentación"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function getLevelByScore(score) {
  if (score >= 70) return "Logro Esperado";
  if (score > 0) return "En Proceso";
  return "En Inicio";
}

function getEvidenceText(tipo) {
  const evidencias = {
    H5P: "El estudiante desarrolló una actividad interactiva y evidenció avances en la comprensión del tema.",
    Cuestionario: "El estudiante respondió preguntas evaluativas relacionadas con la unidad de aprendizaje.",
    Evidencia: "El estudiante presentó un producto o archivo como evidencia de aprendizaje.",
    Foro: "El estudiante participó en una discusión académica argumentando sus ideas.",
    Wiki: "El estudiante aportó a una construcción colaborativa de contenidos.",
    Debate: "El estudiante formuló argumentos y contraargumentos sobre el tema trabajado.",
    Simulación: "El estudiante interactuó con un escenario simulado para aplicar lo aprendido.",
    "Laboratorio virtual": "El estudiante desarrolló una práctica guiada en un entorno virtual.",
    IA: "El estudiante interactuó con un asistente IA para reforzar o construir aprendizajes.",
  };

  return evidencias[tipo] || "El estudiante desarrolló una actividad evaluable dentro de la unidad.";
}

const labelStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 900,
};

const sectionTitle = {
  color: "#6d28d9",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  marginBottom: "8px",
};

const textStyle = {
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

const textareaStyle = {
  width: "100%",
  border: "1px solid #ddd6fe",
  borderRadius: "12px",
  padding: "12px",
  color: "#334155",
  background: "#ffffff",
  fontSize: "13px",
  lineHeight: 1.5,
  resize: "vertical",
  outline: "none",
};

const finalTextBox = {
  width: "100%",
  border: "1px solid #ddd6fe",
  borderRadius: "12px",
  padding: "12px",
  color: "#334155",
  background: "#ffffff",
  fontSize: "13px",
  lineHeight: 1.6,
  whiteSpace: "pre-line",
};

const validatedBox = {
  marginTop: "12px",
  padding: "10px",
  borderRadius: "12px",
  background: "#ecfdf5",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 900,
};

const buttonPurple = {
  border: "none",
  borderRadius: "12px",
  background: "#7c3aed",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonBlue = {
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: 900,
};

const buttonGreen = {
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: 900,
};

function Info({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #ddd6fe",
        borderRadius: "12px",
        background: "#ffffff",
        padding: "10px",
      }}
    >
      <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ color: "#1e3a8a", fontSize: "13px", fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function SmallLine({ label, value, green = false }) {
  return (
    <div
      style={{
        color: green ? "#047857" : "#64748b",
        fontSize: "11px",
        fontWeight: 900,
      }}
    >
      {label}: {value}
    </div>
  );
}
