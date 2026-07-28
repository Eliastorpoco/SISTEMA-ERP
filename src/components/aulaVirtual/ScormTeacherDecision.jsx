import { useState } from "react";

export default function ScormTeacherDecision({ block, onUpdateBlock }) {
  const [decision, setDecision] = useState(
    block.teacherDecision || "Permitir nuevo intento"
  );

  const [note, setNote] = useState(
    block.teacherDecisionNote || ""
  );

  const guardarDecision = () => {
    onUpdateBlock({
      ...block,
      teacherDecision: decision,
      teacherDecisionNote:
        note ||
        "Decisión pedagógica registrada por el docente según el nivel de logro del estudiante.",
      teacherDecisionAt: new Date().toLocaleString(),
    });
  };

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #fde68a",
        borderRadius: "14px",
        background: "#fffbeb",
        padding: "14px",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
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

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Acción definida por el docente después de revisar la evidencia, el nivel de logro y la retroalimentación IA.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
        }}
      >
        <label style={{ display: "grid", gap: "6px" }}>
          <span
            style={{
              color: "#78350f",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Acción docente
          </span>

          <select
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            style={{
              border: "1px solid #fcd34d",
              borderRadius: "12px",
              padding: "10px 12px",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 800,
              outline: "none",
            }}
          >
            <option>Permitir nuevo intento</option>
            <option>Asignar reforzamiento</option>
            <option>Retroalimentación personalizada</option>
            <option>Cerrar seguimiento</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span
            style={{
              color: "#78350f",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Nota docente
          </span>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Escribe una indicación breve para el estudiante..."
            style={{
              border: "1px solid #fcd34d",
              borderRadius: "12px",
              padding: "10px 12px",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              lineHeight: 1.5,
              resize: "vertical",
              outline: "none",
            }}
          />
        </label>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={guardarDecision}
          style={{
            border: "none",
            borderRadius: "12px",
            background: "#f59e0b",
            color: "#ffffff",
            padding: "10px 14px",
            fontSize: "12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Guardar decisión docente
        </button>

        {block.teacherDecisionAt && (
          <span
            style={{
              color: "#92400e",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Registrado: {block.teacherDecisionAt}
          </span>
        )}
      </div>

      {block.teacherDecision && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #fde68a",
          }}
        >
          <div
            style={{
              color: "#92400e",
              fontSize: "12px",
              fontWeight: 900,
              marginBottom: "5px",
            }}
          >
            Decisión registrada: {block.teacherDecision}
          </div>

          <div
            style={{
              color: "#475569",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            {block.teacherDecisionNote}
          </div>
        </div>
      )}
    </section>
  );
}
