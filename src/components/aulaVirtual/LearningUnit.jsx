import { useEffect, useState } from "react";
import Card from "../ui/LegacyCard";
import CompetencyBlock from "./blocks/CompetencyBlock";
import OutcomeBlock from "./blocks/OutcomeBlock";
import ExplorationBlock from "./blocks/ExplorationBlock";
import ResourceBlock from "./blocks/ResourceBlock";
import VideoBlock from "./blocks/VideoBlock";
import H5PBlock from "./blocks/H5PBlock";
import ActivityBlock from "./blocks/ActivityBlock";
import AIEvaluationBlock from "./blocks/AIEvaluationBlock";
import EditModeToolbar from "./EditModeToolbar";
import UniversalLearningBlock from "./UniversalLearningBlock";
import { normalizarBloqueEvaluable } from "./aulaVirtualUMLModel";
import {
  listarBloquesAulaVirtual,
  crearBloqueAulaVirtual,
  actualizarBloqueAulaVirtual,
  eliminarBloqueAulaVirtual,
} from "../../services/aulaVirtualBlocksService";
import SecuenciaDidacticaMovil from "./SecuenciaDidacticaMovil";

const UNIDAD_ID = 1;
const AULA_VIRTUAL_BLOCKS_STORAGE_KEY = "aula_virtual_unidad_1_bloques";

function cargarBloquesLocales() {
  try {
    const saved = localStorage.getItem(AULA_VIRTUAL_BLOCKS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error cargando bloques locales del Aula Virtual:", error);
    return [];
  }
}

function guardarBloquesLocales(blocks) {
  try {
    localStorage.setItem(AULA_VIRTUAL_BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
  } catch (error) {
    console.error("Error guardando bloques locales del Aula Virtual:", error);
  }
}

export default function LearningUnit({
  tareas = [],
  onVerDetalle,
  h5pActivities = {},
}) {
  const [editMode, setEditMode] = useState(false);
  const [customBlocks, setCustomBlocks] = useState(() => cargarBloquesLocales());
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Cargando bloques...");
  const [tipoFiltroDocente, setTipoFiltroDocente] = useState("todos");
  const [bloqueActivoDocente, setBloqueActivoDocente] = useState("");
  const [buscarActividadDocente, setBuscarActividadDocente] = useState("");
  const [vistaDidacticaDocente, setVistaDidacticaDocente] = useState("todos");


  useEffect(() => {
    let active = true;

    async function cargarDesdeBackend() {
      setIsLoadingBlocks(true);

      try {
        const bloques = await listarBloquesAulaVirtual(UNIDAD_ID);
        const normalizados = Array.isArray(bloques)
          ? bloques.map((bloque) => normalizarBloqueEvaluable(bloque))
          : [];

        if (!active) return;

        setCustomBlocks(normalizados);
        guardarBloquesLocales(normalizados);
        setSyncStatus("Sincronizado con servidor");
      } catch (error) {
        console.warn("No se pudo cargar desde backend. Usando modo local:", error);
        if (active) {
          setSyncStatus("Modo local: inicia sesión para sincronizar");
        }
      } finally {
        if (active) setIsLoadingBlocks(false);
      }
    }

    cargarDesdeBackend();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    guardarBloquesLocales(customBlocks);
  }, [customBlocks]);

  const getNextOrden = () => {
    if (!customBlocks.length) return 1;
    return Math.max(...customBlocks.map((b) => Number(b.orden || 0))) + 1;
  };

  const handleAddBlock = async (bloqueRecibido) => {
    const tempId =
      bloqueRecibido.id ||
      `${bloqueRecibido.tipo?.toLowerCase().replaceAll(" ", "-") || "bloque"}-${Date.now()}`;

    const bloqueNormalizado = normalizarBloqueEvaluable({
      ...bloqueRecibido,
      id: tempId,
      orden: getNextOrden(),
      titulo:
        bloqueRecibido.titulo ||
        `${bloqueRecibido.tipo || "Actividad"} agregado a la unidad`,
      visible: true,
      updatedAt: new Date().toLocaleString(),
    });

    setCustomBlocks((actuales) => [bloqueNormalizado, ...actuales]);
    setSyncStatus("Guardando bloque...");

    try {
      const creado = await crearBloqueAulaVirtual(UNIDAD_ID, bloqueNormalizado);
      const bloqueBackend = normalizarBloqueEvaluable({
        ...bloqueNormalizado,
        ...creado,
      });

      setCustomBlocks((actuales) =>
        actuales.map((bloque) =>
          bloque.id === tempId ? bloqueBackend : bloque
        )
      );

      setSyncStatus("Bloque guardado en servidor");
    } catch (error) {
      console.error("Error guardando bloque en backend:", error);
      setSyncStatus("Bloque guardado localmente, pendiente de sincronizar");
    }
  };

  const handleUpdateBlock = async (bloqueActualizado) => {
    const bloqueNormalizado = normalizarBloqueEvaluable({
      ...bloqueActualizado,
      updatedAt: new Date().toLocaleString(),
    });

    setCustomBlocks((actuales) =>
      actuales.map((bloque) =>
        bloque.id === bloqueNormalizado.id ? bloqueNormalizado : bloque
      )
    );

    setSyncStatus("Guardando cambios...");

    try {
      const actualizado = await actualizarBloqueAulaVirtual(bloqueNormalizado);
      const bloqueBackend = normalizarBloqueEvaluable({
        ...bloqueNormalizado,
        ...actualizado,
      });

      setCustomBlocks((actuales) =>
        actuales.map((bloque) =>
          bloque.id === bloqueNormalizado.id ? bloqueBackend : bloque
        )
      );

      setSyncStatus("Cambios guardados en servidor");
    } catch (error) {
      console.error("Error actualizando bloque en backend:", error);
      setSyncStatus("Cambios guardados localmente, pendiente de sincronizar");
    }
  };

  const handleRemoveBlock = async (id) => {
    const bloqueEliminado = customBlocks.find((bloque) => bloque.id === id);

    setCustomBlocks((actuales) => actuales.filter((bloque) => bloque.id !== id));
    setSyncStatus("Eliminando bloque...");

    try {
      await eliminarBloqueAulaVirtual(id);
      setSyncStatus("Bloque eliminado del servidor");
    } catch (error) {
      console.error("Error eliminando bloque en backend:", error);

      if (bloqueEliminado) {
        setCustomBlocks((actuales) => [bloqueEliminado, ...actuales]);
      }

      setSyncStatus("No se pudo eliminar en servidor");
    }
  };

  const normalizarTipoDocente = (tipo = "") =>
    String(tipo || "").trim().toLowerCase();

  const tipoVisualDocente = (tipo = "") => {
    const key = normalizarTipoDocente(tipo);

    const mapa = {
      h5p: { icono: "🧩", label: "H5P", color: "#2563eb", fondo: "#eff6ff", borde: "#bfdbfe" },
      cuestionario: { icono: "📝", label: "Cuestionario", color: "#6d28d9", fondo: "#f5f3ff", borde: "#ddd6fe" },
      pdf: { icono: "📄", label: "PDF", color: "#dc2626", fondo: "#fef2f2", borde: "#fecaca" },
      foro: { icono: "💬", label: "Foro", color: "#0e7490", fondo: "#ecfeff", borde: "#a5f3fc" },
      evidencia: { icono: "📤", label: "Evidencia", color: "#047857", fondo: "#ecfdf5", borde: "#a7f3d0" },
      scorm: { icono: "🎓", label: "SCORM", color: "#c2410c", fondo: "#fff7ed", borde: "#fed7aa" },
      video: { icono: "🎬", label: "Video", color: "#be123c", fondo: "#fff1f2", borde: "#fecdd3" },
      ia: { icono: "🤖", label: "IA", color: "#4338ca", fondo: "#eef2ff", borde: "#c7d2fe" },
    };

    return mapa[key] || {
      icono: "📌",
      label: tipo || "Actividad",
      color: "#334155",
      fondo: "#f8fafc",
      borde: "#e2e8f0",
    };
  };

  const tiposRecursosAprendizajeDocente = [
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

  const tiposActividadesEvaluablesDocente = [
    "h5p",
    "cuestionario",
    "foro",
    "evidencia",
    "scorm",
    "wiki",
    "debate",
    "simulacion",
    "simulación",
    "laboratorio virtual",
    "ia",
  ];

  const tiposRevisablesDocente = ["cuestionario", "foro", "evidencia"];

  const esRecursoAprendizajeDocente = (block) =>
    tiposRecursosAprendizajeDocente.includes(normalizarTipoDocente(block?.tipo));

  const esActividadEvaluableDocente = (block) => {
    const tipo = normalizarTipoDocente(block?.tipo);

    if (tiposRecursosAprendizajeDocente.includes(tipo)) return false;
    if (tiposActividadesEvaluablesDocente.includes(tipo)) return true;

    return true;
  };

  const esRevisableDocente = (block) =>
    tiposRevisablesDocente.includes(normalizarTipoDocente(block?.tipo));

  const tiposDisponiblesDocente = [
    "todos",
    ...Array.from(
      new Set(
        (customBlocks || [])
          .map((block) => normalizarTipoDocente(block?.tipo))
          .filter(Boolean)
      )
    ),
  ];

  const bloquesPorVistaDidacticaDocente = (customBlocks || []).filter((block) => {
    if (vistaDidacticaDocente === "recursos") return esRecursoAprendizajeDocente(block);
    if (vistaDidacticaDocente === "actividades") return esActividadEvaluableDocente(block);
    if (vistaDidacticaDocente === "revisables") return esRevisableDocente(block);

    return true;
  });

  const bloquesFiltradosDocente = bloquesPorVistaDidacticaDocente.filter((block) => {
    if (tipoFiltroDocente === "todos") return true;
    return normalizarTipoDocente(block?.tipo) === tipoFiltroDocente;
  });

  const textoBusquedaDocente = String(buscarActividadDocente || "").trim().toLowerCase();

  const bloquesVisiblesDocente = bloquesFiltradosDocente.filter((block) => {
    if (!textoBusquedaDocente) return true;

    return (
      String(block?.titulo || "").toLowerCase().includes(textoBusquedaDocente) ||
      String(block?.tipo || "").toLowerCase().includes(textoBusquedaDocente) ||
      String(block?.descripcion || "").toLowerCase().includes(textoBusquedaDocente)
    );
  });

  const bloqueActivoFinalDocente =
    bloquesVisiblesDocente.find((block) => String(block.id) === String(bloqueActivoDocente)) ||
    bloquesVisiblesDocente[0] ||
    null;

  const seleccionarBloqueDocente = (blockId) => {
    setBloqueActivoDocente(String(blockId || ""));

    setTimeout(() => {
      const elemento = document.getElementById("bloque-docente-activo");
      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  const renderNavegadorDocenteActividades = () => {
    if (!customBlocks || customBlocks.length === 0) return null;

    const totalRecursos = customBlocks.filter(esRecursoAprendizajeDocente).length;
    const totalActividades = customBlocks.filter(esActividadEvaluableDocente).length;
    const totalRevisables = customBlocks.filter(esRevisableDocente).length;

    const pestañas = [
      { id: "todos", label: "Todos", icono: "📚", cantidad: customBlocks.length, color: "#1d4ed8", fondo: "#eff6ff", borde: "#bfdbfe" },
      { id: "recursos", label: "Recursos", icono: "📖", cantidad: totalRecursos, color: "#047857", fondo: "#ecfdf5", borde: "#a7f3d0" },
      { id: "actividades", label: "Actividades evaluables", icono: "📝", cantidad: totalActividades, color: "#6d28d9", fondo: "#f5f3ff", borde: "#ddd6fe" },
      { id: "revisables", label: "Revisables", icono: "✅", cantidad: totalRevisables, color: "#c2410c", fondo: "#fff7ed", borde: "#fed7aa" },
    ];

    const resumenTipos = tiposDisponiblesDocente.map((tipo) => {
      if (tipo === "todos") {
        return {
          tipo,
          visual: { icono: "📚", label: "Todos", color: "#1d4ed8", fondo: "#eff6ff", borde: "#bfdbfe" },
          cantidad: bloquesPorVistaDidacticaDocente.length,
        };
      }

      const visual = tipoVisualDocente(tipo);
      const cantidad = bloquesPorVistaDidacticaDocente.filter((block) => normalizarTipoDocente(block?.tipo) === tipo).length;

      return { tipo, visual, cantidad };
    }).filter((item) => item.tipo === "todos" || item.cantidad > 0);

    return (
      <div
        style={{
          marginBottom: "18px",
          padding: "18px",
          border: "1px solid #bfdbfe",
          borderRadius: "22px",
          background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 65%, #eef2ff 100%)",
          boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
          position: "sticky",
          top: "8px",
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1fr) minmax(340px, 1.5fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ fontWeight: 950, color: "#1e3a8a", fontSize: "18px", letterSpacing: "-0.02em" }}>
              🧭 Secuencia didáctica docente
            </div>

            <div style={{ color: "#64748b", fontSize: "12px", marginTop: "5px", lineHeight: 1.45 }}>
              Organiza recursos para enseñar y actividades para evaluar. Solo se abre un elemento a la vez.
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
              {pestañas.map((pestaña) => {
                const activo = vistaDidacticaDocente === pestaña.id;

                return (
                  <button
                    type="button"
                    key={pestaña.id}
                    onClick={() => {
                      setVistaDidacticaDocente(pestaña.id);
                      setTipoFiltroDocente("todos");
                      setBloqueActivoDocente("");
                    }}
                    style={{
                      border: activo ? `2px solid ${pestaña.color}` : `1px solid ${pestaña.borde}`,
                      background: activo ? pestaña.fondo : "#ffffff",
                      color: pestaña.color,
                      borderRadius: "999px",
                      padding: "8px 11px",
                      fontSize: "11px",
                      fontWeight: 950,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {pestaña.icono} {pestaña.label} ({pestaña.cantidad})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 1fr) minmax(260px, 1.4fr)",
                gap: "10px",
              }}
            >
              <label style={{ display: "grid", gap: "5px", fontSize: "11px", color: "#475569", fontWeight: 950 }}>
                Buscar recurso o actividad
                <input
                  value={buscarActividadDocente}
                  onChange={(event) => setBuscarActividadDocente(event.target.value)}
                  placeholder="Ej.: PDF, video, foro, evidencia..."
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "14px",
                    padding: "11px 12px",
                    fontWeight: 800,
                    color: "#0f172a",
                    background: "#ffffff",
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "5px", fontSize: "11px", color: "#475569", fontWeight: 950 }}>
                Ir a un elemento
                <select
                  value={bloqueActivoFinalDocente?.id || ""}
                  onChange={(event) => seleccionarBloqueDocente(event.target.value)}
                  style={{
                    border: "1px solid #bfdbfe",
                    borderRadius: "14px",
                    padding: "11px 12px",
                    fontWeight: 850,
                    color: "#0f172a",
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  {bloquesVisiblesDocente.map((block) => {
                    const visual = tipoVisualDocente(block?.tipo);
                    const categoria = esRecursoAprendizajeDocente(block) ? "Recurso" : "Actividad";

                    return (
                      <option key={block.id} value={block.id}>
                        {visual.icono} {categoria} - {block.titulo || "Sin título"}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {resumenTipos.map(({ tipo, visual, cantidad }) => {
                const activo = tipoFiltroDocente === tipo;

                return (
                  <button
                    type="button"
                    key={tipo}
                    onClick={() => {
                      setTipoFiltroDocente(tipo);
                      setBloqueActivoDocente("");
                    }}
                    style={{
                      border: activo ? `2px solid ${visual.color}` : `1px solid ${visual.borde}`,
                      background: activo ? visual.fondo : "#ffffff",
                      color: visual.color,
                      borderRadius: "999px",
                      padding: "8px 11px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 950,
                      fontFamily: "inherit",
                    }}
                  >
                    {visual.icono} {visual.label} ({cantidad})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {bloqueActivoFinalDocente && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px",
              border: "1px solid #c7d2fe",
              borderRadius: "16px",
              background: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                {esRecursoAprendizajeDocente(bloqueActivoFinalDocente)
                  ? "Recurso de aprendizaje abierto"
                  : "Actividad evaluable abierta"}
              </div>

              <div style={{ color: "#0f172a", fontSize: "14px", fontWeight: 950, marginTop: "3px" }}>
                {tipoVisualDocente(bloqueActivoFinalDocente?.tipo).icono} {bloqueActivoFinalDocente.titulo || "Sin título"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => seleccionarBloqueDocente(bloqueActivoFinalDocente.id)}
              style={{
                border: "0",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 950,
                fontFamily: "inherit",
              }}
            >
              Abrir / gestionar
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "10px",
            maxHeight: "230px",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          {bloquesVisiblesDocente.map((block) => {
            const visual = tipoVisualDocente(block?.tipo);
            const activo = String(bloqueActivoFinalDocente?.id || "") === String(block.id || "");
            const esRecurso = esRecursoAprendizajeDocente(block);

            return (
              <button
                type="button"
                key={block.id}
                onClick={() => seleccionarBloqueDocente(block.id)}
                style={{
                  textAlign: "left",
                  border: activo ? `2px solid ${visual.color}` : `1px solid ${visual.borde}`,
                  background: activo ? visual.fondo : "#ffffff",
                  borderRadius: "16px",
                  padding: "12px",
                  cursor: "pointer",
                  boxShadow: activo ? "0 10px 20px rgba(37,99,235,0.12)" : "none",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 9px",
                      borderRadius: "999px",
                      background: visual.fondo,
                      color: visual.color,
                      fontSize: "11px",
                      fontWeight: 950,
                    }}
                  >
                    {visual.icono} {visual.label}
                  </span>

                  <span style={{ color: esRecurso ? "#047857" : "#6d28d9", fontSize: "11px", fontWeight: 950 }}>
                    {esRecurso ? "Recurso" : "Evaluable"}
                  </span>
                </div>

                <div style={{ marginTop: "9px", color: "#0f172a", fontSize: "13px", fontWeight: 950, lineHeight: 1.3 }}>
                  {block.titulo || "Sin título"}
                </div>

                <div style={{ marginTop: "6px", color: "#64748b", fontSize: "11px", lineHeight: 1.35 }}>
                  {esRecurso
                    ? `Material para el proceso didáctico`
                    : `Estado: ${block.activityStatus || block.estado || "Sin estado"} · Puntaje: ${block.activityScore ?? block.puntaje ?? 0}%`}
                </div>
              </button>
            );
          })}
        </div>

        {bloquesVisiblesDocente.length === 0 && (
          <div style={{ marginTop: "12px", color: "#64748b", fontSize: "13px", fontWeight: 800 }}>
            No hay recursos o actividades para este filtro.
          </div>
        )}
      </div>
    );
  };


  return (
    <>
      <Card style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "22px 24px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg,#eff6ff 0%,#f8fafc 70%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  color: "#2563eb",
                  letterSpacing: "1.6px",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                Unidad de aprendizaje 1
              </div>

              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "24px",
                  lineHeight: 1.15,
                  fontWeight: 900,
                }}
              >
                Fracciones en situaciones de la vida cotidiana
              </h2>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Secuencia constructivista basada en exploración, construcción,
                evidencia y retroalimentación.
              </p>

              <div
                style={{
                  marginTop: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  background: isLoadingBlocks ? "#fef3c7" : "#dbeafe",
                  color: isLoadingBlocks ? "#92400e" : "#1e40af",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {isLoadingBlocks ? "Cargando..." : syncStatus}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: "999px",
                  padding: "9px 14px",
                  background: "#dbeafe",
                  color: "#1e40af",
                  fontSize: "12px",
                  fontWeight: 900,
                }}
              >
                Modo docente
              </span>

              <button
                type="button"
                onClick={() => setEditMode((value) => !value)}
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#2563eb",
                  padding: "9px 14px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(15,23,42,.08)",
                }}
              >
                {editMode ? "Salir de edición" : "Editar unidad"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: "18px" }}>
          {editMode && <EditModeToolbar onAddBlock={handleAddBlock} />}

          <SecuenciaDidacticaMovil
            bloques={customBlocks}
            bloqueActivo={bloqueActivoFinalDocente}
            onSeleccionarBloque={seleccionarBloqueDocente}
          />

          <div className="hidden lg:block">
            {renderNavegadorDocenteActividades()}
          </div>

          {bloqueActivoFinalDocente && (
            <div
              id="bloque-docente-activo"
              className="w-full min-w-0 overflow-hidden"
              style={{
                display: "grid",
                gap: "14px",
                marginBottom: "14px",
                scrollMarginTop: "90px",
              }}
            >
              <UniversalLearningBlock
                key={bloqueActivoFinalDocente.id}
                block={bloqueActivoFinalDocente}
                editMode={editMode}
                onUpdateBlock={handleUpdateBlock}
                onRemoveBlock={handleRemoveBlock}
              />
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
