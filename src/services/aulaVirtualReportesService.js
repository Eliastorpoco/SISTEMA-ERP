import client from "../api/client";
import { buildConsolidadoCalificacionesParams } from "../utils/aulaVirtualReportePedagogico";

export { buildConsolidadoCalificacionesParams };

export async function getConsolidadoCalificaciones(options = {}) {
  const params = buildConsolidadoCalificacionesParams(options);
  const { data } = await client.get(
    "/aula-virtual/reportes/calificaciones",
    { params }
  );

  return data;
}
