export default function BlockTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:12, fontWeight:900, color:"#111827" }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
