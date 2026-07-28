import Card from "./LegacyCard";

export default function StatCard({ label, value, color = "#4f46e5" }) {
  return (
    <Card style={{
      borderTop:`4px solid ${color}`,
      padding:"16px 20px",
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#6b7280",
        textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>
        {label}
      </div>
      <div style={{ fontSize:28, fontWeight:800, color }}>
        {value}
      </div>
    </Card>
  );
}
