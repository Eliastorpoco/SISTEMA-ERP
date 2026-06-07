import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir si ya está logueado
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const userRole = String(user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || user?.isAdmin === true;

    navigate(isAdmin ? '/dashboard' : '/asistencia', { replace: true });
  }, [isAuthenticated, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Completa todos los campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      const userData = await login(trimmedUsername, password);
      const isAdmin =
        trimmedUsername.toLowerCase() === 'admin' ||
        String(userData?.role || '').toLowerCase() === 'admin' ||
        userData?.isAdmin === true;

      localStorage.setItem(
        'user',
        JSON.stringify({
          username: trimmedUsername,
          role: isAdmin ? 'admin' : 'docente',
          isAdmin,
          isDocente: !isAdmin,
          secciones: isAdmin ? [] : ['4A', '4B', '5A', '5B'],
        })
      );

      navigate(isAdmin ? '/dashboard' : '/asistencia', { replace: true });
    } catch (err) {
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              background: '#1D9E75',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: 'white', fontSize: '20px' }}>✓</span>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
            Sistema de asistencia
          </h1>

          <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem' }}>
            Ingresa con tu cuenta
          </p>

          {error && (
            <div
              style={{
                background: '#FCEBEB',
                color: '#791F1F',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Usuario</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="profe4a"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '12px', color: '#666' }}>Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '40px',
                background: loading ? '#9FE1CB' : '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
