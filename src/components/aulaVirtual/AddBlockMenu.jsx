import { crearBloqueEvaluableBase } from "./aulaVirtualUMLModel";

export default function AddBlockMenu({
  onAddBlock,
  onCreateBlock,
  onSelectBlock,
  onClose,
}) {
  const secciones = [
    {
      titulo: "Recursos de aprendizaje",
      subtitulo: "Materiales para enseñar, explicar, orientar o reforzar antes de evaluar.",
      icono: "📚",
      color: "#047857",
      fondo: "#ecfdf5",
      borde: "#a7f3d0",
      categoria: "recurso",
      bloques: [
        { tipo: "Lectura", icono: "📖", descripcion: "Texto breve o contenido de lectura para introducir el tema." },
        { tipo: "Guía", icono: "🧭", descripcion: "Guía de aprendizaje con orientaciones paso a paso." },
        { tipo: "Separata", icono: "📘", descripcion: "Material teórico o práctico para reforzar la unidad." },
        { tipo: "PDF", icono: "📄", descripcion: "Documento, ficha de trabajo o material descargable." },
        { tipo: "Presentación", icono: "🖥️", descripcion: "Diapositivas o presentación para explicar contenidos." },
        { tipo: "Imagen", icono: "🖼️", descripcion: "Imagen, organizador visual o recurso gráfico." },
        { tipo: "Infografía", icono: "📊", descripcion: "Resumen visual con información clave del tema." },
        { tipo: "Video", icono: "🎬", descripcion: "Recurso audiovisual para explicar o demostrar procesos." },
        { tipo: "Enlace", icono: "🔗", descripcion: "Enlace externo a página, herramienta o recurso web." },
      ],
    },
    {
      titulo: "Actividades evaluables",
      subtitulo: "Espacios donde el estudiante responde, participa, entrega evidencia o registra avance.",
      icono: "📝",
      color: "#6d28d9",
      fondo: "#f5f3ff",
      borde: "#ddd6fe",
      categoria: "actividad",
      bloques: [
        { tipo: "H5P", icono: "🧩", descripcion: "Actividad interactiva con seguimiento de avance e intentos." },
        { tipo: "Cuestionario", icono: "📝", descripcion: "Preguntas evaluativas para comprobar aprendizajes." },
        { tipo: "Foro", icono: "💬", descripcion: "Participación argumentativa o discusión académica." },
        { tipo: "Evidencia", icono: "📤", descripcion: "Producto, archivo o evidencia entregada por el estudiante." },
        { tipo: "SCORM", icono: "🎓", descripcion: "Paquete interactivo compatible con seguimiento LMS." },
        { tipo: "Debate", icono: "🗣️", descripcion: "Actividad argumentativa guiada entre estudiantes." },
        { tipo: "Wiki", icono: "🧱", descripcion: "Construcción colaborativa de contenidos." },
        { tipo: "Simulación", icono: "🧪", descripcion: "Escenario interactivo o práctica simulada." },
        { tipo: "Laboratorio virtual", icono: "🔬", descripcion: "Práctica guiada en entorno virtual." },
      ],
    },
    {
      titulo: "Apoyo pedagógico y evaluación",
      subtitulo: "Herramientas para orientar, retroalimentar o calificar el proceso.",
      icono: "🤖",
      color: "#1d4ed8",
      fondo: "#eff6ff",
      borde: "#bfdbfe",
      categoria: "apoyo",
      bloques: [
        { tipo: "IA", icono: "🤖", descripcion: "Asistente IA para preguntas, análisis o retroalimentación." },
        { tipo: "Rúbrica", icono: "📋", descripcion: "Criterios, niveles de logro y valoración del producto." },
      ],
    },
  ];

  const handleAdd = (bloque, seccion) => {
    const esRecurso = seccion.categoria === "recurso";
    const esActividad = seccion.categoria === "actividad";

    const nuevoBloque = {
      ...crearBloqueEvaluableBase(bloque.tipo),
      tipo: bloque.tipo,
      titulo: `${bloque.tipo} agregado a la unidad`,
      descripcion: bloque.descripcion,
      categoriaDidactica: seccion.categoria,
      esRecursoAprendizaje: esRecurso,
      esActividadEvaluable: esActividad,
      visibleEstudiante: true,
      generaIntento: esActividad,
      requiereRevisionDocente: ["Cuestionario", "Foro", "Evidencia"].includes(bloque.tipo),
      activityStatus: esRecurso ? "Disponible" : "En uso",
      activityProgress: esRecurso ? 0 : undefined,
      activityScore: esRecurso ? 0 : undefined,
      formativeScore: esRecurso ? 0 : undefined,
      nivelLogro: esRecurso ? "No evaluable" : undefined,
      tipoIcono: bloque.icono,
      tipoColor: seccion.color,
      ...(esRecurso
        ? {
            categoriaDidactica: "recurso",
            esRecursoAprendizaje: true,
            esActividadEvaluable: false,
            generaIntento: false,
            requiereRevisionDocente: false,
            activityConfigured: false,
            configurado: false,
            activityStatus: "Pendiente",
            activityProgress: 0,
            activityScore: 0,
            formativeScore: 0,
            formativeLevel: "No evaluable",
            nivelLogro: "No evaluable",
            puntajeMinimo: 0,
            intentosPermitidos: 0,
            productoEsperado: "Material de aprendizaje revisado por el estudiante.",
            criterioEvaluacion: "Recurso de apoyo pedagógico. No genera calificación.",
          }
        : {
            categoriaDidactica: "actividad",
            esRecursoAprendizaje: false,
            esActividadEvaluable: true,
            generaIntento: true,
          }),
    };

    if (typeof onAddBlock === "function") {
      onAddBlock(nuevoBloque);
      if (typeof onClose === "function") onClose();
      return;
    }

    if (typeof onCreateBlock === "function") {
      onCreateBlock(nuevoBloque);
      if (typeof onClose === "function") onClose();
      return;
    }

    if (typeof onSelectBlock === "function") {
      onSelectBlock(nuevoBloque);
      if (typeof onClose === "function") onClose();
      return;
    }

    console.warn("No se encontró función para agregar bloque:", nuevoBloque);
  };

  return (
    <div
      style={{
        marginTop: "14px",
        padding: "16px",
        border: "1px solid #bfdbfe",
        borderRadius: "18px",
        background: "#ffffff",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <h4
          style={{
            margin: 0,
            color: "#111827",
            fontSize: "15px",
            fontWeight: 950,
          }}
        >
          Agregar recurso o actividad a la secuencia didáctica
        </h4>

        <p
          style={{
            margin: "5px 0 0",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.45,
          }}
        >
          Primero selecciona si vas a enseñar con un recurso, evaluar con una actividad o apoyar con IA/rúbrica.
        </p>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {secciones.map((seccion) => (
          <div
            key={seccion.titulo}
            style={{
              border: `1px solid ${seccion.borde}`,
              borderRadius: "18px",
              background: seccion.fondo,
              padding: "14px",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  color: seccion.color,
                  fontSize: "14px",
                  fontWeight: 950,
                }}
              >
                {seccion.icono} {seccion.titulo}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  marginTop: "4px",
                  lineHeight: 1.4,
                }}
              >
                {seccion.subtitulo}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {seccion.bloques.map((bloque) => (
                <button
                  key={`${seccion.titulo}-${bloque.tipo}`}
                  type="button"
                  onClick={() => handleAdd(bloque, seccion)}
                  style={{
                    textAlign: "left",
                    padding: "13px",
                    border: `1px solid ${seccion.borde}`,
                    borderRadius: "14px",
                    background: "#ffffff",
                    cursor: "pointer",
                    minHeight: "88px",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: seccion.color,
                      fontWeight: 950,
                      fontSize: "13px",
                      marginBottom: "7px",
                    }}
                  >
                    <span>{bloque.icono}</span>
                    <span>+ {bloque.tipo}</span>
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      lineHeight: 1.35,
                    }}
                  >
                    {bloque.descripcion}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
