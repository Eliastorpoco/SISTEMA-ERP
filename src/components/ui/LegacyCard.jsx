export default function Card({ children, style = {}, ...props }) {
  return (
    <div
      style={{
        background:"#fff",
        border:"1px solid #e5e7eb",
        borderRadius:16,
        boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
