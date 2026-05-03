import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const API_VERSION = 'v2.0';

const client = axios.create({
  baseURL: 'https://api.evolonline.online',
});

export function clearStoredSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function verificarMigracion() {
  const apiVersion = localStorage.getItem('api_version');
  if (apiVersion !== API_VERSION) {
    clearStoredSession();
    localStorage.setItem('api_version', API_VERSION);
  }
}

verificarMigracion();

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

function tokenEstaExpirado(decoded) {
  if (!decoded?.exp) return false;
  return decoded.exp * 1000 <= Date.now();
}

client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Decodifica el JWT y devuelve los datos del usuario:
 * { username, role, secciones, isAdmin, isDocente }.
 * Devuelve null si el token es invalido o esta expirado.
 */
export function getUsuarioActual() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (tokenEstaExpirado(decoded)) {
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
