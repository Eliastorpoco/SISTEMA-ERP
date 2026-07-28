import { useAuth } from "../context/useAuth";
import AulaHeader from "../components/aulaVirtual/AulaHeader";
import DashboardCards from "../components/aulaVirtual/DashboardCards";
import TeacherLearningLayout from "../components/aulaVirtual/TeacherLearningLayout";
import LearningWorkspace from "../components/aulaVirtual/LearningWorkspace";
import RightLearningPanel from "../components/aulaVirtual/RightLearningPanel";
import LeftLearningNav from "../components/aulaVirtual/LeftLearningNav";
import LearningUnit from "../components/aulaVirtual/LearningUnit";
import { useAulaVirtual } from "../hooks/useAulaVirtual";

const API =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.evolonline.online";

const H5P_ACTIVITIES = {
  "h5p-31ee8efae42f": "https://h5p.org/h5p/embed/617",
};

export default function AulaVirtual() {
  const { token } = useAuth();
  const { tareas, loadingTareas } = useAulaVirtual(API, token);

  const stats = {
    total: tareas.length,
    conH5P: tareas.filter((t) => String(t.tipo).toLowerCase() === "h5p").length,
    entregas: tareas.reduce((s, t) => s + (t.total_entregas || 0), 0),
    evaluadas: tareas.reduce((s, t) => s + (t.evaluadas || 0), 0),
  };

  return (
    <TeacherLearningLayout
      leftPanel={<LeftLearningNav />}
      header={<AulaHeader />}
      stats={<DashboardCards stats={stats} />}
      tabs={null}
      workspace={
        <LearningWorkspace>
          {loadingTareas && (
            <div
              style={{
                padding: "16px",
                marginBottom: "14px",
                borderRadius: "16px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontWeight: 800,
              }}
            >
              Cargando bloques desde PostgreSQL...
            </div>
          )}

          <LearningUnit
            tareas={tareas}
            onVerDetalle={() => {}}
            h5pActivities={H5P_ACTIVITIES}
          />
        </LearningWorkspace>
      }
      rightPanel={<RightLearningPanel />}
    />
  );
}
