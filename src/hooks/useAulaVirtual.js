import { useCallback, useEffect, useState } from "react";
import { listarTareas } from "../services/aulaVirtualService";

export function useAulaVirtual(api, token) {
  const [tareas, setTareas] = useState([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const cargarTareas = useCallback(() => {
    setLoadingTareas(true);

    listarTareas(api, token)
      .then((data) => setTareas(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Error cargando bloques Aula Virtual:", error);
        setTareas([]);
      })
      .finally(() => setLoadingTareas(false));
  }, [api, token]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas, refreshKey]);

  const refrescar = () => setRefreshKey((k) => k + 1);

  return {
    tareas,
    loadingTareas,
    refreshKey,
    refrescar,
  };
}
