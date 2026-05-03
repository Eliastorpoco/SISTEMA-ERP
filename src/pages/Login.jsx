import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarBanner, setMostrarBanner] = useState(false);

  const fromPath = location.state?.from?.pathname || '/dashboard';
  const redirectPath = fromPath === '/login' ? '/dashboard' : fromPath;

  // Mostrar banner de migración si es primera carga post-migración
  useEffect(() => {
    const esPrimeraVez = localStorage.getItem('api_version') === 'v2.0' && !localStorage.getItem('_migration_banner_shown');
    if (esPrimeraVez) {
      setMostrarBanner(true);
      localStorage.setItem('_migration_banner_shown', 'true');
    }
  }, []);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch {
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
        {mostrarBanner && (
          <div
            style={{
              background: '#dbeafe',
              border: '1px solid #3b82f6',
              color: '#1e40af',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            ℹ️ Hemos actualizado la plataforma. Por favor inicia sesión nuevamente.
          </div>
        )}

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
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#666',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Usuario
              </label>
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
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#666',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Contraseña
              </label>
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
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
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
                fontSize: '14px',
                fontWeight: '500',
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
