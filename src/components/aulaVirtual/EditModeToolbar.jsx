import { useState } from "react";
import AddBlockMenu from "./AddBlockMenu";

export default function EditModeToolbar({
  onAddBlock,
  onCreateBlock,
  onSelectBlock,
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const cerrarMenu = () => {
    setShowAddMenu(false);
  };

  return (
    <section
      style={{
        marginTop: "18px",
        marginBottom: "18px",
        padding: "16px",
        border: "1px dashed #93c5fd",
        borderRadius: "20px",
        background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 75%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: "240px", flex: "1 1 320px" }}>
          <h3
            style={{
              margin: 0,
              color: "#1e3a8a",
              fontSize: "15px",
              fontWeight: 950,
            }}
          >
            ✏️ Modo edición de la unidad
          </h3>

          <p
            style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: "12px",
              lineHeight: 1.45,
            }}
          >
            Agrega recursos para enseñar y actividades para evaluar el
            aprendizaje.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddMenu((value) => !value)}
          style={{
            border: "1px solid #2563eb",
            background: showAddMenu ? "#ffffff" : "#2563eb",
            color: showAddMenu ? "#2563eb" : "#ffffff",
            borderRadius: "999px",
            padding: "11px 17px",
            fontWeight: 950,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 8px 18px rgba(37,99,235,0.14)",
            whiteSpace: "nowrap",
          }}
        >
          {showAddMenu
            ? "Cerrar menú"
            : "+ Agregar recurso o actividad"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginTop: "12px",
        }}
      >
        <span
          style={{
            borderRadius: "999px",
            padding: "6px 10px",
            background: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          📚 Recursos sin puntaje
        </span>

        <span
          style={{
            borderRadius: "999px",
            padding: "6px 10px",
            background: "#f5f3ff",
            color: "#6d28d9",
            border: "1px solid #ddd6fe",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          📝 Actividades con seguimiento
        </span>

        <span
          style={{
            borderRadius: "999px",
            padding: "6px 10px",
            background: "#fff7ed",
            color: "#c2410c",
            border: "1px solid #fed7aa",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          ✅ Revisión docente individual
        </span>
      </div>

      {showAddMenu && (
        <AddBlockMenu
          onAddBlock={(bloque) => {
            if (typeof onAddBlock === "function") onAddBlock(bloque);
            cerrarMenu();
          }}
          onCreateBlock={(bloque) => {
            if (typeof onCreateBlock === "function") onCreateBlock(bloque);
            cerrarMenu();
          }}
          onSelectBlock={(bloque) => {
            if (typeof onSelectBlock === "function") onSelectBlock(bloque);
            cerrarMenu();
          }}
          onClose={cerrarMenu}
        />
      )}
    </section>
  );
}
