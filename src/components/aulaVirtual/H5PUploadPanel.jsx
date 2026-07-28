import { useState } from "react";

export default function H5PUploadPanel({ block, onUpdateBlock }) {
  const [openPreview, setOpenPreview] = useState(false);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isH5P = file.name.toLowerCase().endsWith(".h5p");

    if (!isH5P) {
      alert("Por favor selecciona un archivo con extensión .h5p");
      event.target.value = "";
      return;
    }

    onUpdateBlock({
      ...block,
      configurado: true,
      h5pUploaded: true,
      h5pFileName: file.name,
      h5pFileSize: formatFileSize(file.size),
      h5pMimeType: file.type || "application/h5p",
      h5pUploadedAt: new Date().toLocaleString(),
      h5pStatus: "Disponible",
      h5pProgress: block.h5pProgress || 0,
      h5pScore: block.h5pScore || 0,
    });
  };

  const openH5P = () => {
    onUpdateBlock({
      ...block,
      h5pLastOpenedAt: new Date().toLocaleString(),
      h5pStatus: block.h5pCompleted ? "Completado" : "En uso",
    });

    setOpenPreview(true);
  };

  const startH5P = () => {
    onUpdateBlock({
      ...block,
      h5pStatus: "En desarrollo",
      h5pProgress: 25,
      h5pLastStartedAt: new Date().toLocaleString(),
    });
  };

  const advanceH5P = () => {
    const current = Number(block.h5pProgress || 0);
    const next = Math.min(current + 25, 100);

    onUpdateBlock({
      ...block,
      h5pStatus: next >= 100 ? "Completado" : "En desarrollo",
      h5pProgress: next,
      h5pScore: next >= 100 ? Math.max(Number(block.h5pScore || 0), 80) : block.h5pScore || 0,
      h5pCompleted: next >= 100,
      h5pCompletedAt: next >= 100 ? new Date().toLocaleString() : block.h5pCompletedAt || "",
      formativeScore: next >= 100 ? Math.max(Number(block.formativeScore || 0), 80) : block.formativeScore || 0,
      formativeLevel: next >= 100 ? "Logro Esperado" : block.formativeLevel || "En Proceso",
    });
  };

  const finishH5P = () => {
    const updatedBlock = {
      ...block,
      h5pStatus: "Completado",
      h5pProgress: 100,
      h5pScore: Math.max(Number(block.h5pScore || 0), 80),
      h5pCompleted: true,
      h5pCompletedAt: new Date().toLocaleString(),
      formativeScore: Math.max(Number(block.formativeScore || 0), 80),
      formativeLevel: "Logro Esperado",
      formativeAiFeedback: "",
      formativeAiOriginalFeedback: "",
      formativeTeacherObservation: "",
      formativeHumanReviewed: false,
      formativeHumanReviewedAt: "",
      formativeFeedbackSent: false,
      formativeFeedbackSentAt: "",
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",
    };

    onUpdateBlock(updatedBlock);
    setOpenPreview(false);
  };

  const startNewH5PAttempt = () => {
    const savedAt = new Date().toLocaleString();

    const intentoAnterior = {
      id: Date.now(),
      h5pFileName: block.h5pFileName,
      h5pFileSize: block.h5pFileSize,
      h5pStatus: block.h5pStatus,
      h5pProgress: block.h5pProgress,
      h5pScore: block.h5pScore,
      h5pCompleted: block.h5pCompleted,
      h5pCompletedAt: block.h5pCompletedAt,
      formativeScore: block.formativeScore,
      formativeLevel: block.formativeLevel,
      formativeEvidence: block.formativeEvidence,
      formativeAiOriginalFeedback: block.formativeAiOriginalFeedback,
      formativeAiFeedback: block.formativeAiFeedback,
      formativeAiGeneratedAt: block.formativeAiGeneratedAt,
      formativeTeacherObservation: block.formativeTeacherObservation,
      formativeHumanReviewedAt: block.formativeHumanReviewedAt,
      formativeFeedbackSentAt: block.formativeFeedbackSentAt,
      savedAt,
    };

    onUpdateBlock({
      ...block,
      h5pAttemptHistory: [intentoAnterior, ...(block.h5pAttemptHistory || [])],
      h5pStatus: "Disponible",
      h5pProgress: 0,
      h5pScore: 0,
      h5pCompleted: false,
      h5pCompletedAt: "",
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
    });
  };

  const removeH5P = () => {
    onUpdateBlock({
      ...block,
      configurado: false,
      h5pUploaded: false,
      h5pFileName: "",
      h5pFileSize: "",
      h5pMimeType: "",
      h5pUploadedAt: "",
      h5pStatus: "Pendiente",
      h5pProgress: 0,
      h5pScore: 0,
      h5pCompleted: false,
      h5pCompletedAt: "",
      h5pLastOpenedAt: "",
      h5pLastStartedAt: "",
    });
  };

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
        <div style={{ marginBottom: "12px" }}>
          <h4
            style={{
              margin: 0,
              color: "#0369a1",
              fontSize: "13px",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Actividad H5P
          </h4>

          <p
            style={{
              margin: "4px 0 0",
              color: "#64748b",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Sube un paquete .h5p para usarlo como actividad interactiva dentro de la unidad.
          </p>
        </div>

        {!block.h5pUploaded ? (
          <label
            style={{
              display: "grid",
              placeItems: "center",
              border: "2px dashed #7dd3fc",
              borderRadius: "16px",
              background: "#ffffff",
              padding: "24px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <input
              type="file"
              accept=".h5p"
              onChange={handleUpload}
              style={{ display: "none" }}
            />

            <div
              style={{
                color: "#0369a1",
                fontSize: "15px",
                fontWeight: 900,
                marginBottom: "6px",
              }}
            >
              + Subir archivo H5P
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              Selecciona una actividad interactiva en formato .h5p
            </div>
          </label>
        ) : (
          <div
            style={{
              border: "1px solid #bae6fd",
              borderRadius: "14px",
              background: "#ffffff",
              padding: "14px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <Info label="Archivo" value={block.h5pFileName} />
              <Info label="Tamaño" value={block.h5pFileSize} />
              <Info label="Estado" value={block.h5pStatus || "Disponible"} />
              <Info label="Subido" value={block.h5pUploadedAt} />
              <Info label="Avance" value={`${block.h5pProgress || 0}%`} />
              <Info label="Puntaje" value={`${block.h5pScore || 0}%`} />
            </div>

            <div
              style={{
                padding: "12px",
                borderRadius: "14px",
                border: "1px solid #bae6fd",
                background: "#f0f9ff",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  color: "#0369a1",
                  fontSize: "13px",
                  fontWeight: 900,
                  marginBottom: "4px",
                }}
              >
                Vista previa H5P
              </div>

              <div
                style={{
                  color: "#475569",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                El archivo está registrado. Al pulsar Abrir H5P se mostrará una vista previa
                del reproductor. Luego el backend descomprimirá el paquete real y publicará
                el archivo de inicio.
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={openH5P}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  background: "#0284c7",
                  color: "#ffffff",
                  padding: "9px 13px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Abrir H5P
              </button>

              <label
                style={{
                  border: "1px solid #bae6fd",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#0369a1",
                  padding: "9px 13px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cambiar archivo
                <input
                  type="file"
                  accept=".h5p"
                  onChange={handleUpload}
                  style={{ display: "none" }}
                />
              </label>

              {block.h5pCompleted && (
                <button
                  type="button"
                  onClick={startNewH5PAttempt}
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "999px",
                    background: "#ffffff",
                    color: "#2563eb",
                    padding: "9px 13px",
                    fontSize: "12px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Nuevo intento H5P
                </button>
              )}

              <button
                type="button"
                onClick={removeH5P}
                style={{
                  border: "1px solid #fecaca",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#dc2626",
                  padding: "9px 13px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Quitar H5P
              </button>
            </div>
          </div>
        )}
      </section>

      {openPreview && (
        <H5PPreviewModal
          block={block}
          onClose={() => setOpenPreview(false)}
          onStart={startH5P}
          onAdvance={advanceH5P}
          onFinish={finishH5P}
        />
      )}
    </>
  );
}

function H5PPreviewModal({ block, onClose, onStart, onAdvance, onFinish }) {
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
          maxWidth: "820px",
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
            background: "linear-gradient(135deg,#f0f9ff,#f8fafc)",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              Reproductor H5P
            </h3>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              {block.h5pFileName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "999px",
              background: "#ffffff",
              color: "#334155",
              padding: "9px 13px",
              fontSize: "12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div
            style={{
              minHeight: "330px",
              border: "1px solid #bae6fd",
              borderRadius: "18px",
              background: "#f0f9ff",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: "24px",
            }}
          >
            <div>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "20px",
                  background: "#dbeafe",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  fontSize: "24px",
                  fontWeight: 900,
                }}
              >
                H5P
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "20px",
                  fontWeight: 900,
                }}
              >
                {block.h5pFileName}
              </h3>

              <p
                style={{
                  margin: "10px auto 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  maxWidth: "560px",
                }}
              >
                Vista previa del paquete H5P. Cuando conectemos el backend, aquí se cargará
                el contenido real descomprimido dentro de un iframe o reproductor H5P.
              </p>

              <div
                style={{
                  marginTop: "18px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                }}
              >
                <Info label="Estado" value={block.h5pStatus || "Disponible"} />
                <Info label="Avance" value={`${block.h5pProgress || 0}%`} />
                <Info label="Puntaje" value={`${block.h5pScore || 0}%`} />
                <Info label="Tamaño" value={block.h5pFileSize} />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "14px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button type="button" onClick={onStart} style={buttonWhite}>
              Iniciar actividad
            </button>

            <button type="button" onClick={onAdvance} style={buttonBlue}>
              Avanzar 25%
            </button>

            <button
              type="button"
              onClick={onFinish}
              disabled={block.h5pCompleted}
              style={{
                ...buttonGreen,
                background: block.h5pCompleted ? "#94a3b8" : "#059669",
                cursor: block.h5pCompleted ? "not-allowed" : "pointer",
              }}
            >
              {block.h5pCompleted ? "H5P finalizado" : "Finalizar H5P"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 900,
          marginBottom: "3px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0c4a6e",
          fontSize: "12px",
          fontWeight: 900,
          wordBreak: "break-word",
        }}
      >
        {value || "Pendiente"}
      </div>
    </div>
  );
}

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
  cursor: "pointer",
};

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
