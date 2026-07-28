import { useEffect, useState } from "react";

export default function ScormPlayerModal({ block, onClose, onSaveProgress }) {
  const [progress, setProgress] = useState({
    status: "En Inicio",
    progressPercent: 0,
    score: 0,
    attemptsUsed: 0,
    completedAt: "",
  });

  useEffect(() => {
    if (block) {
      setProgress({
        status: normalizeNivel(block.status) || "En Inicio",
        progressPercent: block.progressPercent || 0,
        score: block.score || 0,
        attemptsUsed: block.attemptsUsed || 0,
        completedAt: block.completedAt || "",
      });
    }
  }, [block]);

  if (!block) return null;

  const maxAttempts = block.maxAttempts || 3;
  const minScore = block.minScore || 70;
  const attemptsLocked = progress.attemptsUsed >= maxAttempts;
  const logroEsperado = progress.status === "Logro Esperado";

  const calcularNivelLogro = ({ progressPercent, score }) => {
    const avance = Number(progressPercent || 0);
    const puntaje = Number(score || 0);

    if (avance >= 100 && puntaje >= minScore) return "Logro Esperado";
    if (avance > 0 || puntaje > 0) return "En Proceso";
    return "En Inicio";
  };

  const saveProgress = (nuevoEstado) => {
    const updatedProgress = {
      ...progress,
      ...nuevoEstado,
    };

    setProgress(updatedProgress);

    onSaveProgress({
      ...block,
      ...updatedProgress,
      aiFeedback: "",
    });
  };

  const reiniciarSeguimiento = () => {
    saveProgress({
      status: "En Inicio",
      progressPercent: 0,
      score: 0,
      attemptsUsed: 0,
      completedAt: "",
    });
  };

  const iniciarIntento = () => {
    if (attemptsLocked || logroEsperado) return;

    const nuevoAvance = Math.max(progress.progressPercent, 10);

    saveProgress({
      status: "En Proceso",
      attemptsUsed: progress.attemptsUsed + 1,
      progressPercent: nuevoAvance,
    });
  };

  const simularAvance = () => {
    if (attemptsLocked || logroEsperado) return;

    const nextProgress = Math.min(progress.progressPercent + 25, 100);
    const nextStatus = calcularNivelLogro({
      progressPercent: nextProgress,
      score: progress.score,
    });

    saveProgress({
      status: nextStatus,
      progressPercent: nextProgress,
      completedAt: nextProgress >= 100 ? new Date().toLocaleString() : progress.completedAt,
    });
  };

  const registrarPuntaje = () => {
    if (attemptsLocked || logroEsperado) return;

    const nuevoPuntaje = Math.min(progress.score + 20, 100);
    const nextStatus = calcularNivelLogro({
      progressPercent: progress.progressPercent,
      score: nuevoPuntaje,
    });

    saveProgress({
      score: nuevoPuntaje,
      status: nextStatus,
    });
  };

  const finalizar = () => {
    if (logroEsperado) return;

    const nextStatus = calcularNivelLogro({
      progressPercent: 100,
      score: progress.score,
    });

    saveProgress({
      status: nextStatus,
      progressPercent: 100,
      completedAt: new Date().toLocaleString(),
    });

    setTimeout(() => {
      onClose();
    }, 300);
  };

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
          maxWidth: "940px",
          height: "82vh",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 24px 60px rgba(15,23,42,.28)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
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
              Reproductor SCORM
            </h3>

            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>
              {block.titulo}
            </p>
          </div>

          <button type="button" onClick={onClose} style={buttonClose}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: "22px", background: "#f8fafc", overflow: "auto" }}>
          <div
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: "18px",
              background: "#ffffff",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "74px",
                height: "74px",
                borderRadius: "22px",
                background: "linear-gradient(135deg,#dbeafe,#ede9fe)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                color: "#4f46e5",
                fontSize: "28px",
                fontWeight: 900,
              }}
            >
              LMS
            </div>

            <h2 style={{ margin: 0, color: "#0f172a", fontSize: "22px", fontWeight: 900 }}>
              {block.packageName || "Paquete SCORM"}
            </h2>

            <p
              style={{
                margin: "10px auto 18px",
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
                maxWidth: "620px",
              }}
            >
              Vista previa del paquete SCORM. El seguimiento se registra usando niveles de logro MINEDU.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px",
                textAlign: "left",
                marginBottom: "16px",
              }}
            >
              <Info label="Versión" value={block.scormVersion || "SCORM 1.2"} />
              <Info label="Inicio" value={block.launchFile || "index.html"} />
              <Info label="Puntaje mínimo" value={`${minScore}%`} />
              <Info label="Intentos usados" value={`${progress.attemptsUsed}/${maxAttempts}`} />
              <Info label="Nivel de logro" value={progress.status} />
              <Info label="Tamaño" value={block.packageSize || "No registrado"} />
            </div>

            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: "16px",
                background: "#eff6ff",
                padding: "14px",
                textAlign: "left",
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
                <span>Avance SCORM</span>
                <span>{progress.progressPercent}%</span>
              </div>

              <div
                style={{
                  height: "12px",
                  borderRadius: "999px",
                  background: "#dbeafe",
                  overflow: "hidden",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress.progressPercent}%`,
                    background: "#2563eb",
                    borderRadius: "999px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                }}
              >
                <Info label="Puntaje obtenido" value={`${progress.score}%`} />
                <Info label="Finalizado" value={progress.completedAt || "Pendiente"} />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 800 }}>
            Seguimiento SCORM con niveles MINEDU.
          </span>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" onClick={reiniciarSeguimiento} style={buttonDanger}>
              Reiniciar seguimiento
            </button>

            <button
              type="button"
              onClick={iniciarIntento}
              disabled={attemptsLocked || logroEsperado}
              style={disabledStyle(buttonSecondary, attemptsLocked || logroEsperado)}
            >
              Iniciar intento
            </button>

            <button
              type="button"
              onClick={simularAvance}
              disabled={attemptsLocked || logroEsperado}
              style={disabledStyle(buttonSecondary, attemptsLocked || logroEsperado)}
            >
              Avanzar 25%
            </button>

            <button
              type="button"
              onClick={registrarPuntaje}
              disabled={attemptsLocked || logroEsperado}
              style={disabledStyle(buttonSecondary, attemptsLocked || logroEsperado)}
            >
              +20 puntaje
            </button>

            <button
              type="button"
              onClick={finalizar}
              disabled={logroEsperado}
              style={disabledStyle(buttonPrimary, logroEsperado)}
            >
              Finalizar SCORM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeNivel(status) {
  if (status === "Aprobado") return "Logro Esperado";
  if (status === "No aprobado") return "En Proceso";
  if (status === "Completado") return "En Proceso";
  if (status === "En progreso") return "En Proceso";
  if (status === "No iniciado") return "En Inicio";
  return status;
}

function disabledStyle(base, disabled) {
  return {
    ...base,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
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

const buttonSecondary = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#334155",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonPrimary = {
  border: "none",
  borderRadius: "12px",
  background: "#4f46e5",
  color: "#ffffff",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

const buttonDanger = {
  border: "1px solid #fecaca",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#dc2626",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "pointer",
};

function Info({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "12px",
        background: "#f8fafc",
      }}
    >
      <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
        {label}
      </div>

      <div style={{ color: "#1e3a8a", fontSize: "13px", fontWeight: 900, wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
