/**
 * roles.js — Fuente única de verdad para roles del ERP Educativo
 *
 * Reemplaza los strings hardcodeados dispersos en el código:
 *   'admin', 'docente'           → normalizarRol() → 'ADMIN', 'DOCENTE'
 *   'DIRECTOR','ADMIN','DOCENTE' → usar Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE
 *
 * Uso:
 *   import { Rol, tieneRol, normalizarRol } from '../types/roles';
 */

export const Rol = Object.freeze({
  DIRECTOR:   'DIRECTOR',
  ADMIN:      'ADMIN',
  DOCENTE:    'DOCENTE',
  APODERADO:  'APODERADO',
  ESTUDIANTE: 'ESTUDIANTE',
});

export const ROLES_LISTA = Object.values(Rol);

/** Verifica si un string es un Rol válido del sistema */
export function esRolValido(valor) {
  return typeof valor === 'string' && ROLES_LISTA.includes(valor);
}

/**
 * Normaliza el rol que viene del JWT al formato del enum.
 * Resuelve la inconsistencia histórica: 'admin' → 'ADMIN', 'docente' → 'DOCENTE'
 */
export function normalizarRol(rolRaw) {
  if (!rolRaw) return null;
  const upper = rolRaw.toUpperCase();
  return esRolValido(upper) ? upper : null;
}

/** Verifica si el rol actual está en la lista de roles permitidos */
export function tieneRol(rolActual, rolesPermitidos) {
  const rolNorm = normalizarRol(rolActual);
  if (!rolNorm) return false;
  return rolesPermitidos.map((r) => r.toUpperCase()).includes(rolNorm);
}

/** Verifica al menos uno de los roles (uso variádico) */
export function tieneAlgunRol(rolActual, ...roles) {
  return tieneRol(rolActual, roles);
}

/** Configuración de módulos por rol — única fuente para Sidebar y App */
export const MODULOS = [
  {
    clave:  'dashboard',
    label:  'Panel principal',
    ruta:   '/dashboard',
    roles:  [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE],
  },
  {
    clave:  'asistencia',
    label:  'Asistencia',
    ruta:   '/asistencia',
    roles:  [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE],
  },
  {
    clave:  'estudiantes',
    label:  'Estudiantes',
    ruta:   '/estudiantes',
    roles:  [Rol.DIRECTOR, Rol.ADMIN],
  },
  {
    clave:  'matricula',
    label:  'Matrícula',
    ruta:   '/matricula',
    roles:  [Rol.DIRECTOR, Rol.ADMIN],
  },
  {
    clave:  'finanzas',
    label:  'Finanzas',
    ruta:   '/finanzas',
    roles:  [Rol.DIRECTOR, Rol.ADMIN],
  },
  {
    clave:  'reportes',
    label:  'Reportes',
    ruta:   '/reporte',
    roles:  [Rol.DIRECTOR, Rol.ADMIN, Rol.DOCENTE],
  },
  {
    clave:  'notificaciones',
    label:  'Notificaciones',
    ruta:   '/notificaciones',
    roles:  [Rol.DIRECTOR, Rol.ADMIN],
  },
  {
    clave:  'kpi',
    label:  'Panel directivo',
    ruta:   '/panel-director-kpi',
    roles:  [Rol.DIRECTOR, Rol.ADMIN],
  },
];

export function modulosParaRol(rol) {
  const rolNorm = normalizarRol(rol);
  if (!rolNorm) return [];
  return MODULOS.filter((m) => m.roles.includes(rolNorm));
}
