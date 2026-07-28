export default function ScormAttemptHistory({ attempts = [] }) {
  if (!attempts.length) return null;

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #cbd5e1",
        borderRadius: "14px",
        background: "#f8fafc",
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
          Historial de intentos SCORM
        </h4>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Registro de oportunidades anteriores antes de iniciar un nuevo intento.
        </p>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {attempts.map((item, index) => (
          <div
            key={item.id || index}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              background: "#ffffff",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "8px",
              }}
            >
              <strong
                style={{
                  color: "#0f172a",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                Intento anterior #{attempts.length - index}
              </strong>

              <span
                style={{
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                Aplicado: {item.appliedAt || "Sin fecha"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <Info label="Nivel" value={item.status || "En Proceso"} />
              <Info label="Avance" value={`${item.progressPercent || 0}%`} />
              <Info label="Puntaje" value={`${item.score || 0}%`} />
              <Info label="Finalizado" value={item.completedAt || "Pendiente"} />
              <Info label="Decisión" value={item.teacherDecision || "Sin decisión"} />
            </div>

            {item.teacherDecisionNote && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#78350f",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                <strong>Nota docente:</strong> {item.teacherDecisionNote}
              </div>
            )}

            {item.aiFeedback && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "#faf5ff",
                  border: "1px solid #ddd6fe",
                  color: "#334155",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "#6d28d9" }}>Retroalimentación enviada:</strong>{" "}
                {item.aiFeedback}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Info({ label, value }) {
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
        }}
      >
        {value}
      </div>
    </div>
  );
}
