import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';

const MOCK_CANALES = [
  { id: 1, nombre: 'Email Institucional', tipo: 'email',    estado: 'activo',   descripcion: 'Correo Gmail del colegio' },
  { id: 2, nombre: 'WhatsApp Padres',     tipo: 'whatsapp', estado: 'activo',   descripcion: 'Grupos de padres de familia' },
  { id: 3, nombre: 'SMS Emergencias',     tipo: 'sms',      estado: 'inactivo', descripcion: 'Solo para urgencias' },
];

const STATUS_COLOR = {
  activo:    'bg-emerald-100 text-emerald-700',
  inactivo:  'bg-gray-100 text-gray-500',
  error:     'bg-red-100 text-red-700',
  pendiente: 'bg-amber-100 text-amber-700',
};

const CanalCard = ({ canal }) => {
  const nombre = canal.nombre ?? canal.canal ?? canal.name ?? 'Canal';
  const tipo   = canal.tipo ?? canal.type ?? '';
  const estado = (canal.estado ?? canal.status ?? 'activo').toLowerCase();
  const cls    = STATUS_COLOR[estado] ?? STATUS_COLOR.activo;

  const iconos = {
    email:    '✉️',
    whatsapp: '💬',
    sms:      '📱',
    push:     '🔔',
  };
  const icono = iconos[tipo.toLowerCase()] ?? '📡';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="text-3xl">{icono}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 text-sm">{nombre}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
            {estado}
          </span>
        </div>
        {tipo && <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{tipo}</p>}
        {canal.descripcion && (
          <p className="text-xs text-gray-500 mt-1 truncate">{canal.descripcion}</p>
        )}
      </div>
      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
        style={{ background: estado === 'activo' ? '#10b981' : estado === 'error' ? '#ef4444' : '#9ca3af' }} />
    </div>
  );
};

export default function Notificaciones() {
  const { token, user } = useAuth();
  const [canales, setCanales] = useState([]);
  const [loadingCanales, setLoadingCanales] = useState(true);
  const [errorCanales, setErrorCanales] = useState(null);

  // Form envío masivo
  const [form, setForm] = useState({
    canal:    '',
    asunto:   '',
    mensaje:  '',
    destino:  'todos',
    seccion:  '',
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, msg }

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchCanales = async () => {
      try {
        const res = await client.get('/notificaciones/canales');
        const data = res.data ?? {};
        // API devuelve { whatsapp: bool, sms: bool, email: bool }
        const LABEL = { whatsapp: 'WhatsApp Padres', sms: 'SMS Emergencias', email: 'Email Institucional' };
        const DESC  = { whatsapp: 'Grupos de padres de familia', sms: 'Solo para urgencias', email: 'Correo Gmail del colegio' };
        if (Array.isArray(data)) {
          setCanales(data);
        } else {
          setCanales(
            Object.entries(data).map(([tipo, activo], idx) => ({
              id:          idx + 1,
              nombre:      LABEL[tipo] ?? tipo,
              tipo,
              estado:      activo ? 'activo' : 'inactivo',
              descripcion: DESC[tipo] ?? '',
            }))
          );
        }
      } catch (err) {
        console.warn('[EduERP-DEV] API no disponible, usando canales mock', err);
        setCanales(MOCK_CANALES);
      } finally {
        setLoadingCanales(false);
      }
    };
    fetchCanales();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setResultado(null);
  };

  const handleEnviar = async () => {
    if (!form.canal || !form.mensaje.trim()) {
      setResultado({ ok: false, msg: 'Selecciona un canal y escribe un mensaje.' });
      return;
    }
    try {
      setEnviando(true);
      setResultado(null);
      const filtro = form.destino === 'seccion' && form.seccion
        ? { tipo: 'seccion', valor: form.seccion }
        : { tipo: form.destino };
      const payload = {
        canal:   form.canal,
        tipo:    'comunicado',
        asunto:  form.asunto,
        mensaje: form.mensaje,
        filtro,
      };
      const res = await client.post('/notificaciones/masivo', payload);
      const data = res.data;
      setResultado({
        ok: true,
        msg: data.mensaje ?? data.message ?? `Notificación enviada exitosamente.`,
        extra: data.enviados != null ? `${data.enviados} destinatarios notificados.` : null,
      });
      setForm((prev) => ({ ...prev, asunto: '', mensaje: '' }));
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message
        ?? 'Error al enviar la notificación.';
      setResultado({ ok: false, msg });
    } finally {
      setEnviando(false);
    }
  };

  const secciones = user?.secciones ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Notificaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestión de canales y envío masivo de mensajes</p>
      </div>

      {/* Canales */}
      <section>
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
          Canales disponibles
        </h2>

        {loadingCanales && (
          <div className="flex gap-2 py-4">
            {[0,1,2].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        {errorCanales && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
            {errorCanales}
          </div>
        )}

        {!loadingCanales && canales.length === 0 && !errorCanales && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
            No hay canales configurados.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canales.map((c, i) => (
            <CanalCard key={c.id ?? i} canal={c} />
          ))}
        </div>
      </section>

      {/* Envío masivo */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-indigo-50">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">
            📢 Envío Masivo
          </h2>
          <p className="text-xs text-indigo-600 mt-0.5">
            Envía notificaciones a múltiples destinatarios a la vez
          </p>
        </div>

        <div className="p-6 space-y-5">

          {/* Canal */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Canal de envío *
            </label>
            <select
              name="canal"
              value={form.canal}
              onChange={handleChange}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            >
              <option value="">Seleccionar canal...</option>
              {canales.map((c, i) => (
                <option key={c.id ?? i} value={c.id ?? c.nombre ?? c.canal}>
                  {c.nombre ?? c.canal ?? c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Destinatarios
            </label>
            <div className="flex flex-wrap gap-2">
              {['todos', 'docentes', 'estudiantes', 'seccion'].map((d) => (
                <button
                  key={d}
                  onClick={() => setForm((p) => ({ ...p, destino: d }))}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all flex-1 sm:flex-none text-center min-w-[70px] ${
                    form.destino === d
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sección (condicional) */}
          {form.destino === 'seccion' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Sección
              </label>
              {secciones.length > 0 ? (
                <select
                  name="seccion"
                  value={form.seccion}
                  onChange={handleChange}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                >
                  <option value="">Seleccionar sección...</option>
                  {secciones.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="seccion"
                  value={form.seccion}
                  onChange={handleChange}
                  placeholder="Ej: 3°A"
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                />
              )}
            </div>
          )}

          {/* Asunto */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Asunto <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              name="asunto"
              value={form.asunto}
              onChange={handleChange}
              placeholder="Asunto de la notificación..."
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Mensaje *
            </label>
            <textarea
              name="mensaje"
              value={form.mensaje}
              onChange={handleChange}
              rows={4}
              placeholder="Escribe el mensaje que será enviado a los destinatarios..."
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.mensaje.length} caracteres</p>
          </div>

          {/* Feedback */}
          {resultado && (
            <div className={`rounded-xl p-4 text-sm font-medium ${
              resultado.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <p>{resultado.ok ? '✅' : '❌'} {resultado.msg}</p>
              {resultado.extra && <p className="text-xs mt-1 opacity-80">{resultado.extra}</p>}
            </div>
          )}

          {/* Botón */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Enviando...
                </>
              ) : (
                '📤 Enviar Notificación'
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
