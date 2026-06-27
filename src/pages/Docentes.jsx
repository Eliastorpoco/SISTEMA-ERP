import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Docentes() {
  const [docentes, setDocentes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await client.get('/docentes');
      setDocentes(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch(e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const filtrados = docentes.filter(d => {
    const q = busqueda.toLowerCase();
    return (
      (d.nombres ?? d.nombre ?? '').toLowerCase().includes(q) ||
      (d.apellidos ?? '').toLowerCase().includes(q) ||
      (d.dni ?? '').includes(q) ||
      (d.correo ?? d.email ?? '').toLowerCase().includes(q) ||
      (d.especialidad ?? '').toLowerCase().includes(q)
    );
  });

  const iniciales = d => {
    const n = (d.nombres ?? d.nombre ?? 'D').split(' ')[0][0] ?? 'D';
    const a = (d.apellidos ?? '').split(' ')[0][0] ?? '';
    return (n+a).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="rounded-xl mb-5 p-4 md:px-6 md:py-4" style={{background:'linear-gradient(135deg,#1a4a8a 0%,#378ADD 100%)'}}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-white text-lg font-bold">Gestión de Docentes</div>
            <div className="text-blue-200 text-xs mt-0.5">Personal docente registrado en la institución</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
              {docentes.length} docentes
            </div>
            <button onClick={cargar}
              className="h-9 px-4 rounded-lg border border-blue-300 bg-white/10 text-white text-sm cursor-pointer hover:bg-white/20 transition">
              ↻ Actualizar
            </button>
          </div>
        </div>
        {/* Buscador */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, correo o especialidad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full md:w-96 h-9 px-4 rounded-lg border-0 text-sm bg-white/90 text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando docentes...</div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">👨‍🏫</div>
          <div className="text-gray-500 font-medium">
            {busqueda ? 'No se encontraron docentes con esa búsqueda' : 'No hay docentes registrados'}
          </div>
          {busqueda && (
            <button onClick={()=>setBusqueda('')}
              className="mt-3 text-sm text-[#1a4a8a] underline cursor-pointer">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((d, i) => (
            <div key={d.id ?? i}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 text-[#1a4a8a] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {iniciales(d)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">
                    {[d.nombres ?? d.nombre, d.apellidos].filter(Boolean).join(' ') || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{d.especialidad ?? d.cargo ?? 'Docente'}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {d.dni && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        DNI: {d.dni}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.tipo_contrato === 'NOMBRADO' ? 'bg-green-100 text-green-700' :
                      d.tipo_contrato === 'CONTRATADO' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-[#1a4a8a]'
                    }`}>
                      {d.tipo_contrato ?? 'Activo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                {(d.correo ?? d.email) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>✉️</span>
                    <span className="truncate">{d.correo ?? d.email}</span>
                  </div>
                )}
                {d.telefono && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📞</span>
                    <span>{d.telefono}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 bg-white border border-gray-100 rounded-xl px-5 py-3 flex justify-between items-center text-xs text-gray-400">
        <span>📋 ERP Educativo · Módulo Docentes</span>
        <span>{filtrados.length} de {docentes.length} docentes</span>
      </div>
    </div>
  );
}
