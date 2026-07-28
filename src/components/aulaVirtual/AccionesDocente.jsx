import Button from "../ui/LegacyButton";

export default function AccionesDocente({
  entrega,
  esDocente,
  esEstudiante,
  procesando,
  onVerDetalle,
  onRevisar,
  onPrepararResubida,
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:150 }}>
      <Button
        variant="info"
        onClick={() => onVerDetalle(entrega)}
        style={{ background:"#eef2ff", color:"#4338ca" }}
      >
        Ver retroalimentación
      </Button>

      {esDocente && (
        <Button
          variant="success"
          disabled={procesando === entrega.id || entrega.validado_docente}
          onClick={() => onRevisar(entrega, "APROBAR")}
        >
          Aprobar
        </Button>
      )}

      {esDocente && (
        <Button
          variant="danger"
          disabled={procesando === entrega.id}
          onClick={() => onRevisar(entrega, "RECHAZAR_RESUBIDA")}
        >
          Pedir resubida
        </Button>
      )}

      {esDocente && (
        <Button
          variant="warning"
          disabled={procesando === entrega.id}
          onClick={() => onRevisar(entrega, "REINTENTAR_IA")}
        >
          Reintentar IA
        </Button>
      )}

      {esEstudiante && entrega.requiere_resubida && (
        <Button
          disabled={procesando === entrega.id}
          onClick={() => onPrepararResubida(entrega)}
        >
          Resubir evidencia
        </Button>
      )}
    </div>
  );
}
