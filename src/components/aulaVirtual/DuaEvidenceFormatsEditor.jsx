import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  guardarFormatosEvidenciaDUABloqueAulaVirtual,
} from "../../services/aulaVirtualBlocksService";

// dua-frontend-evidence-formats-editor-v1
const MB = 1024 * 1024;

const FORMATOS_CATALOGO = [
  {
    codigo: "TEXTO",
    nombre: "Texto escrito",
    descripcion:
      "Respuesta escrita directamente en el aula virtual.",
    requiere_archivo: false,
    admite_url: false,
    permite_texto_directo: true,
    mime_types: [],
    tamano_mb: "",
    duracion_minutos: "",
  },
  {
    codigo: "DOCUMENTO",
    nombre: "Documento",
    descripcion:
      "Documento PDF, Word u otro archivo autorizado.",
    requiere_archivo: true,
    admite_url: false,
    permite_texto_directo: false,
    mime_types: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    tamano_mb: "35",
    duracion_minutos: "",
  },
  {
    codigo: "AUDIO",
    nombre: "Audio",
    descripcion:
      "Grabación de voz, explicación oral o pódcast.",
    requiere_archivo: true,
    admite_url: false,
    permite_texto_directo: false,
    mime_types: [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
    ],
    tamano_mb: "50",
    duracion_minutos: "10",
  },
  {
    codigo: "VIDEO",
    nombre: "Video",
    descripcion:
      "Exposición, demostración o producción audiovisual.",
    requiere_archivo: true,
    admite_url: true,
    permite_texto_directo: false,
    mime_types: [
      "video/mp4",
      "video/webm",
    ],
    tamano_mb: "200",
    duracion_minutos: "15",
  },
  {
    codigo: "IMAGEN",
    nombre: "Imagen",
    descripcion:
      "Fotografía, dibujo, captura o producción visual.",
    requiere_archivo: true,
    admite_url: false,
    permite_texto_directo: false,
    mime_types: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    tamano_mb: "20",
    duracion_minutos: "",
  },
  {
    codigo: "INFOGRAFIA",
    nombre: "Infografía",
    descripcion:
      "Síntesis visual presentada como imagen, PDF o enlace.",
    requiere_archivo: true,
    admite_url: true,
    permite_texto_directo: false,
    mime_types: [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ],
    tamano_mb: "35",
    duracion_minutos: "",
  },
  {
    codigo: "MAPA_CONCEPTUAL",
    nombre: "Mapa conceptual",
    descripcion:
      "Organizador gráfico presentado como archivo o enlace.",
    requiere_archivo: true,
    admite_url: true,
    permite_texto_directo: false,
    mime_types: [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ],
    tamano_mb: "35",
    duracion_minutos: "",
  },
  {
    codigo: "PRESENTACION",
    nombre: "Presentación",
    descripcion:
      "Diapositivas, exposición digital o enlace a una presentación.",
    requiere_archivo: true,
    admite_url: true,
    permite_texto_directo: false,
    mime_types: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    tamano_mb: "100",
    duracion_minutos: "",
  },
  {
    codigo: "ENLACE",
    nombre: "Enlace web",
    descripcion:
      "URL a un recurso, publicación o producto digital.",
    requiere_archivo: false,
    admite_url: true,
    permite_texto_directo: false,
    mime_types: [],
    tamano_mb: "",
    duracion_minutos: "",
  },
  {
    codigo: "ACTIVIDAD_PRACTICA",
    nombre: "Actividad práctica",
    descripcion:
      "Descripción, registro o enlace de una ejecución práctica.",
    requiere_archivo: false,
    admite_url: true,
    permite_texto_directo: true,
    mime_types: [],
    tamano_mb: "",
    duracion_minutos: "",
  },
];

const FORMATO_POR_CODIGO = new Map(
  FORMATOS_CATALOGO.map(
    (item) => [
      item.codigo,
      item,
    ]
  )
);

const CODIGOS_VALIDOS = new Set(
  FORMATOS_CATALOGO.map(
    (item) => item.codigo
  )
);

const extraerFormatos = (
  respuesta
) => {
  const formatos =
    respuesta?.dua
      ?.formatos_evidencia;

  return Array.isArray(formatos)
    ? formatos
    : [];
};

const bloquearRueda = (
  event
) => {
  event.currentTarget.blur();
};

const numeroPositivoTexto = (
  valor
) => {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero <= 0
  ) {
    return "";
  }

  return String(
    Math.round(
      numero * 100
    ) / 100
  );
};

const bytesAMb = (
  valor
) => {
  const numero = Number(valor);

  return numero > 0
    ? numeroPositivoTexto(
        numero / MB
      )
    : "";
};

const segundosAMinutos = (
  valor
) => {
  const numero = Number(valor);

  return numero > 0
    ? numeroPositivoTexto(
        numero / 60
      )
    : "";
};

const crearFormatoCatalogo = (
  codigo,
  indice = 0
) => {
  const catalogo =
    FORMATO_POR_CODIGO.get(
      codigo
    ) ||
    FORMATOS_CATALOGO[0];

  return {
    _key:
      `nuevo-${catalogo.codigo}-${Date.now()}-${indice}`,
    codigo_formato:
      catalogo.codigo,
    nombre:
      catalogo.nombre,
    indicaciones:
      catalogo.descripcion,
    mime_types_texto:
      catalogo.mime_types.join(
        ", "
      ),
    tamano_maximo_mb:
      catalogo.tamano_mb,
    duracion_maxima_minutos:
      catalogo
        .duracion_minutos,
    requiere_archivo:
      catalogo
        .requiere_archivo,
    admite_url:
      catalogo.admite_url,
    permite_texto_directo:
      catalogo
        .permite_texto_directo,
    es_predeterminado: false,
    es_activo: true,
    orden: indice + 1,
    metadatos: {
      origen:
        "dua-formatos-evidencia-frontend-v1",
    },
  };
};

const normalizarFormato = (
  formato = {},
  indice = 0
) => {
  const codigo =
    CODIGOS_VALIDOS.has(
      formato?.codigo_formato
    )
      ? formato.codigo_formato
      : "TEXTO";

  const catalogo =
    FORMATO_POR_CODIGO.get(
      codigo
    );

  const mimeTypes =
    Array.isArray(
      formato
        ?.mime_types_permitidos
    )
      ? formato
          .mime_types_permitidos
      : [];

  return {
    _key:
      formato?.id != null
        ? `servidor-${formato.id}`
        : `formato-${codigo}-${indice}`,
    codigo_formato: codigo,
    nombre: String(
      formato?.nombre ||
        catalogo?.nombre ||
        ""
    ),
    indicaciones: String(
      formato?.indicaciones ||
        ""
    ),
    mime_types_texto:
      mimeTypes.join(", "),
    tamano_maximo_mb:
      bytesAMb(
        formato
          ?.tamano_maximo_bytes
      ),
    duracion_maxima_minutos:
      segundosAMinutos(
        formato
          ?.duracion_maxima_segundos
      ),
    requiere_archivo: Boolean(
      formato
        ?.requiere_archivo
    ),
    admite_url: Boolean(
      formato?.admite_url
    ),
    permite_texto_directo:
      Boolean(
        formato
          ?.permite_texto_directo
      ),
    es_predeterminado:
      Boolean(
        formato
          ?.es_predeterminado
      ),
    es_activo:
      formato?.es_activo !== false,
    orden:
      Number.isFinite(
        Number(formato?.orden)
      )
        ? Math.max(
            0,
            Math.trunc(
              Number(formato.orden)
            )
          )
        : indice + 1,
    metadatos:
      formato?.metadatos &&
      typeof formato.metadatos ===
        "object" &&
      !Array.isArray(
        formato.metadatos
      )
        ? formato.metadatos
        : {},
  };
};

const parsearMimeTypes = (
  valor
) => {
  const vistos = new Set();

  return String(valor || "")
    .split(/[\n,;]+/)
    .map(
      (item) =>
        item
          .trim()
          .toLowerCase()
    )
    .filter(Boolean)
    .filter(
      (item) => {
        if (vistos.has(item)) {
          return false;
        }

        vistos.add(item);
        return true;
      }
    );
};

const etiquetaCanales = (
  formato
) => {
  const canales = [];

  if (
    formato?.requiere_archivo
  ) {
    canales.push("Archivo");
  }

  if (formato?.admite_url) {
    canales.push("URL");
  }

  if (
    formato
      ?.permite_texto_directo
  ) {
    canales.push("Texto");
  }

  return canales.length > 0
    ? canales.join(" · ")
    : "Sin canal";
};

const estiloEntrada = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #c4b5fd",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#312e81",
  padding: "8px 9px",
  fontSize: "12px",
};

const estiloEtiqueta = {
  display: "block",
  color: "#4c1d95",
  fontSize: "11px",
  fontWeight: 900,
};

export default function DuaEvidenceFormatsEditor({
  bloqueId,
  duaConsulta,
  editando = false,
  puedeEditar = false,
  guardandoBase = false,
  onSaved,
}) {
  const configuracion =
    duaConsulta?.dua
      ?.configuracion &&
    typeof duaConsulta.dua
      .configuracion === "object"
      ? duaConsulta.dua
          .configuracion
      : null;

  const existeConfiguracion =
    Boolean(
      duaConsulta?.dua
        ?.existe_configuracion &&
        configuracion
    );

  const formatosServidor =
    useMemo(
      () =>
        extraerFormatos(
          duaConsulta
        ),
      [duaConsulta]
    );

  const [
    formatosForm,
    setFormatosForm,
  ] = useState([]);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    if (guardando) return;

    setFormatosForm(
      formatosServidor.map(
        normalizarFormato
      )
    );

    setError("");
    setMensaje("");
  }, [
    formatosServidor,
    editando,
    guardando,
  ]);

  const habilitarEdicion =
    Boolean(
      editando &&
      puedeEditar &&
      existeConfiguracion &&
      configuracion?.estado ===
        "BORRADOR" &&
      !guardandoBase &&
      !guardando
    );

  const codigosUsados =
    useMemo(
      () =>
        new Set(
          formatosForm.map(
            (formato) =>
              formato
                .codigo_formato
          )
        ),
      [formatosForm]
    );

  const actualizarFormato = (
    key,
    cambios
  ) => {
    setFormatosForm(
      (actuales) =>
        actuales.map(
          (formato) =>
            formato._key === key
              ? {
                  ...formato,
                  ...cambios,
                }
              : formato
        )
    );

    setError("");
    setMensaje("");
  };

  const cambiarCodigo = (
    key,
    codigo
  ) => {
    setFormatosForm(
      (actuales) =>
        actuales.map(
          (
            formato,
            indice
          ) => {
            if (
              formato._key !== key
            ) {
              return formato;
            }

            const nuevo =
              crearFormatoCatalogo(
                codigo,
                indice
              );

            return {
              ...nuevo,
              _key: formato._key,
              es_activo:
                formato.es_activo,
              orden:
                formato.orden,
            };
          }
        )
    );

    setError("");
    setMensaje("");
  };

  const agregarFormato = () => {
    const disponible =
      FORMATOS_CATALOGO.find(
        (item) =>
          !codigosUsados.has(
            item.codigo
          )
      );

    if (!disponible) {
      setError(
        "Ya se agregaron los diez formatos disponibles."
      );

      return;
    }

    setFormatosForm(
      (actuales) => [
        ...actuales,
        crearFormatoCatalogo(
          disponible.codigo,
          actuales.length
        ),
      ]
    );

    setError("");
    setMensaje("");
  };

  const eliminarFormato = (
    key
  ) => {
    setFormatosForm(
      (actuales) =>
        actuales
          .filter(
            (formato) =>
              formato._key !== key
          )
          .map(
            (
              formato,
              indice
            ) => ({
              ...formato,
              orden: indice + 1,
            })
          )
    );

    setError("");
    setMensaje("");
  };

  const cambiarPredeterminado = (
    key,
    checked
  ) => {
    setFormatosForm(
      (actuales) =>
        actuales.map(
          (formato) => ({
            ...formato,
            es_predeterminado:
              formato._key === key
                ? checked
                : checked
                  ? false
                  : formato
                      .es_predeterminado,
          })
        )
    );

    setError("");
    setMensaje("");
  };

  const construirPayload = () => {
    if (!existeConfiguracion) {
      throw new Error(
        "Primero guarda la configuración base DUA."
      );
    }

    if (
      configuracion?.estado !==
      "BORRADOR"
    ) {
      throw new Error(
        "Los formatos solo pueden editarse mientras la configuración esté en borrador."
      );
    }

    if (
      formatosForm.length > 10
    ) {
      throw new Error(
        "No pueden guardarse más de diez formatos."
      );
    }

    const codigos = new Set();
    let predeterminados = 0;

    return formatosForm.map(
      (
        formato,
        indice
      ) => {
        const codigo =
          String(
            formato
              .codigo_formato ||
              ""
          ).trim();

        const nombre =
          String(
            formato.nombre || ""
          ).trim();

        const indicaciones =
          String(
            formato
              .indicaciones || ""
          ).trim();

        if (
          !CODIGOS_VALIDOS.has(
            codigo
          )
        ) {
          throw new Error(
            `El formato ${
              indice + 1
            } tiene un código inválido.`
          );
        }

        if (codigos.has(codigo)) {
          throw new Error(
            "No pueden repetirse los códigos de formato."
          );
        }

        codigos.add(codigo);

        if (!nombre) {
          throw new Error(
            `Escribe el nombre del formato ${
              indice + 1
            }.`
          );
        }

        const requiereArchivo =
          Boolean(
            formato
              .requiere_archivo
          );

        const admiteUrl =
          Boolean(
            formato.admite_url
          );

        const permiteTexto =
          Boolean(
            formato
              .permite_texto_directo
          );

        if (
          !requiereArchivo &&
          !admiteUrl &&
          !permiteTexto
        ) {
          throw new Error(
            `El formato "${nombre}" debe admitir archivo, URL o texto directo.`
          );
        }

        const mimeTypes =
          parsearMimeTypes(
            formato
              .mime_types_texto
          );

        if (
          mimeTypes.length > 50
        ) {
          throw new Error(
            `El formato "${nombre}" supera 50 tipos MIME.`
          );
        }

        if (
          mimeTypes.some(
            (item) =>
              item.length > 160 ||
              !item.includes("/")
          )
        ) {
          throw new Error(
            `Revisa los tipos MIME de "${nombre}".`
          );
        }

        const tamanoTexto =
          String(
            formato
              .tamano_maximo_mb ||
              ""
          ).trim();

        const duracionTexto =
          String(
            formato
              .duracion_maxima_minutos ||
              ""
          ).trim();

        const tamanoMb =
          Number(tamanoTexto);

        const duracionMinutos =
          Number(duracionTexto);

        if (
          !requiereArchivo &&
          (
            mimeTypes.length > 0 ||
            tamanoTexto
          )
        ) {
          throw new Error(
            `El formato "${nombre}" no requiere archivo; elimina los MIME y el tamaño máximo.`
          );
        }

        if (
          tamanoTexto &&
          (
            !Number.isFinite(
              tamanoMb
            ) ||
            tamanoMb <= 0 ||
            tamanoMb > 1024
          )
        ) {
          throw new Error(
            `El tamaño máximo de "${nombre}" debe estar entre 0,01 y 1024 MB.`
          );
        }

        if (
          duracionTexto &&
          (
            !Number.isFinite(
              duracionMinutos
            ) ||
            duracionMinutos <= 0 ||
            duracionMinutos > 1440
          )
        ) {
          throw new Error(
            `La duración máxima de "${nombre}" debe estar entre 0,01 y 1440 minutos.`
          );
        }

        const predeterminado =
          Boolean(
            formato
              .es_predeterminado
          );

        const activo =
          formato
            .es_activo !== false;

        if (predeterminado) {
          predeterminados += 1;

          if (!activo) {
            throw new Error(
              "El formato predeterminado debe estar activo."
            );
          }
        }

        if (
          predeterminados > 1
        ) {
          throw new Error(
            "Solo puede existir un formato predeterminado."
          );
        }

        return {
          codigo_formato: codigo,
          nombre,
          indicaciones,
          mime_types_permitidos:
            requiereArchivo
              ? mimeTypes
              : [],
          tamano_maximo_bytes:
            requiereArchivo &&
            tamanoTexto
              ? Math.round(
                  tamanoMb * MB
                )
              : null,
          duracion_maxima_segundos:
            duracionTexto
              ? Math.round(
                  duracionMinutos *
                    60
                )
              : null,
          requiere_archivo:
            requiereArchivo,
          admite_url:
            admiteUrl,
          permite_texto_directo:
            permiteTexto,
          es_predeterminado:
            predeterminado,
          es_activo: activo,
          orden: indice + 1,
          metadatos:
            formato?.metadatos &&
            typeof formato
              .metadatos ===
              "object" &&
            !Array.isArray(
              formato.metadatos
            )
              ? formato.metadatos
              : {},
        };
      }
    );
  };

  const guardarFormatos =
    async () => {
      setError("");
      setMensaje("");

      if (!habilitarEdicion) {
        setError(
          "Los formatos no están disponibles para edición."
        );

        return;
      }

      let payload;

      try {
        payload =
          construirPayload();
      } catch (
        validationError
      ) {
        setError(
          validationError?.message ||
            "Revisa los formatos de evidencia."
        );

        return;
      }

      setGuardando(true);

      try {
        const respuesta =
          await guardarFormatosEvidenciaDUABloqueAulaVirtual(
            bloqueId,
            payload
          );

        setFormatosForm(
          extraerFormatos(
            respuesta
          ).map(
            normalizarFormato
          )
        );

        setMensaje(
          respuesta?.mensaje ||
            "Formatos de evidencia DUA guardados correctamente."
        );

        if (
          typeof onSaved ===
          "function"
        ) {
          onSaved(respuesta);
        }
      } catch (
        guardarError
      ) {
        setError(
          guardarError?.message ||
            "No fue posible guardar los formatos de evidencia DUA."
        );
      } finally {
        setGuardando(false);
      }
    };

  return (
    <section
      style={{
        marginTop: "12px",
        border:
          "1px solid #c4b5fd",
        borderRadius: "14px",
        background: "#faf5ff",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "10px",
          alignItems:
            "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#5b21b6",
              fontSize: "13px",
              fontWeight: 950,
            }}
          >
            Formatos de evidencia DUA
          </div>

          <div
            style={{
              marginTop: "3px",
              color: "#64748b",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            Define las formas válidas
            para que el estudiante
            demuestre su aprendizaje.
          </div>
        </div>

        <div
          style={{
            border:
              "1px solid #ddd6fe",
            borderRadius: "999px",
            background: "#ffffff",
            color: "#6d28d9",
            padding: "5px 9px",
            fontSize: "11px",
            fontWeight: 900,
          }}
        >
          {formatosServidor.length}
          {" "}de 10 formatos
        </div>
      </div>

      {!existeConfiguracion && (
        <div
          style={{
            marginTop: "11px",
            border:
              "1px dashed #c4b5fd",
            borderRadius: "10px",
            background: "#ffffff",
            color: "#64748b",
            padding: "10px",
            fontSize: "12px",
          }}
        >
          Guarda primero la
          configuración base DUA.
        </div>
      )}

      {existeConfiguracion &&
        !editando && (
          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "11px",
            }}
          >
            {formatosServidor.map(
              (formato) => (
                <div
                  key={
                    formato.id ||
                    formato
                      .codigo_formato
                  }
                  style={{
                    border:
                      "1px solid #e9d5ff",
                    borderRadius:
                      "10px",
                    background:
                      "#ffffff",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "8px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <strong
                      style={{
                        color:
                          "#4c1d95",
                        fontSize:
                          "12px",
                      }}
                    >
                      {formato.nombre}
                    </strong>

                    <span
                      style={{
                        color:
                          formato
                            .es_activo
                            ? "#166534"
                            : "#64748b",
                        fontSize:
                          "10px",
                        fontWeight:
                          900,
                      }}
                    >
                      {formato
                        .es_predeterminado
                        ? "Predeterminado · "
                        : ""}
                      {formato
                        .es_activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "4px",
                      color: "#64748b",
                      fontSize: "11px",
                    }}
                  >
                    {
                      formato
                        .codigo_formato
                    }
                    {" · "}
                    {etiquetaCanales(
                      formato
                    )}
                  </div>

                  {formato
                    .indicaciones && (
                    <div
                      style={{
                        marginTop:
                          "5px",
                        color:
                          "#475569",
                        fontSize:
                          "11px",
                        lineHeight:
                          1.5,
                      }}
                    >
                      {
                        formato
                          .indicaciones
                      }
                    </div>
                  )}
                </div>
              )
            )}

            {formatosServidor.length ===
              0 && (
              <div
                style={{
                  border:
                    "1px dashed #c4b5fd",
                  borderRadius:
                    "10px",
                  background:
                    "#ffffff",
                  color:
                    "#64748b",
                  padding: "11px",
                  textAlign:
                    "center",
                  fontSize: "12px",
                }}
              >
                Todavía no hay
                formatos de evidencia.
              </div>
            )}
          </div>
        )}

      {existeConfiguracion &&
        editando &&
        puedeEditar && (
          <>
            {configuracion?.estado !==
              "BORRADOR" && (
              <div
                style={{
                  marginTop:
                    "11px",
                  border:
                    "1px solid #fed7aa",
                  borderRadius:
                    "10px",
                  background:
                    "#fff7ed",
                  color:
                    "#9a3412",
                  padding:
                    "9px 10px",
                  fontSize:
                    "12px",
                }}
              >
                Los formatos solo
                pueden modificarse en
                estado Borrador.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: "11px",
                marginTop: "11px",
              }}
            >
              {formatosForm.map(
                (
                  formato,
                  indice
                ) => (
                  <article
                    key={
                      formato._key
                    }
                    style={{
                      border:
                        "1px solid #ddd6fe",
                      borderRadius:
                        "12px",
                      background:
                        "#ffffff",
                      padding:
                        "11px",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#4c1d95",
                          fontSize:
                            "12px",
                        }}
                      >
                        Formato{" "}
                        {indice + 1}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarFormato(
                            formato._key
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
                            "#ffffff",
                          color:
                            "#b91c1c",
                          padding:
                            "5px 9px",
                          fontSize:
                            "10px",
                          fontWeight:
                            900,
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
                        gap: "9px",
                        marginTop: "9px",
                      }}
                    >
                      <label
                        style={
                          estiloEtiqueta
                        }
                      >
                        Tipo de formato

                        <select
                          value={
                            formato
                              .codigo_formato
                          }
                          onChange={(
                            event
                          ) =>
                            cambiarCodigo(
                              formato._key,
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            !habilitarEdicion
                          }
                          style={{
                            ...estiloEntrada,
                            marginTop:
                              "4px",
                          }}
                        >
                          {FORMATOS_CATALOGO.map(
                            (
                              item
                            ) => (
                              <option
                                key={
                                  item.codigo
                                }
                                value={
                                  item.codigo
                                }
                                disabled={
                                  item.codigo !==
                                    formato
                                      .codigo_formato &&
                                  codigosUsados.has(
                                    item.codigo
                                  )
                                }
                              >
                                {
                                  item.nombre
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label
                        style={
                          estiloEtiqueta
                        }
                      >
                        Nombre

                        <input
                          value={
                            formato.nombre
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarFormato(
                              formato._key,
                              {
                                nombre:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          disabled={
                            !habilitarEdicion
                          }
                          maxLength={
                            180
                          }
                          style={{
                            ...estiloEntrada,
                            marginTop:
                              "4px",
                          }}
                        />
                      </label>
                    </div>

                    <label
                      style={{
                        ...estiloEtiqueta,
                        marginTop: "9px",
                      }}
                    >
                      Indicaciones para
                      el estudiante

                      <textarea
                        value={
                          formato
                            .indicaciones
                        }
                        onChange={(
                          event
                        ) =>
                          actualizarFormato(
                            formato._key,
                            {
                              indicaciones:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        disabled={
                          !habilitarEdicion
                        }
                        maxLength={12000}
                        rows={3}
                        style={{
                          ...estiloEntrada,
                          marginTop: "4px",
                          resize:
                            "vertical",
                        }}
                      />
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        marginTop: "10px",
                        color: "#4c1d95",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={
                            formato
                              .requiere_archivo
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarFormato(
                              formato._key,
                              event
                                .target
                                .checked
                                ? {
                                    requiere_archivo:
                                      true,
                                  }
                                : {
                                    requiere_archivo:
                                      false,
                                    mime_types_texto:
                                      "",
                                    tamano_maximo_mb:
                                      "",
                                  }
                            )
                          }
                          disabled={
                            !habilitarEdicion
                          }
                        />{" "}
                        Archivo
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={
                            formato
                              .admite_url
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarFormato(
                              formato._key,
                              {
                                admite_url:
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
                        URL
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={
                            formato
                              .permite_texto_directo
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarFormato(
                              formato._key,
                              {
                                permite_texto_directo:
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
                        Texto directo
                      </label>
                    </div>

                    {formato
                      .requiere_archivo && (
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(240px,2fr) minmax(150px,1fr)",
                          gap: "9px",
                          marginTop: "9px",
                        }}
                      >
                        <label
                          style={
                            estiloEtiqueta
                          }
                        >
                          MIME permitidos

                          <textarea
                            value={
                              formato
                                .mime_types_texto
                            }
                            onChange={(
                              event
                            ) =>
                              actualizarFormato(
                                formato._key,
                                {
                                  mime_types_texto:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            disabled={
                              !habilitarEdicion
                            }
                            rows={2}
                            placeholder="application/pdf, image/png"
                            style={{
                              ...estiloEntrada,
                              marginTop:
                                "4px",
                              resize:
                                "vertical",
                            }}
                          />
                        </label>

                        <label
                          style={
                            estiloEtiqueta
                          }
                        >
                          Tamaño máximo
                          (MB)

                          <input
                            type="number"
                            min="0.01"
                            max="1024"
                            step="0.01"
                            value={
                              formato
                                .tamano_maximo_mb
                            }
                            onWheel={
                              bloquearRueda
                            }
                            onChange={(
                              event
                            ) =>
                              actualizarFormato(
                                formato._key,
                                {
                                  tamano_maximo_mb:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            disabled={
                              !habilitarEdicion
                            }
                            style={{
                              ...estiloEntrada,
                              marginTop:
                                "4px",
                            }}
                          />
                        </label>
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(180px,1fr) minmax(180px,1fr)",
                        gap: "9px",
                        marginTop: "9px",
                      }}
                    >
                      <label
                        style={
                          estiloEtiqueta
                        }
                      >
                        Duración máxima
                        (minutos)

                        <input
                          type="number"
                          min="0.01"
                          max="1440"
                          step="0.01"
                          value={
                            formato
                              .duracion_maxima_minutos
                          }
                          onWheel={
                            bloquearRueda
                          }
                          onChange={(
                            event
                          ) =>
                            actualizarFormato(
                              formato._key,
                              {
                                duracion_maxima_minutos:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          disabled={
                            !habilitarEdicion
                          }
                          placeholder="Opcional"
                          style={{
                            ...estiloEntrada,
                            marginTop:
                              "4px",
                          }}
                        />
                      </label>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-end",
                          gap: "14px",
                          flexWrap: "wrap",
                          paddingBottom:
                            "7px",
                          color: "#4c1d95",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={
                              formato
                                .es_predeterminado
                            }
                            onChange={(
                              event
                            ) =>
                              cambiarPredeterminado(
                                formato._key,
                                event
                                  .target
                                  .checked
                              )
                            }
                            disabled={
                              !habilitarEdicion
                            }
                          />{" "}
                          Predeterminado
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={
                              formato
                                .es_activo
                            }
                            onChange={(
                              event
                            ) =>
                              actualizarFormato(
                                formato._key,
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
                          Activo
                        </label>
                      </div>
                    </div>
                  </article>
                )
              )}

              {formatosForm.length ===
                0 && (
                <div
                  style={{
                    border:
                      "1px dashed #c4b5fd",
                    borderRadius:
                      "10px",
                    background:
                      "#ffffff",
                    color:
                      "#64748b",
                    padding: "12px",
                    textAlign:
                      "center",
                    fontSize:
                      "12px",
                  }}
                >
                  Agrega el primer
                  formato de evidencia.
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  marginTop: "11px",
                  border:
                    "1px solid #fecaca",
                  borderRadius:
                    "10px",
                  background:
                    "#fef2f2",
                  color:
                    "#991b1b",
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
                  border:
                    "1px solid #bbf7d0",
                  borderRadius:
                    "10px",
                  background:
                    "#f0fdf4",
                  color:
                    "#166534",
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
                onClick={
                  agregarFormato
                }
                disabled={
                  !habilitarEdicion ||
                  formatosForm.length >=
                    10
                }
                style={{
                  border:
                    "1px solid #7c3aed",
                  borderRadius:
                    "999px",
                  background:
                    "#ffffff",
                  color:
                    "#6d28d9",
                  padding: "8px 12px",
                  fontWeight: 900,
                  cursor:
                    habilitarEdicion
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                + Agregar formato
              </button>

              <button
                type="button"
                onClick={
                  guardarFormatos
                }
                disabled={
                  !habilitarEdicion
                }
                style={{
                  border:
                    "1px solid #6d28d9",
                  borderRadius:
                    "999px",
                  background:
                    "#6d28d9",
                  color:
                    "#ffffff",
                  padding: "9px 14px",
                  fontWeight: 950,
                  cursor:
                    habilitarEdicion
                      ? "pointer"
                      : "not-allowed",
                  opacity:
                    habilitarEdicion
                      ? 1
                      : 0.65,
                }}
              >
                {guardando
                  ? "Guardando..."
                  : `Guardar formatos DUA (${formatosForm.length})`}
              </button>
            </div>
          </>
        )}

      {existeConfiguracion &&
        editando &&
        !puedeEditar && (
          <div
            style={{
              marginTop: "11px",
              border:
                "1px dashed #c4b5fd",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#64748b",
              padding: "10px",
              fontSize: "12px",
            }}
          >
            Tu rol no tiene permiso
            para editar los formatos
            DUA.
          </div>
        )}
    </section>
  );
}
