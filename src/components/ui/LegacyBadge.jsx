const variants = {
  success: { background:"#d1fae5", color:"#065f46" },
  warning: { background:"#fef3c7", color:"#92400e" },
  danger: { background:"#fee2e2", color:"#991b1b" },
  info: { background:"#ede9fe", color:"#4f46e5" },
  neutral: { background:"#f3f4f6", color:"#374151" },
};

export default function Badge({ children, variant = "neutral", style = {} }) {
  const cfg = variants[variant] || variants.neutral;

  return (
    <span
      style={{
        background:cfg.background,
        color:cfg.color,
        padding:"4px 10px",
        borderRadius:999,
        fontSize:11,
        fontWeight:800,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
