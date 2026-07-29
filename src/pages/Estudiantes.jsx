import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/useAuth';

// Paleta de colores para las tarjetas de seccion
const SECTION_COLORS = {
  '4A': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', accent: '#2563eb' },
  '4B': { bg: '#dcfce7', border: '#22c55e', text: '#166534', accent: '#16a34a' },
  '5A': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', accent: '#d97706' },
  '5B': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d', accent: '#db2777' },
};

const DEFAULT_COLOR = { bg: '#f1f5f9', border: '#64748b', text: '#334155', accent: '#475569' };

function splitNombre(nombreCompleto = '') {
  const partes = nombreCompleto.split(',');
  if (partes.length >= 2) {
    return {
      apellidos: partes[0].trim().toUpperCase(),
      nombres: partes.slice(1).join(',').trim().toUpperCase(),
    };
  }
  const tokens = nombreCompleto.trim().split(/\s+/);
  if (tokens.length >= 3) {
    return {
      apellidos: tokens.slice(0, 2).join(' ').toUpperCase(),
      nombres: tokens.slice(2).join(' ').toUpperCase(),
    };
  }
  return { apellidos: nombreCompleto.toUpperCase(), nombres: '' };
}

function getIniciales(nombre = '') {
  const { apellidos, nombres } = splitNombre(nombre);
  const a = apellidos.charAt(0) || '';
  const n = nombres.charAt(0) || '';
  return (a + n) || nombre.charAt(0).toUpperCase();
}

export default function Estudiantes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState(
    user?.isDocente ? user?.secciones?.[0] || 'TODAS' : 'TODAS'
  );
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState(-1);
  const buscadorRef = useRef(null);

  const cargarEstudiantes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        user?.isDocente ? '/mis-estudiantes' : '/estudiantes'
      );
      setEstudiantes(data || []);
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
      alert('Error al cargar estudiantes. Verifica tu sesion.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    cargarEstudiantes();
  }, [cargarEstudiantes]);

  useEffect(() => {
    function handleClickFuera(e) {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const resumenSecciones = useMemo(() => {
    const mapa = {};
    estudiantes.forEach((e) => {
      const s = e.seccion || 'SIN_SECCION';
      mapa[s] = (mapa[s] || 0) + 1;
    });
    const ordenadas = Object.keys(mapa).sort();
    return ordenadas.map((s) => ({ seccion: s, total: mapa[s] }));
  }, [estudiantes]);

  const listaPorSeccion = useMemo(() => {
    let lista = estudiantes;
    if (seccionActiva !== 'TODAS') {
      lista = lista.filter((e) => e.seccion === seccionActiva);
    }
    return [...lista].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [estudiantes, seccionActiva]);

  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return estudiantes
      .filter((e) => (e.nombre || '').toLowerCase().includes(q))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      .slice(0, 8);
  }, [estudiantes, busqueda]);

  const listaFiltrada = useMemo(() => {
    let lista = listaPorSeccion;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter((e) => (e.nombre || '').toLowerCase().includes(q));
    }
    return lista;
  }, [listaPorSeccion, busqueda]);

  function irAReporte(estudiante) {
    navigate(`/reporte-estudiante?estudiante_id=${estudiante.id}`);
  }

  function handleKeyDown(e) {
    if (!mostrarSugerencias || sugerencias.length === 0) {
      if (e.key === 'Enter' && listaFiltrada.length === 1) {
        irAReporte(listaFiltrada[0]);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugerencia((prev) => Math.min(prev + 1, sugerencias.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugerencia((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (indiceSugerencia >= 0 && sugerencias[indiceSugerencia]) {
        irAReporte(sugerencias[indiceSugerencia]);
      } else if (sugerencias.length === 1) {
        irAReporte(sugerencias[0]);
      }
    } else if (e.key === 'Escape') {
      setMostrarSugerencias(false);
    }
  }

  async function exportarExcel() {
    if (seccionActiva === 'TODAS') {
      alert('Por favor selecciona una seccion especifica para exportar');
      return;
    }
    await exportarPorSeccion(seccionActiva);
  }

  async function exportarPorSeccion(seccion) {
    try {
      setExportando(true);
      const XLSXModule = await import("xlsx-js-style");
      const XLSX = XLSXModule.default ?? XLSXModule;
      const lista = estudiantes
        .filter((e) => e.seccion === seccion)
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

      const fechaHoy = new Date().toLocaleDateString('es-PE', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      const aoa = [];
      aoa.push(['LISTA DE ESTUDIANTES']);
      aoa.push([`Seccion: ${seccion}`]);
      aoa.push([`Fecha de emision: ${fechaHoy}`]);
      aoa.push([`Total de estudiantes: ${lista.length}`]);
      aoa.push([]);
      aoa.push(['N', 'APELLIDOS', 'NOMBRES', 'FIRMA']);

      lista.forEach((e, idx) => {
        const { apellidos, nombres } = splitNombre(e.nombre);
        aoa.push([idx + 1, apellidos, nombres, '']);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 35 }, { wch: 30 }];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
      ];
      ws['!rows'] = [
        { hpt: 28 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 10 }, { hpt: 24 },
      ];

      const bordeFino = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      };

      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      };

      ['A2', 'A3', 'A4'].forEach((ref) => {
        ws[ref].s = {
          font: { bold: ref === 'A2', sz: 11, color: { rgb: '1E40AF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
        };
      });

      ['A6', 'B6', 'C6', 'D6'].forEach((ref) => {
        ws[ref].s = {
          font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
          border: bordeFino,
        };
      });

      lista.forEach((_, idx) => {
        const rowNum = 7 + idx;
        const esPar = idx % 2 === 0;
        const fondoAlterno = esPar ? 'FFFFFF' : 'F1F5F9';
        ['A', 'B', 'C', 'D'].forEach((col) => {
          const ref = `${col}${rowNum}`;
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          ws[ref].s = {
            font: { sz: 10, color: { rgb: '0F172A' } },
            alignment: {
              horizontal: col === 'A' ? 'center' : 'left',
              vertical: 'center',
            },
            fill: { patternType: 'solid', fgColor: { rgb: fondoAlterno } },
            border: bordeFino,
          };
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Seccion ${seccion}`);
      const nombreArchivo = `Lista_Estudiantes_${seccion}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    } catch (err) {
      console.error('Error exportando:', err);
      alert('Ocurrio un error al exportar el archivo Excel.');
    } finally {
      setExportando(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500 text-sm">Cargando estudiantes...</div>
      </div>
    );
  }

  const totalGlobal = estudiantes.length;
  const colorActivo = SECTION_COLORS[seccionActiva] || DEFAULT_COLOR;
  const puedoExportar = seccionActiva !== 'TODAS';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="m-0 text-2xl md:text-[26px] text-gray-900 font-bold">
          {user?.isDocente ? 'Mis estudiantes' : 'Estudiantes'}
        </h1>
        <p className="mt-1 mb-0 text-gray-500 text-sm">
          Haz clic en un estudiante para ver su reporte individual
        </p>
      </div>

      {/* Tarjetas de secciones - 2 cols movil, varias en desktop */}
      {(user?.isAdmin || user?.isDocente) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-3.5 mb-6">
          <TarjetaSeccion
            titulo="Todas"
            subtitulo="Vista general"
            total={totalGlobal}
            color={DEFAULT_COLOR}
            activa={seccionActiva === 'TODAS'}
            onClick={() => setSeccionActiva('TODAS')}
          />
          {resumenSecciones.map(({ seccion, total }) => (
            <TarjetaSeccion
              key={seccion}
              titulo={`Seccion ${seccion}`}
              subtitulo={`${total} ${total === 1 ? 'alumno' : 'alumnos'}`}
              total={total}
              color={SECTION_COLORS[seccion] || DEFAULT_COLOR}
              activa={seccionActiva === seccion}
              onClick={() => setSeccionActiva(seccion)}
            />
          ))}
        </div>
      )}

      {/* Buscador + boton exportar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
        <div ref={buscadorRef} className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar estudiante por nombre..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarSugerencias(true);
              setIndiceSugerencia(-1);
            }}
            onFocus={() => setMostrarSugerencias(true)}
            onKeyDown={handleKeyDown}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {/* Dropdown autocompletado */}
          {mostrarSugerencias && sugerencias.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[360px] overflow-y-auto z-50">
              <div className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                {sugerencias.length}{' '}
                {sugerencias.length === 1 ? 'resultado' : 'resultados'} - Click para ver reporte
              </div>
              {sugerencias.map((e, idx) => {
                const color = SECTION_COLORS[e.seccion] || DEFAULT_COLOR;
                const activa = idx === indiceSugerencia;
                return (
                  <div
                    key={e.id}
                    onClick={() => irAReporte(e)}
                    onMouseEnter={() => setIndiceSugerencia(idx)}
                    className={`px-3.5 py-2.5 flex items-center gap-3 cursor-pointer border-b border-slate-100 last:border-b-0 ${
                      activa ? 'bg-slate-100' : 'bg-transparent hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar - SIEMPRE redondo */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 aspect-square"
                      style={{
                        background: color.bg,
                        color: color.text,
                        border: `2px solid ${color.border}44`,
                      }}
                    >
                      {getIniciales(e.nombre)}
                    </div>
                    <span className="flex-1 text-slate-900 text-sm truncate">
                      {e.nombre}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {e.seccion}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {puedoExportar && (
          <button
            onClick={exportarExcel}
            disabled={exportando || listaFiltrada.length === 0}
            className={`px-4 py-2.5 rounded-lg border-0 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition ${
              exportando
                ? 'bg-slate-400 cursor-wait'
                : 'bg-green-600 hover:bg-green-700 cursor-pointer active:scale-95'
            } disabled:opacity-60`}
          >
            <span>📊</span>
            {exportando ? 'Generando...' : 'Exportar Excel'}
          </button>
        )}
      </div>

      {/* Lista de estudiantes */}
      <div
        className="bg-white rounded-xl overflow-hidden shadow-sm"
        style={{ border: `1px solid ${colorActivo.border}33` }}
      >
        {/* Header de la lista */}
        <div
          className="px-4 md:px-5 py-3.5 flex justify-between items-center"
          style={{
            background: colorActivo.bg,
            borderBottom: `2px solid ${colorActivo.border}`,
          }}
        >
          <strong style={{ color: colorActivo.text }} className="text-sm md:text-[15px]">
            {seccionActiva === 'TODAS'
              ? 'Todas las secciones'
              : `Seccion ${seccionActiva}`}
          </strong>
          <span style={{ color: colorActivo.text }} className="text-xs md:text-sm font-medium">
            {listaFiltrada.length}{' '}
            {listaFiltrada.length === 1 ? 'estudiante' : 'estudiantes'}
          </span>
        </div>

        {listaFiltrada.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            {busqueda
              ? 'No hay resultados para tu busqueda'
              : 'No hay estudiantes en esta seccion'}
          </div>
        ) : (
          <>
            {/* Tabla en desktop */}
            <table className="hidden md:table w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="w-[70px] px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="w-[120px] px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Seccion
                  </th>
                  <th className="w-[140px] px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((e, idx) => {
                  const color = SECTION_COLORS[e.seccion] || DEFAULT_COLOR;
                  return (
                    <tr
                      key={e.id || `${e.nombre}-${idx}`}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3 text-sm text-center text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          onClick={() => irAReporte(e)}
                          className="flex items-center gap-3 cursor-pointer group"
                          title="Ver reporte individual"
                        >
                          {/* Avatar - SIEMPRE redondo */}
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 aspect-square"
                            style={{
                              background: color.bg,
                              color: color.text,
                              border: `2px solid ${color.border}44`,
                            }}
                          >
                            {getIniciales(e.nombre)}
                          </div>
                          <span className="text-slate-900 font-medium text-sm group-hover:text-blue-600 group-hover:underline transition">
                            {e.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {e.seccion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => irAReporte(e)}
                          className="px-3 py-1.5 rounded-md border border-blue-600 bg-white text-blue-600 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 hover:bg-blue-600 hover:text-white active:scale-95 transition"
                          title="Ver reporte individual"
                        >
                          <span>📊</span>
                          Ver reporte
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Tarjetas en movil */}
            <div className="md:hidden">
              {listaFiltrada.map((e, idx) => {
                const color = SECTION_COLORS[e.seccion] || DEFAULT_COLOR;
                return (
                  <div
                    key={e.id || `${e.nombre}-${idx}`}
                    onClick={() => irAReporte(e)}
                    className="px-4 py-3 border-b border-slate-100 last:border-b-0 active:bg-slate-50 cursor-pointer flex items-center gap-3"
                  >
                    {/* Numero */}
                    <div className="text-xs text-slate-400 font-medium w-5 flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Avatar - SIEMPRE redondo */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 aspect-square"
                      style={{
                        background: color.bg,
                        color: color.text,
                        border: `2px solid ${color.border}44`,
                      }}
                    >
                      {getIniciales(e.nombre)}
                    </div>

                    {/* Nombre + seccion */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {e.nombre}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {e.seccion}
                        </span>
                        <span className="text-[11px] text-blue-600 font-medium">
                          📊 Toca para ver reporte
                        </span>
                      </div>
                    </div>

                    {/* Flecha */}
                    <div className="text-slate-300 text-xl flex-shrink-0">›</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ==================== Sub-componentes ==================== */

function TarjetaSeccion({ titulo, subtitulo, total, color, activa, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 md:p-4 rounded-xl flex flex-col gap-1.5 md:gap-2 cursor-pointer transition ${
        activa ? 'shadow-md' : 'shadow-sm hover:shadow-md'
      }`}
      style={{
        border: `2px solid ${activa ? color.border : 'transparent'}`,
        background: activa ? color.bg : '#fff',
      }}
    >
      <div className="flex justify-between items-center">
        <span
          className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: activa ? color.text : '#64748b' }}
        >
          {titulo}
        </span>
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 aspect-square"
          style={{ background: color.accent }}
        />
      </div>
      <div
        className="text-2xl md:text-[32px] font-bold leading-none"
        style={{ color: activa ? color.accent : '#0f172a' }}
      >
        {total}
      </div>
      <div className="text-[11px] md:text-xs text-slate-400">{subtitulo}</div>
    </button>
  );
}
