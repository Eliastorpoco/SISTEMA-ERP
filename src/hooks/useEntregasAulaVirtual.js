import { useCallback, useEffect, useState } from "react";
import {
  listarMisEntregas,
  resubirEntrega,
  revisarEntrega,
  reintentarIA,
} from "../services/aulaVirtualService";

const mensajesRevision = {
  APROBAR: "Validado por docente. La evidencia corresponde y el nivel asignado es adecuado.",
  RECHAZAR_RESUBIDA: "La evidencia es insuficiente o no corresponde. Se solicita resubida.",
  REINTENTAR_IA: "Se solicita nueva evaluación IA por posible inconsistencia.",
};

export function useEntregasAulaVirtual(api, token, estudianteId = 1) {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);

  const cargarEntregas = useCallback(() => {
    if (!token) return;

    setLoading(true);

    listarMisEntregas(api, token, estudianteId)
      .then((d) => setEntregas(Array.isArray(d) ? d : []))
      .catch(() => setEntregas([]))
      .finally(() => setLoading(false));
  }, [api, token, estudianteId]);

  useEffect(() => {
    cargarEntregas();
  }, [cargarEntregas]);

  const resubir = async (entrega, texto) => {
    if (!entrega) return;

    if (!texto.trim()) {
      throw new Error("Escribe la nueva evidencia antes de resubir.");
    }

    setProcesando(entrega.id);

    try {
      await resubirEntrega(api, token, entrega.id, {
        texto,
        tipo: "texto",
      });

      cargarEntregas();
    } finally {
      setProcesando(null);
    }
  };

  const revisar = async (entrega, decision) => {
    setProcesando(entrega.id);

    try {
      await revisarEntrega(api, token, entrega.id, {
        decision,
        motivo: mensajesRevision[decision],
        observacion_docente: mensajesRevision[decision],
      });

      if (decision === "REINTENTAR_IA") {
        await reintentarIA(api, token, entrega.id);
      }

      cargarEntregas();
    } finally {
      setProcesando(null);
    }
  };

  return {
    entregas,
    loading,
    procesando,
    cargarEntregas,
    resubir,
    revisar,
  };
}
