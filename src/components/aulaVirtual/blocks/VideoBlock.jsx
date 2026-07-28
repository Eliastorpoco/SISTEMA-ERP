import BlockTitle from "./BlockTitle";

export default function VideoBlock() {
  const videos = [
    {
      titulo: "Introducción a las fracciones",
      duracion: "05:30 min",
      descripcion:
        "Video inicial para comprender qué es una fracción y cómo se representa en situaciones cotidianas.",
    },
    {
      titulo: "Fracciones en la vida diaria",
      duracion: "07:15 min",
      descripcion:
        "Ejemplos prácticos usando alimentos, medidas y reparto de cantidades.",
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
        title="Videos de aprendizaje"
        subtitle="Recursos audiovisuales para fortalecer la comprensión"
      />

      <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
        {videos.map((video, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr auto",
              gap: "14px",
              alignItems: "center",
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                height: "70px",
                borderRadius: "14px",
                background: "linear-gradient(135deg,#ede9fe,#dbeafe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4f46e5",
                fontSize: "26px",
                fontWeight: 900,
              }}
            >
              ▶
            </div>

            <div>
              <h4
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                {video.titulo}
              </h4>

              <p
                style={{
                  margin: "6px 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {video.descripcion}
              </p>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {video.duracion}
              </span>
            </div>

            <button
              type="button"
              style={{
                border: "none",
                borderRadius: "12px",
                background: "#4f46e5",
                color: "#ffffff",
                padding: "10px 14px",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Ver video
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
