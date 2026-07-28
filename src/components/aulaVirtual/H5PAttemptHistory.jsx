export default function H5PAttemptHistory({ attempts = [] }) {
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
      <h4
        style={{
          margin: 0,
          color: "#0f172a",
          fontSize: "13px",
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        Historial de intentos H5P
      </h4>

      <p
        style={{
          margin: "4px 0 12px",
          color: "#64748b",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Registro de actividades H5P anteriores antes de iniciar una nueva oportunidad.
      </p>

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
              <strong style={{ color: "#0f172a", fontSize: "13px", fontWeight: 900 }}>
                Intento H5P anterior #{attempts.length - index}
              </strong>

              <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                Registrado: {item.savedAt || "Sin fecha"}
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
              <Info label="Archivo" value={item.h5pFileName || "H5P"} />
              <Info label="Estado" value={item.h5pStatus || "Completado"} />
              <Info label="Avance" value={`${item.h5pProgress || 0}%`} />
              <Info label="Puntaje" value={`${item.h5pScore || 0}%`} />
              <Info label="Nivel" value={item.formativeLevel || "En Inicio"} />
              <Info label="Finalizado" value={item.h5pCompletedAt || "Pendiente"} />
            </div>

            {item.formativeAiFeedback && (
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
                <strong style={{ color: "#6d28d9" }}>Retroalimentación IA enviada:</strong>{" "}
                {item.formativeAiFeedback}
              </div>
            )}

            {item.formativeTeacherObservation && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
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

function Info({ label, value }) {
  return (
    <div>
      <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 800 }}>
        {label}
      </div>

      <div
        style={{
          marginTop: "3px",
          color: "#1e3a8a",
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
