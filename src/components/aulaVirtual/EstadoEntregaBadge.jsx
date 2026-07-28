import Badge from "../ui/LegacyBadge";

export default function EstadoEntregaBadge({ estado }) {
  const variant =
    estado === "VALIDADA"
      ? "success"
      : estado === "REQUIERE_RESUBIDA"
        ? "danger"
        : "warning";

  return <Badge variant={variant}>{estado}</Badge>;
}
