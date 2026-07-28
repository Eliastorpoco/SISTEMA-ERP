const variants = {
  primary: {
    background:"#4f46e5",
    color:"#fff",
    border:"none",
  },
  success: {
    background:"#059669",
    color:"#fff",
    border:"none",
  },
  danger: {
    background:"#fef2f2",
    color:"#dc2626",
    border:"1px solid #fecaca",
  },
  warning: {
    background:"#fff7ed",
    color:"#c2410c",
    border:"1px solid #fed7aa",
  },
  info: {
    background:"#eef2ff",
    color:"#4338ca",
    border:"none",
  },
  ghost: {
    background:"#fff",
    color:"#374151",
    border:"1px solid #e5e7eb",
  },
  disabled: {
    background:"#d1d5db",
    color:"#fff",
    border:"none",
  },
};

export default function Button({
  children,
  variant = "primary",
  disabled = false,
  style = {},
  ...props
}) {
  const base = disabled ? variants.disabled : variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        ...base,
        borderRadius:10,
        padding:"8px 14px",
        fontSize:12,
        fontWeight:800,
        cursor:disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
