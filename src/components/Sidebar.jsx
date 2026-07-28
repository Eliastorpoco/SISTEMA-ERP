import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const NAV_ITEMS = [
  { label:'Panel Directivo', to:'/panel-director-kpi', group:'Inicio', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { label:'Asistencia', to:'/asistencia', group:'Académico', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round"/></svg> },
  { label:'Evaluaciones', to:'/evaluaciones', group:'Académico', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4" strokeLinecap="round"/></svg> },
  { label:'Matrícula', to:'/matricula', group:'Académico', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6" strokeLinecap="round"/></svg> },
  { label:'Incidencias', to:'/incidencias', group:'Académico', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg> },
  { label:'Docentes', to:'/docentes', group:'Administrativo', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round"/></svg> },
  { label:'Horarios', to:'/horarios', group:'Administrativo', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/></svg> },
  { label:'Inventario', to:'/inventario', group:'Administrativo', roles:['ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" strokeLinecap="round"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" strokeLinecap="round"/><path d="M12 12v4M10 14h4" strokeLinecap="round"/></svg> },
  { label:'Biblioteca', to:'/biblioteca', group:'Administrativo', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round"/></svg> },
  { label:'Finanzas', to:'/finanzas', group:'Finanzas', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" strokeLinecap="round"/></svg> },
  { label:'Presupuesto', to:'/presupuesto', group:'Finanzas', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round"/><polyline points="14 2 14 8 20 8" strokeLinecap="round"/><line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round"/></svg> },
  { label:'Aula Virtual', to:'/aula-virtual', group:'Aprendizaje', roles:['DIRECTOR','ADMIN','DOCENTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg> },
  { label:'Vista Estudiante', to:'/aula-virtual-estudiante', group:'Aprendizaje', roles:['DIRECTOR','ADMIN','DOCENTE','ESTUDIANTE'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M12 14l9-5-9-5-9 5 9 5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 14l6.16-3.42A12.08 12.08 0 0112 21a12.08 12.08 0 01-6.16-10.42L12 14z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { label:'Notificaciones', to:'/notificaciones', group:'Aprendizaje', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round"/><path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/></svg> },
  { label:'Reportes', to:'/reporte', group:'Reportes', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/></svg> },
  { label:'Proveedor IA', to:'/configuracion/ia', group:'Configuración', roles:['DIRECTOR','ADMIN'],
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><line x1="9" y1="2" x2="9" y2="4" strokeLinecap="round"/><line x1="15" y1="2" x2="15" y2="4" strokeLinecap="round"/><line x1="9" y1="20" x2="9" y2="22" strokeLinecap="round"/><line x1="15" y1="20" x2="15" y2="22" strokeLinecap="round"/><line x1="20" y1="9" x2="22" y2="9" strokeLinecap="round"/><line x1="20" y1="15" x2="22" y2="15" strokeLinecap="round"/><line x1="2" y1="9" x2="4" y2="9" strokeLinecap="round"/><line x1="2" y1="15" x2="4" y2="15" strokeLinecap="round"/></svg> },
];

const GRUPOS = ['Inicio','Académico','Administrativo','Finanzas','Aprendizaje','Reportes','Configuración'];

export default function Sidebar({ collapsed=false, onToggle, onNavClick }) {
  const { user, logout } = useAuth();
  const rol = (user?.role ?? 'docente').toUpperCase();
  const items = NAV_ITEMS.filter(i => i.roles.length===0 || i.roles.includes(rol));
  const displayName = user?.nombre ?? user?.username ?? '';
  const iniciales = displayName ? displayName.split(/[\s@._-]+/).map(p=>p[0]).filter(Boolean).slice(0,2).join('').toUpperCase() : 'US';

  const base = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150';
  const active = 'bg-[#1a4a8a] text-white shadow-sm';
  const idle = 'text-gray-500 hover:bg-blue-50 hover:text-[#1a4a8a]';

  return (
    <aside className={`flex flex-col h-screen bg-white border-r border-gray-100 transition-all duration-300 ${collapsed?'w-16':'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {!collapsed && (
              <div className="flex items-center px-1" style={{height:"64px"}}>
                <img
                  src="/images/evolsist-logo.png"
                  alt="Evolsist Plataforma LMS"
                  style={{width:"192px", height:"60px", display:"block", objectFit:"contain"}}
                />
              </div>
            )}
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ml-auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            {collapsed
              ? <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
        {GRUPOS.map(grupo => {
          const its = items.filter(i => i.group===grupo);
          if (!its.length) return null;
          return (
            <div key={grupo} className="mb-3">
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 mb-1.5">{grupo}</p>
              )}
              {its.map(item => (
                <NavLink key={item.to} to={item.to} onClick={onNavClick}
                  className={({isActive}) => `${base} ${isActive?active:idle} ${collapsed?'justify-center':''}`}
                  title={collapsed?item.label:undefined}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className={`flex items-center gap-3 ${collapsed?'justify-center':''}`}>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1a4a8a] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {iniciales}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.nombre ?? 'Usuario'}</p>
                <p className="text-[10px] text-gray-400 truncate">{rol}</p>
              </div>
              <button onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Cerrar sesión">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
