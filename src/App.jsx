import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Lazy loading: cada pagina se carga solo cuando se necesita
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Asistencia = lazy(() => import('./pages/Asistencia'));
const Reporte = lazy(() => import('./pages/Reporte'));
const Estudiantes = lazy(() => import('./pages/Estudiantes'));
const ReporteEstudiante = lazy(() => import('./pages/ReporteEstudiante'));

const privateRoutes = [
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: 'dashboard', element: <Dashboard /> },
  { path: 'asistencia', element: <Asistencia /> },
  { path: 'reporte', element: <Reporte /> },
  { path: 'estudiantes', element: <Estudiantes /> },
  { path: 'reporte-estudiante', element: <ReporteEstudiante /> },
];

// Layout principal con sidebar + area de contenido
function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      {/* Contenido principal - en móvil tiene padding top para no chocar con el botón hamburguesa */}
      <main className="flex-1 overflow-auto pt-16 md:pt-6 px-4 md:px-6 pb-6">
        <Outlet />
      </main>
    </div>
  );
}

// Pantalla de carga mientras se cargan las paginas
function Cargando() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-6 rounded-xl bg-white shadow-md">
        <div className="text-sm text-gray-500">Cargando...</div>
      </div>
    </div>
  );
}

// 404 amigable: redirige al dashboard
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
                  <Route key={route.path} path={route.path} element={route.element} />
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
