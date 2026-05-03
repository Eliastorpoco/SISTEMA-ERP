import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  if (!user) return null;

  // Menus segun rol
  const adminLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '▦' },
    { to: '/estudiantes', label: 'Estudiantes', icon: '👥' },
    { to: '/reporte', label: 'Reporte Global', icon: '📋' },
  ];

  const docenteLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '▦' },
    { to: '/asistencia', label: 'Registrar Asistencia', icon: '📅' },
    { to: '/estudiantes', label: 'Mis Estudiantes', icon: '👥' },
    { to: '/reporte', label: 'Reporte', icon: '📊' },
  ];

  const links = user.isAdmin ? adminLinks : docenteLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? 'US';

  return (
    <>
      {/* Botón hamburguesa - SOLO EN MÓVIL */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="md:hidden fixed top-3 left-3 z-50 w-11 h-11 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-md text-gray-700 hover:bg-gray-50 active:scale-95 transition"
        aria-label="Abrir menú"
      >
        {abierto ? (
          <span className="text-xl leading-none">✕</span>
        ) : (
          <span className="text-xl leading-none">☰</span>
        )}
      </button>

      {/* Overlay oscuro - SOLO EN MÓVIL cuando está abierto */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 z-40
          h-screen md:h-auto md:min-h-screen
          w-64 md:w-52
          bg-white border-r border-gray-200
          flex flex-col py-5
          flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${abierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pb-5 border-b border-gray-200 mb-3">
          <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center text-white text-base">
            ✓
          </div>
          <span className="text-sm font-medium">EvolAssist</span>
        </div>

        {/* Links */}
        <nav className="flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-2 text-[13px] transition
                ${
                  isActive
                    ? 'text-[#0F6E56] bg-[#E1F5EE] font-medium'
                    : 'text-gray-500 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-sm">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer con info de usuario */}
        <div className="mt-auto px-5 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 bg-[#E1F5EE] rounded-full flex items-center justify-center text-xs font-medium text-[#0F6E56] flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">
                {user?.username ?? 'Usuario'}
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {user?.isAdmin
                  ? 'admin · Todas las secciones'
                  : `Secciones: ${
                      (user?.secciones || []).join(', ') || 'Sin secciones'
                    }`}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full h-8 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 active:scale-95 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
