import { useEffect, useMemo, useState } from "react";
import {
  listarBloquesAulaVirtual,
  actualizarBloqueAulaVirtual,
  registrarIntentoBloqueAulaVirtual,
  entregarEvidenciaRealBloque,
  listarEntregasDetalleBloqueAulaVirtual,
  construirUrlArchivoAulaVirtual,
  abrirArchivoAulaVirtual,
} from "../services/aulaVirtualBlocksService";

import { BookOpen, ChevronRight, FileText } from "lucide-react";

import {
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";


import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";

import {
  Accordion as UiAccordion,
  AccordionContent as UiAccordionContent,
  AccordionItem as UiAccordionItem,
  AccordionTrigger as UiAccordionTrigger,
} from "@/components/ui/accordion";

import {
  Separator as UiSeparator,
} from "@/components/ui/separator";


import {
  Card as UiCard,
  CardContent as UiCardContent,
  CardDescription as UiCardDescription,
  CardFooter as UiCardFooter,
  CardHeader as UiCardHeader,
  CardTitle as UiCardTitle,
} from "@/components/ui/card";


function Badge({ children, type = "default" }) {
  const styles = {
    default: { background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" },
    green: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
    yellow: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" },
    blue: { background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" },
    gray: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
    red: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" },
  };

  return (
    <span
      style={{
        ...(styles[type] || styles.default),
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "11px",
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {children}
    </span>
  );
}

function InfoCard({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 900, marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ color: "#1e3a8a", fontWeight: 900, fontSize: "14px" }}>
        {value}
      </div>
    </div>
  );
}


function EvidenceRealUploadPanel({ block, onEnviar }) {
  const [archivo, setArchivo] = useState(null);
  const [descripcion, setDescripcion] = useState(
    "Presento mi evidencia de aprendizaje desarrollada según el propósito y criterio de evaluación."
  );
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const enviar = async () => {
    if (!archivo) {
      setMensaje("Selecciona un archivo primero.");
      return;
    }

    try {
      setSubiendo(true);
      setMensaje("Subiendo evidencia real...");
      await onEnviar(block, archivo, descripcion);
      setArchivo(null);
      setMensaje("Evidencia real enviada correctamente.");
    } catch (error) {
      console.error("Error enviando evidencia real:", error);
      setMensaje(error?.message || "No se pudo enviar la evidencia real.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "14px",
        marginBottom: "14px",
        background: "#ffffff",
        border: "1px solid #bbf7d0",
        borderRadius: "16px",
        padding: "14px",
      }}
    >
      <div style={{ fontWeight: 900, color: "#166534", marginBottom: "8px" }}>
        📤 Subir evidencia real
      </div>

      <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
        Adjunta tu archivo para enviarlo al docente.
      </div>

      <label style={{ display: "grid", gap: "8px", color: "#166534", fontWeight: 900, marginBottom: "12px" }}>
        Descripción de mi evidencia
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={4}
          placeholder="Describe brevemente qué estás entregando..."
          style={{
            width: "100%",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "11px 12px",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </label>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="file"
          onChange={(e) => setArchivo(e.target.files?.[0] || null)}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "10px",
            background: "#f8fafc",
          }}
        />

        <button
          type="button"
          onClick={enviar}
          disabled={subiendo}
          style={{
            border: "0",
            borderRadius: "12px",
            padding: "11px 14px",
            background: subiendo ? "#94a3b8" : "#16a34a",
            color: "#ffffff",
            fontWeight: 900,
            cursor: subiendo ? "not-allowed" : "pointer",
          }}
        >
          {subiendo ? "Subiendo..." : "Enviar evidencia real"}
        </button>
      </div>

      {mensaje && (
        <div style={{ marginTop: "10px", color: "#0f172a", fontSize: "13px", fontWeight: 800 }}>
          {mensaje}
        </div>
      )}
    </div>
  );
}


function getStudentBlockState(block) {
  const tieneEstadoIndividual = Array.isArray(
    block.studentAttemptHistory
  );

  const historial = tieneEstadoIndividual
    ? block.studentAttemptHistory
    : block.activityAttemptHistory || [];

  const ultimoIntento = historial[0] || null;

  const feedbackIndividual =
    block.studentLatestFeedback || null;

  const intentosPermitidos = Number(
    block.intentosPermitidos || 3
  );

  const intentosUsados = historial.length;

  const intentosDisponibles = Math.max(
    intentosPermitidos - intentosUsados,
    0
  );

  // feedback-vigente-ultimo-intento-v1
  const feedbackCorrespondeUltimo = Boolean(
    ultimoIntento?.id &&
      feedbackIndividual?.intento_id &&
      String(feedbackIndividual.intento_id) ===
        String(ultimoIntento.id)
  );

  const feedbackEnviado = tieneEstadoIndividual
    ? Boolean(
        feedbackCorrespondeUltimo &&
          (
            feedbackIndividual?.enviado_estudiante ??
              feedbackIndividual?.formativeFeedbackSent
          )
      )
    : Boolean(block.formativeFeedbackSent);

  const revisado = tieneEstadoIndividual
    ? Boolean(
        feedbackCorrespondeUltimo &&
          (
            feedbackIndividual?.revisado ??
              feedbackIndividual?.formativeHumanReviewed
          )
      )
    : Boolean(block.formativeHumanReviewed);

  const tipoNormalizado = String(
    block.tipo || ""
  ).toLowerCase();

  const tipoSoportado = [
    "h5p",
    "pdf",
    "evidencia",
    "cuestionario",
    "foro",
    "scorm",
  ].includes(tipoNormalizado);

  const configurado = Boolean(
    block.activityConfigured ||
      block.configurado ||
      block.activityStatus === "Disponible" ||
      tipoSoportado
  );

  const estadoActividad = tieneEstadoIndividual
    ? feedbackCorrespondeUltimo &&
      feedbackIndividual?.estado_revision
      ? feedbackIndividual.estado_revision
      : ultimoIntento?.estado ||
        (configurado ? "Disponible" : "Pendiente")
    : block.activityStatus ||
      (configurado ? "Disponible" : "Pendiente");

  const avanceActividad = tieneEstadoIndividual
    ? Math.max(
        0,
        Math.min(
          100,
          Number(ultimoIntento?.avance ?? 0) || 0
        )
      )
    : Number(block.activityProgress ?? 0) || 0;

  const puntajeActividad = tieneEstadoIndividual
    ? Number(
        feedbackCorrespondeUltimo
          ? feedbackIndividual?.puntaje ??
              ultimoIntento?.puntaje ??
              0
          : ultimoIntento?.puntaje ?? 0
      ) || 0
    : Number(
        block.activityScore ??
          block.formativeScore ??
          0
      ) || 0;

  const nivelActividad = tieneEstadoIndividual
    ? (
        feedbackCorrespondeUltimo
          ? feedbackIndividual?.nivel_logro ||
            ultimoIntento?.nivel_logro ||
            ultimoIntento?.nivel
          : ultimoIntento?.nivel_logro ||
            ultimoIntento?.nivel
      ) || "En Inicio"
    : block.formativeLevel || "En Inicio";

  const retroalimentacion = feedbackEnviado
    ? feedbackIndividual?.retroalimentacion_ia ||
      feedbackIndividual?.formativeAiFeedback ||
      (!tieneEstadoIndividual
        ? block.formativeAiFeedback
        : "") ||
      ultimoIntento?.retroalimentacion ||
      ""
    : "";

  const observacion = feedbackEnviado
    ? feedbackIndividual?.observacion_docente ||
      feedbackIndividual?.formativeTeacherObservation ||
      (!tieneEstadoIndividual
        ? block.formativeTeacherObservation
        : "") ||
      ultimoIntento?.observacionDocente ||
      ""
    : "";

  const decisionDocente = tieneEstadoIndividual
    ? (
        feedbackCorrespondeUltimo
          ? feedbackIndividual?.decision_docente ||
            feedbackIndividual?.teacherDecisionLabel ||
            feedbackIndividual?.teacherDecision ||
            ultimoIntento?.decisionDocente ||
            ""
          : ultimoIntento?.decisionDocente || ""
      )
    : block.teacherDecisionLabel ||
      block.teacherDecision ||
      ultimoIntento?.decisionDocente ||
      "";

  const decisionLower = String(
    decisionDocente || ""
  ).toLowerCase();

  const estadoActividadLower = String(
    estadoActividad || ""
  ).toLowerCase();

  const actividadCompletada = tieneEstadoIndividual
    ? Boolean(
        estadoActividadLower === "completado" ||
          estadoActividadLower === "revisado" ||
          estadoActividadLower.includes("revisado") ||
          (
            feedbackCorrespondeUltimo &&
            revisado
          )
      )
    : Boolean(
        block.activityCompleted ||
          block.activityStatus === "Completado" ||
          historial.length > 0
      );

  const intentoEnUso = Boolean(
    ultimoIntento &&
      [
        "en uso",
        "pendiente",
      ].includes(
        String(
          ultimoIntento.estado || ""
        ).toLowerCase()
      )
  );

  const decisionPendiente = Boolean(
    !feedbackEnviado ||
      decisionLower.includes("pendiente")
  );

  const revisionDocenteConfirmada = Boolean(
    feedbackEnviado &&
      revisado &&
      !decisionPendiente
  );

  const feedbackBadgeType = feedbackEnviado
    ? "green"
    : "gray";

  const feedbackBadgeText = feedbackEnviado
    ? "Retroalimentación recibida"
    : "Sin retroalimentación";

  const revisionBadgeType =
    revisionDocenteConfirmada
      ? "green"
      : actividadCompletada
      ? "yellow"
      : "gray";

  const revisionBadgeText =
    revisionDocenteConfirmada
      ? "Revisado por docente"
      : actividadCompletada
      ? "Pendiente de revisión"
      : "Sin envío";

  return {
    historial,
    ultimoIntento,
    intentoEnUso,
    feedbackIndividual,
    intentosPermitidos,
    intentosUsados,
    intentosDisponibles,
    estadoActividad,
    avanceActividad,
    puntajeActividad,
    nivelActividad,
    feedbackEnviado,
    revisado,
    configurado,
    retroalimentacion,
    observacion,
    decisionDocente,
    decisionPendiente,
    revisionDocenteConfirmada,
    actividadCompletada,
    feedbackBadgeType,
    feedbackBadgeText,
    revisionBadgeType,
    revisionBadgeText,
  };
}


async function enriquecerBloquesConRevisionesDocente(bloques = []) {
  const lista = Array.isArray(bloques) ? bloques : [];

  return Promise.all(
    lista.map(async (block) => {
      const tipo = String(block?.tipo || "").toLowerCase();

      if (!block?.id || tipo !== "evidencia") {
        return block;
      }

      try {
        const entregas = await listarEntregasDetalleBloqueAulaVirtual(block.id);

        const revisionesEnviadas = (Array.isArray(entregas) ? entregas : [])
          .filter((item) => item?.revision_id && item?.enviado_estudiante)
          .sort((a, b) => {
            const fa = new Date(a.revision_created_at || a.fecha_entrega || a.entregado_at || 0).getTime();
            const fb = new Date(b.revision_created_at || b.fecha_entrega || b.entregado_at || 0).getTime();
            return fb - fa;
          });

        const revision = revisionesEnviadas[0];

        if (!revision) {
          return block;
        }

        const puntaje = Number(revision.puntaje ?? block.activityScore ?? block.formativeScore ?? 0);
        const nivel = revision.nivel_logro || block.formativeLevel || "En Inicio";
        const fechaRevision =
          revision.revision_created_at ||
          revision.fecha_entrega ||
          revision.entregado_at ||
          new Date().toISOString();

        const intentoRevision = {
          id: revision.id || revision.intento_id || Date.now(),
          tipo: revision.actividad_tipo || block.tipo,
          fecha: fechaRevision,
          nivel,
          avance: 100,
          estado: revision.estado_revision || "Revisado por docente",
          intento: revision.numero_intento || 1,
          puntaje,
          archivo_url: revision.archivo_url,
          archivo_nombre: revision.archivo_nombre,
          decisionDocente: revision.decision_docente || "Revisado por docente",
          retroalimentacion:
            revision.retroalimentacion_ia ||
            "Tu evidencia fue revisada por el docente.",
          observacionDocente:
            revision.observacion_docente ||
            "El docente revisó tu evidencia.",
        };

        const historialPrevio = Array.isArray(block.activityAttemptHistory)
          ? block.activityAttemptHistory
          : [];

        return {
          ...block,
          activityStatus: revision.estado_revision || "Revisado por docente",
          activityCompleted: true,
          activityProgress: 100,
          activityScore: puntaje,
          formativeScore: puntaje,
          formativeLevel: nivel,

          formativeHumanReviewed: true,
          formativeHumanReviewedAt: fechaRevision,
          formativeFeedbackSent: true,
          formativeFeedbackSentAt: fechaRevision,
          formativeFeedbackViewed: false,

          teacherDecision: revision.decision_docente || "revisado_docente",
          teacherDecisionLabel: revision.decision_docente || "Revisado por docente",
          teacherDecisionNote: revision.observacion_docente || "",
          teacherDecisionAt: fechaRevision,

          formativeTeacherObservation:
            revision.observacion_docente ||
            "El docente revisó tu evidencia.",
          formativeAiFeedback:
            revision.retroalimentacion_ia ||
            "Tu evidencia fue revisada por el docente.",
          formativeAiGeneratedAt: fechaRevision,

          ultimaRevisionDocente: revision,
          activityAttemptHistory: [intentoRevision, ...historialPrevio],
          updatedAt: fechaRevision,
        };
      } catch (error) {
        console.warn("No se pudo cargar revisión docente para el estudiante:", error);
        return block;
      }
    })
  );
}


function getActivityVisualStyle(block = {}) {
  const tipo = String(block?.tipo || "").trim().toLowerCase();

  const fallback = {
    icon: "📚",
    label: block?.tipo || "Recurso",
    accent: "#2563eb",
    soft: "#eff6ff",
    border: "#bfdbfe",
    badge: "blue",
  };

  const map = {
    h5p: {
      icon: "🧩",
      label: "Actividad interactiva H5P",
      accent: "#2563eb",
      soft: "#eff6ff",
      border: "#bfdbfe",
      badge: "blue",
    },
    cuestionario: {
      icon: "📝",
      label: "Cuestionario",
      accent: "#7c3aed",
      soft: "#f5f3ff",
      border: "#ddd6fe",
      badge: "default",
    },
    pdf: {
      icon: "📄",
      label: "Material PDF",
      accent: "#dc2626",
      soft: "#fef2f2",
      border: "#fecaca",
      badge: "red",
    },
    foro: {
      icon: "💬",
      label: "Foro de discusión",
      accent: "#0891b2",
      soft: "#ecfeff",
      border: "#a5f3fc",
      badge: "blue",
    },
    evidencia: {
      icon: "📤",
      label: "Entrega de evidencia",
      accent: "#047857",
      soft: "#ecfdf5",
      border: "#a7f3d0",
      badge: "green",
    },
    scorm: {
      icon: "🎓",
      label: "SCORM",
      accent: "#c2410c",
      soft: "#fff7ed",
      border: "#fed7aa",
      badge: "yellow",
    },
    video: {
      icon: "🎬",
      label: "Video",
      accent: "#be123c",
      soft: "#fff1f2",
      border: "#fecdd3",
      badge: "red",
    },
    enlace: {
      icon: "🔗",
      label: "Enlace",
      accent: "#0e7490",
      soft: "#ecfeff",
      border: "#a5f3fc",
      badge: "blue",
    },
    lectura: {
      icon: "📖",
      label: "Lectura",
      accent: "#047857",
      soft: "#ecfdf5",
      border: "#a7f3d0",
      badge: "green",
    },
    guia: {
      icon: "🧭",
      label: "Guía",
      accent: "#047857",
      soft: "#ecfdf5",
      border: "#a7f3d0",
      badge: "green",
    },
    "guía": {
      icon: "🧭",
      label: "Guía",
      accent: "#047857",
      soft: "#ecfdf5",
      border: "#a7f3d0",
      badge: "green",
    },
    separata: {
      icon: "📘",
      label: "Separata",
      accent: "#047857",
      soft: "#ecfdf5",
      border: "#a7f3d0",
      badge: "green",
    },
    presentacion: {
      icon: "🖥️",
      label: "Presentación",
      accent: "#4338ca",
      soft: "#eef2ff",
      border: "#c7d2fe",
      badge: "default",
    },
    "presentación": {
      icon: "🖥️",
      label: "Presentación",
      accent: "#4338ca",
      soft: "#eef2ff",
      border: "#c7d2fe",
      badge: "default",
    },
    imagen: {
      icon: "🖼️",
      label: "Imagen",
      accent: "#0e7490",
      soft: "#ecfeff",
      border: "#a5f3fc",
      badge: "blue",
    },
    infografia: {
      icon: "📊",
      label: "Infografía",
      accent: "#0e7490",
      soft: "#ecfeff",
      border: "#a5f3fc",
      badge: "blue",
    },
    "infografía": {
      icon: "📊",
      label: "Infografía",
      accent: "#0e7490",
      soft: "#ecfeff",
      border: "#a5f3fc",
      badge: "blue",
    },
  };

  return map[tipo] || fallback;
}

function obtenerTipoRecursoAprendizajeEstudiante(block = {}) {
  return String(block?.tipo || "").trim().toLowerCase();
}

function obtenerAccionRecursoAprendizajeEstudiante(block = {}) {
  const tipo = obtenerTipoRecursoAprendizajeEstudiante(block);

  const acciones = {
    pdf: {
      texto: "📄 Abrir PDF",
      textoCorto: "Abrir PDF",
      descripcion: "Documento PDF listo para abrir o descargar.",
    },
    video: {
      texto: "🎬 Abrir video",
      textoCorto: "Abrir video",
      descripcion: "Recurso audiovisual para revisar el contenido.",
    },
    enlace: {
      texto: "🔗 Abrir enlace",
      textoCorto: "Abrir enlace",
      descripcion: "Recurso externo que se abrirá en una nueva pestaña.",
    },
    "recurso externo": {
      texto: "🔗 Abrir enlace",
      textoCorto: "Abrir enlace",
      descripcion: "Recurso externo que se abrirá en una nueva pestaña.",
    },
    imagen: {
      texto: "🖼️ Ver imagen",
      textoCorto: "Ver imagen",
      descripcion: "Imagen o recurso gráfico para observar.",
    },
    infografia: {
      texto: "📊 Ver infografía",
      textoCorto: "Ver infografía",
      descripcion: "Infografía o resumen visual para revisar.",
    },
    "infografía": {
      texto: "📊 Ver infografía",
      textoCorto: "Ver infografía",
      descripcion: "Infografía o resumen visual para revisar.",
    },
    presentacion: {
      texto: "🖥️ Abrir presentación",
      textoCorto: "Abrir presentación",
      descripcion: "Presentación de apoyo para la clase.",
    },
    "presentación": {
      texto: "🖥️ Abrir presentación",
      textoCorto: "Abrir presentación",
      descripcion: "Presentación de apoyo para la clase.",
    },
    guia: {
      texto: "🧭 Abrir guía",
      textoCorto: "Abrir guía",
      descripcion: "Guía con orientaciones paso a paso.",
    },
    "guía": {
      texto: "🧭 Abrir guía",
      textoCorto: "Abrir guía",
      descripcion: "Guía con orientaciones paso a paso.",
    },
    separata: {
      texto: "📘 Abrir separata",
      textoCorto: "Abrir separata",
      descripcion: "Separata o material de refuerzo.",
    },
    lectura: {
      texto: "📖 Abrir lectura",
      textoCorto: "Abrir lectura",
      descripcion: "Lectura o documento textual para revisar.",
    },
  };

  return (
    acciones[tipo] || {
      texto: "📚 Abrir recurso",
      textoCorto: "Abrir recurso",
      descripcion: "Material de aprendizaje disponible para revisar.",
    }
  );
}

function obtenerEmbedVideoRecursoEstudiante(url = "") {
  const valor = String(url || "").trim();

  if (!/^https?:\/\//i.test(valor)) return "";

  try {
    const parsed = new URL(valor);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return valor;

      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : "";
      }

      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    return "";
  } catch {
    return "";
  }
}

function esUrlImagenRecursoEstudiante(url = "") {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(String(url || ""));
}

function esUrlPdfRecursoEstudiante(url = "") {
  return /\.pdf(\?.*)?$/i.test(String(url || ""));
}

function renderPreviewRecursoAprendizajeEstudiante(block = {}, visual = {}) {
  const tipo = obtenerTipoRecursoAprendizajeEstudiante(block);
  const urlRecurso = String(obtenerUrlRecursoAprendizajeEstudiante(block) || "").trim();
  const accion = obtenerAccionRecursoAprendizajeEstudiante(block);

  if (!urlRecurso) return null;

  const esUrlPublica = /^https?:\/\//i.test(urlRecurso);
  const urlConstruida =
    urlRecurso.startsWith("/aula-virtual/")
      ? ""
      : esUrlPublica
      ? urlRecurso
      : construirUrlArchivoAulaVirtual(urlRecurso);

  const previewBox = {
    border: `1px solid ${visual.border || "#dbeafe"}`,
    background: "#ffffff",
    borderRadius: "18px",
    padding: "14px",
    margin: "12px 0",
  };

  if (tipo === "video") {
    const embedUrl = obtenerEmbedVideoRecursoEstudiante(urlRecurso);

    if (embedUrl) {
      return (
        <div style={previewBox}>
          <div style={{ fontWeight: 950, color: visual.accent || "#1d4ed8", marginBottom: "10px" }}>
            🎬 Vista previa del video
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              paddingTop: "56.25%",
              borderRadius: "16px",
              overflow: "hidden",
              background: "#0f172a",
            }}
          >
            <iframe
              src={embedUrl}
              title={block?.titulo || "Video de aprendizaje"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "0",
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div style={previewBox}>
        <div style={{ fontWeight: 950, color: visual.accent || "#1d4ed8" }}>
          🎬 Video listo para abrir
        </div>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
          Este video se abrirá en una nueva pestaña.
        </p>
      </div>
    );
  }

  if ((tipo === "imagen" || tipo === "infografia" || tipo === "infografía") && urlConstruida && esUrlImagenRecursoEstudiante(urlConstruida)) {
    return (
      <div style={previewBox}>
        <div style={{ fontWeight: 950, color: visual.accent || "#1d4ed8", marginBottom: "10px" }}>
          {tipo === "imagen" ? "🖼️ Vista previa de imagen" : "📊 Vista previa de infografía"}
        </div>

        <img
          src={urlConstruida}
          alt={block?.titulo || "Recurso visual"}
          style={{
            width: "100%",
            maxHeight: "420px",
            objectFit: "contain",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
          }}
        />
      </div>
    );
  }

  if (tipo === "pdf" || esUrlPdfRecursoEstudiante(urlRecurso)) {
    return (
      <div style={previewBox}>
        <div style={{ fontWeight: 950, color: visual.accent || "#1d4ed8" }}>
          📄 PDF listo para abrir
        </div>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
          El documento se abrirá con acceso seguro para visualizarlo o descargarlo.
        </p>
      </div>
    );
  }

  return (
    <div style={previewBox}>
      <div style={{ fontWeight: 950, color: visual.accent || "#1d4ed8" }}>
        {accion.descripcion}
      </div>
      <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
        Usa el botón inferior para abrir el recurso.
      </p>
    </div>
  );
}

async function abrirRecursoAprendizajeEstudiante(block = {}) {
  const url = String(obtenerUrlRecursoAprendizajeEstudiante(block) || "").trim();

  if (!url) return;

  const nombre =
    block?.activityFileName ||
    block?.resourceName ||
    block?.archivoNombre ||
    block?.titulo ||
    "Recurso de aprendizaje";

  try {
    if (url.startsWith("/aula-virtual/")) {
      await abrirArchivoAulaVirtual(url, nombre);
      return;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const urlConstruida = construirUrlArchivoAulaVirtual(url);

    if (urlConstruida) {
      window.open(urlConstruida, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.error("Error abriendo recurso de aprendizaje:", error);
    window.alert("No se pudo abrir el recurso. Intenta nuevamente o avisa al docente.");
  }
}

function esRecursoAprendizajeEstudiante(block = {}) {
  const tipo = String(block?.tipo || "").trim().toLowerCase();

  const tiposRecursos = [
    "pdf",
    "video",
    "enlace",
    "recurso externo",
    "lectura",
    "presentacion",
    "presentación",
    "imagen",
    "infografia",
    "infografía",
    "guia",
    "guía",
    "documento",
    "material",
    "separata",
    "ficha",
  ];

  return (
    block?.esRecursoAprendizaje === true ||
    block?.categoriaDidactica === "recurso" ||
    tiposRecursos.includes(tipo)
  );
}

function obtenerUrlRecursoAprendizajeEstudiante(block = {}) {
  return (
    block?.resourceUrl ||
    block?.url ||
    block?.activityPdfUrl ||
    block?.activityFileUrl ||
    block?.archivoUrl ||
    ""
  );
}


function StudentBlockCard({ block, onOpen }) {
  const {
    intentosPermitidos,
    intentosDisponibles,
    feedbackEnviado,
    configurado,
    retroalimentacion,
    observacion,
    decisionDocente,
    feedbackBadgeType,
    feedbackBadgeText,
    revisionBadgeType,
    revisionBadgeText,
    estadoActividad,
    avanceActividad,
    puntajeActividad,
    nivelActividad,
    intentoEnUso,
  } = getStudentBlockState(block);

  const visual = getActivityVisualStyle(block);

  // evidencia-card-modo-consulta-v1
  const tipoNormalizadoTarjeta = String(
    block?.tipo || ""
  )
    .trim()
    .toLowerCase();

  const evidenciaEnModoConsulta = Boolean(
    tipoNormalizadoTarjeta === "evidencia" &&
      configurado &&
      !intentoEnUso &&
      intentosDisponibles <= 0
  );
  const safeFeedbackBadgeType = feedbackBadgeType || (feedbackEnviado ? "green" : "gray");
  const safeFeedbackBadgeText = feedbackBadgeText || (feedbackEnviado ? "Retroalimentación recibida" : "Sin retroalimentación");
  const safeRevisionBadgeType = revisionBadgeType || "gray";
  const safeRevisionBadgeText = revisionBadgeText || "Sin envío";

  const renderTarjetaRecursoEstudiantePrincipal = () => {
    const urlRecurso =
      obtenerUrlRecursoAprendizajeEstudiante(block);

    const recursoDisponible = Boolean(urlRecurso);
    const formato = block?.tipo || "Recurso";

    const nombreMaterial =
      block?.activityFileName ||
      block?.resourceName ||
      block?.archivoNombre ||
      block?.titulo ||
      "Material de aprendizaje";

    const accionRecursoPrincipal =
      obtenerAccionRecursoAprendizajeEstudiante(block);

    const formatoNormalizado = String(formato)
      .trim()
      .toLowerCase();

    const IconoMaterial =
      formatoNormalizado === "pdf"
        ? FileText
        : BookOpen;

    return (
      <UiCard
        className="w-full min-w-0 overflow-hidden rounded-3xl border border-l-4 shadow-sm"
        style={{
          borderColor: visual.border,
          borderLeftColor: visual.accent,
        }}
      >
        <UiCardHeader
          className="flex w-full min-w-0 flex-col gap-4 p-4 sm:p-5"
          style={{
            background: `linear-gradient(135deg, ${visual.soft}, #ffffff)`,
            borderBottom: `1px solid ${visual.border}`,
          }}
        >
          <div className="flex w-full min-w-0 flex-wrap gap-2">
            <UiBadge
              variant="outline"
              className="max-w-full whitespace-normal rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              📚 Recurso de aprendizaje
            </UiBadge>

            <UiBadge
              variant="outline"
              className="max-w-full whitespace-normal rounded-xl"
              style={{
                borderColor: visual.border,
                backgroundColor: visual.soft,
                color: visual.accent,
              }}
            >
              {visual.icon} {formato}
            </UiBadge>

            <UiBadge
              variant="outline"
              className={
                recursoDisponible
                  ? "max-w-full whitespace-normal rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "max-w-full whitespace-normal rounded-xl border-amber-200 bg-amber-50 text-amber-700"
              }
            >
              {recursoDisponible
                ? "Disponible"
                : "Pendiente"}
            </UiBadge>

            <UiBadge
              variant="outline"
              className="max-w-full whitespace-normal rounded-xl border-slate-200 bg-slate-50 text-slate-600"
            >
              No evaluable
            </UiBadge>
          </div>

          <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: visual.soft,
                borderColor: visual.border,
                color: visual.accent,
              }}
            >
              <IconoMaterial className="h-6 w-6" />
            </div>

            <div className="w-full min-w-0">
              <UiCardTitle className="max-w-full break-words text-xl leading-tight text-slate-950">
                {block.titulo ||
                  "Recurso de aprendizaje"}
              </UiCardTitle>

              <UiCardDescription className="mt-2 max-w-full break-words text-sm leading-6 text-slate-600">
                {block.descripcion ||
                  "Material para revisar, leer o explorar antes de desarrollar las actividades evaluables."}
              </UiCardDescription>
            </div>
          </div>
        </UiCardHeader>

        <UiCardContent className="flex w-full min-w-0 flex-col gap-4 p-4 sm:p-5">
          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500">
                Tipo
              </div>

              <div className="mt-2 break-words text-sm font-black text-blue-900">
                Recurso de aprendizaje
              </div>
            </div>

            <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500">
                Formato
              </div>

              <div className="mt-2 break-words text-sm font-black text-blue-900">
                {formato}
              </div>
            </div>

            <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500">
                Entrega
              </div>

              <div className="mt-2 break-words text-sm font-black text-blue-900">
                No requiere entrega
              </div>
            </div>

            <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-500">
                Evaluación
              </div>

              <div className="mt-2 break-words text-sm font-black text-blue-900">
                No tiene puntaje
              </div>
            </div>
          </div>

          <div
            className="w-full min-w-0 overflow-hidden rounded-3xl border p-4"
            style={{
              borderColor: visual.border,
              backgroundColor: visual.soft,
            }}
          >
            <h3
              className="mb-3 break-words text-xs font-black uppercase tracking-wide"
              style={{
                color: visual.accent,
              }}
            >
              Material de aprendizaje
            </h3>

            <div
              className="w-full min-w-0 break-all rounded-2xl border bg-white p-4 text-sm font-bold leading-6 text-blue-900"
              style={{
                borderColor: visual.border,
              }}
            >
              {recursoDisponible
                ? nombreMaterial
                : "El docente aún no cargó el material de este recurso."}
            </div>
          </div>
        </UiCardContent>

        <UiCardFooter className="w-full border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <UiButton
            type="button"
            className="h-12 w-full rounded-2xl font-black shadow-sm"
            style={{
              backgroundColor: visual.accent,
              color: "#ffffff",
            }}
            onClick={() => onOpen(block)}
          >
            {recursoDisponible
              ? accionRecursoPrincipal.textoCorto
              : "Ver estado del recurso"}

            <ChevronRight className="ml-2 h-5 w-5" />
          </UiButton>
        </UiCardFooter>
      </UiCard>
    );
  };

  if (esRecursoAprendizajeEstudiante(block)) {
    return renderTarjetaRecursoEstudiantePrincipal();
  }


  return (
    <UiCard
      data-ui="activity-card-mobile-v4"
      className="
        mb-5 w-full min-w-0 overflow-hidden
        !rounded-3xl border border-l-4 shadow-sm
      "
      style={{
        borderColor: visual.border,
        borderLeftColor: visual.accent,
      }}
    >
      <UiCardHeader
        className="flex w-full min-w-0 flex-col gap-4 !p-4 sm:!p-5"
        style={{
          background: `linear-gradient(135deg, ${visual.soft}, #ffffff)`,
          borderBottom: `1px solid ${visual.border}`,
        }}
      >
        {/* ESTADOS EN CUADRÍCULA ORDENADA */}
        <div className="grid w-full min-w-0 grid-cols-2 gap-2">
          <UiBadge
            variant="outline"
            className="
              flex min-h-11 w-full min-w-0 items-center
              justify-center whitespace-normal !rounded-xl
              px-2 py-2 text-center text-xs
            "
            style={{
              borderColor: visual.border,
              backgroundColor: visual.soft,
              color: visual.accent,
            }}
          >
            <span className="break-words">
              {visual.icon} {visual.label}
            </span>
          </UiBadge>

          <UiBadge
            variant="outline"
            className={
              configurado
                ? "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                : "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs text-amber-700"
            }
          >
            <span className="break-words">
              {configurado
                ? "Actividad disponible"
                : "Pendiente de configuración"}
            </span>
          </UiBadge>

          <UiBadge
            variant="outline"
            className={
              safeFeedbackBadgeType === "green"
                ? "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                : "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs text-slate-600"
            }
          >
            <span className="break-words">
              {safeFeedbackBadgeText}
            </span>
          </UiBadge>

          <UiBadge
            variant="outline"
            className={
              safeRevisionBadgeType === "green"
                ? "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                : "flex min-h-11 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs text-amber-700"
            }
          >
            <span className="break-words">
              {safeRevisionBadgeText}
            </span>
          </UiBadge>
        </div>

        {/* ICONO, TÍTULO Y DESCRIPCIÓN */}
        <div className="flex w-full min-w-0 items-start gap-3">
          <div
            className="
              flex h-12 w-12 shrink-0 items-center
              justify-center !rounded-2xl border
              bg-white text-2xl shadow-sm
            "
            style={{
              borderColor: visual.border,
              color: visual.accent,
            }}
          >
            {visual.icon}
          </div>

          <div className="w-full min-w-0 flex-1">
            <UiCardTitle
              className="
                max-w-full break-words
                text-xl leading-tight text-slate-950
              "
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
              title={block.titulo || "Actividad evaluable"}
            >
              {block.titulo || "Actividad evaluable"}
            </UiCardTitle>

            <UiCardDescription
              className="
                mt-2 max-w-full break-words
                text-sm leading-6 text-slate-600
              "
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
              }}
            >
              {block.descripcion ||
                "Actividad asignada para desarrollar y demostrar el aprendizaje."}
            </UiCardDescription>
          </div>
        </div>
      </UiCardHeader>

      <UiCardContent
        className="flex w-full min-w-0 flex-col gap-4 !p-4 sm:!p-5"
      >
        {/* INDICADORES COMPACTOS */}
        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          <div className="min-w-0 !rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-xs font-bold text-slate-500">
              Estado
            </div>

            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
              {estadoActividad}
            </div>
          </div>

          <div className="min-w-0 !rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-xs font-bold text-slate-500">
              Avance
            </div>

            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
              {avanceActividad}%
            </div>
          </div>

          <div className="min-w-0 !rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-xs font-bold text-slate-500">
              Nivel
            </div>

            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
              {nivelActividad}
            </div>
          </div>

          {/* activity-card-intentos-disponibles-v1 */}
          <div className="min-w-0 !rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className="text-xs font-bold text-slate-500">
              Intentos disponibles
            </div>

            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
              {intentosDisponibles} de {intentosPermitidos}
            </div>
          </div>
        </div>

        {/* RETROALIMENTACIÓN COLAPSABLE */}
        <UiCard
          className="
            w-full min-w-0 overflow-hidden
            !rounded-2xl border-slate-200 shadow-none
          "
        >
          <UiAccordion
            type="single"
            collapsible
            className="w-full"
          >
            <UiAccordionItem
              value="feedback-actividad"
              className="border-0"
            >
              <UiAccordionTrigger
                className="
                  gap-3 px-4 py-3.5 text-left
                  hover:no-underline
                "
              >
                <div className="min-w-0">
                  <div className="break-words text-sm font-black text-slate-900">
                    Retroalimentación
                  </div>

                  <div className="mt-1 break-words text-xs font-normal text-slate-500">
                    Revisión y observación docente
                  </div>
                </div>
              </UiAccordionTrigger>

              <UiAccordionContent className="px-4 pb-4">
                <UiSeparator className="mb-4" />

                {feedbackEnviado ? (
                  <div className="flex min-w-0 flex-col gap-3 text-sm leading-6 text-slate-700">
                    <p className="break-words">
                      <strong>Retroalimentación:</strong>{" "}
                      {retroalimentacion ||
                        "La retroalimentación fue enviada por el docente."}
                    </p>

                    <p className="break-words">
                      <strong>Observación:</strong>{" "}
                      {observacion ||
                        "El docente revisó tu actividad."}
                    </p>

                    <p className="break-words">
                      <strong>Decisión:</strong>{" "}
                      {decisionDocente ||
                        safeRevisionBadgeText}
                    </p>
                  </div>
                ) : (
                  <p className="break-words text-sm leading-6 text-slate-600">
                    La actividad todavía no tiene retroalimentación enviada.
                  </p>
                )}
              </UiAccordionContent>
            </UiAccordionItem>
          </UiAccordion>
        </UiCard>
      </UiCardContent>

      {/* BOTÓN COMPLETO EN LA PARTE INFERIOR */}
      <UiCardFooter
        className="
          w-full border-t border-slate-200
          bg-slate-50/70 !p-4 sm:!p-5
        "
      >
        <UiButton
          type="button"
          className="
            h-12 w-full min-w-0
            whitespace-normal !rounded-2xl
            px-4 text-center font-black shadow-sm
          "
          style={{
            backgroundColor: visual.accent,
            color: "#ffffff",
          }}
          onClick={() => onOpen(block)}
        >
          <span className="min-w-0 break-words">
            {evidenciaEnModoConsulta
              ? "Ver en modo consulta"
              : "Abrir actividad"}
          </span>

          <ChevronRight className="ml-2 h-5 w-5 shrink-0" />
        </UiButton>
      </UiCardFooter>
    </UiCard>
  );
}


function ActivityDetailModal({ block, onClose, onBlockUpdated }) {

  const desplazarHistorialAlAbrir = (value) => {
    if (value !== "history") return;

    const desplazar = () => {
      const body = document.querySelector(
        '[data-ui="activity-modal-body-v8"]'
      );

      const history = document.querySelector(
        '[data-ui="activity-history-v9e"]'
      );

      if (!body || !history) return;

      body.scrollTo({
        top: body.scrollHeight,
        behavior: "smooth",
      });
    };

    window.requestAnimationFrame(() => {
      window.setTimeout(desplazar, 120);
      window.setTimeout(desplazar, 380);
    });
  };

  const visual = getActivityVisualStyle(block || {}) || {
    icon: "📚",
    label: block?.tipo || "Recurso",
    accent: "#2563eb",
    soft: "#eff6ff",
    border: "#bfdbfe",
    badge: "blue",
  };

  const [showResource, setShowResource] = useState(false);
  const [modalFullScreen, setModalFullScreen] = useState(false);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptCompleted, setAttemptCompleted] = useState(false);
  const [attemptMessage, setAttemptMessage] = useState("");
  const [activityDraft, setActivityDraft] = useState({
    cuestionario: {},
    foro: "",
    evidenciaDescripcion:
      "Presento mi evidencia de aprendizaje desarrollada según el propósito y criterio de evaluación.",
  });

  const {
    historial,
    intentosPermitidos,
    intentosDisponibles,
    feedbackEnviado,
    revisado,
    configurado,
    retroalimentacion,
    observacion,
    decisionDocente,
    feedbackBadgeType,
    feedbackBadgeText,
    revisionBadgeType,
    revisionBadgeText,
    estadoActividad,
    avanceActividad,
    puntajeActividad,
    nivelActividad,
    intentoEnUso,
  } = getStudentBlockState(block);

  if (!block) return null;

  const modalShellStyle = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "#ffffff",
    borderRadius: modalFullScreen ? "0" : "26px",
    width: modalFullScreen ? "100vw" : "100%",
    maxWidth: modalFullScreen ? "100vw" : "980px",
    height: modalFullScreen ? "100dvh" : "94dvh",
    maxHeight: modalFullScreen ? "100dvh" : "94dvh",
    overflow: "hidden",
    padding: "0",
    boxShadow: modalFullScreen
      ? "none"
      : "0 30px 80px rgba(15, 23, 42, 0.28)",
  };


  const h5pEmbeds = {
    "h5p-31ee8efae42f": "https://h5p.org/h5p/embed/617",
  };

  const tipoNormalizado = String(block.tipo || "").toLowerCase();
  const h5pUrl = h5pEmbeds[block.id] || block.h5pUrl || block.url || "";

  const recursoDisponible = Boolean(
    (tipoNormalizado === "h5p" && h5pUrl) ||
      ["pdf", "evidencia", "cuestionario", "foro"].includes(tipoNormalizado)
  );

  const recursoLabel =
    tipoNormalizado === "h5p"
      ? "H5P conectado"
      : tipoNormalizado === "pdf"
      ? "PDF conectado"
      : tipoNormalizado === "evidencia"
      ? "Entrega conectada"
      : tipoNormalizado === "cuestionario"
      ? "Cuestionario conectado"
      : tipoNormalizado === "foro"
      ? "Foro conectado"
      : "Recurso pendiente";

  const puedeDesarrollar = Boolean(
    configurado &&
      (
        intentoEnUso ||
        intentosDisponibles > 0
      )
  );
  const puedeConsultarRecurso = configurado && recursoDisponible;

  const actualizarRespuestaCuestionario = (clave, valor) => {
    setActivityDraft((prev) => ({
      ...prev,
      cuestionario: {
        ...(prev.cuestionario || {}),
        [clave]: valor,
      },
    }));
  };

  const actualizarCampoActividad = (campo, valor) => {
    setActivityDraft((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const obtenerRespuestaActividad = () => ({
    tipo: tipoNormalizado,
    titulo: block.titulo,
    cuestionario: activityDraft.cuestionario || {},
    foro: activityDraft.foro || "",
    evidenciaDescripcion: activityDraft.evidenciaDescripcion || "",
  });

  const renderRecursoEstudiante = () => {
    const commonCardStyle = {
      border: `1px solid ${visual.border}`,
      borderRadius: "18px",
      padding: "18px",
      background: visual.soft,
      boxSizing: "border-box",
      width: "100%",
    };

    const sectionTitleStyle = {
      margin: "0 0 8px",
      color: visual.accent,
      fontWeight: 1000,
      fontSize: "16px",
    };

    const helpTextStyle = {
      margin: "0 0 14px",
      color: "#475569",
      lineHeight: 1.6,
      fontSize: "13px",
    };

    const inputStyle = {
      width: "100%",
      border: `1px solid ${visual.border}`,
      borderRadius: "14px",
      padding: "12px",
      resize: "vertical",
      color: "#334155",
      fontWeight: 700,
      background: "#ffffff",
      boxSizing: "border-box",
      fontFamily: "inherit",
    };

    if (tipoNormalizado === "h5p" && h5pUrl) {
      return (
        <div style={commonCardStyle}>
          <h4 style={sectionTitleStyle}>🧩 Actividad interactiva H5P</h4>
          <p style={helpTextStyle}>
            Interactúa con el recurso, revisa tus respuestas y completa la actividad antes de finalizar tu intento.
          </p>

          <div
            style={{
              border: `1px solid ${visual.border}`,
              borderRadius: "18px",
              overflow: "hidden",
              background: "#ffffff",
            }}
          >
            <iframe
              src={h5pUrl}
              title={block.titulo || "Actividad H5P"}
              allowFullScreen
              style={{
                width: "100%",
                minHeight: modalFullScreen ? "640px" : "520px",
                border: "0",
                background: "#ffffff",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
            }}
          >
            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "12px" }}>
              <strong>1. Explora</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>
                Lee o interactúa con el recurso.
              </p>
            </div>

            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "12px" }}>
              <strong>2. Responde</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>
                Completa los ítems del H5P.
              </p>
            </div>

            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "12px" }}>
              <strong>3. Finaliza</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>
                Guarda tu intento para revisión.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (tipoNormalizado === "pdf") {
      return (
        <div style={commonCardStyle}>
          <h4 style={sectionTitleStyle}>📄 Material PDF / ficha de trabajo</h4>
          <p style={helpTextStyle}>
            Lee la ficha, identifica las ideas principales y desarrolla la actividad solicitada por el docente.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "13px" }}>
              <strong>Propósito</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
                Comprender el material y resolver la actividad.
              </p>
            </div>

            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "13px" }}>
              <strong>Producto esperado</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
                Evidencia desarrollada por el estudiante.
              </p>
            </div>
          </div>

          <div
            style={{
              border: `1px dashed ${visual.accent}`,
              borderRadius: "16px",
              padding: "16px",
              background: "#ffffff",
              color: "#334155",
            }}
          >
            {block.activityPdfUrl || block.activityFileUrl ? (
              <button
                type="button"
                onClick={() =>
                  abrirArchivoAulaVirtual(
                    block.activityPdfUrl || block.activityFileUrl,
                    block.activityFileName || "Documento del docente"
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: visual.accent,
                  fontWeight: 950,
                  background: "#ffffff",
                  border: `1px solid ${visual.border}`,
                  borderRadius: "999px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📄 Ver PDF real: {block.activityFileName || "Documento del docente"}
              </button>
            ) : (
              <>
                <strong>PDF pendiente:</strong> El docente todavía no ha cargado un documento real.
              </>
            )}
          </div>
        </div>
      );
    }

    if (tipoNormalizado === "evidencia") {
      return (
        <div style={commonCardStyle}>
          <h4 style={sectionTitleStyle}>📤 Entrega de evidencia</h4>
          <p style={helpTextStyle}>
            Adjunta tu archivo real y escribe una breve descripción del producto que elaboraste para demostrar tu aprendizaje.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              marginBottom: "14px",
            }}
          >
            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "13px" }}>
              <strong>Antes de enviar</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
                Verifica que tu archivo sea el correcto.
              </p>
            </div>

            <div style={{ background: "#ffffff", border: `1px solid ${visual.border}`, borderRadius: "14px", padding: "13px" }}>
              <strong>Después de enviar</strong>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
                El docente revisará tu evidencia y enviará retroalimentación.
              </p>
            </div>
          </div>
</div>
      );
    }

    if (tipoNormalizado === "cuestionario") {
      const preguntas = [
        {
          titulo: "¿Qué aprendiste en esta actividad?",
          tipo: "abierta",
          placeholder: "Escribe con tus palabras lo que aprendiste...",
        },
        {
          titulo: "¿Qué estrategia usaste para resolver la actividad?",
          tipo: "abierta",
          placeholder: "Describe el procedimiento o estrategia que utilizaste...",
        },
        {
          titulo: "Autoevaluación de mi desempeño",
          tipo: "opciones",
          opciones: ["Lo logré", "Estoy en proceso", "Necesito apoyo"],
        },
      ];

      return (
        <div style={commonCardStyle}>
          <h4 style={sectionTitleStyle}>📝 Cuestionario de aprendizaje</h4>
          <p style={helpTextStyle}>
            Responde cada pregunta con atención. Tus respuestas ayudarán al docente a revisar tu progreso.
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            {preguntas.map((pregunta, index) => {
              const clave = `pregunta_${index + 1}`;
              const valorActual = activityDraft.cuestionario?.[clave] || "";

              return (
                <div
                  key={pregunta.titulo}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${visual.border}`,
                    borderRadius: "16px",
                    padding: "14px",
                  }}
                >
                  <label style={{ display: "grid", gap: "8px", color: "#334155", fontWeight: 950 }}>
                    {index + 1}. {pregunta.titulo}

                    {pregunta.tipo === "opciones" ? (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {pregunta.opciones.map((opcion) => (
                          <label
                            key={opcion}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "7px",
                              background: valorActual === opcion ? visual.soft : "#f8fafc",
                              border: `1px solid ${valorActual === opcion ? visual.accent : visual.border}`,
                              borderRadius: "999px",
                              padding: "9px 12px",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`pregunta-${index}`}
                              checked={valorActual === opcion}
                              onChange={() => actualizarRespuestaCuestionario(clave, opcion)}
                            />
                            {opcion}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder={pregunta.placeholder}
                        value={valorActual}
                        onChange={(event) =>
                          actualizarRespuestaCuestionario(clave, event.target.value)
                        }
                        style={inputStyle}
                      />
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (tipoNormalizado === "foro") {
      return (
        <div style={commonCardStyle}>
          <h4 style={sectionTitleStyle}>💬 Foro de discusión</h4>
          <p style={helpTextStyle}>
            Participa con respeto, argumenta tu respuesta y dialoga con tus compañeros.
          </p>

          <div
            style={{
              background: "#ffffff",
              border: `1px solid ${visual.border}`,
              borderRadius: "16px",
              padding: "14px",
              marginBottom: "14px",
            }}
          >
            <strong>Pregunta orientadora</strong>
            <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.55 }}>
              ¿Cómo aplicarías lo aprendido en una situación real de tu comunidad o vida diaria?
            </p>
          </div>

          <label style={{ display: "grid", gap: "8px", color: "#334155", fontWeight: 900 }}>
            Mi participación en el foro
            <textarea
              value={activityDraft.foro}
              onChange={(event) => actualizarCampoActividad("foro", event.target.value)}
              placeholder="Mi participación en el foro es..."
              rows={5}
              style={inputStyle}
            />
          </label>
        </div>
      );
    }

    return (
      <div
        style={{
          border: "1px dashed #cbd5e1",
          borderRadius: "16px",
          padding: "18px",
          color: "#64748b",
          background: "#f8fafc",
        }}
      >
        Este tipo de actividad todavía no tiene recurso conectado.
      </div>
    );
  };

  const entregarArchivoRealEstudiante = async (
    block,
    archivoSeleccionado = null,
    descripcionDesdePanel = ""
  ) => {
    if (!block?.id) {
      setMensajeEvidenciaReal("No se puede entregar evidencia: falta el ID del bloque.");
      return;
    }

    // limite-evidencia-frontend-v1
    if (!puedeDesarrollar) {
      const mensaje =
        "No tienes intentos disponibles para enviar otra evidencia.";

      setMensajeEvidenciaReal(mensaje);
      setAttemptMessage(mensaje);

      throw new Error(mensaje);
    }

    if (!archivoSeleccionado) {
      setMensajeEvidenciaReal("Selecciona un archivo primero.");
      return;
    }

    try {

      const descripcionEvidencia =
        descripcionDesdePanel?.trim() ||
        activityDraft.evidenciaDescripcion?.trim() ||
        "Entrega realizada desde la vista estudiante";

      const numeroIntentoEvidencia = historial.length + 1;

      const respuesta = await entregarEvidenciaRealBloque(block.id, archivoSeleccionado, {
        numero_intento: numeroIntentoEvidencia,
        estudiante_username: "estudiante",
        comentario: descripcionEvidencia,
        evidencia_descripcion: descripcionEvidencia,
        descripcion_evidencia: descripcionEvidencia,
        puntaje: 80,
        avance: 100,
        nivel_logro: "Logro Esperado",
      });

      setAttemptCompleted(true);
      setAttemptMessage("Evidencia real enviada y guardada correctamente.");

      const intento = respuesta?.intento || {};
      const archivo = respuesta?.archivo || {};

      const nuevoHistorial = [
        {
          id: intento.id || Date.now(),
          tipo: block.tipo,
          fecha: new Date().toLocaleString(),
          nivel: intento.nivel_logro || "Logro Esperado",
          avance: intento.avance || 100,
          estado: intento.estado || "Completado",
          intento: intento.numero_intento || 1,
          puntaje: intento.puntaje || 80,
          archivo_url: intento.archivo_url || archivo.url,
          archivo_nombre: intento.archivo_nombre || archivo.nombre,
          decisionDocente: "Pendiente",
          retroalimentacion: "Evidencia real enviada por el estudiante. Pendiente de revisión docente.",
          observacionDocente: "Pendiente de revisión docente.",
        },
        ...(block.studentAttemptHistory || []),
      ];

      const actualizado = {
        ...block,
        studentAttemptHistory:
          nuevoHistorial,
        studentLatestFeedback: null,
        updatedAt:
          new Date().toLocaleString(),
      };

      if (
        typeof onBlockUpdated === "function"
      ) {
        onBlockUpdated(actualizado);
      }

      // La evidencia ya fue registrada en backend.
      // No actualizamos setBloques aquí porque esta función vive dentro del modal.

    } catch (error) {
      console.error("Error entregando evidencia real:", error);

      setAttemptMessage(
        error?.message ||
          "No se pudo enviar la evidencia real."
      );

      throw error;
    } finally {
    }
  };


  const renderVistaRecursoAprendizajeEstudiante = () => {
    const urlRecurso =
      obtenerUrlRecursoAprendizajeEstudiante(block);

    const recursoDisponibleEstudiante =
      Boolean(urlRecurso);

    const tipoRecurso = String(
      block?.tipo || "Recurso"
    )
      .trim()
      .toLowerCase();

    const accionRecurso =
      obtenerAccionRecursoAprendizajeEstudiante(block);

    const nombreMaterial =
      block?.activityFileName ||
      block?.resourceName ||
      block?.archivoNombre ||
      urlRecurso ||
      "Material de aprendizaje";

    const IconoRecurso =
      tipoRecurso === "pdf"
        ? FileText
        : BookOpen;

    return (
      <div
        className="
          fixed inset-0 z-[9999]
          flex items-end justify-center
          overflow-hidden bg-slate-950/50
          p-0 backdrop-blur-sm
          sm:items-center sm:p-4
        "
      >
        <UiCard
          className={[
            "flex w-full min-w-0 flex-col overflow-hidden border-0 bg-white shadow-2xl",
            modalFullScreen
              ? "h-dvh max-h-dvh rounded-none"
              : "max-h-[94dvh] rounded-t-3xl sm:max-w-3xl sm:rounded-3xl",
          ].join(" ")}
        >
          {/* ENCABEZADO DEL MODAL */}
          <UiCardHeader className="shrink-0 border-b border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex w-full min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className="
                    flex h-11 w-11 shrink-0
                    items-center justify-center
                    rounded-2xl border
                  "
                  style={{
                    backgroundColor: visual.soft,
                    borderColor: visual.border,
                    color: visual.accent,
                  }}
                >
                  <IconoRecurso className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex min-w-0 flex-wrap gap-2">
                    <UiBadge
                      variant="outline"
                      className="
                        max-w-full whitespace-normal rounded-xl
                        border-emerald-200 bg-emerald-50
                        text-emerald-700
                      "
                    >
                      Recurso de aprendizaje
                    </UiBadge>

                    <UiBadge
                      variant="outline"
                      className="max-w-full whitespace-normal rounded-xl"
                      style={{
                        borderColor: visual.border,
                        backgroundColor: visual.soft,
                        color: visual.accent,
                      }}
                    >
                      {block?.tipo || "Recurso"}
                    </UiBadge>

                    <UiBadge
                      variant="outline"
                      className={
                        recursoDisponibleEstudiante
                          ? "max-w-full whitespace-normal rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "max-w-full whitespace-normal rounded-xl border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {recursoDisponibleEstudiante
                        ? "Disponible"
                        : "Pendiente"}
                    </UiBadge>
                  </div>

                  <UiCardTitle className="max-w-full break-words text-lg leading-tight text-slate-950 sm:text-xl">
                    {block?.titulo ||
                      "Recurso de aprendizaje"}
                  </UiCardTitle>

                  <p className="mt-2 max-w-full break-words text-sm leading-5 text-slate-600">
                    {block?.descripcion ||
                      "Material de apoyo para revisar antes de desarrollar las actividades evaluables."}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <UiButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={() =>
                    setModalFullScreen(
                      (value) => !value
                    )
                  }
                  aria-label={
                    modalFullScreen
                      ? "Salir de pantalla completa"
                      : "Abrir en pantalla completa"
                  }
                >
                  {modalFullScreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </UiButton>

                <UiButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl text-slate-500"
                  onClick={onClose}
                  aria-label="Cerrar recurso"
                >
                  <X className="h-5 w-5" />
                </UiButton>
              </div>
            </div>
          </UiCardHeader>

          {/* CONTENIDO DESPLAZABLE */}
          <UiCardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="flex w-full min-w-0 flex-col gap-4">
              {/* INFORMACIÓN PRINCIPAL */}
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Tipo
                  </div>

                  <div className="mt-2 break-words text-sm font-black text-blue-900">
                    Recurso de aprendizaje
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Formato
                  </div>

                  <div className="mt-2 break-words text-sm font-black text-blue-900">
                    {block?.tipo || "Recurso"}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Entrega
                  </div>

                  <div className="mt-2 break-words text-sm font-black text-blue-900">
                    No requiere entrega
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Evaluación
                  </div>

                  <div className="mt-2 break-words text-sm font-black text-blue-900">
                    No tiene puntaje
                  </div>
                </div>
              </div>

              {/* ACORDEÓN PEDAGÓGICO */}
              <UiCard className="w-full min-w-0 overflow-hidden rounded-3xl border-slate-200 shadow-sm">
                <UiAccordion
                  type="single"
                  collapsible
                  className="w-full"
                >
                  <UiAccordionItem
                    value="pedagogia"
                    className="border-0"
                  >
                    <UiAccordionTrigger className="gap-3 px-4 py-4 text-left hover:no-underline sm:px-5">
                      <div className="min-w-0">
                        <div className="break-words font-black text-slate-900">
                          Información pedagógica
                        </div>

                        <div className="mt-1 break-words text-xs font-normal text-slate-500">
                          Propósito y orientación del recurso
                        </div>
                      </div>
                    </UiAccordionTrigger>

                    <UiAccordionContent className="px-4 pb-4 sm:px-5 sm:pb-5">
                      <UiSeparator className="mb-4" />

                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Propósito
                          </div>

                          <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                            {block?.proposito ||
                              "Revisar el material para comprender, reforzar o ampliar el aprendizaje antes de participar en las actividades evaluables."}
                          </p>
                        </div>

                        <div>
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Orientación
                          </div>

                          <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                            {block?.criterioEvaluacion ||
                              "Lee, observa o explora el recurso antes de continuar con la siguiente actividad."}
                          </p>
                        </div>
                      </div>
                    </UiAccordionContent>
                  </UiAccordionItem>
                </UiAccordion>
              </UiCard>

              {/* MATERIAL */}
              <div
                className="w-full min-w-0 overflow-hidden rounded-3xl border p-4 sm:p-5"
                style={{
                  borderColor: visual.border,
                  backgroundColor: visual.soft,
                }}
              >
                <div
                  className="mb-3 text-xs font-black uppercase tracking-wide"
                  style={{
                    color: visual.accent,
                  }}
                >
                  Material de aprendizaje
                </div>

                {recursoDisponibleEstudiante ? (
                  <div className="flex w-full min-w-0 flex-col gap-4">
                    <div
                      className="
                        w-full min-w-0 break-all
                        rounded-2xl border bg-white
                        p-4 text-sm font-bold
                        leading-6 text-blue-900
                      "
                      style={{
                        borderColor: visual.border,
                      }}
                    >
                      {nombreMaterial}
                    </div>

                    <div className="w-full min-w-0 overflow-hidden rounded-2xl">
                      {renderPreviewRecursoAprendizajeEstudiante(
                        block,
                        visual
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className="
                      w-full min-w-0 rounded-2xl
                      border border-dashed border-slate-300
                      bg-white p-4 text-sm
                      font-semibold leading-6 text-slate-500
                    "
                  >
                    El docente todavía no ha cargado el archivo, enlace o material de este recurso.
                  </div>
                )}
              </div>
            </div>
          </UiCardContent>

          {/* BOTÓN INFERIOR SIEMPRE VISIBLE */}
          <UiCardFooter className="shrink-0 border-t border-slate-200 bg-white p-4 sm:p-5">
            <UiButton
              type="button"
              size="lg"
              disabled={!recursoDisponibleEstudiante}
              className="
                h-12 w-full rounded-2xl
                font-black shadow-sm
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              style={
                recursoDisponibleEstudiante
                  ? {
                      backgroundColor:
                        visual.accent,
                      color: "#ffffff",
                    }
                  : undefined
              }
              onClick={() =>
                abrirRecursoAprendizajeEstudiante(
                  block
                )
              }
            >
              {recursoDisponibleEstudiante
                ? accionRecurso.texto
                : "Recurso pendiente"}
            </UiButton>
          </UiCardFooter>
        </UiCard>
      </div>
    );
  };

  if (esRecursoAprendizajeEstudiante(block)) {
    return renderVistaRecursoAprendizajeEstudiante();
  }


  const iniciarActividadEstudiante = async () => {
    if (!puedeDesarrollar) return;

    setShowResource(true);
    setAttemptMessage("");

    try {
      setSavingAttempt(true);

      const fecha = new Date().toLocaleString();

      const abiertoActual = historial.find(
        (item) =>
          ["en uso", "pendiente"].includes(
            String(
              item?.estado || ""
            ).toLowerCase()
          )
      );

      const numeroSolicitado = Number(
        abiertoActual?.numero_intento ??
          abiertoActual?.intento ??
          historial.length + 1
      );

      const respuesta =
        await registrarIntentoBloqueAulaVirtual(
          block.id,
          {
            estudiante_username: "estudiante",
            numero_intento: numeroSolicitado,
            intento: numeroSolicitado,
            estado: "En uso",
            avance: 0,
            puntaje: 0,
            nivel_logro: "En Inicio",
            payload: {
              tipo: block.tipo,
              accion: "inicio_estudiante",
              fecha,
              estudiante: "estudiante",
              bloque_id: block.id,
              titulo: block.titulo,
            },
          }
        );

      const intentoId =
        respuesta?.intento_id ??
        abiertoActual?.id ??
        Date.now();

      const numeroReal = Number(
        respuesta?.numero_intento ??
          numeroSolicitado
      );

      const intentoActualizado = {
        ...(abiertoActual || {}),
        id: intentoId,
        bloque_id: block.id,
        tipo: block.tipo,
        fecha,
        created_at:
          abiertoActual?.created_at || fecha,
        updated_at: fecha,
        intento: numeroReal,
        numero_intento: numeroReal,
        estado: "En uso",
        avance: 0,
        puntaje: 0,
        nivel: "En Inicio",
        nivel_logro: "En Inicio",
        usuario_id:
          respuesta?.usuario_id ??
          abiertoActual?.usuario_id ??
          2,
        estudiante: "estudiante",
        estudiante_username: "estudiante",
      };

      const historialActualizado = [
        intentoActualizado,
        ...historial.filter((item) => {
          const mismoId =
            item?.id != null &&
            String(item.id) ===
              String(intentoId);

          const numeroItem = Number(
            item?.numero_intento ??
              item?.intento ??
              0
          );

          return (
            !mismoId &&
            numeroItem !== numeroReal
          );
        }),
      ];

      const actualizado = {
        ...block,
        studentAttemptHistory:
          historialActualizado,
        studentLatestFeedback: null,
        updatedAt: fecha,
      };

      if (
        typeof onBlockUpdated === "function"
      ) {
        onBlockUpdated(actualizado);
      }

      setAttemptMessage(
        respuesta?.accion === "reutilizado"
          ? "Intento en uso recuperado correctamente."
          : "Intento iniciado y registrado correctamente."
      );
    } catch (error) {
      console.error(
        "Error iniciando intento:",
        error
      );

      setAttemptMessage(
        error?.message ||
          "No se pudo registrar el inicio del intento."
      );
    } finally {
      setSavingAttempt(false);
    }
  };


  const finalizarActividadEstudiante = async () => {
    if (!block?.id) return;

    if (tipoNormalizado === "evidencia") {
      setAttemptMessage(
        "Para evidencias, finaliza usando el botón Enviar evidencia real."
      );
      return;
    }

    if (!puedeDesarrollar) {
      setAttemptMessage(
        "Modo consulta: ya no tienes intentos disponibles para enviar."
      );
      return;
    }

    try {
      setSavingAttempt(true);
      setAttemptMessage("");

      const fecha = new Date().toLocaleString();
      const puntaje = 80;
      const nivel = "Logro Esperado";

      const abiertoActual = historial.find(
        (item) =>
          ["en uso", "pendiente"].includes(
            String(
              item?.estado || ""
            ).toLowerCase()
          )
      );

      const numeroSolicitado = Number(
        abiertoActual?.numero_intento ??
          abiertoActual?.intento ??
          historial.length + 1
      );

      const respuestaActividad =
        obtenerRespuestaActividad();

      const respuesta =
        await registrarIntentoBloqueAulaVirtual(
          block.id,
          {
            estudiante_username: "estudiante",
            numero_intento: numeroSolicitado,
            intento: numeroSolicitado,
            estado: "Completado",
            avance: 100,
            puntaje,
            nivel_logro: nivel,
            payload: {
              tipo: block.tipo,
              accion:
                "finalizacion_estudiante",
              fecha,
              estudiante: "estudiante",
              bloque_id: block.id,
              titulo: block.titulo,
              respuesta_actividad:
                respuestaActividad,
              respuestas_cuestionario:
                respuestaActividad.cuestionario,
              respuesta_foro:
                respuestaActividad.foro,
              evidencia_descripcion:
                respuestaActividad
                  .evidenciaDescripcion,
            },
          }
        );

      const intentoId =
        respuesta?.intento_id ??
        abiertoActual?.id ??
        Date.now();

      const numeroReal = Number(
        respuesta?.numero_intento ??
          numeroSolicitado
      );

      const intentoFinalizado = {
        ...(abiertoActual || {}),
        id: intentoId,
        bloque_id: block.id,
        tipo: block.tipo,
        fecha,
        updated_at: fecha,
        nivel,
        nivel_logro: nivel,
        avance: 100,
        estado: "Completado",
        intento: numeroReal,
        numero_intento: numeroReal,
        puntaje,
        usuario_id:
          respuesta?.usuario_id ??
          abiertoActual?.usuario_id ??
          2,
        estudiante: "estudiante",
        estudiante_username: "estudiante",
        respuestaActividad,
        respuestasCuestionario:
          respuestaActividad.cuestionario,
        respuestaForo:
          respuestaActividad.foro,
        evidenciaDescripcion:
          respuestaActividad
            .evidenciaDescripcion,
        decisionDocente: "Pendiente",
        retroalimentacion:
          "Actividad enviada por el estudiante. Pendiente de revisión docente.",
        observacionDocente:
          "Pendiente de revisión docente.",
      };

      const historialActualizado = [
        intentoFinalizado,
        ...historial.filter((item) => {
          const mismoId =
            item?.id != null &&
            String(item.id) ===
              String(intentoId);

          const numeroItem = Number(
            item?.numero_intento ??
              item?.intento ??
              0
          );

          return (
            !mismoId &&
            numeroItem !== numeroReal
          );
        }),
      ];

      const actualizado = {
        ...block,
        studentAttemptHistory:
          historialActualizado,
        studentLatestFeedback: null,
        updatedAt: fecha,
      };

      if (
        typeof onBlockUpdated === "function"
      ) {
        onBlockUpdated(actualizado);
      }

      setAttemptCompleted(true);
      setAttemptMessage(
        "Actividad finalizada y guardada correctamente."
      );
    } catch (error) {
      console.error(
        "Error finalizando intento:",
        error
      );

      setAttemptMessage(
        error?.message ||
          "No se pudo finalizar la actividad."
      );
    } finally {
      setSavingAttempt(false);
    }
  };


  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: modalFullScreen ? "stretch" : "center",
        justifyContent: "center",
        padding: modalFullScreen ? "0" : "22px",
      }}
      onClick={onClose}
    >
      <div
          data-ui="activity-modal-mobile-v8"
          className="flex w-full min-w-0 flex-col overflow-hidden"
        style={modalShellStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <UiCardHeader
            data-ui="activity-modal-header-v8"
            className="shrink-0 gap-4 border-b !p-4 sm:!p-5"
            style={{
              background:
                `linear-gradient(135deg, ${visual.soft}, #ffffff)`,
              borderBottomColor: visual.border,
              borderTop: `6px solid ${visual.accent}`,
            }}
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center !rounded-2xl border bg-white text-xl shadow-sm"
                  style={{
                    borderColor: visual.border,
                    color: visual.accent,
                  }}
                >
                  {visual.icon}
                </div>

                <div className="min-w-0">
                  <div
                    className="break-words text-xs font-black uppercase tracking-wide"
                    style={{ color: visual.accent }}
                  >
                    {visual.label}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Actividad evaluable
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <UiButton
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 !rounded-2xl bg-white"
                  onClick={() =>
                    setModalFullScreen(
                      (prev) => !prev
                    )
                  }
                  title={
                    modalFullScreen
                      ? "Salir de pantalla completa"
                      : "Pantalla completa"
                  }
                  aria-label={
                    modalFullScreen
                      ? "Salir de pantalla completa"
                      : "Pantalla completa"
                  }
                >
                  {modalFullScreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </UiButton>

                <UiButton
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 !rounded-2xl bg-white text-slate-500"
                  onClick={onClose}
                  title="Cerrar"
                  aria-label="Cerrar actividad"
                >
                  <X className="h-5 w-5" />
                </UiButton>
              </div>
            </div>

            <div className="grid w-full min-w-0 grid-cols-2 gap-2">
              <UiBadge
                variant="outline"
                className="flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl px-2 py-2 text-center text-xs"
                style={{
                  borderColor: visual.border,
                  backgroundColor: visual.soft,
                  color: visual.accent,
                }}
              >
                <span className="break-words">
                  {visual.icon} {visual.label}
                </span>
              </UiBadge>

              <UiBadge
                variant="outline"
                className={
                  configurado
                    ? "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                    : "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs text-amber-700"
                }
              >
                <span className="break-words">
                  {configurado
                    ? "Actividad disponible"
                    : "Pendiente de configuración"}
                </span>
              </UiBadge>

              <UiBadge
                variant="outline"
                className={
                  feedbackBadgeType === "green"
                    ? "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                    : "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs text-slate-600"
                }
              >
                <span className="break-words">
                  {feedbackBadgeText}
                </span>
              </UiBadge>

              <UiBadge
                variant="outline"
                className={
                  revisionBadgeType === "green"
                    ? "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs text-emerald-700"
                    : "flex min-h-10 w-full min-w-0 items-center justify-center whitespace-normal !rounded-xl border-amber-200 bg-amber-50 px-2 py-2 text-center text-xs text-amber-700"
                }
              >
                <span className="break-words">
                  {revisionBadgeText}
                </span>
              </UiBadge>
            </div>

            <div className="w-full min-w-0">
              <UiCardTitle
                className="max-w-full break-words text-xl leading-tight text-slate-950 sm:text-2xl"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                }}
                title={
                  block.titulo ||
                  "Actividad evaluable"
                }
              >
                {block.titulo ||
                  "Actividad evaluable"}
              </UiCardTitle>

              <UiCardDescription
                className="mt-2 max-w-full break-words text-sm leading-6 text-slate-600"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                }}
              >
                {block.descripcion ||
                  "Detalle de la actividad asignada por el docente."}
              </UiCardDescription>
            </div>
          </UiCardHeader>

        <div
            data-ui="activity-modal-body-v8"
            className="min-h-0 flex-1 overflow-y-auto !p-4 sm:!p-5"
          >
          <div
              data-ui="activity-summary-v9a"
              className="
                mb-4 grid w-full min-w-0
                grid-cols-2 gap-3
                rounded-2xl border p-3
                md:grid-cols-3 xl:grid-cols-5
              "
              style={{
                backgroundColor: visual.soft,
                borderColor: visual.border,
              }}
            >
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-bold text-slate-500">
                  📌 Estado
                </div>

                <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                  {estadoActividad}
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-bold text-slate-500">
                  📊 Avance
                </div>

                <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                  {avanceActividad}%
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-bold text-slate-500">
                  ⭐ Puntaje
                </div>

                <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                  {puntajeActividad}%
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5">
                <div className="text-xs font-bold text-slate-500">
                  🏅 Nivel
                </div>

                <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                  {nivelActividad}
                </div>
              </div>

              <div className="col-span-2 min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 md:col-span-1">
                <div className="text-xs font-bold text-slate-500">
                  🔁 Intentos disponibles
                </div>

                <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                  {intentosDisponibles} de {intentosPermitidos}
                </div>
              </div>
            </div>

          <UiCard
              data-ui="activity-pedagogy-v9b"
              className="
                mb-4 w-full min-w-0
                overflow-hidden !rounded-2xl
                border-blue-200 shadow-none
              "
            >
              <UiAccordion
                type="single"
                collapsible
                className="w-full"
              >
                <UiAccordionItem
                  value="pedagogy"
                  className="border-0"
                >
                  <UiAccordionTrigger
                    className="
                      gap-3 px-4 py-4
                      text-left hover:no-underline
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          !rounded-2xl border text-xl
                        "
                        style={{
                          backgroundColor: visual.soft,
                          borderColor: visual.border,
                        }}
                      >
                        🎯
                      </div>

                      <div className="min-w-0">
                        <div className="break-words text-sm font-black text-slate-900">
                          Información pedagógica
                        </div>

                        <div className="mt-1 break-words text-xs font-normal text-slate-500">
                          Lo que aprenderás y cómo se evaluará
                        </div>
                      </div>
                    </div>
                  </UiAccordionTrigger>

                  <UiAccordionContent className="px-4 pb-4">
                    <UiSeparator className="mb-4" />

                    <div className="grid gap-3">
                      <div className="!rounded-2xl bg-slate-50 p-3.5">
                        <strong className="text-sm text-slate-900">
                          Propósito de aprendizaje
                        </strong>

                        <p className="mt-1.5 break-words text-sm leading-6 text-slate-600">
                          {block.proposito ||
                            "Desarrollar la actividad asignada por el docente."}
                        </p>
                      </div>

                      <div className="!rounded-2xl bg-slate-50 p-3.5">
                        <strong className="text-sm text-slate-900">
                          Criterio de evaluación
                        </strong>

                        <p className="mt-1.5 break-words text-sm leading-6 text-slate-600">
                          {block.criterioEvaluacion ||
                            "Evidencia comprensión y logro del propósito planteado."}
                        </p>
                      </div>

                      <div className="!rounded-2xl bg-slate-50 p-3.5">
                        <strong className="text-sm text-slate-900">
                          Producto esperado
                        </strong>

                        <p className="mt-1.5 break-words text-sm leading-6 text-slate-600">
                          {block.productoEsperado ||
                            "Evidencia desarrollada por el estudiante."}
                        </p>
                      </div>
                    </div>
                  </UiAccordionContent>
                </UiAccordionItem>
              </UiAccordion>
            </UiCard>

          <section
              data-ui="activity-development-v9c"
            style={{
              background: puedeDesarrollar ? "#ecfdf5" : "#f8fafc",
              border: puedeDesarrollar ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              borderRadius: "18px",
              padding: "16px",
              boxSizing: "border-box",
              width: "100%",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  background: visual.soft,
                  border: `1px solid ${visual.border}`,
                  fontSize: "19px",
                }}
              >
                {visual.icon}
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    color: puedeDesarrollar ? visual.accent : "#475569",
                    fontSize: "16px",
                    fontWeight: 1000,
                  }}
                >
                  Desarrollo de la actividad
                </h3>
                <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                  Revisa las instrucciones y completa tu actividad
                </div>
              </div>
            </div>

            <p style={{ margin: "0 0 12px", color: "#475569", fontSize: "13px", lineHeight: 1.55 }}>
              {puedeDesarrollar
                ? "La actividad está disponible. Revísala, desarrolla tu trabajo y finaliza el intento."
                : puedeConsultarRecurso
                ? "Ya no tienes intentos disponibles, pero puedes revisar el recurso en modo consulta."
                : "Esta actividad aún no está configurada por el docente."}
            </p>

            <UiButton
                data-ui="activity-open-button-v9c"
                type="button"
                size="lg"
                disabled={
                  !puedeDesarrollar &&
                  !puedeConsultarRecurso
                }
                className="
                  h-auto min-h-12 w-full
                  whitespace-normal !rounded-2xl
                  px-4 py-3 text-center
                  font-black shadow-sm
                "
                style={{
                  borderColor:
                    puedeDesarrollar ||
                    puedeConsultarRecurso
                      ? visual.accent
                      : "#cbd5e1",
                  backgroundColor: puedeDesarrollar
                    ? visual.accent
                    : puedeConsultarRecurso
                    ? "#ffffff"
                    : "#f1f5f9",
                  color: puedeDesarrollar
                    ? "#ffffff"
                    : puedeConsultarRecurso
                    ? visual.accent
                    : "#94a3b8",
                }}
                onClick={() => {
                  if (puedeDesarrollar) {
                    iniciarActividadEstudiante();
                    return;
                  }

                  if (puedeConsultarRecurso) {
                    setShowResource(true);
                  }
                }}
              >
                {puedeDesarrollar
                  ? `${visual.icon} Abrir y desarrollar actividad`
                  : puedeConsultarRecurso
                  ? `${visual.icon} Ver en modo consulta`
                  : "Actividad no disponible"}
              </UiButton>

            {showResource && (
              <div
                style={{
                  marginTop: "16px",
                  border: "1px solid #bfdbfe",
                  borderRadius: "18px",
                  background: "#ffffff",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ color: "#0f172a" }}>Recurso de aprendizaje</strong>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                      Actividad interactiva conectada para el estudiante.
                    </p>
                  </div>

                  <Badge type={recursoDisponible ? "green" : "yellow"}>
                    {recursoLabel}
                  </Badge>
                </div>

                {recursoDisponible ? (
                  <>
                    {renderRecursoEstudiante()}

                    <div
                      style={{
                        marginTop: "14px",
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                                    {tipoNormalizado === "evidencia" &&
                        puedeDesarrollar && (
                          <EvidenceRealUploadPanel
                            block={block}
                            onEnviar={entregarArchivoRealEstudiante}
                          />
                        )}

<UiButton
                        data-ui="activity-finalize-button-v9c"
                        type="button"
                        disabled={
                          savingAttempt ||
                          attemptCompleted ||
                          !puedeDesarrollar ||
                          tipoNormalizado === "evidencia"
                        }
                        className="
                          h-auto min-h-11 w-full
                          whitespace-normal !rounded-2xl
                          px-4 py-3 text-center
                          font-black
                        "
                        style={{
                          borderColor:
                            savingAttempt ||
                            attemptCompleted ||
                            !puedeDesarrollar ||
                            tipoNormalizado === "evidencia"
                              ? "#cbd5e1"
                              : "#16a34a",
                          backgroundColor:
                            savingAttempt ||
                            attemptCompleted ||
                            !puedeDesarrollar ||
                            tipoNormalizado === "evidencia"
                              ? "#f1f5f9"
                              : "#16a34a",
                          color:
                            savingAttempt ||
                            attemptCompleted ||
                            !puedeDesarrollar ||
                            tipoNormalizado === "evidencia"
                              ? "#94a3b8"
                              : "#ffffff",
                        }}
                        onClick={finalizarActividadEstudiante}
                      >
                        {savingAttempt
                          ? "Guardando..."
                          : attemptCompleted
                          ? "Actividad finalizada"
                          : !puedeDesarrollar
                          ? "Sin intentos para enviar"
                          : tipoNormalizado === "evidencia"
                          ? "Finaliza enviando evidencia real"
                          : "Finalizar actividad"}
                      </UiButton>

                      {!puedeDesarrollar && puedeConsultarRecurso && (
                        <Badge type="yellow">
                          Modo consulta: sin intentos disponibles para enviar.
                        </Badge>
                      )}

                      {attemptMessage && (
                        <Badge type={attemptCompleted ? "green" : "blue"}>
                          {attemptMessage}
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  renderRecursoEstudiante()
                )}
              </div>
            )}
          </section>

          <UiCard
              data-ui="activity-feedback-v9d"
              className="
                mb-4 w-full min-w-0
                overflow-hidden !rounded-2xl
                border-blue-200 shadow-none
              "
            >
              <UiAccordion
                type="single"
                collapsible
                className="w-full"
              >
                <UiAccordionItem
                  value="feedback"
                  className="border-0"
                >
                  <UiAccordionTrigger
                    className="
                      gap-3 px-4 py-4
                      text-left hover:no-underline
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          !rounded-2xl border
                          border-blue-200 bg-blue-50
                          text-xl
                        "
                      >
                        💡
                      </div>

                      <div className="min-w-0">
                        <div className="break-words text-sm font-black text-blue-900">
                          Retroalimentación recibida
                        </div>

                        <div className="mt-1 break-words text-xs font-normal text-slate-500">
                          {feedbackEnviado
                            ? "Orientaciones disponibles para seguir mejorando"
                            : "Todavía no tienes retroalimentación enviada"}
                        </div>
                      </div>
                    </div>
                  </UiAccordionTrigger>

                  <UiAccordionContent className="px-4 pb-4">
                    <UiSeparator className="mb-4" />

                    {feedbackEnviado ? (
                      <div className="grid gap-3">
                        <div className="!rounded-2xl bg-blue-50 p-3.5">
                          <strong className="text-sm text-slate-900">
                            Retroalimentación IA
                          </strong>

                          <p className="mt-1.5 break-words text-sm leading-6 text-slate-700">
                            {retroalimentacion ||
                              "La retroalimentación fue enviada por el docente."}
                          </p>
                        </div>

                        <div className="!rounded-2xl bg-slate-50 p-3.5">
                          <strong className="text-sm text-slate-900">
                            Observación del docente
                          </strong>

                          <p className="mt-1.5 break-words text-sm leading-6 text-slate-700">
                            {observacion ||
                              "El docente revisó tu actividad."}
                          </p>
                        </div>

                        <div className="!rounded-2xl bg-slate-50 p-3.5">
                          <strong className="text-sm text-slate-900">
                            Decisión docente
                          </strong>

                          <p className="mt-1.5 break-words text-sm leading-6 text-slate-700">
                            {decisionDocente ||
                              revisionBadgeText}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                          <div className="!rounded-2xl bg-slate-50 p-3.5">
                            <div className="text-xs font-bold text-slate-500">
                              Puntaje revisado
                            </div>

                            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                              {block.formativeScore ??
                                block.activityScore ??
                                0}%
                            </div>
                          </div>

                          <div className="!rounded-2xl bg-slate-50 p-3.5">
                            <div className="text-xs font-bold text-slate-500">
                              Nivel alcanzado
                            </div>

                            <div className="mt-1.5 break-words text-sm font-black text-blue-900">
                              {block.formativeLevel ||
                                "En Inicio"}
                            </div>
                          </div>
                        </div>

                        <div className="!rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                          <div className="text-xs font-bold text-emerald-700">
                            Retroalimentación enviada
                          </div>

                          <div className="mt-1 break-words text-sm text-emerald-800">
                            {block.formativeFeedbackSentAt ||
                              "Fecha registrada"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="!rounded-2xl bg-slate-50 p-4">
                        <p className="break-words text-sm leading-6 text-slate-600">
                          Aún no tienes retroalimentación enviada por el docente.
                          Cuando revise tu actividad, aparecerá en esta sección.
                        </p>
                      </div>
                    )}
                  </UiAccordionContent>
                </UiAccordionItem>
              </UiAccordion>
            </UiCard>

          <UiCard
              data-ui="activity-history-v9e"
              data-scroll="activity-history-autoscroll-v1"
              className="
                w-full min-w-0 overflow-hidden
                !rounded-2xl border-slate-200
                shadow-none
              "
            >
              <UiAccordion
                type="single"
                collapsible
                onValueChange={desplazarHistorialAlAbrir}
                className="w-full"
              >
                <UiAccordionItem
                  value="history"
                  className="border-0"
                >
                  <UiAccordionTrigger
                    className="
                      gap-3 px-4 py-4
                      text-left hover:no-underline
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex h-11 w-11 shrink-0
                          items-center justify-center
                          !rounded-2xl border
                          border-slate-200 bg-slate-50
                          text-xl
                        "
                      >
                        🕘
                      </div>

                      <div className="min-w-0">
                        <div className="break-words text-sm font-black text-slate-900">
                          Historial de intentos
                        </div>

                        <div className="mt-1 break-words text-xs font-normal text-slate-500">
                          {historial.length > 0
                            ? `${historial.length} intentos registrados`
                            : "Todavía no tienes intentos registrados"}
                        </div>
                      </div>
                    </div>
                  </UiAccordionTrigger>

                  <UiAccordionContent className="px-4 pb-4">
                    <UiSeparator className="mb-4" />

                    {historial.length > 0 ? (
                      <div className="grid gap-3">
                        {historial.map((item, index) => (
                          <div
                            key={item.id || index}
                            className="
                              min-w-0 !rounded-2xl
                              border border-slate-200
                              bg-slate-50 p-3.5
                            "
                          >
                            <div className="flex min-w-0 flex-wrap gap-2">
                              <UiBadge
                                variant="outline"
                                className="
                                  whitespace-normal !rounded-xl
                                  border-blue-200 bg-blue-50
                                  px-2.5 py-1.5 text-center
                                  text-xs text-blue-800
                                "
                              >
                                Intento {item.intento || index + 1}
                              </UiBadge>

                              <UiBadge
                                variant="outline"
                                className={
                                  item.estado === "Completado"
                                    ? "whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center text-xs text-emerald-700"
                                    : "whitespace-normal !rounded-xl border-slate-200 bg-white px-2.5 py-1.5 text-center text-xs text-slate-600"
                                }
                              >
                                {item.estado || "Registrado"}
                              </UiBadge>
                            </div>

                            {/* historial-revision-por-intento-frontend-v1 */}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="min-w-0 !rounded-xl bg-white p-3">
                                <div className="text-xs font-bold text-slate-500">
                                  {item.revision_id &&
                                  item.enviado_estudiante
                                    ? "Puntaje revisado"
                                    : "Puntaje"}
                                </div>

                                <div className="mt-1 break-words text-sm font-black text-blue-900">
                                  {item.revision_id &&
                                  item.enviado_estudiante
                                    ? item.puntaje_revision ??
                                      item.puntaje ??
                                      0
                                    : item.puntaje ?? 0}
                                  %
                                </div>
                              </div>

                              <div className="min-w-0 !rounded-xl bg-white p-3">
                                <div className="text-xs font-bold text-slate-500">
                                  {item.revision_id &&
                                  item.enviado_estudiante
                                    ? "Nivel revisado"
                                    : "Nivel"}
                                </div>

                                <div className="mt-1 break-words text-sm font-black text-blue-900">
                                  {item.revision_id &&
                                  item.enviado_estudiante
                                    ? item.nivel_revision ||
                                      item.nivel ||
                                      "En Inicio"
                                    : item.nivel || "En Inicio"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 break-words text-xs leading-5 text-slate-600">
                              <strong className="text-slate-700">
                                Fecha:
                              </strong>{" "}
                              {item.fecha || "Sin fecha"}
                            </div>

                            {item.revision_id && (
                              <div
                                className="
                                  mt-3 grid gap-3
                                  !rounded-2xl border
                                  border-violet-200 bg-violet-50
                                  p-3.5
                                "
                              >
                                <div className="flex min-w-0 flex-wrap gap-2">
                                  <UiBadge
                                    variant="outline"
                                    className="
                                      whitespace-normal !rounded-xl
                                      border-violet-200 bg-white
                                      px-2.5 py-1.5 text-center
                                      text-xs text-violet-800
                                    "
                                  >
                                    {item.estado_revision ||
                                      "Revisado por docente"}
                                  </UiBadge>

                                  <UiBadge
                                    variant="outline"
                                    className={
                                      item.enviado_estudiante
                                        ? "whitespace-normal !rounded-xl border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center text-xs text-emerald-700"
                                        : "whitespace-normal !rounded-xl border-amber-200 bg-amber-50 px-2.5 py-1.5 text-center text-xs text-amber-700"
                                    }
                                  >
                                    {item.enviado_estudiante
                                      ? "Enviado al estudiante"
                                      : "Pendiente de envío"}
                                  </UiBadge>
                                </div>

                                {item.enviado_estudiante ? (
                                  <>
                                    {item.decision_docente && (
                                      <div className="!rounded-xl bg-white p-3">
                                        <div className="text-xs font-bold text-violet-700">
                                          Decisión docente
                                        </div>

                                        <div className="mt-1 break-words text-sm font-black text-slate-900">
                                          {item.decision_docente}
                                        </div>
                                      </div>
                                    )}

                                    {item.observacion_docente && (
                                      <div className="!rounded-xl bg-white p-3">
                                        <div className="text-xs font-bold text-violet-700">
                                          Observación docente
                                        </div>

                                        <div className="mt-1 break-words text-sm leading-6 text-slate-700">
                                          {item.observacion_docente}
                                        </div>
                                      </div>
                                    )}

                                    {item.retroalimentacion_ia && (
                                      <div className="!rounded-xl bg-white p-3">
                                        <div className="text-xs font-bold text-violet-700">
                                          Retroalimentación recibida
                                        </div>

                                        <div className="mt-1 break-words text-sm leading-6 text-slate-700">
                                          {item.retroalimentacion_ia}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="!rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <div className="break-words text-sm leading-6 text-amber-800">
                                      La revisión fue registrada, pero todavía
                                      no ha sido enviada al estudiante.
                                    </div>
                                  </div>
                                )}

                                {item.revision_created_at && (
                                  <div className="break-words text-xs leading-5 text-violet-700">
                                    <strong>
                                      Fecha de revisión:
                                    </strong>{" "}
                                    {item.revision_created_at}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="!rounded-2xl bg-slate-50 p-4">
                        <p className="break-words text-sm leading-6 text-slate-600">
                          Todavía no tienes intentos registrados.
                          Cuando desarrolles una actividad, los resultados
                          aparecerán en esta sección.
                        </p>
                      </div>
                    )}
                  </UiAccordionContent>
                </UiAccordionItem>
              </UiAccordion>
            </UiCard>
        </div>
      </div>
    </div>
  );
}

export default function AulaVirtualEstudiante() {
  const [bloques, setBloques] = useState([]);
  const [archivoEvidenciaReal, setArchivoEvidenciaReal] = useState(null);
  const [subiendoEvidenciaReal, setSubiendoEvidenciaReal] = useState(false);
  const [mensajeEvidenciaReal, setMensajeEvidenciaReal] = useState("");
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listarBloquesAulaVirtual(1);
      const bloquesConRevisionesDocente = await enriquecerBloquesConRevisionesDocente(Array.isArray(data) ? data : []);
      setBloques(bloquesConRevisionesDocente);
    } catch (err) {
      console.error("Error cargando vista estudiante:", err);
      setError(err?.message || "No se pudo cargar el Aula Virtual del estudiante.");
      setBloques([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleBlockUpdated = (updatedBlock) => {
    if (!updatedBlock?.id) return;

    setBloques((prev) =>
      prev.map((item) => (item.id === updatedBlock.id ? updatedBlock : item))
    );

    setSelectedBlock(updatedBlock);
  };

  const resumen = useMemo(() => {
    // estadisticas-individuales-v1
    const recursos = bloques.filter(
      (block) => esRecursoAprendizajeEstudiante(block)
    );

    const actividades = bloques.filter(
      (block) => !esRecursoAprendizajeEstudiante(block)
    );

    const estadosIndividuales = actividades.map(
      (block) => getStudentBlockState(block)
    );

    const conFeedback = estadosIndividuales.filter(
      (estado) => estado.feedbackEnviado
    ).length;

    const completadas = estadosIndividuales.filter(
      (estado) => estado.actividadCompletada
    ).length;

    const revisadas = estadosIndividuales.filter(
      (estado) => estado.revisado
    ).length;

    return {
      total: bloques.length,
      recursos: recursos.length,
      actividades: actividades.length,
      conFeedback,
      completadas,
      revisadas,
    };
  }, [bloques]);

  const bloquesRecursosEstudiante = useMemo(
    () => bloques.filter((block) => esRecursoAprendizajeEstudiante(block)),
    [bloques]
  );

  const bloquesActividadesEstudiante = useMemo(
    () => bloques.filter((block) => !esRecursoAprendizajeEstudiante(block)),
    [bloques]
  );

  const bloquesConRetroalimentacionEstudiante = useMemo(
    () =>
      bloques.filter((block) => {
        if (esRecursoAprendizajeEstudiante(block)) {
          return false;
        }

        const estado =
          getStudentBlockState(block);

        return Boolean(
          estado.feedbackEnviado ||
            estado.revisado
        );
      }),
    [bloques]
  );

  const renderSeccionEstudiante = (titulo, subtitulo, lista, tipo = "actividad") => {
    if (!Array.isArray(lista) || lista.length === 0) return null;

    const esRecursos = tipo === "recurso";

    return (
      <section
        style={{
          background: "#ffffff",
          border: esRecursos ? "1px solid #a7f3d0" : "1px solid #ddd6fe",
          borderRadius: "22px",
          padding: "18px",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: esRecursos ? "#047857" : "#6d28d9",
                fontSize: "18px",
                fontWeight: 950,
              }}
            >
              {titulo}
            </h2>

            <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
              {subtitulo}
            </p>
          </div>

          <Badge type={esRecursos ? "green" : "default"}>
            {lista.length} {lista.length === 1 ? "elemento" : "elementos"}
          </Badge>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          {lista.map((block) => (
            <StudentBlockCard key={block.id} block={block} onOpen={setSelectedBlock} />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 36%, #ffffff 100%)",
        padding: "26px",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #dbeafe",
            borderRadius: "26px",
            padding: "24px",
            marginBottom: "18px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Badge type="blue">Vista estudiante</Badge>

          <h1 style={{ margin: "14px 0 8px", color: "#0f172a", fontSize: "30px", fontWeight: 950 }}>
            Mi Aula Virtual
          </h1>

          <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.6 }}>
            Aquí visualizas tus recursos de aprendizaje y actividades evaluables, con avance, revisión y retroalimentación del docente.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            <InfoCard label="Recursos" value={resumen.recursos} />
            <InfoCard label="Actividades evaluables" value={resumen.actividades} />
            <InfoCard label="Completadas" value={resumen.completadas} />
            <InfoCard label="Revisadas" value={resumen.revisadas} />
            <InfoCard label="Con retroalimentación" value={resumen.conFeedback} />
          </div>
        </section>

        {loading && (
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "18px", color: "#64748b" }}>
            Cargando actividades del estudiante...
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "18px",
              padding: "18px",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && bloques.length === 0 && (
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "18px", color: "#64748b" }}>
            Todavía no tienes actividades asignadas.
          </div>
        )}

        {renderSeccionEstudiante(
          "📚 Recursos de aprendizaje",
          "Materiales para revisar, leer o explorar antes de desarrollar las actividades evaluables.",
          bloquesRecursosEstudiante,
          "recurso"
        )}

        {renderSeccionEstudiante(
          "📝 Actividades evaluables",
          "Actividades que requieren participación, respuesta, evidencia, intento, revisión o retroalimentación.",
          bloquesActividadesEstudiante,
          "actividad"
        )}

        {bloquesConRetroalimentacionEstudiante.length > 0 &&
          renderSeccionEstudiante(
            "✅ Revisadas o con retroalimentación",
            "Actividades que ya tienen revisión docente o retroalimentación enviada.",
            bloquesConRetroalimentacionEstudiante,
            "actividad"
          )}
      </div>

      {selectedBlock && (
        <ActivityDetailModal
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onBlockUpdated={handleBlockUpdated}
        />
      )}
    </div>
  );
}
