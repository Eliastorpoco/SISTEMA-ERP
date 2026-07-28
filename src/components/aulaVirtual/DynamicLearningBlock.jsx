import { useEffect, useState } from "react";
import ScormTraceability from "./ScormTraceability";
import ScormReviewEvidence from "./ScormReviewEvidence";
import ScormTeacherDecision from "./ScormTeacherDecision";
import ScormAttemptHistory from "./ScormAttemptHistory";
import ScormTeacherSummary from "./ScormTeacherSummary";
import FormativeEvaluationPanel from "./FormativeEvaluationPanel";
import EvaluableActivityPanel from "./EvaluableActivityPanel";
import H5PUploadPanel from "./H5PUploadPanel";
import H5PTeacherSummary from "./H5PTeacherSummary";
import H5PAttemptHistory from "./H5PAttemptHistory";

export default function DynamicLearningBlock({
  block,
  onRemove,
  onConfigure,
  onLaunchScorm,
  onUpdateBlock,
  onOpenStudentView,
  editMode = false,
}) {
  const isScorm = block.tipo === "SCORM";
  const isH5P = block.tipo === "H5P";
  const scormMessage = isScorm ? getScormPedagogicalMessage(block) : null;
  const isFormativeEvaluable =
    !isScorm &&
    ["H5P", "Cuestionario", "Evidencia", "Foro", "Wiki", "Debate", "Simulación", "Laboratorio virtual", "IA"].includes(block.tipo);

  const [editedFeedback, setEditedFeedback] = useState(block.aiFeedback || "");
  const [teacherObservation, setTeacherObservation] = useState(
    block.teacherObservation || ""
  );

  useEffect(() => {
    setEditedFeedback(block.aiFeedback || "");
    setTeacherObservation(block.teacherObservation || "");
  }, [block.aiFeedback, block.teacherObservation]);

  const generarRetroalimentacionIA = () => {
    const nivel = block.status || "En Inicio";
    const puntaje = Number(block.score || 0);
    const avance = Number(block.progressPercent || 0);
    const minimo = Number(block.minScore || 70);
    const intentos = Number(block.attemptsUsed || 0);
    const intentosMaximos = Number(block.maxAttempts || 3);

    let feedback = "";

    if (nivel === "Logro Esperado") {
      feedback =
        `Has alcanzado el logro esperado. Completaste el paquete SCORM con un avance de ${avance}% y obtuviste ${puntaje}%, superando el puntaje mínimo esperado de ${minimo}%. Para seguir mejorando, desarrolla una actividad de profundización, explica tus procedimientos y aplica lo aprendido en una situación nueva.`;
    } else if (avance >= 100 && puntaje < minimo) {
      feedback =
        `Completaste el paquete SCORM con un avance de ${avance}%, pero tu puntaje de ${puntaje}% aún no alcanza el mínimo esperado de ${minimo}%. Te recomiendo revisar nuevamente los contenidos, identificar los errores frecuentes, practicar los ejercicios principales y realizar un nuevo intento guiado. Has usado ${intentos} de ${intentosMaximos} intento(s).`;
    } else if (avance > 0 || puntaje > 0) {
      feedback =
        `Te encuentras en proceso. Presentas un avance de ${avance}% y un puntaje de ${puntaje}%. Continúa desarrollando el paquete SCORM, revisa las secciones pendientes y solicita apoyo si encuentras dificultades.`;
    } else {
      feedback =
        "Te encuentras en inicio. Aún no se evidencia avance en el paquete SCORM. Ingresa al recurso, revisa el propósito de la actividad y empieza con la primera sección para familiarizarte con el contenido.";
    }

    setEditedFeedback(feedback);
    setTeacherObservation("");

    onUpdateBlock({
      ...block,
      aiOriginalFeedback: feedback,
      aiFeedback: feedback,
      aiGeneratedAt: new Date().toLocaleString(),
      teacherObservation: "",
      humanReviewed: false,
      feedbackSent: false,
      feedbackSentAt: "",
    });
  };

  const guardarCorreccionDocente = () => {
    const feedbackDocente = editedFeedback.trim();

    if (!feedbackDocente) return;

    const observacion =
      teacherObservation.trim() ||
      "Validado por docente. La retroalimentación fue revisada y ajustada según el desempeño del estudiante.";

    onUpdateBlock({
      ...block,
      aiFeedback: feedbackDocente,
      teacherObservation: observacion,
      humanReviewed: true,
      humanReviewedAt: new Date().toLocaleString(),
      feedbackSent: false,
      feedbackSentAt: "",
    });
  };

  const enviarRetroalimentacion = () => {
    if (!block.aiFeedback) return;

    onUpdateBlock({
      ...block,
      feedbackSent: true,
      feedbackSentAt: new Date().toLocaleString(),
      humanReviewed: true,
      teacherObservation:
        block.teacherObservation ||
        "Validado por docente. La retroalimentación fue revisada antes del envío.",
    });
  };

  return (
    <section
      style={{
        border: "1px solid #ddd6fe",
        borderRadius: "16px",
        background: block.visible === false ? "#f8fafc" : "#ffffff",
        padding: "16px",
        boxShadow: "0 1px 3px rgba(15,23,42,.06)",
        opacity: block.visible === false ? 0.65 : 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
          alignItems: "stretch",
        }}
      >
        <div style={{ width: "100%", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "8px",
            }}
          >
            <Badge text="Nuevo bloque" bg="#eef2ff" color="#4f46e5" />
            <Badge text={block.tipo} bg="#f8fafc" color="#334155" border />

            {block.configurado && (
              <Badge text="Configurado" bg="#dcfce7" color="#166534" />
            )}

            {block.obligatorio && (
              <Badge text="Obligatorio" bg="#fef3c7" color="#92400e" />
            )}

            {block.humanReviewed && (
              <Badge text="Revisión humana" bg="#ecfdf5" color="#047857" />
            )}

            {block.feedbackSent && (
              <Badge text="Retroalimentación enviada" bg="#dcfce7" color="#166534" />
            )}

            {block.feedbackViewed && (
              <Badge text="Retroalimentación leída" bg="#ecfdf5" color="#047857" />
            )}

            {isScorm && block.status && (
              <Badge
                text={block.status}
                bg={
                  block.status === "Logro Esperado"
                    ? "#dcfce7"
                    : block.status === "En Proceso"
                    ? "#dbeafe"
                    : "#f1f5f9"
                }
                color={
                  block.status === "Logro Esperado"
                    ? "#166534"
                    : block.status === "En Proceso"
                    ? "#1d4ed8"
                    : "#475569"
                }
              />
            )}
          </div>

          <h4
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: "15px",
              fontWeight: 900,
            }}
          >
            {block.titulo || `${block.tipo} agregado a la unidad`}
          </h4>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {block.descripcion}
          </p>

          {isScorm && block.configurado && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "14px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <InfoItem label="Versión" value={block.scormVersion || "SCORM 1.2"} />
                <InfoItem label="Inicio" value={block.launchFile || "index.html"} />
                <InfoItem label="Puntaje mínimo" value={`${block.minScore || 70}%`} />
                <InfoItem
                  label="Intentos"
                  value={`${block.attemptsUsed || 0}/${block.maxAttempts || 3}`}
                />
                <InfoItem
                  label="Seguimiento"
                  value={block.tracking === false ? "Inactivo" : "Activo"}
                />

                {block.packageName && (
                  <InfoItem
                    label="Paquete"
                    value={`${block.packageName} (${block.packageSize || "sin tamaño"})`}
                  />
                )}
              </div>

              <div
                style={{
                  borderTop: "1px solid #bfdbfe",
                  paddingTop: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "8px",
                    color: "#1e3a8a",
                    fontSize: "12px",
                    fontWeight: 900,
                  }}
                >
                  <span>Avance del estudiante</span>
                  <span>{block.progressPercent || 0}%</span>
                </div>

                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    background: "#dbeafe",
                    overflow: "hidden",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${block.progressPercent || 0}%`,
                      background: "#2563eb",
                      borderRadius: "999px",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "8px",
                  }}
                >
                  <InfoItem label="Nivel de logro" value={block.status || "En Inicio"} />
                  <InfoItem label="Puntaje obtenido" value={`${block.score || 0}%`} />
                  <InfoItem label="Finalizado" value={block.completedAt || "Pendiente"} />
                </div>

                {scormMessage && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      borderRadius: "14px",
                      border: `1px solid ${scormMessage.border}`,
                      background: scormMessage.bg,
                    }}
                  >
                    <div
                      style={{
                        color: scormMessage.color,
                        fontSize: "13px",
                        fontWeight: 900,
                        marginBottom: "4px",
                      }}
                    >
                      {scormMessage.title}
                    </div>

                    <div
                      style={{
                        color: "#475569",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      {scormMessage.text}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={generarRetroalimentacionIA}
                    style={{
                      border: "none",
                      borderRadius: "12px",
                      background: "#7c3aed",
                      color: "#ffffff",
                      padding: "10px 14px",
                      fontSize: "12px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {block.aiFeedback
                      ? "Regenerar retroalimentación IA"
                      : "Generar retroalimentación IA"}
                  </button>
                </div>

                {block.aiFeedback && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "14px",
                      borderRadius: "14px",
                      border: "1px solid #ddd6fe",
                      background: "#faf5ff",
                    }}
                  >
                    <div
                      style={{
                        color: "#6d28d9",
                        fontSize: "13px",
                        fontWeight: 900,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Retroalimentación IA
                    </div>

                    {block.feedbackSent ? (
                      <div
                        style={{
                          width: "100%",
                          border: "1px solid #ddd6fe",
                          borderRadius: "12px",
                          padding: "12px",
                          color: "#334155",
                          background: "#ffffff",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {editedFeedback}
                      </div>
                    ) : (
                      <textarea
                        value={editedFeedback}
                        onChange={(e) => setEditedFeedback(e.target.value)}
                        rows={5}
                        style={{
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
                        }}
                      />
                    )}

                    <div
                      style={{
                        marginTop: "12px",
                        color: "#047857",
                        fontSize: "13px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      Observación docente
                    </div>

                    {block.feedbackSent ? (
                      <div
                        style={{
                          marginTop: "8px",
                          width: "100%",
                          border: "1px solid #bbf7d0",
                          borderRadius: "12px",
                          padding: "12px",
                          color: "#166534",
                          background: "#ffffff",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {teacherObservation}
                      </div>
                    ) : (
                      <textarea
                        value={teacherObservation}
                        onChange={(e) => setTeacherObservation(e.target.value)}
                        rows={3}
                        placeholder="Escribe la validación o corrección humana del docente..."
                        style={{
                          marginTop: "8px",
                          width: "100%",
                          border: "1px solid #bbf7d0",
                          borderRadius: "12px",
                          padding: "12px",
                          color: "#166534",
                          background: "#ffffff",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    )}

                    {block.humanReviewed && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          borderRadius: "12px",
                          background: "#ecfdf5",
                          color: "#166534",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        Validado por docente. La retroalimentación fue revisada humanamente.
                      </div>
                    )}

                    {block.aiGeneratedAt && (
                      <div
                        style={{
                          marginTop: "8px",
                          color: "#64748b",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        Generado por IA: {block.aiGeneratedAt}
                      </div>
                    )}

                    {block.humanReviewedAt && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#047857",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        Revisado por docente: {block.humanReviewedAt}
                      </div>
                    )}

                    {block.feedbackSentAt && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#64748b",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        Fecha de envío: {block.feedbackSentAt}
                      </div>
                    )}

                    {block.feedbackViewedAt && (
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#047857",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        Vista estudiante: {block.feedbackViewedAt}
                      </div>
                    )}

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
                        disabled={block.feedbackSent}
                        style={{
                          border: "none",
                          borderRadius: "12px",
                          background: block.feedbackSent ? "#94a3b8" : "#2563eb",
                          color: "#ffffff",
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontWeight: 900,
                          cursor: block.feedbackSent ? "not-allowed" : "pointer",
                        }}
                      >
                        {block.feedbackSent
                          ? "Corrección bloqueada"
                          : "Guardar corrección docente"}
                      </button>

                      <button
                        type="button"
                        onClick={enviarRetroalimentacion}
                        disabled={block.feedbackSent || !block.humanReviewed}
                        style={{
                          border: "none",
                          borderRadius: "12px",
                          background:
                            block.feedbackSent || !block.humanReviewed
                              ? "#94a3b8"
                              : "#059669",
                          color: "#ffffff",
                          padding: "9px 12px",
                          fontSize: "12px",
                          fontWeight: 900,
                          cursor:
                            block.feedbackSent || !block.humanReviewed
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {block.feedbackSent
                          ? "Retroalimentación enviada"
                          : !block.humanReviewed
                          ? "Primero guardar corrección docente"
                          : "Enviar retroalimentación al estudiante"}
                      </button>
                    </div>
                  </div>
                )}

                {(block.configurado || block.attemptHistory?.length > 0) && (
                  <ScormTeacherSummary block={block} />
                )}

                {block.aiFeedback && <ScormReviewEvidence block={block} />}

                {block.humanReviewed && (
                  <ScormTeacherDecision
                    block={block}
                    onUpdateBlock={onUpdateBlock}
                  />
                )}

                {(block.attemptHistory || []).length > 0 && (
                  <ScormAttemptHistory attempts={block.attemptHistory} />
                )}

                {(block.aiGeneratedAt ||
                  block.humanReviewedAt ||
                  block.feedbackSentAt ||
                  block.feedbackViewedAt) && (
                  <ScormTraceability block={block} />
                )}
              </div>
            </div>
          )}

          {isFormativeEvaluable && (
            <>
              <EvaluableActivityPanel
                block={block}
                onUpdateBlock={onUpdateBlock}
              />

              <FormativeEvaluationPanel
                block={block}
                onUpdateBlock={onUpdateBlock}
              />
            </>
          )}

          <p
            style={{
              margin: "10px 0 0",
              color: "#7c3aed",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {block.configurado
              ? "Bloque configurado. Luego se conectará con base de datos y seguimiento."
              : "Pendiente de configurar contenido, visibilidad, evidencia y asistencia IA."}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "flex-start",
            marginTop: "4px",
            paddingTop: "12px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          {isScorm && block.configurado && (
            <button
              type="button"
              onClick={() => onLaunchScorm(block)}
              style={{
                border: "none",
                borderRadius: "999px",
                background: "#059669",
                color: "#ffffff",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Abrir SCORM
            </button>
          )}

          {block.feedbackSent && (
            <button
              type="button"
              onClick={() => onOpenStudentView(block)}
              style={{
                border: "none",
                borderRadius: "999px",
                background: "#0ea5e9",
                color: "#ffffff",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Ver vista estudiante
            </button>
          )}

          {editMode && (
            <>
              <button
                type="button"
                onClick={() => onConfigure(block)}
                style={{
                  border: "1px solid #c4b5fd",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#4f46e5",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Configurar
              </button>

              <button
                type="button"
                onClick={() => onRemove(block.id)}
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#dc2626",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function getScormPedagogicalMessage(block) {
  const avance = Number(block.progressPercent || 0);
  const puntaje = Number(block.score || 0);
  const minimo = Number(block.minScore || 70);

  if (block.status === "Logro Esperado") {
    return {
      title: "Logro esperado alcanzado",
      text: "El estudiante completó el paquete SCORM y alcanzó el puntaje mínimo esperado.",
      bg: "#ecfdf5",
      border: "#bbf7d0",
      color: "#166534",
    };
  }

  if (avance >= 100 && puntaje < minimo) {
    return {
      title: "En proceso de consolidación",
      text: `El estudiante completó el paquete SCORM, pero aún no alcanza el puntaje mínimo esperado de ${minimo}%. Requiere retroalimentación o una nueva oportunidad de mejora.`,
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    };
  }

  if (avance > 0 || puntaje > 0) {
    return {
      title: "Aprendizaje en proceso",
      text: "El estudiante inició la actividad y se encuentra desarrollando el paquete SCORM.",
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    };
  }

  return {
    title: "Actividad en inicio",
    text: "El estudiante todavía no evidencia avance en el paquete SCORM.",
    bg: "#f8fafc",
    border: "#e2e8f0",
    color: "#475569",
  };
}

function Badge({ text, bg, color, border = false }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: "999px",
        background: bg,
        color,
        fontSize: "11px",
        fontWeight: 900,
        border: border ? "1px solid #e5e7eb" : "none",
      }}
    >
      {text}
    </span>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 800,
          marginBottom: "3px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#1e3a8a",
          fontSize: "12px",
          fontWeight: 900,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
