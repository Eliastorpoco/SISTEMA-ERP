/**
 * Modelo central del Aula Virtual según la ruta UML:
 *
 * Curso
 *  -> Unidad de aprendizaje
 *    -> Bloque de aprendizaje
 *      -> Actividad evaluable
 *        -> Intento
 *          -> Evaluación formativa IA
 *            -> Corrección humana docente
 *              -> Retroalimentación al estudiante
 */

export const BLOQUES_EVALUABLES = [
  "SCORM",
  "H5P",
  "Cuestionario",
  "Evidencia",
  "Foro",
  "Wiki",
  "Debate",
  "Simulación",
  "Laboratorio virtual",
  "IA",
  "PDF",
  "Video",
];

export const NIVELES_MINEDU = {
  INICIO: "En Inicio",
  PROCESO: "En Proceso",
  LOGRO_ESPERADO: "Logro Esperado",
  DESTACADO: "Logro Destacado",
};

export const ESTADOS_ACTIVIDAD = {
  PENDIENTE: "Pendiente",
  DISPONIBLE: "Disponible",
  EN_USO: "En uso",
  COMPLETADO: "Completado",
};

export const ESTADOS_REVISION_DOCENTE = {
  PENDIENTE: "Pendiente docente",
  GENERADA_IA: "Generada por IA",
  REVISADA_DOCENTE: "Revisada por docente",
  ENVIADA_ESTUDIANTE: "Enviada al estudiante",
  LEIDA_ESTUDIANTE: "Leída por estudiante",
};

export const DECISIONES_DOCENTE = [
  {
    value: "aprobar",
    label: "Aprobar actividad",
    descripcion: "El estudiante cumplió con la actividad y puede continuar.",
  },
  {
    value: "permitir_nuevo_intento",
    label: "Permitir nuevo intento",
    descripcion: "El estudiante requiere una nueva oportunidad de mejora.",
  },
  {
    value: "pedir_resubida",
    label: "Pedir resubida",
    descripcion: "La evidencia enviada requiere corrección o nueva entrega.",
  },
  {
    value: "reintentar_ia",
    label: "Reintentar evaluación IA",
    descripcion: "Se solicita una nueva evaluación automática por posible inconsistencia.",
  },
];

export function esBloqueEvaluable(tipo) {
  return BLOQUES_EVALUABLES.includes(tipo);
}

export function calcularNivelMINEDU(puntaje = 0) {
  const score = Number(puntaje || 0);

  if (score >= 90) return NIVELES_MINEDU.DESTACADO;
  if (score >= 71) return NIVELES_MINEDU.LOGRO_ESPERADO;
  if (score >= 41) return NIVELES_MINEDU.PROCESO;
  return NIVELES_MINEDU.INICIO;
}

export function obtenerDescripcionNivel(nivel) {
  const descripciones = {
    [NIVELES_MINEDU.INICIO]:
      "El estudiante todavía no evidencia avances suficientes y requiere acompañamiento inicial.",
    [NIVELES_MINEDU.PROCESO]:
      "El estudiante evidencia avances, pero aún necesita reforzar algunos aspectos para alcanzar el logro esperado.",
    [NIVELES_MINEDU.LOGRO_ESPERADO]:
      "El estudiante alcanzó el desempeño esperado para la actividad propuesta.",
    [NIVELES_MINEDU.DESTACADO]:
      "El estudiante supera el desempeño esperado y demuestra dominio sólido de la actividad.",
  };

  return descripciones[nivel] || descripciones[NIVELES_MINEDU.INICIO];
}

export function crearBloqueEvaluableBase(tipo = "Evidencia") {
  const now = new Date().toLocaleString();

  return {
    id: Date.now(),
    tipo,
    titulo: `${tipo} agregado a la unidad`,
    descripcion: obtenerDescripcionTipo(tipo),
    visible: true,
    configurado: false,

    // Configuración pedagógica según UML
    competencia: "Resuelve problemas de cantidad",
    capacidad: "Traduce cantidades a expresiones numéricas",
    proposito: "Desarrollar una actividad de aprendizaje vinculada a la unidad.",
    criterioEvaluacion: "Evidencia comprensión, participación y logro del propósito planteado.",
    productoEsperado: "Evidencia desarrollada por el estudiante.",
    puntajeMinimo: 71,
    intentosPermitidos: 3,
    tiempoEstimado: "45 minutos",
    visibilidad: "Visible para estudiantes",

    activityConfigured: false,
    activityFileName: "",
    activityFileSize: "",
    activityUploadedAt: "",
    activityStatus: ESTADOS_ACTIVIDAD.PENDIENTE,
    activityProgress: 0,
    activityScore: 0,
    activityCompleted: false,
    activityCompletedAt: "",
    activityAttemptHistory: [],

    formativeScore: 0,
    formativeLevel: NIVELES_MINEDU.INICIO,
    formativeEvidence: obtenerEvidenciaBase(tipo),
    formativeAiOriginalFeedback: "",
    formativeAiFeedback: "",
    formativeAiGeneratedAt: "",
    formativeTeacherObservation: "",
    formativeHumanReviewed: false,
    formativeHumanReviewedAt: "",
    formativeFeedbackSent: false,
    formativeFeedbackSentAt: "",
    formativeFeedbackViewed: false,
    formativeFeedbackViewedAt: "",

    teacherDecision: "",
    teacherDecisionLabel: "",
    teacherDecisionNote: "",
    teacherDecisionAt: "",

    createdAt: now,
    updatedAt: now,
  };
}

export function normalizarBloqueEvaluable(block = {}) {
  const tipo = block.tipo || "Evidencia";
  const puntaje = Number(
    block.formativeScore ??
      block.activityScore ??
      block.h5pScore ??
      block.scormScore ??
      0
  );

  return {
    ...crearBloqueEvaluableBase(tipo),
    ...block,

    formativeScore: puntaje,
    formativeLevel: block.formativeLevel || calcularNivelMINEDU(puntaje),

    activityConfigured:
      Boolean(block.activityConfigured) ||
      Boolean(block.configurado) ||
      Boolean(block.h5pUploaded) ||
      Boolean(block.scormConfigured),

    activityStatus:
      block.activityStatus ||
      block.h5pStatus ||
      block.scormStatus ||
      ESTADOS_ACTIVIDAD.PENDIENTE,

    activityProgress: Number(
      block.activityProgress ??
        block.h5pProgress ??
        block.scormProgress ??
        0
    ),

    activityScore: Number(
      block.activityScore ??
        block.h5pScore ??
        block.scormScore ??
        puntaje
    ),

    activityAttemptHistory:
      block.activityAttemptHistory ||
      block.h5pAttemptHistory ||
      block.scormAttemptHistory ||
      [],
  };
}

export function generarRetroalimentacionIA({
  tipo = "Actividad",
  puntaje = 0,
  avance = 0,
  intento = 1,
  puntajeMinimo = 71,
}) {
  const score = Number(puntaje || 0);
  const progress = Number(avance || 0);
  const level = calcularNivelMINEDU(score);

  if (level === NIVELES_MINEDU.DESTACADO) {
    return `Has alcanzado un logro destacado en la actividad ${tipo}. Tu desempeño evidencia dominio, autonomía y claridad en el desarrollo de la actividad. Para seguir avanzando, puedes asumir retos de mayor complejidad, explicar tu procedimiento y apoyar a tus compañeros en la comprensión del tema.`;
  }

  if (level === NIVELES_MINEDU.LOGRO_ESPERADO) {
    return `Has alcanzado el logro esperado en la actividad ${tipo}. Tu evidencia muestra comprensión y cumplimiento del propósito. Para seguir mejorando, puedes profundizar tus explicaciones, revisar tus estrategias y aplicar lo aprendido en una situación más compleja.`;
  }

  if (level === NIVELES_MINEDU.PROCESO) {
    return `Te encuentras en proceso en la actividad ${tipo}. Aunque registras un avance de ${progress}%, tu puntaje de ${score}% aún no alcanza el mínimo esperado de ${puntajeMinimo}%. Revisa las indicaciones, identifica los errores frecuentes, mejora tu evidencia y realiza un nuevo intento guiado. Has usado ${intento} intento(s).`;
  }

  return `Te encuentras en inicio en la actividad ${tipo}. Aún no se evidencia avance suficiente. Ingresa al recurso, revisa el propósito de la actividad, desarrolla la primera parte y solicita orientación si tienes dudas.`;
}

export function obtenerDescripcionTipo(tipo) {
  const descripciones = {
    SCORM: "Agregar paquete SCORM para cursos interactivos compatibles con LMS.",
    H5P: "Agregar actividad interactiva H5P.",
    Cuestionario: "Crear preguntas evaluativas para comprobar aprendizajes.",
    Evidencia: "Solicitar producto, archivo o evidencia de aprendizaje.",
    Foro: "Abrir espacio de discusión entre estudiantes.",
    Wiki: "Construcción colaborativa de contenidos.",
    Debate: "Actividad argumentativa guiada.",
    Simulación: "Escenario interactivo de aprendizaje.",
    "Laboratorio virtual": "Simulación o práctica guiada.",
    IA: "Crear asistente IA para generar preguntas o retroalimentación.",
    PDF: "Agregar documento de lectura o ficha de trabajo.",
    Video: "Insertar recurso audiovisual para la unidad.",
  };

  return descripciones[tipo] || "Actividad evaluable de aprendizaje.";
}

export function obtenerEvidenciaBase(tipo) {
  const evidencias = {
    SCORM: "El estudiante completó un paquete SCORM y registró avance, intentos y puntaje.",
    H5P: "El estudiante desarrolló una actividad interactiva y evidenció avances en la comprensión del tema.",
    Cuestionario: "El estudiante respondió preguntas evaluativas relacionadas con el propósito de aprendizaje.",
    Evidencia: "El estudiante presentó una evidencia o producto de aprendizaje.",
    Foro: "El estudiante participó en el foro aportando ideas relacionadas con el tema.",
    Wiki: "El estudiante contribuyó en la construcción colaborativa del contenido.",
    Debate: "El estudiante formuló argumentos y contraargumentos sobre el tema trabajado.",
    Simulación: "El estudiante interactuó con una simulación y registró resultados de aprendizaje.",
    "Laboratorio virtual": "El estudiante desarrolló una práctica guiada en entorno virtual.",
    IA: "El estudiante interactuó con una actividad asistida por inteligencia artificial.",
    PDF: "El estudiante revisó el material y desarrolló la actividad asociada.",
    Video: "El estudiante revisó el recurso audiovisual y respondió a la actividad propuesta.",
  };

  return evidencias[tipo] || "El estudiante desarrolló la actividad propuesta.";
}
