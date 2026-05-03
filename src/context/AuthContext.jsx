import { useCallback, useMemo, useState } from 'react';
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
    role: usuarioActual.role,
    secciones: usuarioActual.secciones || [],
    isAdmin: usuarioActual.isAdmin,
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

  const login = useCallback(async (username, password) => {
    const res = await client.post('/login', { username, password });
    const { access_token } = res.data || {};

    if (!access_token) {
      throw new Error('La API no devolvio access_token');
    }

    localStorage.setItem('access_token', access_token);
    localStorage.removeItem('token');
    localStorage.setItem('api_version', API_VERSION);
    setToken(access_token);

    const usuarioActual = getUsuarioActual();
    const userData = crearUsuario(usuarioActual);
    if (!userData) {
      clearStoredSession();
      setToken(null);
      setUser(null);
      throw new Error('Token invalido');
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
