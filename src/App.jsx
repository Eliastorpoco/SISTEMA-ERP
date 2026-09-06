import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import { Rol } from './types/roles';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AulaVirtual = lazy(() => import('./pages/AulaVirtual.jsx'));
const AulaVirtualEstudiante = lazy(() => import('./pages/AulaVirtualEstudiante.jsx'));
const ReportePedagogicoAulaVirtual = lazy(() => import('./pages/ReportePedagogicoAulaVirtual.jsx'));
const Evaluaciones = lazy(() => import('./pages/Evaluaciones.jsx'));
const Asistencia = lazy(() => import('./pages/Asistencia.jsx'));
const Reporte = lazy(() => import('./pages/Reporte'));
const Estudiantes = lazy(() => import('./pages/Estudiantes'));
const ApoderadosComunicacion = lazy(() => import('./pages/ApoderadosComunicacion.jsx'));
const ReporteEstudiante = lazy(() => import('./pages/ReporteEstudiante'));
const PanelDirector = lazy(() => import('./pages/PanelDirector'));
// Nuevos módulos
const PanelDirectorKPI = lazy(() => import('./pages/PanelDirectorKPI'));
const Finanzas = lazy(() => import('./pages/Finanzas'));
const Notificaciones = lazy(() => import('./pages/Notificaciones'));
const Proximamente = lazy(() => import('./pages/Proximamente'));
const Docentes = lazy(() => import('./pages/Docentes'));
const IncidenciasAcademicas = lazy(() => import('./pages/IncidenciasAcademicas.jsx'));
const AIConfigPage  = lazy(() => import('./pages/configuracion/AIConfigPage'));

function DashboardSegunRol() {
  const { user } = useAuth();
  const rol = String(user?.role || '').toUpperCase();

  if (rol === Rol.ESTUDIANTE) {
    return <Navigate to="/aula-virtual-estudiante" replace />;
  }

  return <Dashboard />;
}


const privateRoutes = [
  { index: true, element: <Navigate to="/dashboard" replace /> },

  { path: 'dashboard', element: <DashboardSegunRol />, roles: [Rol.ADMIN, Rol.DOCENTE, Rol.ESTUDIANTE] },
  { path: 'panel-director', element: <PanelDirector />, roles: [Rol.ADMIN] },
  // Nuevas rutas
  { path: 'panel-director-kpi', element: <PanelDirectorKPI />, roles: [Rol.ADMIN] },
  { path: 'finanzas', element: <Finanzas />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.ESTUDIANTE] },
  { path: 'notificaciones', element: <Notificaciones />, roles: [Rol.ADMIN, Rol.DOCENTE] },

  { path: 'asistencia', element: <Asistencia />, roles: [Rol.ADMIN, Rol.DOCENTE] },
  { path: 'reporte', element: <Reporte />, roles: [Rol.ADMIN, Rol.DOCENTE] },
  { path: 'estudiantes', element: <Estudiantes />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE] },
  { path: 'apoderados', element: <ApoderadosComunicacion />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE] },
  { path: 'comunicaciones', element: <ApoderadosComunicacion />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE] },
  { path: 'reporte-estudiante', element: <ReporteEstudiante />, roles: [Rol.ADMIN, Rol.DOCENTE] },

  // Rutas para módulos en construcción (sidebar apuntaba a estas)
  { path: 'evaluaciones',  element: <Evaluaciones />,  roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE, Rol.ESTUDIANTE] },
  { path: 'matricula',     element: <Proximamente titulo="Matrícula" />,     roles: [Rol.ADMIN] },
  { path: 'incidencias', element: <IncidenciasAcademicas />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE, Rol.ESTUDIANTE] },
  { path: 'docentes', element: <Docentes />, roles: [Rol.ADMIN] },
  { path: 'horarios',      element: <Proximamente titulo="Horarios" />,      roles: [Rol.ADMIN, Rol.DOCENTE] },
  { path: 'inventario',    element: <Proximamente titulo="Inventario" />,    roles: [Rol.ADMIN] },
  { path: 'biblioteca',    element: <Proximamente titulo="Biblioteca" />,    roles: [Rol.ADMIN, Rol.DOCENTE] },
  { path: 'presupuesto',   element: <Proximamente titulo="Presupuesto" />,   roles: [Rol.ADMIN] },
  { path: 'configuracion/ia', element: <AIConfigPage />, roles: [Rol.ADMIN] },
  { path: 'aula-virtual',  element: <AulaVirtual />,  roles: [Rol.ADMIN, Rol.DOCENTE] },
  { path: 'aula-virtual/reporte-pedagogico', element: <ReportePedagogicoAulaVirtual />, roles: [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE] },
  { path: 'aula-virtual-estudiante', element: <AulaVirtualEstudiante />, roles: [Rol.ADMIN, Rol.DOCENTE, Rol.ESTUDIANTE] },
];

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Overlay oscuro en móvil cuando sidebar abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={[
        'fixed inset-y-0 left-0 z-50',
        'transform transition-transform duration-300',
        'md:relative md:translate-x-0 md:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'md:w-16' : 'md:w-60',
        'w-64',
      ].join(' ')}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onNavClick={() => setSidebarOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header móvil con botón hamburguesa */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900">EduERP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Cargando() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 rounded-xl bg-white shadow-md">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    </div>
  );
}

function SinPermiso() {
  return (
    <div className="p-6">
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-600">Acceso no autorizado</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tu rol no tiene permiso para acceder a esta sección.
        </p>
      </div>
    </div>
  );
}

function RutaNoEncontrada() {
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/sin-permiso" element={<SinPermiso />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {privateRoutes.map((route) =>
                route.index ? (
                  <Route key="index" index element={route.element} />
                ) : (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ProtectedRoute roles={route.roles}>
                        {route.element}
                      </ProtectedRoute>
                    }
                  />
                )
              )}
            </Route>

            <Route path="*" element={<RutaNoEncontrada />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
