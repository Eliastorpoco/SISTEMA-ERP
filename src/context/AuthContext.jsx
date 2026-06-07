import { useCallback, useEffect, useMemo, useState } from 'react';
import client, {
  API_VERSION,
  clearStoredSession,
  getStoredToken,
  getUsuarioActual,
} from '../api/client';
import { AuthContext } from './useAuth';

function crearUsuario(usuarioActual) {
  if (!usuarioActual) return null;

  return {
    username: usuarioActual.username,
    role: String(usuarioActual.role || "").toLowerCase(),
    secciones: usuarioActual.secciones || [],
    isAdmin:
      usuarioActual.isAdmin === true ||
      String(usuarioActual.role || "").toLowerCase() === "admin",
    isDocente: usuarioActual.isDocente,
    puedeAcceder: (seccion) => {
      if (usuarioActual.isAdmin) return true;
      return (
        Array.isArray(usuarioActual.secciones) &&
        usuarioActual.secciones.includes(seccion)
      );
    },
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => crearUsuario(getUsuarioActual()));

  useEffect(() => {
    const storedToken = getStoredToken();
    const usuarioActual = getUsuarioActual();

    if (storedToken && usuarioActual) {
      setToken(storedToken);
      setUser(crearUsuario(usuarioActual));
    } else {
      setToken(null);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const usernameNormalizado = String(username || '').trim();
    const res = await client.post('/auth/login', { username: usernameNormalizado, password }); // ✅ corregido
    const { access_token } = res.data || {};

    if (!access_token) {
      throw new Error('La API no devolvió access_token');
    }

    localStorage.setItem('access_token', access_token);
    localStorage.removeItem('token');
    localStorage.setItem('api_version', API_VERSION);

    setToken(access_token);

    const usuarioActual = getUsuarioActual();
    let userData = crearUsuario(usuarioActual);

    if (usernameNormalizado.toLowerCase() === 'admin') {
      userData = {
        ...(userData || {}),
        username: usernameNormalizado,
        role: 'admin',
        secciones: [],
        isAdmin: true,
        isDocente: false,
        puedeAcceder: () => true,
      };
    }

    if (!userData) {
      clearStoredSession();
      setToken(null);
      setUser(null);
      throw new Error('Token inválido');
    }

    localStorage.setItem(
      'user',
      JSON.stringify({
        username: userData.username,
        role: userData.role,
        secciones: userData.secciones,
        isAdmin: userData.isAdmin,
        isDocente: userData.isDocente,
      })
    );

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
