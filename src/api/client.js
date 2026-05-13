import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const API_VERSION = 'v2.0';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.evolonline.online',
  timeout: 10000,
});

// 🧹 Limpia toda la sesión
export function clearStoredSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// 🔄 Control de versión de API (migraciones)
function verificarMigracion() {
  const apiVersion = localStorage.getItem('api_version');

  if (apiVersion !== API_VERSION) {
    clearStoredSession();
    localStorage.setItem('api_version', API_VERSION);
  }
}

verificarMigracion();

// 🔐 Obtener token (soporta versión antigua)
export function getStoredToken() {
  const accessToken = localStorage.getItem('access_token');
  if (accessToken) return accessToken;

  const legacyToken = localStorage.getItem('token');
  if (legacyToken) {
    localStorage.setItem('access_token', legacyToken);
    localStorage.removeItem('token');
  }

  return legacyToken;
}

// ⛔ Verifica expiración del token
function tokenEstaExpirado(decoded) {
  if (!decoded?.exp) return false;
  return decoded.exp * 1000 <= Date.now();
}

// 🚀 Interceptor de REQUEST (envía token SIEMPRE)
client.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🚨 Interceptor de RESPONSE (manejo global de errores)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔴 Token inválido o expirado
    if (error.response?.status === 401) {
      console.warn('Sesión expirada o no autorizada');

      clearStoredSession();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // ⚠️ Error servidor
    if (error.response?.status >= 500) {
      console.error('Error del servidor:', error.response);
    }

    return Promise.reject(error);
  }
);

/**
 * 🔍 Decodifica el JWT y devuelve:
 * { username, role, secciones, isAdmin, isDocente }
 */
export function getUsuarioActual() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    // ⛔ Token expirado
    if (tokenEstaExpirado(decoded)) {
      console.warn('Token expirado');
      clearStoredSession();
      return null;
    }

    const role = decoded.role;

    return {
      username: decoded.sub || decoded.username,
      role,
      secciones: Array.isArray(decoded.secciones) ? decoded.secciones : [],
      isAdmin: role === 'admin',
      isDocente: role === 'docente',
    };
  } catch (err) {
    console.error('Error decodificando JWT:', err);
    clearStoredSession();
    return null;
  }
}

export default client;