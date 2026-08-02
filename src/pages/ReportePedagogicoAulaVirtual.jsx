import { useEffect, useMemo, useRef, useState } from "react";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/LegacyBadge";
import { getConsolidadoCalificaciones } from "../services/aulaVirtualReportesService";
import {
  formatearPuntaje,
  mapReporteApiError,
  normalizarConsolidadoCalificaciones,
  obtenerPublicacionVisual,
  debeMostrarAlertaCalidad,
} from "../utils/aulaVirtualReportePedagogico";

const EMPTY_RESPONSE = Object.freeze({
  filtros: {},
  resumen: {
    estudiantes: 0,
    estudiantes_identificados: 0,
    registros_sin_vincular: 0,
    usuarios_sin_estudiante: 0,
    usernames_inferidos: 0,
    actividades: 0,
    calificaciones_definitivas: 0,
    calificaciones_provisionales: 0,
    calificaciones_pendientes_publicacion: 0,
    promedio_definitivo: null,
  },
  unidades: [],
  paginacion: {
    total: 0,
    page: 1,
    page_size: 50,
    pages: 0,
  },
  metadatos: {},
  resultados: [],
});

const INITIAL_FILTERS = Object.freeze({
  unidadId: "",
  bloqueId: "",
  usuarioId: "",
  estudianteUsername: "",
  estadoCalificacion: "todas",
  calidadIdentidad: "todas",
  page: 1,
  pageSize: 50,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatearFecha(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "—" : DATE_FORMATTER.format(fecha);
}

function etiquetaFuente(fuente) {
  if (fuente === "revision_docente") return "Revisión docente";
  if (fuente === "intento") return "Intento provisional";
  return "—";
}

function nivelVisual(nivel) {
  const configuracion = {
    "Logro Destacado": { color: "#7c3aed", background: "#ede9fe" },
    "Logro Esperado": { color: "#047857", background: "#d1fae5" },
    "En Proceso": { color: "#b45309", background: "#fef3c7" },
    "En Inicio": { color: "#b91c1c", background: "#fee2e2" },
  };
  return configuracion[nivel] || {
    color: "#4b5563",
    background: "#f3f4f6",
  };
}

function NivelCalificacion({ nivel }) {
  if (!nivel) return "—";
  const visual = nivelVisual(nivel);
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: visual.color, background: visual.background }}
    >
      {nivel}
    </span>
  );
}

function PublicacionBadge({ estado }) {
  const visual = obtenerPublicacionVisual(estado);
  return <Badge variant={visual.variant}>{visual.label}</Badge>;
}

function ResumenCalificaciones({ resumen }) {
  const tarjetas = [
    {
      label: "Estudiantes identificados",
      value: resumen.estudiantes_identificados,
      color: "#1d4ed8",
      help: `Identidades totales registradas: ${resumen.estudiantes}`,
    },
    {
      label: "Registros sin vincular",
      value: resumen.registros_sin_vincular,
      color: "#9a3412",
      help: "Conservados para trazabilidad",
    },
    {
      label: "Actividades",
      value: resumen.actividades,
      color: "#0f766e",
    },
    {
      label: "Definitivas",
      value: resumen.calificaciones_definitivas,
      color: "#047857",
    },
    {
      label: "Provisionales",
      value: resumen.calificaciones_provisionales,
      color: "#b45309",
      help: "No participan en el promedio",
    },
    {
      label: "Pendientes de publicación",
      value: resumen.calificaciones_pendientes_publicacion,
      color: "#7c3aed",
      help: "Esperan publicación docente",
    },
    {
      label: "Promedio definitivo",
      value: formatearPuntaje(resumen.promedio_definitivo),
      color: "#1a4a8a",
      help: "Solo calificaciones definitivas",
    },
  ];

  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Resumen del consolidado"
    >
      {tarjetas.map((tarjeta) => (
        <div key={tarjeta.label}>
          <StatCard
            label={tarjeta.label}
            value={tarjeta.value}
            color={tarjeta.color}
          />
          {tarjeta.help && (
            <p className="-mt-3 px-5 pb-3 text-xs text-gray-500">
              {tarjeta.help}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}

function ResumenUnidades({ unidades }) {
  if (!unidades.length) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">
        Resumen por unidad
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {unidades.map((unidad, index) => (
          <article
            key={unidad.unidad_id ?? `${unidad.unidad_titulo}-${index}`}
            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
          >
            <h3 className="font-semibold text-gray-800">
              {unidad.unidad_titulo || `Unidad ${unidad.unidad_id ?? "—"}`}
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-gray-500">Estudiantes identificados</dt>
              <dd className="text-right font-medium">
                {unidad.estudiantes_identificados ?? 0}
              </dd>
              <dt className="text-gray-500">Registros sin vincular</dt>
              <dd className="text-right font-medium">
                {unidad.registros_sin_vincular ?? 0}
              </dd>
              <dt className="text-gray-500">Actividades</dt>
              <dd className="text-right font-medium">{unidad.actividades ?? 0}</dd>
              <dt className="text-gray-500">Definitivas</dt>
              <dd className="text-right font-medium">
                {unidad.calificaciones_definitivas ?? 0}
              </dd>
              <dt className="text-gray-500">Provisionales</dt>
              <dd className="text-right font-medium">
                {unidad.calificaciones_provisionales ?? 0}
              </dd>
              <dt className="text-gray-500">Pendientes</dt>
              <dd className="text-right font-medium">
                {unidad.calificaciones_pendientes_publicacion ?? 0}
              </dd>
              <dt className="text-gray-500">Promedio</dt>
              <dd className="text-right font-medium">
                {formatearPuntaje(unidad.promedio_definitivo)}
              </dd>
              <dt className="text-gray-500">Nivel global</dt>
              <dd className="text-right font-medium">
                {unidad.nivel_global || "—"}
              </dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function TablaCalificaciones({ resultados, loading }) {
  if (!loading && resultados.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <p className="font-medium text-gray-700">
          No hay calificaciones para los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {[
                "Estudiante",
                "Sección",
                "Unidad",
                "Actividad",
                "Tipo",
                "Intento",
                "Puntaje final",
                "Nivel",
                "Decisión",
                "Publicación",
                "Fuente",
                "Fecha",
              ].map((columna) => (
                <th key={columna} scope="col" className="px-4 py-3 font-semibold">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && resultados.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                  Cargando calificaciones…
                </td>
              </tr>
            ) : (
              resultados.map((resultado) => (
                <tr
                  key={`${resultado.identidad_estudiante}-${resultado.bloque_id}-${resultado.intento_id}`}
                >
                  <td className="px-4 py-3">
                    {resultado.identidad_tipo === "sin_vincular" ? (
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          Registro sin vincular
                        </div>
                        <div className="text-xs text-gray-500">
                          Intento técnico #{resultado.intento_id ?? "—"}
                        </div>
                        <Badge variant="warning">Sin vincular</Badge>
                      </div>
                    ) : resultado.identidad_tipo ===
                      "usuario_sin_estudiante" ? (
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          Usuario sin ficha de estudiante
                        </div>
                        {resultado.estudiante_username && (
                          <div className="text-xs text-gray-500">
                            {resultado.estudiante_username}
                          </div>
                        )}
                      </div>
                    ) : resultado.identidad_tipo === "username_inferido" ? (
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          Identidad por username
                        </div>
                        {resultado.estudiante_username && (
                          <div className="text-xs text-gray-500">
                            {resultado.estudiante_username}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">
                          {resultado.estudiante_nombre ||
                            resultado.estudiante_username ||
                            "Identidad no disponible"}
                        </div>
                        {resultado.estudiante_username && (
                          <div className="text-xs text-gray-500">
                            {resultado.estudiante_username}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {resultado.seccion_textual || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {resultado.unidad_titulo || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {resultado.actividad_titulo || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {resultado.bloque_id || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {resultado.actividad_tipo || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div>{resultado.numero_intento ?? "—"}</div>
                    <div className="text-xs text-gray-500">
                      ID {resultado.intento_id ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatearPuntaje(resultado.puntaje_final)}
                  </td>
                  <td className="px-4 py-3">
                    <NivelCalificacion nivel={resultado.nivel_final} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {resultado.decision_final || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PublicacionBadge estado={resultado.estado_publicacion} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {etiquetaFuente(resultado.fuente_calificacion)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {formatearFecha(resultado.fecha_calificacion)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {loading && resultados.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500">
          Actualizando resultados…
        </div>
      )}
    </section>
  );
}

export default function ReportePedagogicoAulaVirtual() {
  const [draftFilters, setDraftFilters] = useState({ ...INITIAL_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...INITIAL_FILTERS });
  const [data, setData] = useState(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    const sequence = ++requestSequence.current;

    getConsolidadoCalificaciones(appliedFilters)
      .then((response) => {
        if (sequence !== requestSequence.current) return;
        setData({
          ...EMPTY_RESPONSE,
          ...normalizarConsolidadoCalificaciones(response),
        });
      })
      .catch((requestError) => {
        if (sequence !== requestSequence.current) return;
        setError(mapReporteApiError(requestError));
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
  }, [appliedFilters]);

  const unidadOptions = useMemo(
    () =>
      (Array.isArray(data.unidades) ? data.unidades : []).filter(
        (unidad) => unidad?.unidad_id !== undefined
      ),
    [data.unidades]
  );

  function actualizarDraft(campo, valor) {
    setDraftFilters((prev) => ({ ...prev, [campo]: valor }));
    setValidationError("");
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    if (
      String(draftFilters.usuarioId).trim() &&
      draftFilters.estudianteUsername.trim()
    ) {
      setValidationError("Usa Usuario ID o Username, no ambos.");
      return;
    }

    setValidationError("");
    setError(null);
    setLoading(true);
    setAppliedFilters({ ...draftFilters, page: 1 });
    setDraftFilters((prev) => ({ ...prev, page: 1 }));
  }

  function limpiarFiltros() {
    const filtros = { ...INITIAL_FILTERS };
    setValidationError("");
    setError(null);
    setLoading(true);
    setDraftFilters(filtros);
    setAppliedFilters(filtros);
  }

  function cambiarPagina(page) {
    setError(null);
    setLoading(true);
    setAppliedFilters((prev) => ({ ...prev, page }));
    setDraftFilters((prev) => ({ ...prev, page }));
  }

  function cambiarPageSize(valor) {
    const pageSize = Number(valor);
    setError(null);
    setLoading(true);
    setDraftFilters((prev) => ({ ...prev, pageSize, page: 1 }));
    setAppliedFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  }

  const resumen = { ...EMPTY_RESPONSE.resumen, ...(data.resumen || {}) };
  const paginacion = {
    ...EMPTY_RESPONSE.paginacion,
    ...(data.paginacion || {}),
  };
  const resultados = Array.isArray(data.resultados) ? data.resultados : [];
  const unidades = Array.isArray(data.unidades) ? data.unidades : [];

  return (
    <main className="min-h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#1a4a8a]">
            Aula Virtual
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Reporte pedagógico
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Escala 0–100 · Política: último intento revisado
          </p>
        </header>

        <ResumenCalificaciones resumen={resumen} />

        {debeMostrarAlertaCalidad(resumen) && (
          <section
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            role="status"
            aria-live="polite"
          >
            Hay {resumen.registros_sin_vincular} registros históricos sin
            vínculo formal con un estudiante. Se conservan para trazabilidad y
            no se contabilizan como estudiantes identificados.
          </section>
        )}

        <form
          onSubmit={aplicarFiltros}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <label className="text-sm font-medium text-gray-700">
              Unidad
              <select
                value={draftFilters.unidadId}
                onChange={(event) =>
                  actualizarDraft("unidadId", event.target.value)
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              >
                <option value="">Todas</option>
                {unidadOptions.map((unidad) => (
                  <option key={unidad.unidad_id} value={unidad.unidad_id}>
                    {unidad.unidad_titulo || `Unidad ${unidad.unidad_id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Bloque / actividad ID
              <input
                value={draftFilters.bloqueId}
                onChange={(event) =>
                  actualizarDraft("bloqueId", event.target.value)
                }
                maxLength={200}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Usuario ID
              <input
                type="number"
                min="1"
                step="1"
                value={draftFilters.usuarioId}
                onChange={(event) =>
                  actualizarDraft("usuarioId", event.target.value)
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Username
              <input
                value={draftFilters.estudianteUsername}
                onChange={(event) =>
                  actualizarDraft("estudianteUsername", event.target.value)
                }
                maxLength={150}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Estado
              <select
                value={draftFilters.estadoCalificacion}
                onChange={(event) =>
                  actualizarDraft("estadoCalificacion", event.target.value)
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              >
                <option value="todas">Todas</option>
                <option value="definitiva">Definitivas</option>
                <option value="provisional">Provisionales</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Calidad de identidad
              <select
                value={draftFilters.calidadIdentidad}
                onChange={(event) =>
                  actualizarDraft("calidadIdentidad", event.target.value)
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              >
                <option value="todas">Todas</option>
                <option value="identificadas">Identificadas</option>
                <option value="sin_vincular">Sin vincular</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Filas por página
              <select
                value={draftFilters.pageSize}
                onChange={(event) => cambiarPageSize(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              >
                {[25, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Las unidades mostradas corresponden a las observadas en la respuesta,
            no a un catálogo institucional completo.
          </p>

          {validationError && (
            <p className="mt-3 text-sm font-medium text-red-700" role="alert">
              {validationError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#1a4a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </form>

        <div aria-live="polite" className="sr-only">
          {loading ? "Cargando reporte pedagógico." : "Reporte actualizado."}
        </div>

        {error && (
          <section
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">{error.message}</p>
            {error.retryable && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  setAppliedFilters((prev) => ({ ...prev }));
                }}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                Reintentar
              </button>
            )}
          </section>
        )}

        {!error && (
          <>
            <ResumenUnidades unidades={unidades} />
            <TablaCalificaciones resultados={resultados} loading={loading} />

            <nav
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4"
              aria-label="Paginación del consolidado"
            >
              <span className="text-sm text-gray-600">
                {paginacion.total} resultado(s)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => cambiarPagina(paginacion.page - 1)}
                  disabled={loading || paginacion.page <= 1}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Página {paginacion.pages === 0 ? 0 : paginacion.page} de{" "}
                  {paginacion.pages}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarPagina(paginacion.page + 1)}
                  disabled={
                    loading ||
                    paginacion.pages === 0 ||
                    paginacion.page >= paginacion.pages
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
