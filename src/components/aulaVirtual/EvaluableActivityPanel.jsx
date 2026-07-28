import { useState } from "react";

const EVALUABLE_TYPES = [
  "H5P",
  "Cuestionario",
  "Evidencia",
  "Foro",
  "Wiki",
  "Debate",
  "Simulación",
  "Laboratorio virtual",
  "IA",
  "PDF",
  "Video",
];

export default function EvaluableActivityPanel({ block, onUpdateBlock }) {
  const [openPreview, setOpenPreview] = useState(false);

  const isH5P = block.tipo === "H5P";

  const runtime = normalizeRuntime(block);
  const attempts = block.activityAttemptHistory || block.h5pAttemptHistory || [];

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const updated = {
      ...block,
      configurado: true,

      activityConfigured: true,
      activityFileName: file.name,
      activityFileSize: formatFileSize(file.size),
      activityUploadedAt: new Date().toLocaleString(),
      activityStatus: "Disponible",
      activityProgress: runtime.progress,
      activityScore: runtime.score,

      ...(isH5P
        ? {
            h5pUploaded: true,
            h5pFileName: file.name,
            h5pFileSize: formatFileSize(file.size),
            h5pUploadedAt: new Date().toLocaleString(),
            h5pStatus: "Disponible",
            h5pProgress: runtime.progress,
            h5pScore: runtime.score,
          }
        : {}),
    };

    onUpdateBlock(updated);
  };

  const openActivity = () => {
    onUpdateBlock({
      ...block,
      activityLastOpenedAt: new Date().toLocaleString(),
      activityStatus: runtime.completed ? "Completado" : "En uso",

      ...(isH5P
        ? {
            h5pLastOpenedAt: new Date().toLocaleString(),
            h5pStatus: runtime.completed ? "Completado" : "En uso",
          }
        : {}),
    });

    setOpenPreview(true);
  };

  const startActivity = () => {
    updateActivityProgress(25, false);
  };

  const advanceActivity = () => {
    const next = Math.min(Number(runtime.progress || 0) + 25, 100);
    updateActivityProgress(next, next >= 100);
  };

  const finishActivity = () => {
    updateActivityProgress(100, true);
    setOpenPreview(false);
  };

  const updateActivityProgress = (progress, completed) => {
    const score = completed ? Math.max(Number(runtime.score || 0), 80) : runtime.score || 0;
    const level = completed ? "Logro Esperado" : progress > 0 ? "En Proceso" : "En Inicio";

    onUpdateBlock({
      ...block,
      activityStatus: completed ? "Completado" : "En desarrollo",
      activityProgress: progress,
      activityScore: score,
      activityCompleted: completed,
      activityCompletedAt: completed ? new Date().toLocaleString() : block.activityCompletedAt || "",

      formativeScore: completed ? score : block.formativeScore || 0,
      formativeLevel: level,
      formativeAiFeedback: "",
      formativeAiOriginalFeedback: "",
      formativeTeacherObservation: "",
      formativeHumanReviewed: false,
      formativeHumanReviewedAt: "",
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",

      ...(isH5P
        ? {
            h5pStatus: completed ? "Completado" : "En desarrollo",
            h5pProgress: progress,
            h5pScore: score,
            h5pCompleted: completed,
            h5pCompletedAt: completed ? new Date().toLocaleString() : block.h5pCompletedAt || "",
          }
        : {}),
    });
  };

  const startNewAttempt = () => {
    const savedAt = new Date().toLocaleString();

    const previousAttempt = {
      id: Date.now(),
      tipo: block.tipo,
      title: block.titulo,
      fileName: runtime.fileName,
      fileSize: runtime.fileSize,
      status: runtime.status,
      progress: runtime.progress,
      score: runtime.score,
      completed: runtime.completed,
      completedAt: runtime.completedAt,
      formativeScore: block.formativeScore,
      formativeLevel: block.formativeLevel,
      formativeEvidence: block.formativeEvidence,
      formativeAiOriginalFeedback: block.formativeAiOriginalFeedback,
      formativeAiFeedback: block.formativeAiFeedback,
      formativeAiGeneratedAt: block.formativeAiGeneratedAt,
      formativeTeacherObservation: block.formativeTeacherObservation,
      formativeHumanReviewedAt: block.formativeHumanReviewedAt,
      formativeFeedbackSentAt: block.formativeFeedbackSentAt,

      h5pFileName: runtime.fileName,
      h5pFileSize: runtime.fileSize,
      h5pStatus: runtime.status,
      h5pProgress: runtime.progress,
      h5pScore: runtime.score,
      h5pCompleted: runtime.completed,
      h5pCompletedAt: runtime.completedAt,

      savedAt,
    };

    const newHistory = [previousAttempt, ...attempts];

    onUpdateBlock({
      ...block,
      activityAttemptHistory: newHistory,

      activityStatus: "Disponible",
      activityProgress: 0,
      activityScore: 0,
      activityCompleted: false,
      activityCompletedAt: "",

      formativeScore: 0,
      formativeLevel: "En Inicio",
      formativeAiFeedback: "",
      formativeAiOriginalFeedback: "",
      formativeTeacherObservation: "",
      formativeHumanReviewed: false,
      formativeHumanReviewedAt: "",
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",

      ...(isH5P
        ? {
            h5pAttemptHistory: newHistory,
            h5pStatus: "Disponible",
            h5pProgress: 0,
            h5pScore: 0,
            h5pCompleted: false,
            h5pCompletedAt: "",
          }
        : {}),
    });
  };

  const removeResource = () => {
    onUpdateBlock({
      ...block,
      configurado: false,

      activityConfigured: false,
      activityFileName: "",
      activityFileSize: "",
      activityUploadedAt: "",
      activityStatus: "Pendiente",
      activityProgress: 0,
      activityScore: 0,
      activityCompleted: false,
      activityCompletedAt: "",

      ...(isH5P
        ? {
            h5pUploaded: false,
            h5pFileName: "",
            h5pFileSize: "",
            h5pUploadedAt: "",
            h5pStatus: "Pendiente",
            h5pProgress: 0,
            h5pScore: 0,
            h5pCompleted: false,
            h5pCompletedAt: "",
          }
        : {}),
    });
  };

  if (!EVALUABLE_TYPES.includes(block.tipo)) return null;

  return (
    <>
      <section
        style={{
          marginTop: "12px",
          border: "1px solid #bae6fd",
          borderRadius: "16px",
          background: "#f0f9ff",
          padding: "14px",
        }}
      >
        <h4 style={blueTitle}>Actividad evaluable: {block.tipo}</h4>

        <p style={mutedText}>
          Configura, abre y registra el avance de esta actividad dentro de la evaluación formativa.
        </p>

        {!runtime.configured ? (
          <label style={uploadBox}>
            <input
              type="file"
              accept={getAcceptByType(block.tipo)}
              onChange={handleUpload}
              style={{ display: "none" }}
            />

            <div style={{ color: "#0369a1", fontSize: "15px", fontWeight: 900 }}>
              + Subir o asociar recurso
            </div>

            <div style={mutedText}>
              Archivo o recurso base para la actividad {block.tipo}.
            </div>
          </label>
        ) : (
          <div style={whiteBox}>
            <div style={infoGrid}>
              <Info label="Recurso" value={runtime.fileName || `${block.tipo} configurado`} />
              <Info label="Tamaño" value={runtime.fileSize || "No aplica"} />
              <Info label="Estado" value={runtime.status} />
              <Info label="Subido" value={runtime.uploadedAt || "Registrado"} />
              <Info label="Avance" value={`${runtime.progress}%`} />
              <Info label="Puntaje" value={`${runtime.score}%`} />
            </div>

            <div style={previewBox}>
              <strong>Vista previa de actividad</strong>
              <p style={mutedText}>
                Aquí se mostrará el recurso real cuando se conecte al backend. Por ahora se registra
                la actividad, avance, puntaje, intentos y evaluación formativa.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={openActivity} style={buttonPrimary}>
                Abrir actividad
              </button>

              <label style={buttonOutline}>
                Cambiar recurso
                <input
                  type="file"
                  accept={getAcceptByType(block.tipo)}
                  onChange={handleUpload}
                  style={{ display: "none" }}
                />
              </label>

              {runtime.completed && (
                <button type="button" onClick={startNewAttempt} style={buttonOutlineBlue}>
                  Nuevo intento
                </button>
              )}

              <button type="button" onClick={removeResource} style={buttonDanger}>
                Quitar recurso
              </button>
            </div>
          </div>
        )}
      </section>

      <TeacherSummary block={block} runtime={runtime} attempts={attempts} />

      {attempts.length > 0 && <AttemptHistory attempts={attempts} />}

      {openPreview && (
        <ActivityPreviewModal
          block={block}
          runtime={runtime}
          onClose={() => setOpenPreview(false)}
          onStart={startActivity}
          onAdvance={advanceActivity}
          onFinish={finishActivity}
        />
      )}
    </>
  );
}

function TeacherSummary({ block, runtime, attempts }) {
  const items = [
    {
      label: "Intento actual",
      value: `Intento ${attempts.length + 1}`,
      note: `Actividad ${block.tipo} activa`,
    },
    {
      label: "Historial",
      value: `${attempts.length} intento(s) previo(s)`,
      note: "Intentos conservados",
    },
    {
      label: "Estado",
      value: runtime.status,
      note: `Avance ${runtime.progress}% · Puntaje ${runtime.score}%`,
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
    <section style={summaryBox}>
      <h4 style={summaryTitle}>Resumen docente del seguimiento</h4>

      <p style={mutedText}>
        Vista rápida del avance, evaluación formativa, retroalimentación IA y revisión docente.
      </p>

      <div style={infoGrid}>
        {items.map((item) => (
          <div key={item.label} style={whiteBoxSmall}>
            <div style={infoLabel}>{item.label}</div>
            <div style={infoValue}>{item.value}</div>
            <div style={infoNote}>{item.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AttemptHistory({ attempts }) {
  return (
    <section style={historyBox}>
      <h4 style={historyTitle}>Historial de intentos</h4>

      <p style={mutedText}>
        Registro de oportunidades anteriores antes de iniciar un nuevo intento.
      </p>

      <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
        {attempts.map((item, index) => (
          <div key={item.id || index} style={whiteBoxSmall}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <strong style={{ color: "#0f172a", fontSize: "13px", fontWeight: 900 }}>
                Intento anterior #{attempts.length - index}
              </strong>

              <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                Registrado: {item.savedAt || "Sin fecha"}
              </span>
            </div>

            <div style={infoGrid}>
              <Info label="Recurso" value={item.fileName || item.h5pFileName || "Actividad"} />
              <Info label="Estado" value={item.status || item.h5pStatus || "Completado"} />
              <Info label="Avance" value={`${item.progress ?? item.h5pProgress ?? 0}%`} />
              <Info label="Puntaje" value={`${item.score ?? item.h5pScore ?? 0}%`} />
              <Info label="Nivel" value={item.formativeLevel || "En Inicio"} />
              <Info label="Finalizado" value={item.completedAt || item.h5pCompletedAt || "Pendiente"} />
            </div>

            {item.formativeAiFeedback && (
              <div style={feedbackHistoryBox}>
                <strong style={{ color: "#6d28d9" }}>
                  Retroalimentación IA enviada:
                </strong>{" "}
                {item.formativeAiFeedback}
              </div>
            )}

            {item.formativeTeacherObservation && (
              <div style={teacherHistoryBox}>
                <strong>Observación docente:</strong>{" "}
                {item.formativeTeacherObservation}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPreviewModal({ block, runtime, onClose, onStart, onAdvance, onFinish }) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div style={modalHeader}>
          <div>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 900 }}>
              Reproductor de actividad
            </h3>

            <p style={mutedText}>
              {runtime.fileName || block.titulo}
            </p>
          </div>

          <button type="button" onClick={onClose} style={buttonClose}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={modalPreview}>
            <div>
              <div style={modalIcon}>{block.tipo}</div>

              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: 900 }}>
                {runtime.fileName || block.titulo}
              </h3>

              <p style={{ ...mutedText, maxWidth: "560px", margin: "10px auto 0" }}>
                Vista previa de la actividad. Al conectar backend, aquí se abrirá el recurso real,
                cuestionario, evidencia, foro, wiki, simulación o contenido interactivo.
              </p>

              <div style={{ ...infoGrid, marginTop: "18px" }}>
                <Info label="Estado" value={runtime.status} />
                <Info label="Avance" value={`${runtime.progress}%`} />
                <Info label="Puntaje" value={`${runtime.score}%`} />
                <Info label="Tipo" value={block.tipo} />
              </div>
            </div>
          </div>

          <div style={modalActions}>
            <button type="button" onClick={onStart} style={buttonWhite}>
              Iniciar actividad
            </button>

            <button type="button" onClick={onAdvance} style={buttonBlue}>
              Avanzar 25%
            </button>

            <button
              type="button"
              onClick={onFinish}
              disabled={runtime.completed}
              style={{
                ...buttonGreen,
                background: runtime.completed ? "#94a3b8" : "#059669",
                cursor: runtime.completed ? "not-allowed" : "pointer",
              }}
            >
              {runtime.completed ? "Actividad finalizada" : "Finalizar actividad"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeRuntime(block) {
  const isH5P = block.tipo === "H5P";

  return {
    configured:
      Boolean(block.activityConfigured) ||
      Boolean(block.configurado) ||
      Boolean(block.h5pUploaded),

    fileName:
      block.activityFileName ||
      block.h5pFileName ||
      block.packageName ||
      "",

    fileSize:
      block.activityFileSize ||
      block.h5pFileSize ||
      block.packageSize ||
      "",

    uploadedAt:
      block.activityUploadedAt ||
      block.h5pUploadedAt ||
      "",

    status:
      block.activityStatus ||
      (isH5P ? block.h5pStatus : "") ||
      "Pendiente",

    progress:
      Number(block.activityProgress ?? block.h5pProgress ?? 0),

    score:
      Number(block.activityScore ?? block.h5pScore ?? 0),

    completed:
      Boolean(block.activityCompleted || block.h5pCompleted),

    completedAt:
      block.activityCompletedAt ||
      block.h5pCompletedAt ||
      "",
  };
}

function getAcceptByType(tipo) {
  const map = {
    H5P: ".h5p",
    PDF: ".pdf",
    Video: ".mp4,.webm,.mov",
    Evidencia: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg",
    Cuestionario: ".json,.csv,.xlsx,.txt",
    Simulación: ".html,.zip",
    "Laboratorio virtual": ".html,.zip,.pdf",
  };

  return map[tipo] || "*";
}

function Info({ label, value }) {
  return (
    <div>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value || "Pendiente"}</div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const blueTitle = {
  margin: 0,
  color: "#0369a1",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const mutedText = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.5,
};

const uploadBox = {
  marginTop: "12px",
  display: "grid",
  placeItems: "center",
  border: "2px dashed #7dd3fc",
  borderRadius: "16px",
  background: "#ffffff",
  padding: "24px",
  cursor: "pointer",
  textAlign: "center",
};

const whiteBox = {
  marginTop: "12px",
  border: "1px solid #bae6fd",
  borderRadius: "14px",
  background: "#ffffff",
  padding: "14px",
};

const whiteBoxSmall = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#ffffff",
  padding: "12px",
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "10px",
};

const previewBox = {
  marginTop: "12px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #bae6fd",
  background: "#f0f9ff",
  marginBottom: "12px",
  color: "#0369a1",
  fontSize: "13px",
};

const summaryBox = {
  marginTop: "12px",
  border: "1px solid #bfdbfe",
  borderRadius: "14px",
  background: "#eff6ff",
  padding: "14px",
};

const summaryTitle = {
  margin: 0,
  color: "#1e3a8a",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const historyBox = {
  marginTop: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "#f8fafc",
  padding: "14px",
};

const historyTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const infoLabel = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 900,
  marginBottom: "3px",
};

const infoValue = {
  color: "#1e3a8a",
  fontSize: "12px",
  fontWeight: 900,
  wordBreak: "break-word",
};

const infoNote = {
  marginTop: "5px",
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.4,
};

const feedbackHistoryBox = {
  marginTop: "8px",
  padding: "10px",
  borderRadius: "10px",
  background: "#faf5ff",
  border: "1px solid #ddd6fe",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.5,
};

const teacherHistoryBox = {
  marginTop: "8px",
  padding: "10px",
  borderRadius: "10px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: "12px",
  lineHeight: 1.5,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.55)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const modalBox = {
  width: "100%",
  maxWidth: "820px",
  maxHeight: "90vh",
  overflow: "auto",
  borderRadius: "20px",
  background: "#ffffff",
  boxShadow: "0 24px 60px rgba(15,23,42,.28)",
};

const modalHeader = {
  padding: "18px 20px",
  borderBottom: "1px solid #e5e7eb",
  background: "linear-gradient(135deg,#f0f9ff,#f8fafc)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
};

const modalPreview = {
  minHeight: "330px",
  border: "1px solid #bae6fd",
  borderRadius: "18px",
  background: "#f0f9ff",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: "24px",
};

const modalIcon = {
  width: "78px",
  height: "78px",
  borderRadius: "20px",
  background: "#dbeafe",
  color: "#2563eb",
  display: "grid",
  placeItems: "center",
  margin: "0 auto 16px",
  fontSize: "15px",
  fontWeight: 900,
};

const modalActions = {
  marginTop: "14px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const buttonPrimary = {
  border: "none",
  borderRadius: "999px",
  background: "#0284c7",
  color: "#ffffff",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonOutline = {
  border: "1px solid #bae6fd",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#0369a1",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonOutlineBlue = {
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#2563eb",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonDanger = {
  border: "1px solid #fecaca",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#dc2626",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

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

const buttonWhite = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#334155",
  padding: "10px 14px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonBlue = {
  border: "none",
  borderRadius: "12px",
  background: "#2563eb",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonGreen = {
  border: "none",
  borderRadius: "12px",
  background: "#059669",
  color: "#ffffff",
  padding: "10px 14px",
  fontSize: "12px",
  fontWeight: 900,
};
