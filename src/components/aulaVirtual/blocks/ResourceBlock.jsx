import BlockTitle from "./BlockTitle";

export default function ResourceBlock() {
  const recursos = [
    {
      tipo: "Lectura",
      titulo: "Guía breve sobre fracciones",
      descripcion: "Material de apoyo para reforzar conceptos básicos antes de resolver actividades.",
    },
    {
      tipo: "PDF",
      titulo: "Ficha de práctica",
      descripcion: "Documento descargable con ejercicios progresivos para el estudiante.",
    },
    {
      tipo: "Enlace",
      titulo: "Recurso interactivo externo",
      descripcion: "Actividad complementaria para explorar fracciones en situaciones cotidianas.",
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
        title="Recursos de aprendizaje"
        subtitle="Materiales de apoyo para explorar y reforzar la unidad"
      />

      <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
        {recursos.map((recurso, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr",
              gap: "12px",
              alignItems: "start",
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              background: "#f8fafc",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: "28px",
                borderRadius: "999px",
                background: "#dbeafe",
                color: "#1d4ed8",
                fontSize: "11px",
                fontWeight: 900,
              }}
            >
              {recurso.tipo}
            </span>

            <div>
              <h4
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 900,
                }}
              >
                {recurso.titulo}
              </h4>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {recurso.descripcion}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
