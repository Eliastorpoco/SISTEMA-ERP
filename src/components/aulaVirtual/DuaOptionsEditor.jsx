import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  guardarOpcionesDUABloqueAulaVirtual,
} from "../../services/aulaVirtualBlocksService";

// dua-frontend-options-editor-v1
const PRINCIPIOS_DUA = [
  {
    codigo: "IMPLICACION",
    titulo: "Implicación",
    descripcion:
      "Opciones para favorecer el interés, la participación y la autonomía.",
  },
  {
    codigo: "REPRESENTACION",
    titulo: "Representación",
    descripcion:
      "Opciones para presentar la información de distintas maneras.",
  },
  {
    codigo: "ACCION_EXPRESION",
    titulo: "Acción y expresión",
    descripcion:
      "Opciones para demostrar el aprendizaje mediante diferentes medios.",
  },
];

const AGRUPACIONES_DUA = [
  {
    codigo: "INDIVIDUAL",
    titulo: "Individual",
  },
  {
    codigo: "PAREJAS",
    titulo: "Parejas",
  },
  {
    codigo: "GRUPAL",
    titulo: "Grupal",
  },
  {
    codigo: "FLEXIBLE",
    titulo: "Flexible",
  },
];

const CODIGOS_PRINCIPIO = new Set(
  PRINCIPIOS_DUA.map(
    (item) => item.codigo
  )
);

const CODIGOS_AGRUPACION = new Set(
  AGRUPACIONES_DUA.map(
    (item) => item.codigo
  )
);

// dua-options-wheel-guard-v1
const bloquearCambioPorRueda = (
  event
) => {
  event.currentTarget.blur();
};

const normalizarOpcionDua = (
  opcion = {},
  indice = 0
) => {
  const principio =
    CODIGOS_PRINCIPIO.has(
      opcion?.principio
    )
      ? opcion.principio
      : "IMPLICACION";

  const tipoAgrupacion =
    CODIGOS_AGRUPACION.has(
      opcion?.tipo_agrupacion
    )
      ? opcion.tipo_agrupacion
      : "INDIVIDUAL";

  const ordenNumero = Number(
    opcion?.orden
  );

  const metadatos =
    opcion?.metadatos &&
    typeof opcion.metadatos === "object" &&
    !Array.isArray(opcion.metadatos)
      ? opcion.metadatos
      : {};

  return {
    principio,
    codigo_directriz: String(
      opcion?.codigo_directriz || ""
    ),
    titulo: String(
      opcion?.titulo || ""
    ),
    descripcion: String(
      opcion?.descripcion || ""
    ),
    tipo_agrupacion: tipoAgrupacion,
    orden: Number.isFinite(ordenNumero)
      ? Math.max(
          0,
          Math.trunc(ordenNumero)
        )
      : indice + 1,
    es_obligatoria: Boolean(
      opcion?.es_obligatoria
    ),
    es_predeterminada: Boolean(
      opcion?.es_predeterminada
    ),
    es_activa:
      opcion?.es_activa !== false,
    metadatos,
  };
};

const obtenerOpcionesRespuesta = (
  respuesta
) => {
  const opciones =
    respuesta?.dua?.opciones;

  return Array.isArray(opciones)
    ? opciones
    : [];
};

const etiquetaAgrupacion = (
  codigo
) =>
  AGRUPACIONES_DUA.find(
    (item) => item.codigo === codigo
  )?.titulo || codigo;

export default function DuaOptionsEditor({
  bloqueId,
  duaConsulta,
  editando = false,
  puedeEditar = false,
  guardandoBase = false,
  onSaved,
}) {
  const configuracion =
    duaConsulta?.dua?.configuracion &&
    typeof duaConsulta.dua
      .configuracion === "object"
      ? duaConsulta.dua.configuracion
      : null;

  const existeConfiguracion = Boolean(
    duaConsulta?.dua
      ?.existe_configuracion &&
      configuracion
  );

  const opcionesServidor = useMemo(
    () =>
      obtenerOpcionesRespuesta(
        duaConsulta
      ),
    [duaConsulta]
  );

  const [opcionesForm, setOpcionesForm] =
    useState([]);

  const [
    guardandoOpciones,
    setGuardandoOpciones,
  ] = useState(false);

  const [
    errorOpciones,
    setErrorOpciones,
  ] = useState("");

  const [
    mensajeOpciones,
    setMensajeOpciones,
  ] = useState("");

  useEffect(() => {
    if (guardandoOpciones) return;

    setOpcionesForm(
      opcionesServidor.map(
        normalizarOpcionDua
      )
    );

    setErrorOpciones("");
    setMensajeOpciones("");
  }, [
    opcionesServidor,
    editando,
    guardandoOpciones,
  ]);

  const opcionesAgrupadas = useMemo(
    () =>
      PRINCIPIOS_DUA.reduce(
        (acumulado, principio) => {
          acumulado[
            principio.codigo
          ] = opcionesServidor.filter(
            (opcion) =>
              opcion?.principio ===
              principio.codigo
          );

          return acumulado;
        },
        {}
      ),
    [opcionesServidor]
  );

  const actualizarOpcion = (
    indice,
    campo,
    valor
  ) => {
    setOpcionesForm(
      (actuales) =>
        actuales.map(
          (opcion, posicion) =>
            posicion === indice
              ? {
                  ...opcion,
                  [campo]: valor,
                }
              : opcion
        )
    );

    setErrorOpciones("");
    setMensajeOpciones("");
  };

  const agregarOpcion = (
    principio
  ) => {
    const ordenes = opcionesForm
      .filter(
        (opcion) =>
          opcion.principio ===
          principio
      )
      .map(
        (opcion) =>
          Number(opcion.orden) || 0
      );

    const siguienteOrden =
      Math.max(0, ...ordenes) + 1;

    setOpcionesForm(
      (actuales) => [
        ...actuales,
        normalizarOpcionDua(
          {
            principio,
            orden: siguienteOrden,
            es_activa: true,
            tipo_agrupacion:
              "INDIVIDUAL",
            metadatos: {
              origen:
                "dua-opciones-frontend-v1",
            },
          },
          actuales.length
        ),
      ]
    );

    setErrorOpciones("");
    setMensajeOpciones("");
  };

  const eliminarOpcion = (
    indice
  ) => {
    setOpcionesForm(
      (actuales) =>
        actuales.filter(
          (_, posicion) =>
            posicion !== indice
        )
    );

    setErrorOpciones("");
    setMensajeOpciones("");
  };

  const construirPayload = () => {
    if (
      opcionesForm.length === 0
    ) {
      throw new Error(
        "Debe conservarse al menos una opción DUA."
      );
    }

    if (
      opcionesForm.length > 60
    ) {
      throw new Error(
        "No pueden guardarse más de 60 opciones DUA."
      );
    }

    const principiosSinOpciones =
      PRINCIPIOS_DUA.filter(
        (principio) =>
          !opcionesForm.some(
            (opcion) =>
              opcion.principio ===
              principio.codigo
          )
      );

    if (
      principiosSinOpciones.length > 0
    ) {
      throw new Error(
        "Debe conservarse al menos una opción en cada principio DUA."
      );
    }

    const duplicados = new Set();

    return opcionesForm.map(
      (opcion, indice) => {
        const titulo = String(
          opcion.titulo || ""
        ).trim();

        const descripcion = String(
          opcion.descripcion || ""
        ).trim();

        if (!titulo) {
          throw new Error(
            `La opción ${indice + 1} necesita un título.`
          );
        }

        if (!descripcion) {
          throw new Error(
            `La opción ${indice + 1} necesita una descripción.`
          );
        }

        const claveDuplicado = [
          opcion.principio,
          titulo.toLocaleLowerCase(
            "es"
          ),
        ].join("|");

        if (
          duplicados.has(
            claveDuplicado
          )
        ) {
          throw new Error(
            `El título "${titulo}" está repetido dentro del mismo principio.`
          );
        }

        duplicados.add(
          claveDuplicado
        );

        return {
          principio:
            opcion.principio,
          codigo_directriz:
            String(
              opcion.codigo_directriz ||
                ""
            ).trim() || null,
          titulo,
          descripcion,
          tipo_agrupacion:
            opcion.tipo_agrupacion,
          orden: Math.max(
            0,
            Math.trunc(
              Number(opcion.orden) ||
                0
            )
          ),
          es_obligatoria:
            Boolean(
              opcion.es_obligatoria
            ),
          es_predeterminada:
            Boolean(
              opcion.es_predeterminada
            ),
          es_activa:
            Boolean(
              opcion.es_activa
            ),
          metadatos:
            opcion.metadatos &&
            typeof opcion.metadatos ===
              "object" &&
            !Array.isArray(
              opcion.metadatos
            )
              ? opcion.metadatos
              : {},
        };
      }
    );
  };

  const guardarOpciones = async () => {
    const idNormalizado = String(
      bloqueId || ""
    ).trim();

    if (!idNormalizado) {
      setErrorOpciones(
        "No se encontró el ID del bloque."
      );
      return;
    }

    if (!existeConfiguracion) {
      setErrorOpciones(
        "Primero debe guardarse la configuración base DUA."
      );
      return;
    }

    if (
      configuracion?.estado !==
      "BORRADOR"
    ) {
      setErrorOpciones(
        "Las opciones solo pueden editarse mientras la configuración esté en borrador."
      );
      return;
    }

    let opcionesPayload;

    try {
      opcionesPayload =
        construirPayload();
    } catch (error) {
      setErrorOpciones(
        error?.message ||
          "Revisa las opciones DUA."
      );
      return;
    }

    try {
      setGuardandoOpciones(true);
      setErrorOpciones("");
      setMensajeOpciones("");

      const respuesta =
        await guardarOpcionesDUABloqueAulaVirtual(
          idNormalizado,
          opcionesPayload
        );

      const opcionesGuardadas =
        obtenerOpcionesRespuesta(
          respuesta
        );

      setOpcionesForm(
        opcionesGuardadas.map(
          normalizarOpcionDua
        )
      );

      setMensajeOpciones(
        respuesta?.mensaje ||
          "Opciones DUA guardadas correctamente."
      );

      if (
        typeof onSaved ===
        "function"
      ) {
        onSaved(respuesta);
      }
    } catch (error) {
      setErrorOpciones(
        error?.message ||
          "No fue posible guardar las opciones DUA."
      );
    } finally {
      setGuardandoOpciones(false);
    }
  };

  const bloqueado =
    guardandoOpciones ||
    guardandoBase;

  const estiloCampo = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c4b5fd",
    borderRadius: "10px",
    background: bloqueado
      ? "#f8fafc"
      : "#ffffff",
    color: "#312e81",
    padding: "9px 10px",
    fontSize: "12px",
    outline: "none",
  };

  const estiloEtiqueta = {
    display: "block",
    marginBottom: "5px",
    color: "#5b21b6",
    fontSize: "11px",
    fontWeight: 900,
  };

  if (!existeConfiguracion) {
    if (!editando) return null;

    return (
      <div
        style={{
          marginTop: "12px",
          border:
            "1px dashed #c4b5fd",
          borderRadius: "12px",
          background: "#faf5ff",
          padding: "11px",
          color: "#6d28d9",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Guarda primero la configuración
        base DUA. Después podrás agregar
        las opciones de implicación,
        representación y acción o
        expresión.
      </div>
    );
  }

  if (!editando) {
    return (
      <div
        style={{
          marginTop: "12px",
          display: "grid",
          gap: "10px",
        }}
      >
        {PRINCIPIOS_DUA.map(
          (principio) => {
            const opciones =
              opcionesAgrupadas[
                principio.codigo
              ] || [];

            return (
              <section
                key={principio.codigo}
                style={{
                  border:
                    "1px solid #ddd6fe",
                  borderRadius: "14px",
                  background: "#ffffff",
                  padding: "11px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#5b21b6",
                        fontSize: "12px",
                        fontWeight: 950,
                      }}
                    >
                      {principio.titulo}
                    </div>

                    <div
                      style={{
                        marginTop: "3px",
                        color: "#64748b",
                        fontSize: "11px",
                        lineHeight: 1.4,
                      }}
                    >
                      {
                        principio.descripcion
                      }
                    </div>
                  </div>

                  <span
                    style={{
                      borderRadius:
                        "999px",
                      background:
                        "#f5f3ff",
                      color: "#6d28d9",
                      padding: "5px 9px",
                      fontSize: "11px",
                      fontWeight: 950,
                    }}
                  >
                    {opciones.length}{" "}
                    {opciones.length === 1
                      ? "opción"
                      : "opciones"}
                  </span>
                </div>

                {opciones.length === 0 ? (
                  <div
                    style={{
                      marginTop: "9px",
                      color: "#94a3b8",
                      fontSize: "11px",
                    }}
                  >
                    Sin opciones registradas
                    para este principio.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "8px",
                      marginTop: "10px",
                    }}
                  >
                    {opciones.map(
                      (
                        opcion,
                        indice
                      ) => (
                        <article
                          key={
                            opcion?.id ||
                            `${principio.codigo}-${indice}`
                          }
                          style={{
                            border:
                              "1px solid #ede9fe",
                            borderRadius:
                              "11px",
                            background:
                              "#fafafa",
                            padding: "9px",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#312e81",
                              fontSize:
                                "12px",
                              fontWeight:
                                900,
                            }}
                          >
                            {opcion.titulo}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "4px",
                              color:
                                "#475569",
                              fontSize:
                                "11px",
                              lineHeight:
                                1.45,
                            }}
                          >
                            {
                              opcion.descripcion
                            }
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              gap: "5px",
                              flexWrap:
                                "wrap",
                              marginTop:
                                "7px",
                            }}
                          >
                            <span
                              style={{
                                borderRadius:
                                  "999px",
                                background:
                                  "#ede9fe",
                                color:
                                  "#6d28d9",
                                padding:
                                  "4px 7px",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  850,
                              }}
                            >
                              {etiquetaAgrupacion(
                                opcion.tipo_agrupacion
                              )}
                            </span>

                            {opcion.es_predeterminada && (
                              <span
                                style={{
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#166534",
                                  padding:
                                    "4px 7px",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    850,
                                }}
                              >
                                Predeterminada
                              </span>
                            )}

                            {!opcion.es_activa && (
                              <span
                                style={{
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "#64748b",
                                  padding:
                                    "4px 7px",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    850,
                                }}
                              >
                                Inactiva
                              </span>
                            )}
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>
            );
          }
        )}
      </div>
    );
  }

  if (!puedeEditar) {
    return (
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
        Tu cuenta no tiene permiso para
        editar las opciones DUA.
      </div>
    );
  }

  if (
    configuracion?.estado !==
    "BORRADOR"
  ) {
    return (
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
        La configuración debe encontrarse
        en estado Borrador para editar sus
        opciones.
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: "12px",
        border: "1px solid #c4b5fd",
        borderRadius: "14px",
        background: "#faf5ff",
        padding: "12px",
      }}
    >
      <div
        style={{
          color: "#5b21b6",
          fontSize: "13px",
          fontWeight: 950,
        }}
      >
        Opciones DUA
      </div>

      <div
        style={{
          marginTop: "4px",
          color: "#64748b",
          fontSize: "11px",
          lineHeight: 1.5,
        }}
      >
        El guardado reemplaza la colección
        completa. Revisa todos los campos
        antes de confirmar.
      </div>

      {PRINCIPIOS_DUA.map(
        (principio) => {
          const indices =
            opcionesForm
              .map(
                (opcion, indice) => ({
                  opcion,
                  indice,
                })
              )
              .filter(
                ({ opcion }) =>
                  opcion.principio ===
                  principio.codigo
              );

          return (
            <section
              key={principio.codigo}
              style={{
                marginTop: "11px",
                border:
                  "1px solid #ddd6fe",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#5b21b6",
                      fontSize: "12px",
                      fontWeight: 950,
                    }}
                  >
                    {principio.titulo}
                  </div>

                  <div
                    style={{
                      marginTop: "2px",
                      color: "#64748b",
                      fontSize: "10px",
                    }}
                  >
                    {indices.length}{" "}
                    {indices.length === 1
                      ? "opción"
                      : "opciones"}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() =>
                    agregarOpcion(
                      principio.codigo
                    )
                  }
                  style={{
                    border:
                      "1px solid #8b5cf6",
                    borderRadius: "999px",
                    background: "#ffffff",
                    color: "#6d28d9",
                    padding: "7px 10px",
                    fontSize: "11px",
                    fontWeight: 900,
                    cursor: bloqueado
                      ? "not-allowed"
                      : "pointer",
                    opacity: bloqueado
                      ? 0.6
                      : 1,
                  }}
                >
                  + Agregar opción
                </button>
              </div>

              {indices.length === 0 && (
                <div
                  style={{
                    marginTop: "9px",
                    border:
                      "1px dashed #ddd6fe",
                    borderRadius: "10px",
                    padding: "9px",
                    color: "#94a3b8",
                    fontSize: "11px",
                  }}
                >
                  Todavía no hay opciones
                  en este principio.
                </div>
              )}

              {indices.map(
                ({
                  opcion,
                  indice,
                }) => (
                  <article
                    key={indice}
                    style={{
                      marginTop: "9px",
                      border:
                        "1px solid #ede9fe",
                      borderRadius:
                        "11px",
                      background:
                        "#fdfcff",
                      padding: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: "8px",
                        marginBottom:
                          "9px",
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#312e81",
                          fontSize:
                            "11px",
                        }}
                      >
                        Opción{" "}
                        {opcion.orden}
                      </strong>

                      <button
                        type="button"
                        disabled={bloqueado}
                        onClick={() =>
                          eliminarOpcion(
                            indice
                          )
                        }
                        style={{
                          border:
                            "1px solid #fecaca",
                          borderRadius:
                            "999px",
                          background:
                            "#fff",
                          color:
                            "#b91c1c",
                          padding:
                            "5px 8px",
                          fontSize:
                            "10px",
                          fontWeight:
                            900,
                          cursor:
                            bloqueado
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            bloqueado
                              ? 0.6
                              : 1,
                        }}
                      >
                        Eliminar
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "9px",
                      }}
                    >
                      <label>
                        <span
                          style={
                            estiloEtiqueta
                          }
                        >
                          Principio
                        </span>

                        <select
                          value={
                            opcion.principio
                          }
                          disabled={
                            bloqueado
                          }
                          onWheel={bloquearCambioPorRueda}
                          onChange={(
                            event
                          ) =>
                            actualizarOpcion(
                              indice,
                              "principio",
                              event.target
                                .value
                            )
                          }
                          style={
                            estiloCampo
                          }
                        >
                          {PRINCIPIOS_DUA.map(
                            (item) => (
                              <option
                                key={
                                  item.codigo
                                }
                                value={
                                  item.codigo
                                }
                              >
                                {
                                  item.titulo
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <span
                          style={
                            estiloEtiqueta
                          }
                        >
                          Agrupación
                        </span>

                        <select
                          value={
                            opcion.tipo_agrupacion
                          }
                          disabled={
                            bloqueado
                          }
                          onWheel={bloquearCambioPorRueda}
                          onChange={(
                            event
                          ) =>
                            actualizarOpcion(
                              indice,
                              "tipo_agrupacion",
                              event.target
                                .value
                            )
                          }
                          style={
                            estiloCampo
                          }
                        >
                          {AGRUPACIONES_DUA.map(
                            (item) => (
                              <option
                                key={
                                  item.codigo
                                }
                                value={
                                  item.codigo
                                }
                              >
                                {
                                  item.titulo
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        <span
                          style={
                            estiloEtiqueta
                          }
                        >
                          Orden
                        </span>

                        <input
                          type="number"
                          min="0"
                          max="10000"
                          value={
                            opcion.orden
                          }
                          disabled={
                            bloqueado
                          }
                          onWheel={bloquearCambioPorRueda}
                          onChange={(
                            event
                          ) =>
                            actualizarOpcion(
                              indice,
                              "orden",
                              event.target
                                .value
                            )
                          }
                          style={
                            estiloCampo
                          }
                        />
                      </label>

                      <label>
                        <span
                          style={
                            estiloEtiqueta
                          }
                        >
                          Código de
                          directriz
                        </span>

                        <input
                          type="text"
                          maxLength={80}
                          value={
                            opcion.codigo_directriz
                          }
                          disabled={
                            bloqueado
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarOpcion(
                              indice,
                              "codigo_directriz",
                              event.target
                                .value
                            )
                          }
                          style={
                            estiloCampo
                          }
                          placeholder="Opcional"
                        />
                      </label>
                    </div>

                    <label
                      style={{
                        display: "block",
                        marginTop: "9px",
                      }}
                    >
                      <span
                        style={
                          estiloEtiqueta
                        }
                      >
                        Título
                      </span>

                      <input
                        type="text"
                        maxLength={240}
                        value={
                          opcion.titulo
                        }
                        disabled={
                          bloqueado
                        }
                        onChange={(
                          event
                        ) =>
                          actualizarOpcion(
                            indice,
                            "titulo",
                            event.target
                              .value
                          )
                        }
                        style={estiloCampo}
                      />
                    </label>

                    <label
                      style={{
                        display: "block",
                        marginTop: "9px",
                      }}
                    >
                      <span
                        style={
                          estiloEtiqueta
                        }
                      >
                        Descripción
                      </span>

                      <textarea
                        maxLength={4000}
                        value={
                          opcion.descripcion
                        }
                        disabled={
                          bloqueado
                        }
                        onChange={(
                          event
                        ) =>
                          actualizarOpcion(
                            indice,
                            "descripcion",
                            event.target
                              .value
                          )
                        }
                        style={{
                          ...estiloCampo,
                          minHeight:
                            "72px",
                          resize:
                            "vertical",
                        }}
                      />
                    </label>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginTop: "9px",
                      }}
                    >
                      {[
                        {
                          campo:
                            "es_obligatoria",
                          titulo:
                            "Obligatoria",
                        },
                        {
                          campo:
                            "es_predeterminada",
                          titulo:
                            "Predeterminada",
                        },
                        {
                          campo:
                            "es_activa",
                          titulo:
                            "Activa",
                        },
                      ].map(
                        (item) => (
                          <label
                            key={
                              item.campo
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "6px",
                              color:
                                "#475569",
                              fontSize:
                                "11px",
                              fontWeight:
                                800,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(
                                opcion[
                                  item
                                    .campo
                                ]
                              )}
                              disabled={
                                bloqueado
                              }
                              onChange={(
                                event
                              ) =>
                                actualizarOpcion(
                                  indice,
                                  item.campo,
                                  event
                                    .target
                                    .checked
                                )
                              }
                            />

                            {item.titulo}
                          </label>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </section>
          );
        }
      )}

      {errorOpciones && (
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
          {errorOpciones}
        </div>
      )}

      {mensajeOpciones && (
        <div
          style={{
            marginTop: "11px",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            background: "#f0fdf4",
            color: "#166534",
            padding: "9px 10px",
            fontSize: "12px",
            fontWeight: 850,
          }}
        >
          {mensajeOpciones}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "12px",
        }}
      >
        <button
          type="button"
          disabled={bloqueado}
          onClick={guardarOpciones}
          style={{
            border: "1px solid #6d28d9",
            borderRadius: "999px",
            background: "#6d28d9",
            color: "#ffffff",
            padding: "9px 14px",
            fontWeight: 950,
            cursor: bloqueado
              ? "not-allowed"
              : "pointer",
            opacity: bloqueado
              ? 0.65
              : 1,
          }}
        >
          {guardandoOpciones
            ? "Guardando opciones..."
            : `Guardar opciones DUA (${opcionesForm.length})`}
        </button>
      </div>
    </section>
  );
}
