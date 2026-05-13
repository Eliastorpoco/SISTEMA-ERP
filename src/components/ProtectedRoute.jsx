import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();
  const location = useLocation();

  // 🔐 1. Validar autenticación
  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🔐 2. Validar roles (si se especifican)
  if (roles && roles.length > 0) {
    const userRole = user?.role;

    if (!roles.includes(userRole)) {
      return <Navigate to="/sin-permiso" replace />;
    }
  }

  return children;
}