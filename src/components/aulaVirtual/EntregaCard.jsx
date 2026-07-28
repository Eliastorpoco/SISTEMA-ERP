import Card from "../ui/LegacyCard";
import Badge from "../ui/LegacyBadge";
import NivelBadge from "./NivelBadge";
import EstadoEntregaBadge from "./EstadoEntregaBadge";
import AccionesDocente from "./AccionesDocente";

export default function EntregaCard({
  entrega,
  esDocente,
  esEstudiante,
  procesando,
  onVerDetalle,
  onRevisar,
  onPrepararResubida,
}) {
  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
        <div style={{ flex:1 }}>
          <div style={{
            fontSize:11,
            fontWeight:800,
            color:"#6b7280",
            textTransform:"uppercase",
            letterSpacing:"0.06em",
            marginBottom:4
          }}>
            {entrega.curso_nombre} · {entrega.curso_codigo}
          </div>

          <div style={{
            fontSize:16,
            fontWeight:800,
            color:"#111827",
            marginBottom:8
          }}>
            {entrega.tarea_titulo}
          </div>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            <EstadoEntregaBadge estado={entrega.estado} />

            {entrega.nivel_logro && <NivelBadge nivel={entrega.nivel_logro} />}

            <Badge variant="info">
              {entrega.puntaje !== null && entrega.puntaje !== undefined
                ? `${entrega.puntaje} pts`
                : "Sin puntaje"}
            </Badge>

            <Badge variant={entrega.validado_docente ? "success" : "neutral"}>
              {entrega.validado_docente ? "Docente validó" : "Pendiente docente"}
            </Badge>
          </div>

          <p style={{
            fontSize:13,
            color:"#4b5563",
            lineHeight:1.6,
            margin:"0 0 10px",
            display:"-webkit-box",
            WebkitLineClamp:2,
            WebkitBoxOrient:"vertical",
            overflow:"hidden"
          }}>
            {entrega.texto}
          </p>

          {entrega.requiere_resubida && (
            <div style={{
              background:"#fef2f2",
              border:"1px solid #fecaca",
              borderRadius:12,
              padding:"10px 12px",
              color:"#991b1b",
              fontSize:12,
              fontWeight:600,
              marginBottom:10
            }}>
              Requiere resubida: {entrega.motivo_rechazo || "Evidencia insuficiente."}
            </div>
          )}

          <div style={{ fontSize:11, color:"#9ca3af" }}>
            Intentos IA: {entrega.intentos_ia} · Resubidas: {entrega.intentos_resubida} ·
            Fecha: {new Date(entrega.created_at).toLocaleDateString("es-PE")}
          </div>
        </div>

        <AccionesDocente
          entrega={entrega}
          esDocente={esDocente}
          esEstudiante={esEstudiante}
          procesando={procesando}
          onVerDetalle={onVerDetalle}
          onRevisar={onRevisar}
          onPrepararResubida={onPrepararResubida}
        />
      </div>
    </Card>
  );
}
