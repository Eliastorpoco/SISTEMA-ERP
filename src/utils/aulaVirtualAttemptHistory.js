function obtenerIdIntento(intento) {
  return intento?.id;
}

function obtenerNumeroIntento(intento) {
  return (
    intento?.numero_intento ??
    intento?.numeroIntento ??
    intento?.intento
  );
}

function esMismoIntento(actual, nuevo) {
  const idActual = obtenerIdIntento(actual);
  const idNuevo = obtenerIdIntento(nuevo);

  if (idActual != null && idNuevo != null) {
    return String(idActual) === String(idNuevo);
  }

  const numeroActual = obtenerNumeroIntento(actual);
  const numeroNuevo = obtenerNumeroIntento(nuevo);

  return (
    numeroActual != null &&
    numeroNuevo != null &&
    String(numeroActual) === String(numeroNuevo)
  );
}

export function upsertIntentoHistorial(historial = [], nuevoIntento = {}) {
  const lista = Array.isArray(historial) ? historial : [];
  const anterior = lista.find((item) =>
    esMismoIntento(item, nuevoIntento)
  );
  const camposNuevos = Object.fromEntries(
    Object.entries(nuevoIntento).filter(([, valor]) => valor !== undefined)
  );

  return [
    {
      ...(anterior || {}),
      ...camposNuevos,
    },
    ...lista.filter((item) => !esMismoIntento(item, nuevoIntento)),
  ];
}
