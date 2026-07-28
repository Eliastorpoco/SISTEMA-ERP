const CUSTOM_BLOCKS_STORAGE_KEY = "aulaVirtual.customBlocks.v1";

export function createRestoredScormBlock() {
  const feedback =
    "Completaste el paquete SCORM con un avance de 100%, pero tu puntaje de 20% aún no alcanza el mínimo esperado de 71%. Te recomiendo revisar nuevamente los contenidos, identificar los errores frecuentes, practicar los ejercicios principales y realizar un nuevo intento guiado. Has usado 1 de 4 intento(s).";

  return {
    id: "scorm-restored-main",
    tipo: "SCORM",
    titulo: "MI PRIMER SCORM",
    descripcion: "Agregar paquete SCORM para cursos interactivos compatibles con LMS.",
    configurado: true,
    obligatorio: true,
    visible: true,

    scormVersion: "SCORM 1.2",
    launchFile: "index.html",
    minScore: 71,
    maxAttempts: 4,
    attemptsUsed: 1,
    tracking: true,
    packageName: "ContentPackagingSingleSCO_SCORM12.zip",
    packageSize: "0.34 MB",

    status: "En Inicio",
    progressPercent: 0,
    score: 0,
    completedAt: "",

    teacherDecisionApplied: true,
    teacherDecisionAppliedAt: "29/6/2026, 18:13:55",

    attemptHistory: [
      {
        id: 1,
        status: "En Proceso",
        progressPercent: 100,
        score: 20,
        completedAt: "29/6/2026, 17:31:05",
        aiOriginalFeedback: feedback,
        aiFeedback: feedback,
        aiGeneratedAt: "29/6/2026, 17:51:41",
        teacherObservation: "sigue mejorando",
        humanReviewedAt: "29/6/2026, 17:51:51",
        feedbackSentAt: "29/6/2026, 17:51:53",
        feedbackViewedAt: "29/6/2026, 17:47:44",
        teacherDecision: "Permitir nuevo intento",
        teacherDecisionNote: "intentas nuevamente",
        teacherDecisionAt: "29/6/2026, 18:13:55",
        appliedAt: "29/6/2026, 18:13:55",
      },
    ],
  };
}

export function getInitialCustomBlocks() {
  if (typeof window === "undefined") {
    return [createRestoredScormBlock()];
  }

  try {
    const saved = localStorage.getItem(CUSTOM_BLOCKS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.warn("No se pudo leer Aula Virtual desde localStorage:", error);
  }

  return [createRestoredScormBlock()];
}

export function saveCustomBlocks(blocks) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CUSTOM_BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
  } catch (error) {
    console.warn("No se pudo guardar Aula Virtual en localStorage:", error);
  }
}

export function clearCustomBlocks() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_BLOCKS_STORAGE_KEY);
}
