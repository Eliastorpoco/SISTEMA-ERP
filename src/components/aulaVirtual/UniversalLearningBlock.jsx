import { useEffect, useMemo, useState } from "react";
import {
  normalizarBloqueEvaluable,
  calcularNivelMINEDU,
  generarRetroalimentacionIA,
  obtenerDescripcionNivel,
} from "./aulaVirtualUMLModel";

import {
  subirArchivoDocenteBloque,
  listarEntregasBloqueAulaVirtual,
  listarEntregasDetalleBloqueAulaVirtual,
  construirUrlArchivoAulaVirtual,
  abrirArchivoAulaVirtual,
  registrarRevisionDocenteEntregaAulaVirtual,
  // dua-frontend-readonly-card-v1-import
  obtenerConfiguracionDUABloqueAulaVirtual,
  // dua-frontend-edit-v1-import
  guardarConfiguracionDUABloqueAulaVirtual,
} from "../../services/aulaVirtualBlocksService";

import DuaOptionsEditor from "./DuaOptionsEditor";
// dua-frontend-resources-v1-import
import DuaResourcesEditor from "./DuaResourcesEditor";
// dua-frontend-evidence-formats-v1-import
import DuaEvidenceFormatsEditor from "./DuaEvidenceFormatsEditor";

// dua-frontend-edit-v1-helpers
const crearFormularioDuaVacio = () => ({
  habilitado: false,
  estado: "BORRADOR",
  idioma: "es",
  proposito_accesible: "",
  criterios_exito: "",
  conocimientos_previos: "",
  glosario: "",
  apoyos_universales: "",
  barreras_previstas: "",
});

const listaDuaATexto = (valor) =>
  (Array.isArray(valor) ? valor : [])
    .map((item) =>
      typeof item === "string"
        ? item
        : JSON.stringify(item)
    )
    .join("\n");

const textoAListaDua = (valor) =>
  String(valor || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const crearFormularioDuaDesdeRespuesta = (
  respuesta
) => {
  const configuracion =
    respuesta?.dua?.configuracion &&
    typeof respuesta.dua.configuracion === "object"
      ? respuesta.dua.configuracion
      : null;

  if (!configuracion) {
    return crearFormularioDuaVacio();
  }

  return {
    habilitado: Boolean(
      configuracion.habilitado
    ),
    estado:
      configuracion.estado === "ARCHIVADO"
        ? "ARCHIVADO"
        : "BORRADOR",
    idioma: String(
      configuracion.idioma || "es"
    ),
    proposito_accesible: String(
      configuracion.proposito_accesible || ""
    ),
    criterios_exito: listaDuaATexto(
      configuracion.criterios_exito
    ),
    conocimientos_previos: listaDuaATexto(
      configuracion.conocimientos_previos
    ),
    glosario: listaDuaATexto(
      configuracion.glosario
    ),
    apoyos_universales: listaDuaATexto(
      configuracion.apoyos_universales
    ),
    barreras_previstas: listaDuaATexto(
      configuracion.barreras_previstas
    ),
  };
};

export default function UniversalLearningBlock({
  block,
  editMode = false,
  onUpdateBlock,
  onRemoveBlock,
}) {
  const inicial = useMemo(() => normalizarBloqueEvaluable(block), [block]);
  const [data, setData] = useState(inicial);
  const [showPedagogicalConfig, setShowPedagogicalConfig] = useState(false);
  const [archivoPdfDocente, setArchivoPdfDocente] = useState(null);
  const [subiendoPdfDocente, setSubiendoPdfDocente] = useState(false);
  const [mensajeArchivoReal, setMensajeArchivoReal] = useState("");
  const [entregasReales, setEntregasReales] = useState([]);
  const [cargandoEntregasReales, setCargandoEntregasReales] = useState(false);
  const [respuestasActividadDocente, setRespuestasActividadDocente] = useState([]);
  const [cargandoRespuestasActividadDocente, setCargandoRespuestasActividadDocente] = useState(false);
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null);
  const [revisionForm, setRevisionForm] = useState({
    puntaje: "",
    nivel_logro: "",
    estado_revision: "",
    decision_docente: "",
    observacion_docente: "",
    retroalimentacion_ia: "",
    enviado_estudiante: false,
  });
  const [guardandoRevisionEntrega, setGuardandoRevisionEntrega] = useState(false);
  const [mensajeRevisionEntrega, setMensajeRevisionEntrega] = useState("");

  // dua-frontend-readonly-card-v1-state
  const [duaConsulta, setDuaConsulta] = useState(null);
  const [cargandoDuaConsulta, setCargandoDuaConsulta] = useState(false);
  const [errorDuaConsulta, setErrorDuaConsulta] = useState("");

  // dua-frontend-edit-v1-state
  const [editandoDua, setEditandoDua] = useState(false);
  const [duaForm, setDuaForm] = useState(
    crearFormularioDuaVacio
  );
  const [guardandoDua, setGuardandoDua] = useState(false);
  const [mensajeDua, setMensajeDua] = useState("");
  const [errorGuardadoDua, setErrorGuardadoDua] = useState("");

  useEffect(() => {
    setData(normalizarBloqueEvaluable(block));
  }, [block]);

  // dua-frontend-readonly-card-v1-effect
  useEffect(() => {
    let activo = true;

    async function cargarDuaConsulta() {
      const bloqueId = String(data?.id || "").trim();

      if (!bloqueId) {
        setDuaConsulta(null);
        setCargandoDuaConsulta(false);
        setErrorDuaConsulta("");
        return;
      }

      try {
        setCargandoDuaConsulta(true);
        setErrorDuaConsulta("");

        const respuesta =
          await obtenerConfiguracionDUABloqueAulaVirtual(
            bloqueId
          );

        if (activo) {
          setDuaConsulta(
            respuesta &&
              typeof respuesta === "object"
              ? respuesta
              : null
          );
        }
      } catch (error) {
        if (activo) {
          setDuaConsulta(null);
          setErrorDuaConsulta(
            error?.message ||
              "No se pudo consultar la configuración DUA."
          );
        }
      } finally {
        if (activo) {
          setCargandoDuaConsulta(false);
        }
      }
    }

    cargarDuaConsulta();

    return () => {
      activo = false;
    };
  }, [data?.id]);


  // dua-frontend-edit-v1-sync
  useEffect(() => {
    if (editandoDua) return;

    setDuaForm(
      crearFormularioDuaDesdeRespuesta(
        duaConsulta
      )
    );
  }, [duaConsulta, editandoDua]);

  useEffect(() => {
    let activo = true;

    async function cargarEntregasReales() {
      if (!data?.id || String(data?.tipo || "").toLowerCase() !== "evidencia") return;

      try {
        setCargandoEntregasReales(true);
        let rows = [];

        try {
          rows = await listarEntregasDetalleBloqueAulaVirtual(data.id);
        } catch (detalleError) {
          console.warn("No se pudieron cargar entregas detalladas, usando endpoint base:", detalleError);
          rows = await listarEntregasBloqueAulaVirtual(data.id);
        }

        if (activo) {
          setEntregasReales(Array.isArray(rows) ? rows : []);
        }
      } catch (error) {
        console.warn("No se pudieron cargar entregas reales del bloque:", error);
      } finally {
        if (activo) {
          setCargandoEntregasReales(false);
        }
      }
    }

    cargarEntregasReales();

    return () => {
      activo = false;
    };
  }, [editMode, data?.id, data?.updatedAt]);

  useEffect(() => {
    let activo = true;

    async function cargarRespuestasActividadDocente() {
      const tipoBloque = String(data?.tipo || "").toLowerCase();

      if (!data?.id || !["foro", "cuestionario"].includes(tipoBloque)) {
        setRespuestasActividadDocente([]);
        return;
      }

      try {
        setCargandoRespuestasActividadDocente(true);

        const rows = await listarEntregasDetalleBloqueAulaVirtual(data.id);
        const lista = Array.isArray(rows) ? rows : [];

        const normalizadas = lista
          .map((entrega) => {
            const payload = entrega?.payload || {};
            const payloadInterno = payload?.payload || {};

            const respuestaForo =
              entrega?.respuesta_foro ||
              payload?.respuesta_foro ||
              payload?.respuestaForo ||
              payloadInterno?.respuesta_foro ||
              payloadInterno?.respuestaForo ||
              "";

            const respuestasCuestionario =
              entrega?.respuestas_cuestionario ||
              payload?.respuestas_cuestionario ||
              payload?.respuestasCuestionario ||
              payloadInterno?.respuestas_cuestionario ||
              payloadInterno?.respuestasCuestionario ||
              {};

            return {
              ...entrega,
              respuesta_foro: respuestaForo,
              respuestas_cuestionario: respuestasCuestionario,
            };
          })
          .filter((entrega) => {
            if (String(entrega?.estado || "").toLowerCase() === "en uso") return false;

            if (tipoBloque === "foro") {
              return String(entrega?.respuesta_foro || "").trim().length > 0;
            }

            if (tipoBloque === "cuestionario") {
              const respuestas = entrega?.respuestas_cuestionario || {};
              return (
                respuestas &&
                typeof respuestas === "object" &&
                Object.keys(respuestas).length > 0
              );
            }

            return false;
          });

        if (activo) {
          setRespuestasActividadDocente(normalizadas);
        }
      } catch (error) {
        console.warn("No se pudieron cargar respuestas de la actividad:", error);
        if (activo) {
          setRespuestasActividadDocente([]);
        }
      } finally {
        if (activo) {
          setCargandoRespuestasActividadDocente(false);
        }
      }
    }

    cargarRespuestasActividadDocente();

    return () => {
      activo = false;
    };
  }, [data?.id, data?.tipo, data?.updatedAt]);

  const resolverNombreEstudianteEntrega = (entrega) => {
    const payload = entrega?.payload || {};
    const payloadInterno = payload?.payload || {};

    let nombre =
      entrega?.estudiante_nombre ||
      entrega?.nombre_estudiante ||
      payload?.estudiante_nombre ||
      payload?.nombre_estudiante ||
      payloadInterno?.estudiante_nombre ||
      payloadInterno?.nombre_estudiante ||
      "";

    const usuario =
      entrega?.estudiante_usuario ||
      entrega?.estudiante_username ||
      entrega?.username ||
      payload?.estudiante_usuario ||
      payload?.estudiante_username ||
      payload?.estudiante ||
      payload?.username ||
      payloadInterno?.estudiante_usuario ||
      payloadInterno?.estudiante_username ||
      payloadInterno?.estudiante ||
      payloadInterno?.username ||
      "";

    // Evitar mostrar el texto genérico cuando sí tenemos usuario.
    if (
      String(nombre || "").toLowerCase().includes("sin identificar") &&
      String(usuario || "").trim()
    ) {
      nombre = "";
    }

    if (String(usuario || "").trim() === "estudiante") {
      return "Estudiante Demo / estudiante";
    }

    if (nombre && usuario) return `${nombre} / ${usuario}`;
    if (nombre) return nombre;
    if (usuario) return usuario;

    return "Estudiante sin identificar";
  };



  const obtenerFilasDashboardDocente = () => {
    const tipoBloque = String(data?.tipo || "").toLowerCase();

    if (tipoBloque === "evidencia") {
      return (Array.isArray(entregasReales) ? entregasReales : []).filter(
        (entrega) => entrega?.archivo_url || entrega?.archivo_id || entrega?.archivo_nombre
      );
    }

    if (["foro", "cuestionario"].includes(tipoBloque)) {
      return Array.isArray(respuestasActividadDocente) ? respuestasActividadDocente : [];
    }

    return [];
  };

  const calcularDashboardDocente = () => {
    const filas = obtenerFilasDashboardDocente();
    const total = filas.length;

    const texto = (valor) => String(valor || "").toLowerCase();

    const revisadas = filas.filter((entrega) => {
      const estado = texto(
        entrega?.estado_revision ||
        entrega?.estadoRevision ||
        entrega?.estado ||
        entrega?.payload?.estadoRevision
      );

      const decision = texto(
        entrega?.decision_docente ||
        entrega?.decisionDocente ||
        entrega?.payload?.decisionDocente
      );

      return estado.includes("revis") || decision.includes("aprob") || decision.includes("observ");
    }).length;

    const aprobadas = filas.filter((entrega) => {
      const decision = texto(
        entrega?.decision_docente ||
        entrega?.decisionDocente ||
        entrega?.payload?.decisionDocente
      );

      return decision.includes("aprob");
    }).length;

    const observadas = filas.filter((entrega) => {
      const decision = texto(
        entrega?.decision_docente ||
        entrega?.decisionDocente ||
        entrega?.payload?.decisionDocente
      );

      return decision.includes("observ") || decision.includes("resubida") || decision.includes("reintentar");
    }).length;

    const puntajes = filas
      .map((entrega) =>
        Number(
          entrega?.puntaje ??
          entrega?.formativeScore ??
          entrega?.activityScore ??
          entrega?.payload?.puntaje ??
          0
        )
      )
      .filter((valor) => !Number.isNaN(valor) && valor > 0);

    const promedio = puntajes.length
      ? Math.round((puntajes.reduce((acc, valor) => acc + valor, 0) / puntajes.length) * 10) / 10
      : 0;

    return {
      total,
      revisadas,
      pendientes: Math.max(total - revisadas, 0),
      aprobadas,
      observadas,
      promedio,
    };
  };

  const renderDashboardActividadDocente = () => {
    const tipoBloque = String(data?.tipo || "").toLowerCase();

    if (!["foro", "cuestionario", "evidencia"].includes(tipoBloque)) {
      return null;
    }

    const metricas = calcularDashboardDocente();

    const cards = [
      { label: "Total", value: metricas.total, icon: "📦" },
      { label: "Revisadas", value: metricas.revisadas, icon: "✅" },
      { label: "Pendientes", value: metricas.pendientes, icon: "⏳" },
      { label: "Aprobadas", value: metricas.aprobadas, icon: "🟢" },
      { label: "Observadas", value: metricas.observadas, icon: "🟠" },
      { label: "Promedio", value: metricas.promedio ? metricas.promedio : "—", icon: "📊" },
    ];

    return (
      <div
        style={{
          marginTop: "12px",
          marginBottom: "12px",
          padding: "12px",
          border: "1px solid #dbeafe",
          borderRadius: "16px",
          background: "#ffffff",
        }}
      >
        <div style={{ fontWeight: 950, color: "#1e3a8a", marginBottom: "10px" }}>
          📌 Dashboard docente de la actividad
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "10px",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                background: "#f8fafc",
                padding: "10px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>
                {card.icon} {card.label}
              </div>
              <div style={{ fontSize: "22px", color: "#0f172a", fontWeight: 950, marginTop: "4px" }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const renderPanelRespuestasActividadDocente = () => {
    const tipoBloque = String(data?.tipo || "").toLowerCase();

    if (!["foro", "cuestionario"].includes(tipoBloque)) {
      return null;
    }

    return (
      <div
        style={{
          marginTop: "12px",
          background: "#ffffff",
          border: tipoBloque === "foro" ? "1px solid #a5f3fc" : "1px solid #ddd6fe",
          borderRadius: "16px",
          padding: "14px",
        }}
      >
        <div
          style={{
            fontWeight: 900,
            color: tipoBloque === "foro" ? "#0e7490" : "#6d28d9",
            marginBottom: "10px",
          }}
        >
          {tipoBloque === "foro"
            ? "💬 Participaciones del foro"
            : "📝 Respuestas del cuestionario"}
        </div>

        {cargandoRespuestasActividadDocente ? (
          <div style={{ color: "#64748b", fontSize: "13px" }}>
            Cargando respuestas de estudiantes...
          </div>
        ) : respuestasActividadDocente.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: "13px" }}>
            {tipoBloque === "foro"
              ? "Todavía no hay participaciones guardadas para este foro."
              : "Todavía no hay respuestas guardadas para este cuestionario."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {respuestasActividadDocente.map((entrega) => {
              const respuestas = entrega?.respuestas_cuestionario || {};
              const paresRespuestas =
                respuestas && typeof respuestas === "object"
                  ? Object.entries(respuestas)
                  : [];

              return (
                <div
                  key={entrega.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "12px",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>
                    Estudiante: {resolverNombreEstudianteEntrega(entrega)}
                  </div>

                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Estado: {entrega.estado_revision || entrega.estado || "Sin estado"} · Intento {entrega.numero_intento} · Puntaje {entrega.puntaje ?? "Sin puntaje"}
                  </div>

                  {tipoBloque === "foro" && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 12px",
                        background: "#ecfeff",
                        border: "1px solid #a5f3fc",
                        borderRadius: "12px",
                        color: "#155e75",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: "4px" }}>
                        Participación del estudiante:
                      </div>
                      <div>{entrega.respuesta_foro}</div>
                    </div>
                  )}

                  {tipoBloque === "cuestionario" && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 12px",
                        background: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                        borderRadius: "12px",
                        color: "#4c1d95",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: "6px" }}>
                        Respuestas del cuestionario:
                      </div>

                      <div style={{ display: "grid", gap: "6px" }}>
                        {paresRespuestas.map(([clave, valor], index) => (
                          <div key={clave}>
                            <strong>Pregunta {index + 1}:</strong> {String(valor || "")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                    Entregado: {(() => {
                      const fecha = entrega.fecha_entrega || entrega.entregado_at || entrega.created_at;
                      return fecha ? new Date(fecha).toLocaleString("es-PE") : "Sin fecha";
                    })()}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => seleccionarEntregaParaRevision(entrega)}
                      style={{
                        display: "inline-flex",
                        color: "#047857",
                        fontWeight: 900,
                        textDecoration: "none",
                        background: "transparent",
                        border: "0",
                        padding: 0,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Revisar respuesta
                    </button>
                  </div>

                  {String(entregaSeleccionada?.id || "") === String(entrega.id || "") && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        border: "1px solid #a7f3d0",
                        borderRadius: "14px",
                        background: "#ecfdf5",
                      }}
                    >
                      <div style={{ fontWeight: 900, color: "#065f46", marginBottom: "10px" }}>
                        ✅ Revisión docente individual
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                        <label style={{ display: "grid", gap: "6px", color: "#065f46", fontWeight: 800 }}>
                          Puntaje
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={revisionForm.puntaje}
                            onChange={(event) => actualizarRevisionForm("puntaje", event.target.value)}
                            style={{
                              border: "1px solid #bbf7d0",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              fontFamily: "inherit",
                            }}
                          />
                        </label>

                        <label style={{ display: "grid", gap: "6px", color: "#065f46", fontWeight: 800 }}>
                          Nivel de logro
                          <select
                            value={revisionForm.nivel_logro}
                            disabled
                            style={{
                              border: "1px solid #bbf7d0",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              fontFamily: "inherit",
                            }}
                          >
                            <option value="">Pendiente de puntaje</option>
                            <option>En Inicio</option>
                            <option>En Proceso</option>
                            <option>Logro Esperado</option>
                            <option>Logro Destacado</option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: "6px", color: "#065f46", fontWeight: 800 }}>
                          Decisión docente
                          <select
                            value={revisionForm.decision_docente}
                            onChange={(event) => actualizarRevisionForm("decision_docente", event.target.value)}
                            style={{
                              border: "1px solid #bbf7d0",
                              borderRadius: "10px",
                              padding: "9px 10px",
                              fontFamily: "inherit",
                            }}
                          >
                            <option value="">Selecciona decisión</option>
                            <option>Aprobado</option>
                            <option>Observado</option>
                            <option>Pedir resubida</option>
                            <option>Reintentar IA</option>
                          </select>
                        </label>
                      </div>

                      <label style={{ display: "grid", gap: "6px", color: "#065f46", fontWeight: 800, marginTop: "10px" }}>
                        Observación docente
                        <textarea
                          rows={3}
                          value={revisionForm.observacion_docente}
                          onChange={(event) => actualizarRevisionForm("observacion_docente", event.target.value)}
                          placeholder="Escribe la validación o corrección humana del docente..."
                          style={{
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "10px",
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: "6px", color: "#065f46", fontWeight: 800, marginTop: "10px" }}>
                        Retroalimentación para el estudiante
                        <textarea
                          rows={3}
                          value={revisionForm.retroalimentacion_ia}
                          onChange={(event) => actualizarRevisionForm("retroalimentacion_ia", event.target.value)}
                          placeholder="Escribe la retroalimentación que verá el estudiante..."
                          style={{
                            border: "1px solid #bbf7d0",
                            borderRadius: "10px",
                            padding: "10px",
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      </label>

                      <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", color: "#065f46", fontWeight: 800 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(revisionForm.enviado_estudiante)}
                          onChange={(event) => actualizarRevisionForm("enviado_estudiante", event.target.checked)}
                        />
                        Enviar revisión al estudiante
                      </label>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                        <button
                          type="button"
                          onClick={guardarRevisionEntrega}
                          disabled={guardandoRevisionEntrega}
                          style={{
                            border: "0",
                            borderRadius: "999px",
                            padding: "10px 16px",
                            background: guardandoRevisionEntrega ? "#94a3b8" : "#16a34a",
                            color: "#ffffff",
                            fontWeight: 900,
                            cursor: guardandoRevisionEntrega ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {guardandoRevisionEntrega ? "Guardando..." : "Guardar revisión"}
                        </button>
                      </div>

                      {mensajeRevisionEntrega && (
                        <div style={{ marginTop: "10px", color: "#166534", fontSize: "12px", fontWeight: 800 }}>
                          {mensajeRevisionEntrega}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const seleccionarEntregaParaRevision = (entrega) => {
    setEntregaSeleccionada(entrega);
    setMensajeRevisionEntrega("");

    const tieneRevisionPersistida = Boolean(entrega?.revision_id);
    const tienePuntajePersistido = Boolean(
      tieneRevisionPersistida &&
      entrega?.puntaje !== null &&
      entrega?.puntaje !== undefined &&
      String(entrega.puntaje).trim() !== ""
    );

    const puntaje = tienePuntajePersistido
      ? String(entrega.puntaje)
      : "";

    const nivel = tienePuntajePersistido
      ? (
          entrega?.nivel_logro ||
          calcularNivelMINEDU(Number(entrega.puntaje))
        )
      : "";

    setRevisionForm({
      puntaje,
      nivel_logro: nivel,
      estado_revision: tieneRevisionPersistida
        ? entrega?.estado_revision || "Revisado por docente"
        : "",
      decision_docente: tieneRevisionPersistida
        ? entrega?.decision_docente || ""
        : "",
      observacion_docente: tieneRevisionPersistida
        ? (
            entrega?.observacion_docente ||
            entrega?.payload?.observacionDocente ||
            ""
          )
        : "",
      retroalimentacion_ia: tieneRevisionPersistida
        ? (
            entrega?.retroalimentacion_ia ||
            entrega?.payload?.retroalimentacion ||
            ""
          )
        : "",
      enviado_estudiante: tieneRevisionPersistida
        ? Boolean(entrega?.enviado_estudiante)
        : false,
    });
  };

  const actualizarRevisionForm = (campo, valor) => {
    setRevisionForm((prev) => {
      const next = {
        ...prev,
        [campo]: valor,
      };

      if (campo === "puntaje") {
        const texto = String(valor ?? "");
        next.puntaje = texto;

        if (!texto.trim()) {
          next.nivel_logro = "";
        } else {
          const puntaje = Number(texto);
          next.nivel_logro =
            Number.isFinite(puntaje) &&
            puntaje >= 0 &&
            puntaje <= 100
              ? calcularNivelMINEDU(puntaje)
              : "";
        }
      }

      return next;
    });
  };

  const guardarRevisionEntrega = async () => {
    if (!entregaSeleccionada?.id) {
      setMensajeRevisionEntrega("Selecciona una entrega para revisar.");
      return;
    }

    if (data?.rubrica_id || data?.rubrica?.id) {
      setMensajeRevisionEntrega(
        "Esta actividad utiliza una rúbrica. Completa la evaluación por criterios antes de guardar."
      );
      return;
    }

    const puntajeTexto = String(revisionForm.puntaje ?? "").trim();

    if (!puntajeTexto) {
      setMensajeRevisionEntrega("Ingresa un puntaje antes de guardar la revisión.");
      return;
    }

    const puntajeRevision = Number(puntajeTexto);

    if (
      !Number.isFinite(puntajeRevision) ||
      puntajeRevision < 0 ||
      puntajeRevision > 100
    ) {
      setMensajeRevisionEntrega("El puntaje debe estar entre 0 y 100.");
      return;
    }

    const decisionRevision = String(
      revisionForm.decision_docente || ""
    ).trim();

    if (!decisionRevision) {
      setMensajeRevisionEntrega("Selecciona una decisión docente.");
      return;
    }

    const nivelRevision = calcularNivelMINEDU(puntajeRevision);

    try {
      setGuardandoRevisionEntrega(true);
      setMensajeRevisionEntrega("Guardando revisión docente...");

      const payload = {
        puntaje: puntajeRevision,
        nivel_logro: nivelRevision,
        estado_revision: "Revisado por docente",
        decision_docente: decisionRevision,
        observacion_docente: String(
          revisionForm.observacion_docente || ""
        ).trim(),
        retroalimentacion_ia: String(
          revisionForm.retroalimentacion_ia || ""
        ).trim(),
        enviado_estudiante: Boolean(revisionForm.enviado_estudiante),
      };

      const respuesta = await registrarRevisionDocenteEntregaAulaVirtual(
        entregaSeleccionada.id,
        payload
      );

      setEntregasReales((prev) =>
        prev.map((item) =>
          String(item.id) === String(entregaSeleccionada.id)
            ? {
                ...item,
                ...payload,
                revision_id: respuesta?.revision_id || item.revision_id,
                estado_revision: respuesta?.estado_revision || payload.estado_revision,
                puntaje: respuesta?.puntaje ?? payload.puntaje,
                nivel_logro: respuesta?.nivel_logro || payload.nivel_logro,
                decision_docente: respuesta?.decision_docente || payload.decision_docente,
                observacion_docente:
                  respuesta?.observacion_docente || payload.observacion_docente,
                retroalimentacion_ia:
                  respuesta?.retroalimentacion_ia || payload.retroalimentacion_ia,
                enviado_estudiante:
                  respuesta?.enviado_estudiante ?? payload.enviado_estudiante,
              }
            : item
        )
      );

      setEntregaSeleccionada((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
              revision_id: respuesta?.revision_id || prev.revision_id,
              estado_revision: respuesta?.estado_revision || payload.estado_revision,
              puntaje: respuesta?.puntaje ?? payload.puntaje,
              nivel_logro: respuesta?.nivel_logro || payload.nivel_logro,
              decision_docente: respuesta?.decision_docente || payload.decision_docente,
              observacion_docente:
                respuesta?.observacion_docente || payload.observacion_docente,
              retroalimentacion_ia:
                respuesta?.retroalimentacion_ia || payload.retroalimentacion_ia,
              enviado_estudiante:
                respuesta?.enviado_estudiante ?? payload.enviado_estudiante,
            }
          : prev
      );

      setMensajeRevisionEntrega("✅ Revisión docente guardada para esta entrega.");
    } catch (error) {
      console.error(error);
      setMensajeRevisionEntrega(
        error?.message || "No se pudo guardar la revisión docente."
      );
    } finally {
      setGuardandoRevisionEntrega(false);
    }
  };

  const update = (patch) => {
    const actualizado = normalizarBloqueEvaluable({
      ...data,
      ...patch,
      updatedAt: new Date().toLocaleString(),
    });

    setData(actualizado);

    if (typeof onUpdateBlock === "function") {
      onUpdateBlock(actualizado);
    }

    return actualizado;
  };

  const nivelActual = calcularNivelMINEDU(data.formativeScore || data.activityScore || 0);

  const obtenerUltimoIntentoCompletado = () => {
    const historial = data.activityAttemptHistory || [];

    return [...historial]
      .filter((item) => String(item?.estado || "").toLowerCase() === "completado")
      .sort((a, b) => Number(b?.intento || 0) - Number(a?.intento || 0))[0];
  };

  const estadoDesdeUltimoIntento = (patch = {}) => {
    const ultimo = obtenerUltimoIntentoCompletado();

    if (!ultimo) return patch;

    const puntaje = Number(ultimo.puntaje || data.activityScore || data.formativeScore || 0);
    const avance = Number(ultimo.avance || data.activityProgress || 0);

    return {
      activityStatus: "Completado",
      activityProgress: avance,
      activityScore: puntaje,
      activityCompleted: true,
      activityCompletedAt: ultimo.fecha || data.activityCompletedAt || new Date().toLocaleString(),
      formativeScore: puntaje,
      formativeLevel: ultimo.nivel || calcularNivelMINEDU(puntaje),
      ...patch,
    };
  };



  const tipoBloqueReal = String(data?.tipo || "").toLowerCase();
  const esBloquePdfReal = tipoBloqueReal === "pdf";
  const archivoPdfRealUrl = construirUrlArchivoAulaVirtual(
    data?.activityPdfUrl || data?.activityFileUrl || ""
  );

  const subirPdfRealDocente = async () => {
    if (!data?.id) {
      setMensajeArchivoReal("No se puede subir PDF: el bloque aún no tiene ID.");
      return;
    }

    if (!archivoPdfDocente) {
      setMensajeArchivoReal("Selecciona un archivo primero.");
      return;
    }

    try {
      setSubiendoPdfDocente(true);
      setMensajeArchivoReal("Subiendo archivo del recurso...");

      const respuesta = await subirArchivoDocenteBloque(data.id, archivoPdfDocente, {
        titulo: data.titulo,
        descripcion: data.descripcion,
      });

      const bloqueActualizado = respuesta?.bloque || {};

      update({
        ...bloqueActualizado,
        categoriaDidactica: "recurso",
        esRecursoAprendizaje: true,
        esActividadEvaluable: false,
        generaIntento: false,
        requiereRevisionDocente: false,
        activityConfigured: true,
        configurado: true,
        activityStatus: "Disponible",
        activityProgress: 0,
        activityScore: 0,
        formativeScore: 0,
        formativeLevel: "No evaluable",
        nivelLogro: "No evaluable",
        puntajeMinimo: 0,
        intentosPermitidos: 0,
      });

      setArchivoPdfDocente(null);
      setMensajeArchivoReal("Archivo del recurso subido correctamente.");
    } catch (error) {
      console.error("Error subiendo PDF real:", error);
      setMensajeArchivoReal(error?.message || "No se pudo subir el PDF.");
    } finally {
      setSubiendoPdfDocente(false);
    }
  };

  const guardarConfiguracionPedagogica = () => {
    update({
      configurado: true,
      activityConfigured: true,
      activityStatus: "Disponible",
      updatedAt: new Date().toLocaleString(),
    });

    setShowPedagogicalConfig(false);
  };

  const configurarActividad = () => {
    update({
      configurado: true,
      activityConfigured: true,
      activityStatus: "Disponible",
      activityUploadedAt: new Date().toLocaleString(),
      formativeEvidence:
        data.formativeEvidence ||
        `Actividad ${data.tipo} configurada para seguimiento formativo.`,
    });
  };

  const completarActividad = () => {
    const score = data.activityScore && data.activityScore > 0 ? data.activityScore : 80;
    const nivel = calcularNivelMINEDU(score);
    const feedback = generarRetroalimentacionIA({
      tipo: data.tipo,
      puntaje: score,
      avance: 100,
      intento: (data.activityAttemptHistory?.length || 0) + 1,
      puntajeMinimo: 71,
    });

    update({
      activityStatus: "Completado",
      activityProgress: 100,
      activityScore: score,
      activityCompleted: true,
      activityCompletedAt: new Date().toLocaleString(),
      formativeScore: score,
      formativeLevel: nivel,
      formativeAiOriginalFeedback: feedback,
      formativeAiFeedback: feedback,
      formativeAiGeneratedAt: new Date().toLocaleString(),
    });
  };

  const nuevoIntento = () => {
    const historial = data.activityAttemptHistory || [];
    const intentosUsados = historial.length;
    const limiteActual = Number(data.intentosPermitidos || 3);

    // El docente habilita una oportunidad adicional.
    // No se agrega intento al historial; el intento se registrará cuando el estudiante lo finalice.
    const nuevoLimite = Math.max(limiteActual + 1, intentosUsados + 1);

    update({
      intentosPermitidos: nuevoLimite,
      activityStatus: "Disponible",
      activityProgress: 0,
      activityScore: 0,
      activityCompleted: false,
      activityCompletedAt: "",
      formativeScore: 0,
      formativeLevel: "En Inicio",

      teacherDecision: "permitir_nuevo_intento",
      teacherDecisionLabel: "Permitir nuevo intento",
      teacherDecisionNote:
        `Se habilitó un nuevo intento para el estudiante. Intentos permitidos: ${nuevoLimite}.`,
      teacherDecisionAt: new Date().toLocaleString(),

      // Se conserva la retroalimentación anterior como orientación para el estudiante.
      formativeFeedbackViewed: false,
      formativeFeedbackViewedAt: "",
    });
  };

  const regenerarIA = () => {
    const ultimo = obtenerUltimoIntentoCompletado();
    const puntaje = Number(ultimo?.puntaje || data.formativeScore || data.activityScore || 0);
    const avance = Number(ultimo?.avance || data.activityProgress || 0);

    const feedback = generarRetroalimentacionIA({
      tipo: data.tipo,
      puntaje,
      avance,
      intento: (data.activityAttemptHistory?.length || 0) + 1,
      puntajeMinimo: 71,
    });

    update(
      estadoDesdeUltimoIntento({
        formativeAiOriginalFeedback: feedback,
        formativeAiFeedback: feedback,
        formativeAiGeneratedAt: new Date().toLocaleString(),
      })
    );
  };

  const guardarCorreccionDocente = () => {
    update(
      estadoDesdeUltimoIntento({
        formativeHumanReviewed: true,
        formativeHumanReviewedAt: new Date().toLocaleString(),
        teacherDecision: data.teacherDecision || "aprobar",
        teacherDecisionLabel: data.teacherDecisionLabel || "Aprobar actividad",
        teacherDecisionAt: new Date().toLocaleString(),
      })
    );
  };

  const enviarRetroalimentacion = () => {
    update(
      estadoDesdeUltimoIntento({
        formativeFeedbackSent: true,
        formativeFeedbackSentAt: new Date().toLocaleString(),
      })
    );
  };

  // dua-frontend-edit-v1-handlers
  const actualizarCampoDua = (
    campo,
    valor
  ) => {
    setDuaForm((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const abrirEdicionDua = () => {
    setDuaForm(
      crearFormularioDuaDesdeRespuesta(
        duaConsulta
      )
    );
    setMensajeDua("");
    setErrorGuardadoDua("");
    setEditandoDua(true);
  };

  const cancelarEdicionDua = () => {
    setDuaForm(
      crearFormularioDuaDesdeRespuesta(
        duaConsulta
      )
    );
    setMensajeDua("");
    setErrorGuardadoDua("");
    setEditandoDua(false);
  };

  const guardarBorradorDua = async () => {
    const bloqueId = String(
      data?.id || ""
    ).trim();

    if (!bloqueId) {
      setErrorGuardadoDua(
        "No se encontró el ID del bloque."
      );
      return;
    }

    const metadatosActuales =
      duaConsulta?.dua?.configuracion?.metadatos &&
      typeof duaConsulta.dua.configuracion.metadatos ===
        "object" &&
      !Array.isArray(
        duaConsulta.dua.configuracion.metadatos
      )
        ? duaConsulta.dua.configuracion.metadatos
        : {};

    const payload = {
      habilitado: Boolean(
        duaForm.habilitado
      ),
      estado:
        duaForm.estado === "ARCHIVADO"
          ? "ARCHIVADO"
          : "BORRADOR",
      idioma:
        String(duaForm.idioma || "").trim() ||
        "es",
      proposito_accesible: String(
        duaForm.proposito_accesible || ""
      ).trim(),
      criterios_exito: textoAListaDua(
        duaForm.criterios_exito
      ),
      conocimientos_previos: textoAListaDua(
        duaForm.conocimientos_previos
      ),
      glosario: textoAListaDua(
        duaForm.glosario
      ),
      apoyos_universales: textoAListaDua(
        duaForm.apoyos_universales
      ),
      barreras_previstas: textoAListaDua(
        duaForm.barreras_previstas
      ),
      metadatos: {
        ...metadatosActuales,
        origen_frontend:
          "dua-docente-config-base-v1",
      },
    };

    try {
      setGuardandoDua(true);
      setMensajeDua("");
      setErrorGuardadoDua("");

      const respuesta =
        await guardarConfiguracionDUABloqueAulaVirtual(
          bloqueId,
          payload
        );

      setDuaConsulta(
        respuesta &&
          typeof respuesta === "object"
          ? respuesta
          : null
      );

      setMensajeDua(
        respuesta?.mensaje ||
          "Configuración DUA guardada correctamente."
      );

      setEditandoDua(false);
    } catch (error) {
      setErrorGuardadoDua(
        error?.message ||
          "No fue posible guardar la configuración DUA."
      );
    } finally {
      setGuardandoDua(false);
    }
  };

  // dua-frontend-readonly-card-v1-render
  const renderTarjetaDuaConsulta = () => {
    // dua-frontend-edit-v1-render
    const dua =
      duaConsulta?.dua &&
      typeof duaConsulta.dua === "object"
        ? duaConsulta.dua
        : {};

    const configuracion =
      dua?.configuracion &&
      typeof dua.configuracion === "object"
        ? dua.configuracion
        : null;

    const existeConfiguracion = Boolean(
      dua?.existe_configuracion &&
        configuracion
    );

    const puedeEditarDua =
      duaConsulta?.permisos?.puede_editar === true;

    // dua-frontend-options-v1-summary
    const opcionesDua = Array.isArray(
      dua.opciones
    )
      ? dua.opciones
      : [];

    const contarOpcionesDua = (
      principio
    ) =>
      opcionesDua.filter(
        (opcion) =>
          opcion?.principio === principio
      ).length;

    const resumen = [
      {
        titulo: "Implicación",
        valor: contarOpcionesDua(
          "IMPLICACION"
        ),
        detalle: "Opciones",
      },
      {
        titulo: "Representación",
        valor: contarOpcionesDua(
          "REPRESENTACION"
        ),
        detalle: "Opciones",
      },
      {
        titulo: "Acción y expresión",
        valor: contarOpcionesDua(
          "ACCION_EXPRESION"
        ),
        detalle: "Opciones",
      },
    ];

    const estiloCampoDua = {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid #c4b5fd",
      borderRadius: "11px",
      background: "#ffffff",
      color: "#312e81",
      padding: "10px 11px",
      fontSize: "12px",
      outline: "none",
    };

    const estiloEtiquetaDua = {
      display: "block",
      marginBottom: "5px",
      color: "#5b21b6",
      fontSize: "11px",
      fontWeight: 900,
    };

    const camposLista = [
      {
        campo: "criterios_exito",
        titulo: "Criterios de éxito",
        ayuda:
          "Escribe un criterio observable por línea.",
      },
      {
        campo: "conocimientos_previos",
        titulo: "Conocimientos previos",
        ayuda:
          "Escribe un conocimiento o experiencia por línea.",
      },
      {
        campo: "apoyos_universales",
        titulo: "Apoyos universales",
        ayuda:
          "Escribe un apoyo disponible para todo el grupo por línea.",
      },
      {
        campo: "barreras_previstas",
        titulo: "Barreras previstas",
        ayuda:
          "Escribe una barrera contextual por línea.",
      },
      {
        campo: "glosario",
        titulo: "Glosario accesible",
        ayuda:
          "Escribe un término y su explicación por línea.",
      },
    ];

    return (
      <section
        style={{
          marginTop: "12px",
          marginBottom: "12px",
          border: "1px solid #c4b5fd",
          borderRadius: "18px",
          background: "#faf5ff",
          padding: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#5b21b6",
                fontSize: "13px",
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Diseño Universal para el Aprendizaje
            </div>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              Compromiso, representación y acción o expresión.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "7px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                borderRadius: "999px",
                background: "#ffffff",
                border: "1px solid #c4b5fd",
                color: "#6d28d9",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 950,
              }}
            >
              {puedeEditarDua
                ? editandoDua
                  ? "Edición activa"
                  : "Edición docente"
                : "Solo consulta"}
            </span>

            <span
              style={{
                borderRadius: "999px",
                background: existeConfiguracion
                  ? "#dcfce7"
                  : "#fef3c7",
                color: existeConfiguracion
                  ? "#166534"
                  : "#92400e",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 950,
              }}
            >
              {existeConfiguracion
                ? "DUA configurado"
                : "DUA pendiente"}
            </span>

            {puedeEditarDua &&
              !editandoDua &&
              !cargandoDuaConsulta && (
                <button
                  type="button"
                  onClick={abrirEdicionDua}
                  style={{
                    border: "1px solid #7c3aed",
                    borderRadius: "999px",
                    background: "#7c3aed",
                    color: "#ffffff",
                    padding: "7px 11px",
                    fontSize: "11px",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  {existeConfiguracion
                    ? "Editar DUA"
                    : "Configurar DUA"}
                </button>
              )}
          </div>
        </div>

        {cargandoDuaConsulta && (
          <div
            style={{
              marginTop: "12px",
              color: "#6d28d9",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Consultando configuración DUA...
          </div>
        )}

        {!cargandoDuaConsulta &&
          errorDuaConsulta && (
            <div
              style={{
                marginTop: "12px",
                border: "1px solid #fed7aa",
                borderRadius: "12px",
                background: "#fff7ed",
                padding: "11px",
                color: "#9a3412",
                fontSize: "12px",
              }}
            >
              No fue posible mostrar la configuración DUA.
            </div>
          )}

        {!cargandoDuaConsulta &&
          !errorDuaConsulta &&
          !editandoDua &&
          !existeConfiguracion && (
            <div
              style={{
                marginTop: "12px",
                border: "1px dashed #c4b5fd",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "11px",
                color: "#475569",
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              Este bloque todavía no tiene una configuración
              DUA guardada.
            </div>
          )}

        {!cargandoDuaConsulta &&
          !errorDuaConsulta &&
          !editandoDua &&
          existeConfiguracion && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "9px",
                  marginTop: "12px",
                }}
              >
                {resumen.map((item) => (
                  <div
                    key={item.titulo}
                    style={{
                      border: "1px solid #ddd6fe",
                      borderRadius: "12px",
                      background: "#ffffff",
                      padding: "10px",
                    }}
                  >
                    <div
                      style={{
                        color: "#6d28d9",
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      {item.titulo}
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        color: "#312e81",
                        fontSize: "16px",
                        fontWeight: 950,
                      }}
                    >
                      {item.valor}
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      {item.detalle}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "9px",
                  border: "1px solid #ddd6fe",
                  borderRadius: "12px",
                  background: "#ffffff",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    color: "#6d28d9",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  Propósito accesible
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    color: "#334155",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {configuracion.proposito_accesible ||
                    "Sin propósito accesible registrado."}
                </div>
              </div>
            </>
          )}

        {editandoDua && puedeEditarDua && (
          <div
            style={{
              marginTop: "12px",
              border: "1px solid #ddd6fe",
              borderRadius: "14px",
              background: "#ffffff",
              padding: "12px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                color: "#475569",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              Edita la configuración base y las opciones
              de implicación, representación y acción o
              expresión. Cada colección se guarda de forma
              independiente.
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                color: "#312e81",
                fontSize: "12px",
                fontWeight: 900,
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(
                  duaForm.habilitado
                )}
                onChange={(event) =>
                  actualizarCampoDua(
                    "habilitado",
                    event.target.checked
                  )
                }
              />

              Habilitar DUA para este bloque
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
              }}
            >
              <label>
                <span style={estiloEtiquetaDua}>
                  Estado
                </span>

                <select
                  value={duaForm.estado}
                  onChange={(event) =>
                    actualizarCampoDua(
                      "estado",
                      event.target.value
                    )
                  }
                  style={estiloCampoDua}
                >
                  <option value="BORRADOR">
                    Borrador
                  </option>
                  <option value="ARCHIVADO">
                    Archivado
                  </option>
                </select>
              </label>

              <label>
                <span style={estiloEtiquetaDua}>
                  Idioma
                </span>

                <input
                  type="text"
                  value={duaForm.idioma}
                  maxLength={12}
                  onChange={(event) =>
                    actualizarCampoDua(
                      "idioma",
                      event.target.value
                    )
                  }
                  style={estiloCampoDua}
                  placeholder="es"
                />
              </label>
            </div>

            <label
              style={{
                display: "block",
                marginTop: "11px",
              }}
            >
              <span style={estiloEtiquetaDua}>
                Propósito accesible
              </span>

              <textarea
                value={duaForm.proposito_accesible}
                maxLength={12000}
                onChange={(event) =>
                  actualizarCampoDua(
                    "proposito_accesible",
                    event.target.value
                  )
                }
                style={{
                  ...estiloCampoDua,
                  minHeight: "92px",
                  resize: "vertical",
                }}
                placeholder="Describe qué aprenderá el estudiante y cómo podrá demostrarlo de manera comprensible y flexible."
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "10px",
                marginTop: "11px",
              }}
            >
              {camposLista.map((item) => (
                <label key={item.campo}>
                  <span style={estiloEtiquetaDua}>
                    {item.titulo}
                  </span>

                  <textarea
                    value={duaForm[item.campo]}
                    onChange={(event) =>
                      actualizarCampoDua(
                        item.campo,
                        event.target.value
                      )
                    }
                    style={{
                      ...estiloCampoDua,
                      minHeight: "90px",
                      resize: "vertical",
                    }}
                    placeholder={item.ayuda}
                  />
                </label>
              ))}
            </div>

            {errorGuardadoDua && (
              <div
                style={{
                  marginTop: "11px",
                  border: "1px solid #fecaca",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "9px 10px",
                  fontSize: "12px",
                }}
              >
                {errorGuardadoDua}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <button
                type="button"
                onClick={cancelarEdicionDua}
                disabled={guardandoDua}
                style={{
                  border: "1px solid #c4b5fd",
                  borderRadius: "999px",
                  background: "#ffffff",
                  color: "#6d28d9",
                  padding: "9px 13px",
                  fontWeight: 900,
                  cursor: guardandoDua
                    ? "not-allowed"
                    : "pointer",
                  opacity: guardandoDua
                    ? 0.65
                    : 1,
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarBorradorDua}
                disabled={guardandoDua}
                style={{
                  border: "1px solid #7c3aed",
                  borderRadius: "999px",
                  background: "#7c3aed",
                  color: "#ffffff",
                  padding: "9px 14px",
                  fontWeight: 950,
                  cursor: guardandoDua
                    ? "not-allowed"
                    : "pointer",
                  opacity: guardandoDua
                    ? 0.65
                    : 1,
                }}
              >
                {guardandoDua
                  ? "Guardando..."
                  : "Guardar borrador DUA"}
              </button>
            </div>
          </div>
        )}

        {/* dua-frontend-options-v1-panel */}
        <DuaOptionsEditor
          bloqueId={String(data?.id || "")}
          duaConsulta={duaConsulta}
          editando={editandoDua}
          puedeEditar={puedeEditarDua}
          guardandoBase={guardandoDua}
          onSaved={(respuesta) => {
            setDuaConsulta(respuesta);

            setMensajeDua(
              respuesta?.mensaje ||
                "Opciones DUA guardadas correctamente."
            );
          }}
        />

        {/* dua-frontend-resources-v1-panel */}
        <DuaResourcesEditor
          bloqueId={String(data?.id || "")}
          duaConsulta={duaConsulta}
          editando={editandoDua}
          puedeEditar={puedeEditarDua}
          guardandoBase={guardandoDua}
          onSaved={(respuesta) => {
            setDuaConsulta(respuesta);

            setMensajeDua(
              respuesta?.mensaje ||
                "Recursos DUA guardados correctamente."
            );
          }}
        />


        {/* dua-frontend-evidence-formats-v1-panel */}
        <DuaEvidenceFormatsEditor
          bloqueId={String(data?.id || "")}
          duaConsulta={duaConsulta}
          editando={editandoDua}
          puedeEditar={puedeEditarDua}
          guardandoBase={guardandoDua}
          onSaved={(respuesta) => {
            setDuaConsulta(respuesta);

            setMensajeDua(
              respuesta?.mensaje ||
                "Formatos de evidencia DUA guardados correctamente."
            );
          }}
        />
        {mensajeDua && (
          <div
            style={{
              marginTop: "11px",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#166534",
              padding: "9px 10px",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {mensajeDua}
          </div>
        )}
      </section>
    );
  };

  const renderConfiguracionPedagogica = () => (
    <div
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "18px",
        background: "#f8fbff",
        padding: "14px",
        marginTop: "12px",
      }}
    >
      <h4
        style={{
          margin: "0 0 6px",
          color: "#1e3a8a",
          fontSize: "13px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        Configuración pedagógica
      </h4>

      <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "12px" }}>
        Datos base del bloque según la ruta UML: propósito, criterio, producto, intentos y puntaje mínimo.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "10px",
        }}
      >
        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Competencia
          </span>
          <input
            value={data.competencia || ""}
            onChange={(e) => update({ competencia: e.target.value })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Capacidad
          </span>
          <input
            value={data.capacidad || ""}
            onChange={(e) => update({ capacidad: e.target.value })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Puntaje mínimo
          </span>
          <input
            type="number"
            min="0"
            max="100"
            value={data.puntajeMinimo || 71}
            onChange={(e) => update({ puntajeMinimo: Number(e.target.value) })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Intentos permitidos
          </span>
          <input
            type="number"
            min="1"
            max="10"
            value={data.intentosPermitidos || 3}
            onChange={(e) => update({ intentosPermitidos: Number(e.target.value) })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Tiempo estimado
          </span>
          <input
            value={data.tiempoEstimado || ""}
            onChange={(e) => update({ tiempoEstimado: e.target.value })}
            style={inputStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Visibilidad
          </span>
          <select
            value={data.visibilidad || "Visible para estudiantes"}
            onChange={(e) => update({ visibilidad: e.target.value })}
            style={inputStyle}
          >
            <option>Visible para estudiantes</option>
            <option>Oculto para estudiantes</option>
            <option>Visible desde fecha programada</option>
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Propósito de aprendizaje
          </span>
          <textarea
            value={data.proposito || ""}
            onChange={(e) => update({ proposito: e.target.value })}
            style={textareaSmallStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Criterio de evaluación
          </span>
          <textarea
            value={data.criterioEvaluacion || ""}
            onChange={(e) => update({ criterioEvaluacion: e.target.value })}
            style={textareaSmallStyle}
          />
        </label>

        <label style={{ display: "grid", gap: "5px" }}>
          <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
            Producto esperado
          </span>
          <textarea
            value={data.productoEsperado || ""}
            onChange={(e) => update({ productoEsperado: e.target.value })}
            style={textareaSmallStyle}
          />
        </label>
      </div>
    </div>
  );

  const card = {
    border: "1px solid #bfdbfe",
    borderRadius: "18px",
    background: "#ffffff",
    padding: "16px",
    marginBottom: "14px",
  };

  const softBlue = {
    border: "1px solid #bfdbfe",
    borderRadius: "16px",
    background: "#eff6ff",
    padding: "14px",
    marginTop: "12px",
  };

  const miniCard = {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    padding: "12px",
  };

  const label = {
    fontSize: "11px",
    color: "#64748b",
    fontWeight: 900,
    marginBottom: "4px",
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
  };

  const textareaSmallStyle = {
    width: "100%",
    minHeight: "80px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
    background: "#ffffff",
    resize: "vertical",
    lineHeight: 1.45,
  };

  const value = {
    fontSize: "13px",
    color: "#1e3a8a",
    fontWeight: 900,
  };

  const historialIntentos = data.activityAttemptHistory || [];
  const iaEnHistorial = historialIntentos.some(
    (item) =>
      item?.retroalimentacion &&
      item.retroalimentacion !== "Sin retroalimentación registrada."
  );

  const iaGenerada = Boolean(
    data.formativeAiFeedback ||
      data.formativeAiGeneratedAt ||
      data.formativeAiOriginalFeedback ||
      iaEnHistorial
  );

  const estadoIA = data.formativeAiFeedback
    ? "Generada actual"
    : iaEnHistorial
    ? "En historial"
    : "Pendiente";

  const revisadoDocente = Boolean(data.formativeHumanReviewed);
  const feedbackEnviado = Boolean(data.formativeFeedbackSent);
  const intentosPrevios = historialIntentos.length;

  const badgeEstado = (activo, tipo = "verde") => ({
    background: activo
      ? tipo === "azul"
        ? "#dbeafe"
        : "#dcfce7"
      : "#f1f5f9",
    color: activo
      ? tipo === "azul"
        ? "#1e40af"
        : "#166534"
      : "#64748b",
    border: activo
      ? tipo === "azul"
        ? "1px solid #bfdbfe"
        : "1px solid #bbf7d0"
      : "1px solid #e2e8f0",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: 900,
  });


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

  const esRecursoAprendizajeDocente =
    data?.esRecursoAprendizaje === true ||
    data?.categoriaDidactica === "recurso" ||
    tiposRecursosAprendizajeDocente.includes(tipoBloqueReal);

  const urlRecursoAprendizaje =
    data?.resourceUrl ||
    data?.url ||
    data?.activityPdfUrl ||
    data?.activityFileUrl ||
    "";

  const obtenerConfigMaterialRecursoDocente = () => {
    const tipo = String(tipoBloqueReal || "").trim().toLowerCase();

    const configs = {
      pdf: {
        tituloMaterial: "Material PDF",
        urlLabel: "URL del PDF o archivo del recurso",
        urlPlaceholder: "https://... o /aula-virtual/archivos/...",
        uploadTitle: "📄 Subir PDF del docente",
        uploadButton: "Subir PDF",
        accept: "application/pdf",
        ayuda: "Sube una ficha, separata o documento PDF para que el estudiante lo revise.",
      },
      video: {
        tituloMaterial: "Video de aprendizaje",
        urlLabel: "URL del video",
        urlPlaceholder: "https://youtube.com/... o enlace del video",
        uploadTitle: "🎬 Subir video del recurso",
        uploadButton: "Subir video",
        accept: "video/*",
        ayuda: "Pega un enlace de video o sube un archivo audiovisual.",
      },
      enlace: {
        tituloMaterial: "Enlace externo",
        urlLabel: "URL del recurso externo",
        urlPlaceholder: "https://...",
        uploadTitle: "📎 Archivo complementario opcional",
        uploadButton: "Subir archivo",
        accept: undefined,
        ayuda: "Pega el enlace a una página, simulador, herramienta web o recurso externo.",
      },
      lectura: {
        tituloMaterial: "Lectura",
        urlLabel: "URL o archivo de lectura",
        urlPlaceholder: "https://... o /aula-virtual/archivos/...",
        uploadTitle: "📖 Subir lectura",
        uploadButton: "Subir lectura",
        accept: ".pdf,.doc,.docx,.txt",
        ayuda: "Agrega una lectura breve, documento o material textual.",
      },
      guia: {
        tituloMaterial: "Guía de aprendizaje",
        urlLabel: "URL o archivo de la guía",
        urlPlaceholder: "https://... o /aula-virtual/archivos/...",
        uploadTitle: "🧭 Subir guía",
        uploadButton: "Subir guía",
        accept: ".pdf,.doc,.docx",
        ayuda: "Sube una guía con orientaciones paso a paso para el estudiante.",
      },
      "guía": {
        tituloMaterial: "Guía de aprendizaje",
        urlLabel: "URL o archivo de la guía",
        urlPlaceholder: "https://... o /aula-virtual/archivos/...",
        uploadTitle: "🧭 Subir guía",
        uploadButton: "Subir guía",
        accept: ".pdf,.doc,.docx",
        ayuda: "Sube una guía con orientaciones paso a paso para el estudiante.",
      },
      separata: {
        tituloMaterial: "Separata",
        urlLabel: "URL o archivo de la separata",
        urlPlaceholder: "https://... o /aula-virtual/archivos/...",
        uploadTitle: "📘 Subir separata",
        uploadButton: "Subir separata",
        accept: ".pdf,.doc,.docx",
        ayuda: "Agrega una separata teórica o práctica para reforzar el aprendizaje.",
      },
      presentacion: {
        tituloMaterial: "Presentación",
        urlLabel: "URL o archivo de presentación",
        urlPlaceholder: "https://... o archivo PPT/PDF",
        uploadTitle: "🖥️ Subir presentación",
        uploadButton: "Subir presentación",
        accept: ".ppt,.pptx,.pdf",
        ayuda: "Agrega diapositivas o presentación de apoyo para la clase.",
      },
      "presentación": {
        tituloMaterial: "Presentación",
        urlLabel: "URL o archivo de presentación",
        urlPlaceholder: "https://... o archivo PPT/PDF",
        uploadTitle: "🖥️ Subir presentación",
        uploadButton: "Subir presentación",
        accept: ".ppt,.pptx,.pdf",
        ayuda: "Agrega diapositivas o presentación de apoyo para la clase.",
      },
      imagen: {
        tituloMaterial: "Imagen de aprendizaje",
        urlLabel: "URL o archivo de imagen",
        urlPlaceholder: "https://... o imagen subida",
        uploadTitle: "🖼️ Subir imagen",
        uploadButton: "Subir imagen",
        accept: "image/*",
        ayuda: "Sube una imagen, esquema, organizador visual o recurso gráfico.",
      },
      infografia: {
        tituloMaterial: "Infografía",
        urlLabel: "URL o archivo de infografía",
        urlPlaceholder: "https://... o imagen/PDF",
        uploadTitle: "📊 Subir infografía",
        uploadButton: "Subir infografía",
        accept: "image/*,.pdf",
        ayuda: "Agrega una infografía o resumen visual del tema.",
      },
      "infografía": {
        tituloMaterial: "Infografía",
        urlLabel: "URL o archivo de infografía",
        urlPlaceholder: "https://... o imagen/PDF",
        uploadTitle: "📊 Subir infografía",
        uploadButton: "Subir infografía",
        accept: "image/*,.pdf",
        ayuda: "Agrega una infografía o resumen visual del tema.",
      },
    };

    return configs[tipo] || {
      tituloMaterial: "Material del recurso",
      urlLabel: "URL o archivo del recurso",
      urlPlaceholder: "https://... o /aula-virtual/archivos/...",
      uploadTitle: "📎 Subir archivo del recurso",
      uploadButton: "Subir archivo",
      accept: undefined,
      ayuda: "Agrega un archivo, enlace o material de apoyo para el estudiante.",
    };
  };


  const obtenerAccionRecursoDocente = () => {
    const tipo = String(tipoBloqueReal || "").trim().toLowerCase();

    const acciones = {
      pdf: {
        botonAbrir: "📄 Abrir PDF",
        estadoDisponible: "PDF disponible para estudiantes",
        estadoPendiente: "PDF pendiente de carga",
        descripcion: "Documento PDF que el estudiante podrá abrir en una nueva pestaña.",
      },
      video: {
        botonAbrir: "🎬 Abrir video",
        estadoDisponible: "Video disponible para estudiantes",
        estadoPendiente: "Video pendiente de enlace o archivo",
        descripcion: "Recurso audiovisual para explicar o reforzar el tema.",
      },
      enlace: {
        botonAbrir: "🔗 Abrir enlace",
        estadoDisponible: "Enlace disponible para estudiantes",
        estadoPendiente: "Enlace pendiente",
        descripcion: "Recurso externo que se abrirá en una nueva pestaña.",
      },
      "recurso externo": {
        botonAbrir: "🔗 Abrir enlace",
        estadoDisponible: "Enlace disponible para estudiantes",
        estadoPendiente: "Enlace pendiente",
        descripcion: "Recurso externo que se abrirá en una nueva pestaña.",
      },
      guia: {
        botonAbrir: "🧭 Abrir guía",
        estadoDisponible: "Guía disponible para estudiantes",
        estadoPendiente: "Guía pendiente de carga",
        descripcion: "Guía de aprendizaje con orientaciones paso a paso.",
      },
      "guía": {
        botonAbrir: "🧭 Abrir guía",
        estadoDisponible: "Guía disponible para estudiantes",
        estadoPendiente: "Guía pendiente de carga",
        descripcion: "Guía de aprendizaje con orientaciones paso a paso.",
      },
      infografia: {
        botonAbrir: "📊 Ver infografía",
        estadoDisponible: "Infografía disponible para estudiantes",
        estadoPendiente: "Infografía pendiente de carga",
        descripcion: "Resumen visual para comprender las ideas principales.",
      },
      "infografía": {
        botonAbrir: "📊 Ver infografía",
        estadoDisponible: "Infografía disponible para estudiantes",
        estadoPendiente: "Infografía pendiente de carga",
        descripcion: "Resumen visual para comprender las ideas principales.",
      },
      imagen: {
        botonAbrir: "🖼️ Ver imagen",
        estadoDisponible: "Imagen disponible para estudiantes",
        estadoPendiente: "Imagen pendiente de carga",
        descripcion: "Imagen, esquema u organizador visual de apoyo.",
      },
      lectura: {
        botonAbrir: "📖 Abrir lectura",
        estadoDisponible: "Lectura disponible para estudiantes",
        estadoPendiente: "Lectura pendiente de carga",
        descripcion: "Lectura breve o documento textual para revisar.",
      },
      separata: {
        botonAbrir: "📘 Abrir separata",
        estadoDisponible: "Separata disponible para estudiantes",
        estadoPendiente: "Separata pendiente de carga",
        descripcion: "Material teórico o práctico para reforzar el aprendizaje.",
      },
      presentacion: {
        botonAbrir: "🖥️ Abrir presentación",
        estadoDisponible: "Presentación disponible para estudiantes",
        estadoPendiente: "Presentación pendiente de carga",
        descripcion: "Diapositivas o presentación de apoyo para la clase.",
      },
      "presentación": {
        botonAbrir: "🖥️ Abrir presentación",
        estadoDisponible: "Presentación disponible para estudiantes",
        estadoPendiente: "Presentación pendiente de carga",
        descripcion: "Diapositivas o presentación de apoyo para la clase.",
      },
    };

    return (
      acciones[tipo] || {
        botonAbrir: "📚 Abrir recurso",
        estadoDisponible: "Recurso disponible para estudiantes",
        estadoPendiente: "Recurso pendiente de carga",
        descripcion: "Material de aprendizaje disponible para revisar.",
      }
    );
  };

  const abrirRecursoAprendizajeDocente = () => {
    if (!urlRecursoAprendizaje) return;

    const url = String(urlRecursoAprendizaje || "");

    if (url.startsWith("/aula-virtual/")) {
      abrirArchivoAulaVirtual(url, data.activityFileName || data.titulo || "Recurso de aprendizaje");
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
  };

  const renderVistaRecursoAprendizajeDocente = () => {
    const esPdf = tipoBloqueReal === "pdf";
    const recursoDisponible = Boolean(urlRecursoAprendizaje);
    const iconoRecurso = data?.tipoIcono || (esPdf ? "📄" : tipoBloqueReal === "video" ? "🎬" : tipoBloqueReal === "enlace" ? "🔗" : "📚");
    const materialConfig = obtenerConfigMaterialRecursoDocente();
    const accionRecurso = obtenerAccionRecursoDocente();

    const infoBoxRecursoStyle = {
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      background: "#ffffff",
      padding: "12px",
    };

    const labelRecursoStyle = {
      fontSize: "11px",
      color: "#64748b",
      fontWeight: 900,
      marginBottom: "4px",
    };

    const valueRecursoStyle = {
      fontSize: "13px",
      color: "#1e3a8a",
      fontWeight: 900,
    };

    const inputRecursoStyle = {
      width: "100%",
      border: "1px solid #cbd5e1",
      borderRadius: "12px",
      padding: "10px 12px",
      fontSize: "13px",
      color: "#0f172a",
      outline: "none",
      background: "#ffffff",
      fontFamily: "inherit",
    };

    const textareaRecursoStyle = {
      width: "100%",
      minHeight: "80px",
      border: "1px solid #cbd5e1",
      borderRadius: "12px",
      padding: "10px 12px",
      fontSize: "13px",
      color: "#0f172a",
      outline: "none",
      background: "#ffffff",
      resize: "vertical",
      lineHeight: 1.45,
      fontFamily: "inherit",
    };

    const infoBox = infoBoxRecursoStyle;
    const label = labelRecursoStyle;
    const value = valueRecursoStyle;
    const inputStyle = inputRecursoStyle;
    const textareaStyle = textareaRecursoStyle;

    return (
      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <span
                style={{
                  background: "#ecfdf5",
                  color: "#047857",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                📚 Recurso de aprendizaje
              </span>

              <span
                style={{
                  background: "#f8fafc",
                  color: "#334155",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                {iconoRecurso} {data.tipo}
              </span>

              <span
                style={{
                  background: recursoDisponible ? "#dcfce7" : "#fef3c7",
                  color: recursoDisponible ? "#166534" : "#92400e",
                  borderRadius: "999px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                {recursoDisponible ? "Disponible para estudiantes" : "Pendiente de recurso"}
              </span>
            </div>

            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 900 }}>
              {data.titulo || `${data.tipo} agregado a la unidad`}
            </h3>

            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.45 }}>
              {data.descripcion || "Material de apoyo para el proceso didáctico de la unidad."}
            </p>
          </div>

          {editMode && (
            <button
              type="button"
              onClick={() => onRemoveBlock?.(data.id)}
              style={{
                border: "1px solid #fecaca",
                background: "#ffffff",
                color: "#dc2626",
                borderRadius: "999px",
                padding: "10px 14px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Eliminar
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            border: "1px solid #a7f3d0",
            borderRadius: "18px",
            background: "#ecfdf5",
          }}
        >
          <h4
            style={{
              margin: "0 0 6px",
              color: "#047857",
              fontSize: "13px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            Propósito pedagógico del recurso
          </h4>

          <p style={{ margin: 0, color: "#065f46", fontSize: "13px", lineHeight: 1.55 }}>
            {data.proposito || "Presentar, explicar o reforzar el aprendizaje antes del desarrollo de las actividades evaluables."}
          </p>
        </div>

        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "10px",
          }}
        >
          <div style={infoBox}>
            <div style={label}>Tipo de elemento</div>
            <div style={value}>Recurso de aprendizaje</div>
          </div>

          <div style={infoBox}>
            <div style={label}>Formato</div>
            <div style={value}>{data.tipo || "Recurso"}</div>
          </div>

          <div style={infoBox}>
            <div style={label}>Visibilidad</div>
            <div style={value}>{data.visibilidad || "Visible para estudiantes"}</div>
          </div>

          <div style={infoBox}>
            <div style={label}>Evaluación</div>
            <div style={value}>No evaluable</div>
          </div>
        </div>

        {/* dua-frontend-readonly-card-v1-resource */}
        {renderTarjetaDuaConsulta()}

        <div
          style={{
            marginTop: "12px",
            padding: "14px",
            border: "1px solid #bfdbfe",
            borderRadius: "18px",
            background: "#f8fbff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "10px",
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  color: "#1e3a8a",
                  fontSize: "13px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                {materialConfig.tituloMaterial}
              </h4>

              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                {accionRecurso.descripcion}
              </p>
            </div>

            {recursoDisponible && (
              <button
                type="button"
                onClick={abrirRecursoAprendizajeDocente}
                style={{
                  border: "0",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "999px",
                  padding: "10px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {accionRecurso.botonAbrir}
              </button>
            )}
          </div>

          {recursoDisponible ? (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 11px",
                  borderRadius: "999px",
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: "11px",
                  fontWeight: 950,
                }}
              >
                ✅ {accionRecurso.estadoDisponible}
              </div>

              <div
                style={{
                  padding: "12px",
                  border: "1px solid #dbeafe",
                  borderRadius: "14px",
                  background: "#ffffff",
                  color: "#1e3a8a",
                  fontSize: "13px",
                  fontWeight: 800,
                  wordBreak: "break-word",
                }}
              >
                {data.activityFileName || data.resourceName || urlRecursoAprendizaje}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 11px",
                  borderRadius: "999px",
                  background: "#fef3c7",
                  color: "#92400e",
                  fontSize: "11px",
                  fontWeight: 950,
                }}
              >
                ⏳ {accionRecurso.estadoPendiente}
              </div>

              <div
                style={{
                  padding: "12px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  background: "#ffffff",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Todavía no se ha registrado archivo, enlace o contenido para este recurso.
              </div>
            </div>
          )}

          {editMode && (
            <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                  {materialConfig.urlLabel}
                </span>

                <input
                  value={urlRecursoAprendizaje}
                  onChange={(e) =>
                    update({
                      resourceUrl: e.target.value,
                      activityFileUrl: e.target.value,
                      categoriaDidactica: "recurso",
                      esRecursoAprendizaje: true,
                      esActividadEvaluable: false,
                      generaIntento: false,
                      requiereRevisionDocente: false,
                      activityConfigured: Boolean(e.target.value),
                      configurado: Boolean(e.target.value),
                      activityStatus: e.target.value ? "Disponible" : "Pendiente",
                      activityProgress: 0,
                      activityScore: 0,
                      formativeScore: 0,
                      formativeLevel: "No evaluable",
                      nivelLogro: "No evaluable",
                      puntajeMinimo: 0,
                      intentosPermitidos: 0,
                    })
                  }
                  placeholder={materialConfig.urlPlaceholder}
                  style={inputStyle}
                />
              </label>

              {(esPdf || esRecursoAprendizajeDocente) && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "12px",
                    border: "1px solid #bae6fd",
                    borderRadius: "14px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#075985", marginBottom: "8px" }}>
                    {materialConfig.uploadTitle}
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="file"
                      accept={materialConfig.accept}
                      onChange={(e) => setArchivoPdfDocente(e.target.files?.[0] || null)}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "10px",
                        background: "#f8fafc",
                      }}
                    />

                    <button
                      type="button"
                      onClick={subirPdfRealDocente}
                      disabled={subiendoPdfDocente}
                      style={{
                        border: "0",
                        borderRadius: "12px",
                        padding: "11px 14px",
                        background: subiendoPdfDocente ? "#94a3b8" : "#0284c7",
                        color: "#ffffff",
                        fontWeight: 900,
                        cursor: subiendoPdfDocente ? "not-allowed" : "pointer",
                      }}
                    >
                      {subiendoPdfDocente ? "Subiendo..." : materialConfig.uploadButton}
                    </button>
                  </div>

                  {mensajeArchivoReal && (
                    <div style={{ marginTop: "10px", color: "#0f172a", fontSize: "13px", fontWeight: 800 }}>
                      {mensajeArchivoReal}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  update({
                    categoriaDidactica: "recurso",
                    esRecursoAprendizaje: true,
                    esActividadEvaluable: false,
                    generaIntento: false,
                    requiereRevisionDocente: false,
                    activityConfigured: recursoDisponible,
                    configurado: recursoDisponible,
                    activityStatus: recursoDisponible ? "Disponible" : "Pendiente",
                    activityProgress: 0,
                    activityScore: 0,
                    formativeScore: 0,
                    nivelLogro: "No evaluable",
                    formativeLevel: "No evaluable",
                    puntajeMinimo: 0,
                    intentosPermitidos: 0,
                    activityCompleted: false,
                    activityAttemptHistory: [],
                    productoEsperado:
                      data.productoEsperado || "Material de aprendizaje revisado por el estudiante.",
                    criterioEvaluacion:
                      data.criterioEvaluacion || "Recurso de apoyo pedagógico. No genera calificación.",
                  })
                }
                style={{
                  border: "1px solid #047857",
                  background: "#047857",
                  color: "#ffffff",
                  borderRadius: "999px",
                  padding: "11px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: "fit-content",
                }}
              >
                Guardar cambios del recurso
              </button>
            </div>
          )}
        </div>

        {editMode && (
          <div
            style={{
              marginTop: "12px",
              padding: "14px",
              border: "1px dashed #bfdbfe",
              borderRadius: "18px",
              background: "#ffffff",
            }}
          >
            <button
              type="button"
              onClick={() => setShowPedagogicalConfig((value) => !value)}
              style={{
                border: "1px solid #bfdbfe",
                background: "#ffffff",
                color: "#2563eb",
                borderRadius: "999px",
                padding: "10px 14px",
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {showPedagogicalConfig ? "Ocultar configuración pedagógica" : "Editar configuración pedagógica"}
            </button>

            {showPedagogicalConfig && (
              <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                    Título
                  </span>
                  <input
                    value={data.titulo || ""}
                    onChange={(e) => update({ titulo: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                    Descripción
                  </span>
                  <textarea
                    value={data.descripcion || ""}
                    onChange={(e) => update({ descripcion: e.target.value })}
                    style={textareaStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                    Propósito pedagógico
                  </span>
                  <textarea
                    value={data.proposito || ""}
                    onChange={(e) => update({ proposito: e.target.value })}
                    style={textareaStyle}
                  />
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 900 }}>
                    Visibilidad
                  </span>
                  <select
                    value={data.visibilidad || "Visible para estudiantes"}
                    onChange={(e) => update({ visibilidad: e.target.value })}
                    style={inputStyle}
                  >
                    <option>Visible para estudiantes</option>
                    <option>Oculto para estudiantes</option>
                    <option>Visible desde fecha programada</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  if (esRecursoAprendizajeDocente) {
    return renderVistaRecursoAprendizajeDocente();
  }


  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span
              style={{
                background: "#eef2ff",
                color: "#2563eb",
                borderRadius: "999px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 900,
              }}
            >
              Nuevo bloque
            </span>

            <span
              style={{
                background: "#f1f5f9",
                color: "#334155",
                borderRadius: "999px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 900,
              }}
            >
              {data.tipo}
            </span>

            <span
              style={{
                background: data.activityConfigured ? "#dcfce7" : "#fef3c7",
                color: data.activityConfigured ? "#166534" : "#92400e",
                borderRadius: "999px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 900,
              }}
            >
              {data.activityConfigured ? "Configurado" : "Pendiente"}
            </span>

            {iaGenerada && (
              <span style={badgeEstado(true)}>
                IA generada
              </span>
            )}

            {revisadoDocente && (
              <span style={badgeEstado(true)}>
                Revisado por docente
              </span>
            )}

            {feedbackEnviado && (
              <span style={badgeEstado(true)}>
                Retroalimentación enviada
              </span>
            )}

            {intentosPrevios > 0 && (
              <span style={badgeEstado(true, "azul")}>
                Intentos previos: {intentosPrevios}
              </span>
            )}
          </div>

          <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 900 }}>
            {data.titulo}
          </h3>

          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "13px" }}>
            {data.descripcion}
          </p>
        </div>

        {(
          <button
            type="button"
            onClick={() => onRemoveBlock?.(data.id)}
            style={{
              border: "1px solid #fecaca",
              background: "#ffffff",
              color: "#dc2626",
              borderRadius: "999px",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Eliminar
          </button>
        )}
      </div>

      {(
        <div
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "18px",
            background: "#f8fbff",
            padding: "14px",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  color: "#1e3a8a",
                  fontSize: "13px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                Configuración pedagógica UML
              </h4>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Competencia, propósito, criterio, producto, intentos y puntaje mínimo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPedagogicalConfig((value) => !value)}
              style={{
                border: "1px solid #bfdbfe",
                background: "#ffffff",
                color: "#2563eb",
                borderRadius: "999px",
                padding: "10px 14px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {showPedagogicalConfig ? "Ocultar configuración" : "Mostrar configuración"}
            </button>
          </div>

          {!showPedagogicalConfig && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <div style={miniCard}>
                <div style={label}>Competencia</div>
                <div style={value}>{data.competencia || "Sin registrar"}</div>
              </div>

              <div style={miniCard}>
                <div style={label}>Puntaje mínimo</div>
                <div style={value}>{data.puntajeMinimo || 71}%</div>
              </div>

              <div style={miniCard}>
                <div style={label}>Intentos</div>
                <div style={value}>{data.intentosPermitidos || 3}</div>
              </div>

              <div style={miniCard}>
                <div style={label}>Visibilidad</div>
                <div style={value}>{data.visibilidad || "Visible para estudiantes"}</div>
              </div>
            </div>
          )}

          {showPedagogicalConfig && (
            <>
              {renderConfiguracionPedagogica()}

              <button
                type="button"
                onClick={guardarConfiguracionPedagogica}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "999px",
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Guardar configuración pedagógica
              </button>
            </>
          )}
        </div>
      )}

      {/* dua-frontend-readonly-card-v1-activity */}
      {renderTarjetaDuaConsulta()}

      <div style={softBlue}>
        <h4
          style={{
            margin: "0 0 6px",
            color: "#075985",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Actividad evaluable: {data.tipo}
        </h4>

        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "12px" }}>
          Configura, registra avance, puntaje, intentos y evaluación formativa según la ruta UML.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
        >
          <div style={miniCard}>
            <div style={label}>Estado</div>
            <div style={value}>{data.activityStatus}</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Avance</div>
            <div style={value}>{data.activityProgress || 0}%</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Puntaje</div>
            <div style={value}>{data.activityScore || 0}%</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Nivel</div>
            <div style={value}>{data.formativeLevel || nivelActual}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            border: "1px solid #bae6fd",
            borderRadius: "14px",
            background: "#f0f9ff",
          }}
        >
          <strong style={{ color: "#0369a1", fontSize: "13px" }}>Vista previa de actividad</strong>

          {renderDashboardActividadDocente()}

          {renderPanelRespuestasActividadDocente()}

          {String(data?.tipo || "").toLowerCase() === "evidencia" && (
            <div
              style={{
                marginTop: "12px",
                background: "#ffffff",
                border: "1px solid #bbf7d0",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <div style={{ fontWeight: 900, color: "#166534", marginBottom: "10px" }}>
                📤 Entregas reales de estudiantes
              </div>

              {cargandoEntregasReales ? (
                <div style={{ color: "#64748b", fontSize: "13px" }}>Cargando entregas...</div>
              ) : entregasReales.filter((entrega) => entrega?.archivo_url).length === 0 ? (
                <div style={{ color: "#64748b", fontSize: "13px" }}>
                  Todavía no hay entregas reales con archivo para este bloque.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {entregasReales
                    .filter((entrega) => entrega?.archivo_url)
                    .map((entrega) => (
                      <div
                        key={entrega.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "14px",
                          padding: "12px",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>
                          Estudiante: {entrega.estudiante_nombre || entrega.estudiante_username || "Sin estudiante"}
                        </div>

                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                          Usuario: {entrega.estudiante_usuario || entrega.estudiante_username || "Sin usuario"} · Sección: {entrega.seccion || "Sin sección"}
                        </div>

                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                          Unidad/Curso: {entrega.curso_unidad || entrega.unidad_titulo || "Sin unidad"}
                        </div>

                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                          Actividad: {entrega.actividad_titulo || data?.titulo || "Sin actividad"} · Tipo: {entrega.actividad_tipo || data?.tipo || "Sin tipo"}
                        </div>

                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                          Estado: {entrega.estado_revision || entrega.estado || "Sin estado"} · Intento {entrega.numero_intento} · Puntaje {entrega.puntaje ?? "Sin puntaje"}
                        </div>

                        <div style={{ fontSize: "12px", color: entrega.archivo_disponible === false ? "#b45309" : "#64748b", marginTop: "4px" }}>
                          Archivo: {entrega.archivo_nombre || "Archivo entregado"}
                          {entrega.archivo_disponible === false ? " · No disponible (histórico)" : " · Disponible"}
                        </div>

                        {(entrega.formato_evidencia_nombre ||
                          entrega?.payload?.formato_evidencia_nombre) && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "8px 10px",
                              borderRadius: "10px",
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              color: "#1e40af",
                              fontSize: "12px",
                              fontWeight: 900,
                            }}
                          >
                            Formato DUA utilizado:{" "}
                            {entrega.formato_evidencia_nombre ||
                              entrega?.payload?.formato_evidencia_nombre}
                          </div>
                        )}

                        {(() => {
                          const descripcionEstudiante =
                            entrega.comentario_estudiante ||
                            entrega.descripcion_evidencia ||
                            entrega.evidencia_descripcion ||
                            entrega?.payload?.comentario ||
                            entrega?.payload?.descripcion_evidencia ||
                            entrega?.payload?.evidencia_descripcion ||
                            "";

                          return descripcionEstudiante ? (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "10px 12px",
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "12px",
                                color: "#166534",
                                fontSize: "12px",
                                lineHeight: 1.5,
                              }}
                            >
                              <div style={{ fontWeight: 900, marginBottom: "4px" }}>
                                Descripción del estudiante:
                              </div>
                              <div>{descripcionEstudiante}</div>
                            </div>
                          ) : null;
                        })()}

                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                          Entregado: {(() => {
                            const fecha = entrega.fecha_entrega || entrega.entregado_at || entrega.created_at;
                            return fecha ? new Date(fecha).toLocaleString("es-PE") : "Sin fecha";
                          })()}
                        </div>

                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (entrega.archivo_disponible === false) {
                                alert("Este archivo pertenece a una carga anterior al almacenamiento persistente y ya no está disponible. Vuelve a subir la evidencia o el material.");
                                return;
                              }

                              abrirArchivoAulaVirtual(
                                entrega.archivo_url,
                                entrega.archivo_nombre || "Archivo entregado"
                              );
                            }}
                            style={{
                              display: "inline-flex",
                              color: entrega.archivo_disponible === false ? "#94a3b8" : "#2563eb",
                              fontWeight: 900,
                              textDecoration: "none",
                              background: "transparent",
                              border: "0",
                              padding: 0,
                              cursor: entrega.archivo_disponible === false ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Ver archivo entregado
                          </button>

                          <button
                            type="button"
                            onClick={() => seleccionarEntregaParaRevision(entrega)}
                            style={{
                              display: "inline-flex",
                              color: "#047857",
                              fontWeight: 900,
                              textDecoration: "none",
                              background: "transparent",
                              border: "0",
                              padding: 0,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Revisar entrega
                          </button>
                        </div>

                        {String(entregaSeleccionada?.id || "") === String(entrega.id || "") && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "12px",
                              border: "1px solid #a7f3d0",
                              borderRadius: "14px",
                              background: "#ecfdf5",
                            }}
                          >
                            <div style={{ fontWeight: 900, color: "#065f46", marginBottom: "10px" }}>
                              ✅ Revisión docente individual
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                              <label style={{ display: "grid", gap: "5px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                                Puntaje
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={revisionForm.puntaje}
                                  onChange={(e) => actualizarRevisionForm("puntaje", e.target.value)}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "9px",
                                    fontFamily: "inherit",
                                  }}
                                />
                              </label>

                              <label style={{ display: "grid", gap: "5px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                                Nivel de logro
                                <select
                                  value={revisionForm.nivel_logro}
                                  disabled
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "9px",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <option value="">Pendiente de puntaje</option>
                                  <option>En Inicio</option>
                                  <option>En Proceso</option>
                                  <option>Logro Esperado</option>
                                  <option>Logro Destacado</option>
                                </select>
                              </label>

                              <label style={{ display: "grid", gap: "5px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                                Decisión docente
                                <select
                                  value={revisionForm.decision_docente}
                                  onChange={(e) => actualizarRevisionForm("decision_docente", e.target.value)}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "9px",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  <option value="">Selecciona decisión</option>
                                  <option>Aprobado</option>
                                  <option>Observado</option>
                                  <option>Requiere mejora</option>
                                  <option>Revisado</option>
                                </select>
                              </label>
                            </div>

                            <label style={{ display: "grid", gap: "5px", marginTop: "10px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                              Observación docente
                              <textarea
                                value={revisionForm.observacion_docente}
                                onChange={(e) => actualizarRevisionForm("observacion_docente", e.target.value)}
                                rows={3}
                                style={{
                                  border: "1px solid #a7f3d0",
                                  borderRadius: "12px",
                                  padding: "10px",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                }}
                              />
                            </label>

                            <label style={{ display: "grid", gap: "5px", marginTop: "10px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                              Retroalimentación para el estudiante
                              <textarea
                                value={revisionForm.retroalimentacion_ia}
                                onChange={(e) => actualizarRevisionForm("retroalimentacion_ia", e.target.value)}
                                rows={3}
                                style={{
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "12px",
                                  padding: "10px",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                }}
                              />
                            </label>

                            <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", fontSize: "12px", color: "#334155", fontWeight: 800 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(revisionForm.enviado_estudiante)}
                                onChange={(e) => actualizarRevisionForm("enviado_estudiante", e.target.checked)}
                              />
                              Enviar revisión al estudiante
                            </label>

                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                              <button
                                type="button"
                                onClick={guardarRevisionEntrega}
                                disabled={guardandoRevisionEntrega}
                                style={{
                                  border: "0",
                                  borderRadius: "12px",
                                  padding: "10px 14px",
                                  background: guardandoRevisionEntrega ? "#94a3b8" : "#059669",
                                  color: "#ffffff",
                                  fontWeight: 900,
                                  cursor: guardandoRevisionEntrega ? "not-allowed" : "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {guardandoRevisionEntrega ? "Guardando..." : "Guardar revisión"}
                              </button>

                              <button
                                type="button"
                                onClick={() => setEntregaSeleccionada(null)}
                                style={{
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "12px",
                                  padding: "10px 14px",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                Cerrar
                              </button>
                            </div>

                            {mensajeRevisionEntrega && (
                              <div style={{ marginTop: "10px", color: "#065f46", fontSize: "12px", fontWeight: 900 }}>
                                {mensajeRevisionEntrega}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}


          {esBloquePdfReal && (
            <div
              style={{
                marginTop: "12px",
                background: "#ffffff",
                border: "1px solid #bae6fd",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <div style={{ fontWeight: 900, color: "#075985", marginBottom: "8px" }}>
                📄 Archivo PDF real del docente
              </div>

              {archivoPdfRealUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    abrirArchivoAulaVirtual(
                      data.activityPdfUrl || data.activityFileUrl,
                      data.activityFileName || "Documento PDF"
                    )
                  }
                  style={{
                    display: "inline-flex",
                    marginBottom: "10px",
                    color: "#2563eb",
                    fontWeight: 900,
                    textDecoration: "none",
                    background: "transparent",
                    border: "0",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Ver PDF cargado: {data.activityFileName || "Documento PDF"}
                </button>
              ) : (
                <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
                  Aún no se ha subido un PDF real para este bloque.
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArchivoPdfDocente(e.target.files?.[0] || null)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "10px",
                    background: "#f8fafc",
                  }}
                />

                <button
                  type="button"
                  onClick={subirPdfRealDocente}
                  disabled={subiendoPdfDocente}
                  style={{
                    border: "0",
                    borderRadius: "12px",
                    padding: "11px 14px",
                    background: subiendoPdfDocente ? "#94a3b8" : "#0284c7",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: subiendoPdfDocente ? "not-allowed" : "pointer",
                  }}
                >
                  {subiendoPdfDocente ? "Subiendo..." : "Subir PDF real"}
                </button>
              </div>

              {mensajeArchivoReal && (
                <div style={{ marginTop: "10px", color: "#0f172a", fontSize: "13px", fontWeight: 800 }}>
                  {mensajeArchivoReal}
                </div>
              )}
            </div>
          )}
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>
            Aquí se conectará el recurso real desde el backend. Por ahora se registra configuración,
            avance, puntaje, intentos, IA y revisión docente.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
          <button
            type="button"
            onClick={configurarActividad}
            style={{
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: "999px",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Configurar actividad
          </button>

          <button
            type="button"
            onClick={completarActividad}
            style={{
              border: "1px solid #0ea5e9",
              background: "#ffffff",
              color: "#0369a1",
              borderRadius: "999px",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Simular completar
          </button>

          <button
            type="button"
            onClick={nuevoIntento}
            style={{
              border: "1px solid #bfdbfe",
              background: "#ffffff",
              color: "#2563eb",
              borderRadius: "999px",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Nuevo intento
          </button>
        </div>
      </div>

      <div style={softBlue}>
        <h4
          style={{
            margin: "0 0 6px",
            color: "#1e3a8a",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Resumen docente del seguimiento
        </h4>

        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "12px" }}>
          Vista rápida del avance, nivel de logro, retroalimentación IA y revisión humana.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "10px",
          }}
        >
          <div style={miniCard}>
            <div style={label}>Intento actual</div>
            <div style={value}>Intento {(data.activityAttemptHistory?.length || 0) + 1}</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Historial</div>
            <div style={value}>{data.activityAttemptHistory?.length || 0} intento(s) previo(s)</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Nivel formativo</div>
            <div style={value}>{data.formativeLevel || nivelActual}</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Retroalimentación</div>
            <div style={value}>
              {data.formativeFeedbackSent
                ? "Enviada al estudiante"
                : data.formativeAiFeedback
                ? "Generada por IA"
                : "Pendiente"}
            </div>
          </div>

          <div style={miniCard}>
            <div style={label}>Revisión docente</div>
            <div style={value}>
              {data.formativeHumanReviewed ? "Revisado" : "Pendiente"}
            </div>
          </div>

          <div style={miniCard}>
            <div style={label}>Envío al estudiante</div>
            <div style={value}>
              {data.formativeFeedbackSent
                ? data.formativeFeedbackSentAt || "Enviada"
                : "Pendiente"}
            </div>
          </div>

          <div style={miniCard}>
            <div style={label}>IA formativa</div>
            <div style={value}>
              {estadoIA}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #bfdbfe",
          borderRadius: "18px",
          background: "#eff6ff",
          padding: "14px",
          marginTop: "12px",
        }}
      >
        <h4
          style={{
            margin: "0 0 6px",
            color: "#2563eb",
            fontSize: "13px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Evaluación formativa con IA
        </h4>

        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "12px" }}>
          {obtenerDescripcionNivel(data.formativeLevel || nivelActual)}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div style={miniCard}>
            <div style={label}>Tipo de actividad</div>
            <div style={value}>{data.tipo}</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Nivel de logro</div>
            <div style={value}>{data.formativeLevel || nivelActual}</div>
          </div>

          <div style={miniCard}>
            <div style={label}>Puntaje formativo</div>
            <div style={value}>{data.formativeScore || data.activityScore || 0}%</div>
          </div>
        </div>

        <label style={{ display: "block", marginBottom: "8px" }}>
          <span style={{ ...label, display: "block" }}>Ajustar puntaje formativo</span>
          <input
            type="range"
            min="0"
            max="100"
            value={data.formativeScore || data.activityScore || 0}
            onChange={(e) => {
              const score = Number(e.target.value);
              update({
                formativeScore: score,
                activityScore: score,
                formativeLevel: calcularNivelMINEDU(score),
              });
            }}
            style={{ width: "100%" }}
          />
        </label>

        <button
          type="button"
          onClick={regenerarIA}
          style={{
            width: "100%",
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: "999px",
            padding: "12px 16px",
            fontWeight: 900,
            cursor: "pointer",
            marginBottom: "12px",
          }}
        >
          Regenerar retroalimentación IA
        </button>

        <div
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "16px",
            background: "#ffffff",
            padding: "12px",
          }}
        >
          <h4 style={{ margin: "0 0 8px", color: "#2563eb", fontSize: "14px", fontWeight: 900 }}>
            Retroalimentación IA
          </h4>

          <textarea
            value={data.formativeAiFeedback || ""}
            onChange={(e) => update({ formativeAiFeedback: e.target.value })}
            placeholder="La retroalimentación generada por IA aparecerá aquí..."
            style={{
              width: "100%",
              minHeight: "120px",
              border: "1px solid #bfdbfe",
              borderRadius: "14px",
              padding: "12px",
              resize: "vertical",
              fontSize: "14px",
              color: "#334155",
              lineHeight: 1.5,
            }}
          />

          <h4 style={{ margin: "14px 0 8px", color: "#047857", fontSize: "14px", fontWeight: 900 }}>
            Observación docente
          </h4>

          <textarea
            value={data.formativeTeacherObservation || ""}
            onChange={(e) => update({ formativeTeacherObservation: e.target.value })}
            placeholder="Escribe la validación o corrección humana del docente..."
            style={{
              width: "100%",
              minHeight: "100px",
              border: "1px solid #bbf7d0",
              borderRadius: "14px",
              padding: "12px",
              resize: "vertical",
              fontSize: "14px",
              color: "#334155",
              lineHeight: 1.5,
            }}
          />

          <div style={{ marginTop: "10px", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>
            Generado por IA: {data.formativeAiGeneratedAt || "Pendiente"}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            <button
              type="button"
              onClick={guardarCorreccionDocente}
              style={{
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "11px 14px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Guardar corrección docente
            </button>

            <button
              type="button"
              onClick={enviarRetroalimentacion}
              disabled={!data.formativeHumanReviewed}
              style={{
                border: "1px solid #94a3b8",
                background: data.formativeHumanReviewed ? "#0f766e" : "#94a3b8",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "11px 14px",
                fontWeight: 900,
                cursor: data.formativeHumanReviewed ? "pointer" : "not-allowed",
              }}
            >
              Enviar al estudiante
            </button>
          </div>
        </div>
      </div>

      {data.activityAttemptHistory?.length > 0 && (
        <div style={softBlue}>
          <h4
            style={{
              margin: "0 0 10px",
              color: "#1e3a8a",
              fontSize: "13px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >

            Historial de intentos
          </h4>

          <div style={{ display: "grid", gap: "10px" }}>
            {data.activityAttemptHistory.map((item) => (
              <div key={item.id} style={miniCard}>
                <div style={label}>Intento {item.intento}</div>
                <div style={value}>{item.nivel}</div>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Avance {item.avance}% · Puntaje {item.puntaje}% · {item.fecha}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
