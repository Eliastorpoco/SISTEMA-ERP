import client from "../api/client";
import { buildConsolidadoCalificacionesParams } from "../utils/aulaVirtualReportePedagogico";

export { buildConsolidadoCalificacionesParams };

export async function getConsolidadoCalificaciones(options = {}) {
  const { calidadIdentidad, ...opcionesV1 } = options;
  const params = buildConsolidadoCalificacionesParams({
    ...opcionesV1,
    calidadIdentidad,
  });
  const { data } = await client.get(
    "/aula-virtual/reportes/calificaciones",
    { params }
  );

  return data;
}
