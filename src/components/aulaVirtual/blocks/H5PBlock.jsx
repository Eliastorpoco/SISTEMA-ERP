import BlockTitle from "./BlockTitle";

export default function H5PBlock({ h5pActivities = {} }) {
  const actividades = [
    {
      titulo: "Arrastra y relaciona fracciones",
      tipo: "Drag & Drop",
      estado: "Disponible",
      descripcion:
        "Actividad interactiva para relacionar representaciones gráficas con fracciones numéricas.",
    },
    {
      titulo: "Cuestionario rápido de fracciones",
      tipo: "Quiz",
      estado: "Pendiente",
      descripcion:
        "Preguntas breves para verificar comprensión antes de pasar a la actividad principal.",
    },
  ];

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        background: "#ffffff",
        padding: "16px",
      }}
    >
      <BlockTitle
        title="Actividades interactivas H5P"
        subtitle="Experiencias dinámicas para practicar y comprobar aprendizajes"
      />

      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
        {actividades.map((actividad, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "14px",
              alignItems: "center",
              padding: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#f8fafc",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background: "#ecfdf5",
                    color: "#047857",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  H5P
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background: "#eef2ff",
                    color: "#4338ca",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  {actividad.tipo}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 10px",
                    borderRadius: "999px",
                    background:
                      actividad.estado === "Disponible" ? "#dcfce7" : "#fef3c7",
                    color:
                      actividad.estado === "Disponible" ? "#166534" : "#92400e",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  {actividad.estado}
                </span>
              </div>

              <h4
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                {actividad.titulo}
              </h4>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {actividad.descripcion}
              </p>
            </div>

            <button
              type="button"
              style={{
                border: "none",
                borderRadius: "12px",
                background: "#059669",
                color: "#ffffff",
                padding: "10px 14px",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Abrir H5P
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
