// src/pages/configuracion/components/UsageStatsBar.jsx
// Barra de estadísticas de uso del proveedor activo (últimos 7 días)

export default function UsageStatsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    {
      label: "Evaluaciones (7d)",
      value: stats.total_evaluaciones ?? "—",
      sub: stats.exito_pct != null ? `${stats.exito_pct}% exitosas` : "",
      color: "text-indigo-600",
    },
    {
      label: "Latencia promedio",
      value: stats.latencia_ms != null ? `${stats.latencia_ms} ms` : "—",
      sub: stats.latencia_ms != null
        ? stats.latencia_ms < 2000 ? "Óptima" : "Revisar"
        : "",
      color: stats.latencia_ms != null && stats.latencia_ms < 2000
        ? "text-emerald-600"
        : "text-orange-500",
    },
    {
      label: "Tokens consumidos",
      value: stats.tokens_total != null
        ? stats.tokens_total.toLocaleString("es-PE")
        : "—",
      sub: "Entrada + salida",
      color: "text-gray-700",
    },
  ];

  return (
    <div className="flex gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
        >
          <p className="text-xs text-gray-400 mb-1">{item.label}</p>
          <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
          {item.sub && <p className="text-[11px] text-gray-400">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
