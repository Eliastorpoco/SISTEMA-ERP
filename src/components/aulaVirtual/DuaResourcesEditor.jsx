import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  guardarRecursosDUABloqueAulaVirtual,
} from "../../services/aulaVirtualBlocksService";

const TIPOS_REPRESENTACION = [
  ["TEXTO_ACCESIBLE", "Texto accesible"],
  ["AUDIO", "Audio"],
  ["VIDEO_SUBTITULADO", "Video subtitulado"],
  ["TRANSCRIPCION", "Transcripción"],
  ["INFOGRAFIA", "Infografía"],
  ["EJEMPLO_GUIADO", "Ejemplo guiado"],
  ["PDF_ACCESIBLE", "PDF accesible"],
  ["SIMULACION", "Simulación"],
  ["OBJETO_REAL", "Objeto real"],
  ["OTRO", "Otro"],
].map(([codigo, etiqueta]) => ({
  codigo,
  etiqueta,
}));

const ORIGENES = [
  ["TEXTO", "Texto directo"],
  ["URL", "URL externa"],
  ["ARCHIVO", "Archivo existente"],
].map(([codigo, etiqueta]) => ({
  codigo,
  etiqueta,
}));

let secuenciaLocal = 0;

const nuevaClaveLocal = () => {
  secuenciaLocal += 1;

  return `recurso-${Date.now()}-${secuenciaLocal}`;
};

const bloquearCambioPorRueda = (
  event
) => {
  event.currentTarget.blur();
};

const estiloEntrada = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#ffffff",
  padding: "9px 10px",
  color: "#0f172a",
  fontSize: "13px",
  outline: "none",
};

const estiloEtiqueta = {
  display: "grid",
  gap: "5px",
};

const estiloTituloCampo = {
  color: "#475569",
  fontSize: "11px",
  fontWeight: 900,
};

const crearRecursoVacio = (
  orden = 1
) => ({
  _key: nuevaClaveLocal(),
  opcion_id: "",
  archivo_id: "",
  tipo_representacion:
    "TEXTO_ACCESIBLE",
  titulo: "",
  descripcion: "",
  contenido_texto: "",
  url_externa: "",
  mime_type: "",
  origen: "TEXTO",
  texto_alternativo: "",
  transcripcion: "",
  lectura_facil: false,
  metadatos_base: {},
  orden,
  es_activo: true,
});

const extraerRecursos = (
  respuesta
) =>
  Array.isArray(
    respuesta?.dua?.recursos
  )
    ? respuesta.dua.recursos
    : [];

const extraerOpciones = (
  respuesta
) =>
  Array.isArray(
    respuesta?.dua?.opciones
  )
    ? respuesta.dua.opciones
    : [];

const inferirOrigen = (
  recurso
) => {
  if (recurso?.archivo_id != null) {
    return "ARCHIVO";
  }

  if (
    String(
      recurso?.url_externa || ""
    ).trim()
  ) {
    return "URL";
  }

  return "TEXTO";
};

const normalizarRecurso = (
  recurso,
  indice
) => {
  const metadatos =
    recurso?.metadatos_accesibilidad &&
    typeof recurso
      .metadatos_accesibilidad ===
      "object" &&
    !Array.isArray(
      recurso.metadatos_accesibilidad
    )
      ? recurso.metadatos_accesibilidad
      : {};

  return {
    _key:
      recurso?.id != null
        ? `recurso-${recurso.id}`
        : nuevaClaveLocal(),
    opcion_id:
      recurso?.opcion_id == null
        ? ""
        : String(recurso.opcion_id),
    archivo_id:
      recurso?.archivo_id == null
        ? ""
        : String(recurso.archivo_id),
    tipo_representacion: String(
      recurso?.tipo_representacion ||
        "TEXTO_ACCESIBLE"
    ),
    titulo: String(
      recurso?.titulo || ""
    ),
    descripcion: String(
      recurso?.descripcion || ""
    ),
    contenido_texto: String(
      recurso?.contenido_texto || ""
    ),
    url_externa: String(
      recurso?.url_externa || ""
    ),
    mime_type: String(
      recurso?.mime_type || ""
    ),
    origen: inferirOrigen(recurso),
    texto_alternativo: String(
      metadatos.texto_alternativo || ""
    ),
    transcripcion: String(
      metadatos.transcripcion || ""
    ),
    lectura_facil: Boolean(
      metadatos.lectura_facil
    ),
    metadatos_base: {
      ...metadatos,
    },
    orden: Number.isInteger(
      Number(recurso?.orden)
    )
      ? Number(recurso.orden)
      : indice + 1,
    es_activo:
      recurso?.es_activo !== false,
  };
};

const etiquetaOpcion = (
  opcion
) => {
  const principio = String(
    opcion?.principio || ""
  )
    .replace(/_/g, " ")
    .toLowerCase();

  const nombrePrincipio =
    principio.charAt(0).toUpperCase() +
    principio.slice(1);

  return [
    nombrePrincipio,
    opcion?.titulo,
  ]
    .filter(Boolean)
    .join(" · ");
};

export default function DuaResourcesEditor({
  bloqueId,
  duaConsulta,
  editando = false,
  puedeEditar = false,
  guardandoBase = false,
  onSaved,
}) {
  const recursosServidor = useMemo(
    () => extraerRecursos(duaConsulta),
    [duaConsulta]
  );

  const opcionesActivas = useMemo(
    () =>
      extraerOpciones(
        duaConsulta
      ).filter(
        (opcion) =>
          opcion?.es_activa !== false
      ),
    [duaConsulta]
  );

  const configuracion =
    duaConsulta?.dua?.configuracion &&
    typeof duaConsulta.dua
      .configuracion === "object"
      ? duaConsulta.dua.configuracion
      : null;

  const [recursosForm, setRecursosForm] =
    useState([]);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    setRecursosForm(
      recursosServidor.map(
        normalizarRecurso
      )
    );

    setMensaje("");
    setError("");
  }, [recursosServidor]);

  const configuracionCreada = Boolean(
    configuracion?.id
  );

  const estadoBorrador =
    configuracion?.estado === "BORRADOR";

  const habilitarEdicion =
    editando &&
    puedeEditar &&
    configuracionCreada &&
    estadoBorrador &&
    !guardandoBase &&
    !guardando;

  const actualizar = (
    key,
    cambios
  ) => {
    setRecursosForm((actuales) =>
      actuales.map((recurso) =>
        recurso._key === key
          ? {
              ...recurso,
              ...cambios,
            }
          : recurso
      )
    );

    setMensaje("");
    setError("");
  };

  const agregarRecurso = () => {
    setRecursosForm((actuales) => {
      const ordenMaximo =
        actuales.reduce(
          (maximo, recurso) =>
            Math.max(
              maximo,
              Number(recurso.orden) || 0
            ),
          0
        );

      return [
        ...actuales,
        crearRecursoVacio(
          ordenMaximo + 1
        ),
      ];
    });

    setMensaje("");
    setError("");
  };

  const eliminarRecurso = (
    key
  ) => {
    setRecursosForm((actuales) =>
      actuales.filter(
        (recurso) =>
          recurso._key !== key
      )
    );

    setMensaje("");
    setError("");
  };

  const construirPayload = () => {
    if (recursosForm.length > 100) {
      throw new Error(
        "No se permiten más de 100 recursos DUA."
      );
    }

    const opcionesPermitidas =
      new Set(
        opcionesActivas.map(
          (opcion) =>
            Number(opcion.id)
        )
      );

    const titulosRegistrados =
      new Set();

    return recursosForm.map(
      (recurso, indice) => {
        const numero = indice + 1;

        const titulo = String(
          recurso.titulo || ""
        ).trim();

        if (!titulo) {
          throw new Error(
            `El recurso ${numero} necesita un título.`
          );
        }

        const opcionTexto = String(
          recurso.opcion_id || ""
        ).trim();

        const opcionId =
          opcionTexto === ""
            ? null
            : Number(opcionTexto);

        if (
          opcionId !== null &&
          (
            !Number.isInteger(
              opcionId
            ) ||
            opcionId <= 0 ||
            !opcionesPermitidas.has(
              opcionId
            )
          )
        ) {
          throw new Error(
            `El recurso ${numero} tiene una opción DUA inválida.`
          );
        }

        const claveTitulo = [
          opcionId ?? "GENERAL",
          titulo.toLocaleLowerCase(
            "es"
          ),
        ].join("|");

        if (
          titulosRegistrados.has(
            claveTitulo
          )
        ) {
          throw new Error(
            "No puede repetirse el mismo título dentro de una misma opción DUA."
          );
        }

        titulosRegistrados.add(
          claveTitulo
        );

        const orden = Number(
          recurso.orden
        );

        if (
          !Number.isInteger(orden) ||
          orden < 0 ||
          orden > 10000
        ) {
          throw new Error(
            `El recurso ${numero} tiene un orden inválido.`
          );
        }

        let archivoId = null;
        let contenidoTexto = null;
        let urlExterna = null;

        if (
          recurso.origen === "TEXTO"
        ) {
          contenidoTexto = String(
            recurso.contenido_texto ||
              ""
          ).trim();

          if (!contenidoTexto) {
            throw new Error(
              `El recurso ${numero} necesita contenido de texto.`
            );
          }
        } else if (
          recurso.origen === "URL"
        ) {
          urlExterna = String(
            recurso.url_externa || ""
          ).trim();

          if (
            !/^https?:\/\//i.test(
              urlExterna
            )
          ) {
            throw new Error(
              `La URL del recurso ${numero} debe comenzar con http:// o https://.`
            );
          }
        } else if (
          recurso.origen === "ARCHIVO"
        ) {
          archivoId = Number(
            recurso.archivo_id
          );

          if (
            !Number.isInteger(
              archivoId
            ) ||
            archivoId <= 0
          ) {
            throw new Error(
              `El recurso ${numero} necesita un ID de archivo válido.`
            );
          }
        } else {
          throw new Error(
            `El recurso ${numero} tiene un origen inválido.`
          );
        }

        const metadatos = {
          ...(
            recurso.metadatos_base &&
            typeof recurso
              .metadatos_base ===
              "object" &&
            !Array.isArray(
              recurso.metadatos_base
            )
              ? recurso.metadatos_base
              : {}
          ),
        };

        const textoAlternativo =
          String(
            recurso
              .texto_alternativo ||
              ""
          ).trim();

        const transcripcion =
          String(
            recurso.transcripcion ||
              ""
          ).trim();

        if (textoAlternativo) {
          metadatos.texto_alternativo =
            textoAlternativo;
        } else {
          delete metadatos.texto_alternativo;
        }

        if (transcripcion) {
          metadatos.transcripcion =
            transcripcion;
        } else {
          delete metadatos.transcripcion;
        }

        metadatos.lectura_facil =
          Boolean(
            recurso.lectura_facil
          );

        return {
          opcion_id: opcionId,
          archivo_id: archivoId,
          tipo_representacion: String(
            recurso
              .tipo_representacion ||
              "TEXTO_ACCESIBLE"
          ),
          titulo,
          descripcion:
            String(
              recurso.descripcion ||
                ""
            ).trim() || null,
          contenido_texto:
            contenidoTexto,
          url_externa: urlExterna,
          mime_type:
            String(
              recurso.mime_type || ""
            ).trim() || null,
          metadatos_accesibilidad:
            metadatos,
          orden,
          es_activo: Boolean(
            recurso.es_activo
          ),
        };
      }
    );
  };

  const guardarRecursos = async () => {
    const idNormalizado = String(
      bloqueId || ""
    ).trim();

    if (!idNormalizado) {
      setError(
        "No se pudo identificar el bloque."
      );
      return;
    }

    if (!habilitarEdicion) {
      setError(
        "Los recursos DUA no están disponibles para edición."
      );
      return;
    }

    try {
      const payload =
        construirPayload();

      if (
        recursosServidor.length > 0 &&
        payload.length === 0 &&
        !window.confirm(
          "Se eliminarán todos los recursos DUA del bloque. ¿Deseas continuar?"
        )
      ) {
        return;
      }

      setGuardando(true);
      setMensaje("");
      setError("");

      const respuesta =
        await guardarRecursosDUABloqueAulaVirtual(
          idNormalizado,
          payload
        );

      setRecursosForm(
        extraerRecursos(
          respuesta
        ).map(
          normalizarRecurso
        )
      );

      setMensaje(
        respuesta?.mensaje ||
          "Recursos DUA guardados correctamente."
      );

      if (
        typeof onSaved === "function"
      ) {
        onSaved(respuesta);
      }
    } catch (errorGuardado) {
      setError(
        errorGuardado?.message ||
          "No fue posible guardar los recursos DUA."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      style={{
        marginTop: "14px",
        border: "1px solid #bae6fd",
        borderRadius: "16px",
        background:
          "linear-gradient(180deg,#f0f9ff,#ffffff)",
        padding: "13px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              color: "#075985",
              fontSize: "13px",
              fontWeight: 950,
              textTransform:
                "uppercase",
              letterSpacing: ".04em",
            }}
          >
            Recursos DUA
          </h4>

          <p
            style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Agrega explicaciones, enlaces,
            ejemplos y materiales accesibles.
          </p>
        </div>

        <span
          style={{
            border: "1px solid #7dd3fc",
            borderRadius: "999px",
            background: "#e0f2fe",
            color: "#075985",
            padding: "5px 9px",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          {recursosForm.length} recurso
          {recursosForm.length === 1
            ? ""
            : "s"}
        </span>
      </div>

      {!configuracionCreada && (
        <div
          style={{
            marginTop: "11px",
            border: "1px solid #fde68a",
            borderRadius: "10px",
            background: "#fffbeb",
            color: "#92400e",
            padding: "9px 10px",
            fontSize: "12px",
          }}
        >
          Primero guarda la configuración
          base DUA del bloque.
        </div>
      )}

      {configuracionCreada &&
        !estadoBorrador && (
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
            Los recursos solo pueden
            editarse en estado BORRADOR.
          </div>
        )}

      {!editando ? (
        <div
          style={{
            display: "grid",
            gap: "9px",
            marginTop: "12px",
          }}
        >
          {recursosForm.length === 0 ? (
            <div
              style={{
                border:
                  "1px dashed #bae6fd",
                borderRadius: "12px",
                background: "#ffffff",
                color: "#64748b",
                padding: "13px",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              Aún no se registraron
              recursos DUA.
            </div>
          ) : (
            recursosForm.map(
              (recurso) => {
                const opcion =
                  opcionesActivas.find(
                    (item) =>
                      String(item.id) ===
                      String(
                        recurso.opcion_id
                      )
                  );

                const tipo =
                  TIPOS_REPRESENTACION.find(
                    (item) =>
                      item.codigo ===
                      recurso
                        .tipo_representacion
                  );

                return (
                  <article
                    key={recurso._key}
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#ffffff",
                      padding: "11px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#0f172a",
                        fontSize: "13px",
                      }}
                    >
                      {recurso.titulo}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#0369a1",
                        fontSize: "11px",
                        fontWeight: 900,
                      }}
                    >
                      {tipo?.etiqueta ||
                        recurso
                          .tipo_representacion}
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      {opcion
                        ? etiquetaOpcion(
                            opcion
                          )
                        : "Recurso general del bloque"}
                    </div>

                    {recurso.descripcion && (
                      <p
                        style={{
                          margin:
                            "7px 0 0",
                          color: "#475569",
                          fontSize: "12px",
                          lineHeight: 1.5,
                        }}
                      >
                        {recurso.descripcion}
                      </p>
                    )}
                  </article>
                );
              }
            )
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            {recursosForm.map(
              (recurso, indice) => (
                <article
                  key={recurso._key}
                  style={{
                    border:
                      "1px solid #cbd5e1",
                    borderRadius: "14px",
                    background: "#ffffff",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#0f172a",
                        fontSize: "13px",
                      }}
                    >
                      Recurso {indice + 1}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarRecurso(
                          recurso._key
                        )
                      }
                      disabled={
                        !habilitarEdicion
                      }
                      style={{
                        border:
                          "1px solid #fecaca",
                        borderRadius:
                          "999px",
                        background:
                          "#fff1f2",
                        color: "#be123c",
                        padding:
                          "6px 10px",
                        fontSize: "11px",
                        fontWeight: 900,
                        cursor:
                          habilitarEdicion
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      Eliminar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(210px,1fr))",
                      gap: "10px",
                      marginTop: "11px",
                    }}
                  >
                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Opción DUA
                      </span>

                      <select
                        value={
                          recurso.opcion_id
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              opcion_id:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        onWheel={
                          bloquearCambioPorRueda
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      >
                        <option value="">
                          Recurso general
                        </option>

                        {opcionesActivas.map(
                          (opcion) => (
                            <option
                              key={opcion.id}
                              value={opcion.id}
                            >
                              {etiquetaOpcion(
                                opcion
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Representación
                      </span>

                      <select
                        value={
                          recurso
                            .tipo_representacion
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              tipo_representacion:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        onWheel={
                          bloquearCambioPorRueda
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      >
                        {TIPOS_REPRESENTACION.map(
                          (tipo) => (
                            <option
                              key={
                                tipo.codigo
                              }
                              value={
                                tipo.codigo
                              }
                            >
                              {tipo.etiqueta}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Origen
                      </span>

                      <select
                        value={
                          recurso.origen
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              origen:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        onWheel={
                          bloquearCambioPorRueda
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      >
                        {ORIGENES.map(
                          (origen) => (
                            <option
                              key={
                                origen.codigo
                              }
                              value={
                                origen.codigo
                              }
                            >
                              {origen.etiqueta}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Orden
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={
                          recurso.orden
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              orden:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        onWheel={
                          bloquearCambioPorRueda
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      />
                    </label>
                  </div>

                  <label
                    style={{
                      ...estiloEtiqueta,
                      marginTop: "10px",
                    }}
                  >
                    <span
                      style={
                        estiloTituloCampo
                      }
                    >
                      Título *
                    </span>

                    <input
                      value={
                        recurso.titulo
                      }
                      onChange={(event) =>
                        actualizar(
                          recurso._key,
                          {
                            titulo:
                              event.target
                                .value,
                          }
                        )
                      }
                      maxLength={240}
                      disabled={
                        !habilitarEdicion
                      }
                      style={estiloEntrada}
                    />
                  </label>

                  <label
                    style={{
                      ...estiloEtiqueta,
                      marginTop: "10px",
                    }}
                  >
                    <span
                      style={
                        estiloTituloCampo
                      }
                    >
                      Descripción
                    </span>

                    <textarea
                      value={
                        recurso.descripcion
                      }
                      onChange={(event) =>
                        actualizar(
                          recurso._key,
                          {
                            descripcion:
                              event.target
                                .value,
                          }
                        )
                      }
                      rows={3}
                      maxLength={4000}
                      disabled={
                        !habilitarEdicion
                      }
                      style={{
                        ...estiloEntrada,
                        resize: "vertical",
                      }}
                    />
                  </label>

                  {recurso.origen ===
                    "TEXTO" && (
                    <label
                      style={{
                        ...estiloEtiqueta,
                        marginTop: "10px",
                      }}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Contenido de texto *
                      </span>

                      <textarea
                        value={
                          recurso
                            .contenido_texto
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              contenido_texto:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        rows={5}
                        maxLength={20000}
                        disabled={
                          !habilitarEdicion
                        }
                        style={{
                          ...estiloEntrada,
                          resize: "vertical",
                        }}
                      />
                    </label>
                  )}

                  {recurso.origen ===
                    "URL" && (
                    <label
                      style={{
                        ...estiloEtiqueta,
                        marginTop: "10px",
                      }}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        URL externa *
                      </span>

                      <input
                        type="url"
                        value={
                          recurso.url_externa
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              url_externa:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        placeholder="https://..."
                        maxLength={2000}
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      />
                    </label>
                  )}

                  {recurso.origen ===
                    "ARCHIVO" && (
                    <label
                      style={{
                        ...estiloEtiqueta,
                        marginTop: "10px",
                      }}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        ID de archivo *
                      </span>

                      <input
                        type="number"
                        min="1"
                        value={
                          recurso.archivo_id
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              archivo_id:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        onWheel={
                          bloquearCambioPorRueda
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      />
                    </label>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(220px,1fr))",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Texto alternativo
                      </span>

                      <input
                        value={
                          recurso
                            .texto_alternativo
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              texto_alternativo:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      />
                    </label>

                    <label
                      style={estiloEtiqueta}
                    >
                      <span
                        style={
                          estiloTituloCampo
                        }
                      >
                        Transcripción
                      </span>

                      <input
                        value={
                          recurso
                            .transcripcion
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              transcripcion:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        style={estiloEntrada}
                      />
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "18px",
                      flexWrap: "wrap",
                      marginTop: "11px",
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          recurso
                            .lectura_facil
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              lectura_facil:
                                event
                                  .target
                                  .checked,
                            }
                          )
                        }
                        disabled={
                          !habilitarEdicion
                        }
                      />{" "}
                      Lectura fácil
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={
                          recurso.es_activo
                        }
                        onChange={(event) =>
                          actualizar(
                            recurso._key,
                            {
                              es_activo:
                                event
                                  .target
                                  .checked,
                            }
                          )
                        }
                        disabled={
                          !habilitarEdicion
                        }
                      />{" "}
                      Recurso activo
                    </label>
                  </div>
                </article>
              )
            )}

            {recursosForm.length === 0 && (
              <div
                style={{
                  border:
                    "1px dashed #7dd3fc",
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: "#64748b",
                  padding: "13px",
                  textAlign: "center",
                  fontSize: "12px",
                }}
              >
                Agrega el primer recurso
                accesible del bloque.
              </div>
            )}
          </div>

          {error && (
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
              {error}
            </div>
          )}

          {mensaje && (
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
              {mensaje}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "9px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              onClick={agregarRecurso}
              disabled={
                !habilitarEdicion ||
                recursosForm.length >= 100
              }
              style={{
                border:
                  "1px solid #0284c7",
                borderRadius: "999px",
                background: "#ffffff",
                color: "#0369a1",
                padding: "8px 12px",
                fontWeight: 900,
                cursor:
                  habilitarEdicion
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              + Agregar recurso
            </button>

            <button
              type="button"
              onClick={guardarRecursos}
              disabled={
                !habilitarEdicion
              }
              style={{
                border:
                  "1px solid #0369a1",
                borderRadius: "999px",
                background: "#0369a1",
                color: "#ffffff",
                padding: "9px 14px",
                fontWeight: 950,
                cursor:
                  habilitarEdicion
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {guardando
                ? "Guardando..."
                : `Guardar recursos DUA (${recursosForm.length})`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
