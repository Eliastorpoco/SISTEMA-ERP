import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const normalizeRole = (role) =>
  String(role || "").trim().toUpperCase();

export default function ProtectedRoute({
  children,
  roles = [],
}) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.role);

  const allowedRoles = roles.map((r) =>
    normalizeRole(r)
  );

  console.log("USER ROLE:", userRole);
  console.log("ALLOWED ROLES:", allowedRoles);

  if (userRole === "ADMIN" || user?.isAdmin === true) {
    return children;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return children;
}
