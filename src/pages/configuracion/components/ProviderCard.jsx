// src/pages/configuracion/components/ProviderCard.jsx

export default function ProviderCard({ provider, isActive, onClick }) {
  const { nombre, empresa, iniciales, colorBg, colorText, colorBorder,
          colorRing, badge, badgeColor, local } = provider;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150",
        isActive
          ? `${colorBorder} bg-white ring-1 ${colorRing} shadow-sm`
          : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
      ].join(" ")}
    >
      {/* Ícono inicial */}
      <div
        className={[
          "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0",
          isActive ? `${colorBg} ${colorText}` : "bg-gray-100 text-gray-500",
        ].join(" ")}
      >
        {iniciales}
      </div>

      {/* Nombre y empresa */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={[
              "text-sm font-medium",
              isActive ? colorText : "text-gray-800",
            ].join(" ")}
          >
            {nombre}
          </span>
          {local && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              LOCAL
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{empresa}</p>
      </div>

      {/* Badge Recomendado */}
      {badge && isActive && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}

      {/* Punto activo */}
      {isActive && (
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorText.replace("text-", "bg-")}`} />
      )}
    </button>
  );
}
