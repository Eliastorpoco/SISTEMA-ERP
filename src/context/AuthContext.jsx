import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './useAuth';
import { API_VERSION } from '../api/client';

// seguridad-auth-version-central-v1

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'https://api.evolonline.online').replace(/\/$/, '');

function decodeJwtPayload(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function crearUsuarioDesdeToken(token) {
  const payload = decodeJwtPayload(token);

  if (!payload) return null;

  const role = String(payload.role || '').toLowerCase();
  const secciones = Array.isArray(payload.secciones) ? payload.secciones : [];

  return {
    username: payload.sub || payload.username || 'usuario',
    role,
    tenant_id: payload.tenant_id,
    secciones,
    permisos: payload.permisos || [],
    isAdmin: role === 'admin',
    isDocente: role === 'docente',
    isEstudiante: role === 'estudiante',
    puedeAcceder: (seccion) => {
      if (role === 'admin') return true;
      return secciones.includes(seccion);
    },
  };
}

function getStoredToken() {
  return localStorage.getItem('access_token') || '';
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('jwt');
  localStorage.removeItem('erp_token');
  localStorage.removeItem('aula_virtual_token');
  localStorage.removeItem('user');
  localStorage.removeItem('api_version');
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    const userData = crearUsuarioDesdeToken(storedToken);

    if (!userData) {
      clearStoredSession();
      setToken(null);
      setUser(null);
      return;
    }

    localStorage.setItem('user', JSON.stringify(userData));
    setToken(storedToken);
    setUser(userData);
  }, []);

  const login = useCallback(async (username, password) => {
    const usernameNormalizado = String(username || '').trim();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant': '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({
        username: usernameNormalizado,
        password,
      }),
    });

    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      console.error('Error login:', response.status, data);
      throw new Error(data?.detail || data?.message || 'Usuario o contraseña incorrectos');
    }

    const accessToken = data?.access_token;

    if (!accessToken) {
      throw new Error('La API no devolvió access_token');
    }

    const userData = crearUsuarioDesdeToken(accessToken);

    if (!userData) {
      throw new Error('Token inválido');
    }

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('aula_virtual_token', accessToken);
    localStorage.setItem('api_version', API_VERSION);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);

    return userData;
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
