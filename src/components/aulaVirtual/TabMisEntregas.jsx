import { useState } from "react";
import ModalRetroalimentacion from "./ModalRetroalimentacion";
import ModalResubida from "./ModalResubida";
import EntregaCard from "./EntregaCard";
import { useEntregasAulaVirtual } from "../../hooks/useEntregasAulaVirtual";

export default function TabMisEntregas({ token, user, api }) {
  const [detalle, setDetalle] = useState(null);
  const [resubida, setResubida] = useState(null);
  const [textoResubida, setTextoResubida] = useState("");
  const esDocente = user?.isAdmin || user?.isDocente || String(user?.role || "").toLowerCase() === "docente";
  const esEstudiante = !esDocente;
  const { entregas, loading, procesando, resubir, revisar } = useEntregasAulaVirtual(api, token, 1);

  const resubirEntrega = async () => {
    try {
      await resubir(resubida, textoResubida);
      setResubida(null);
      setTextoResubida("");
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:48, color:"#9ca3af" }}>Cargando...</div>
  );

  if (entregas.length === 0) return (
    <div style={{ textAlign:"center", padding:48 }}>
      <div style={{ fontSize:13, color:"#9ca3af", fontWeight:600 }}>
        Sin entregas aún. Ve a Tareas y entrega tu primera actividad.
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display:"grid", gap:14 }}>
        {entregas.map(e => (
          <EntregaCard
            key={e.id}
            entrega={e}
            esDocente={esDocente}
            esEstudiante={esEstudiante}
            procesando={procesando}
            onVerDetalle={setDetalle}
            onRevisar={revisar}
            onPrepararResubida={(entrega) => {
              setResubida(entrega);
              setTextoResubida("");
            }}
          />
        ))}
      </div>


      <ModalResubida
        resubida={resubida}
        textoResubida={textoResubida}
        setTextoResubida={setTextoResubida}
        procesando={procesando}
        onClose={() => setResubida(null)}
        onSubmit={resubirEntrega}
      />


      <ModalRetroalimentacion
        detalle={detalle}
        onClose={() => setDetalle(null)}
      />

    </>
  );
}
