import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/useAuth';

const SECTION_COLORS = {
  '4A': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', accent: '#2563eb' },
  '4B': { bg: '#dcfce7', border: '#22c55e', text: '#166534', accent: '#16a34a' },
  '5A': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', accent: '#d97706' },
  '5B': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d', accent: '#db2777' },
};

const DEFAULT_COLOR = { bg: '#f1f5f9', border: '#64748b', text: '#334155', accent: '#475569' };

const ETIQUETAS_ESTADO = {
  presente: { texto: 'Presente', textoPlural: 'Presentes', color: '#16a34a', bg: '#dcfce7', icono: '✓', excelRGB: '16A34A' },
  tardanza: { texto: 'Tardanza', textoPlural: 'Tardanzas', color: '#d97706', bg: '#fef3c7', icono: 'T', excelRGB: 'D97706' },
  ausente: { texto: 'Falta', textoPlural: 'Faltas', color: '#dc2626', bg: '#fee2e2', icono: 'F', excelRGB: 'DC2626' },
  justificado: { texto: 'Justificado', color: '#2563eb', bg: '#dbeafe', icono: 'J', excelRGB: '2563EB' },
};

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_SEMANA_CORTO = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

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

function capitalizar(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function obtenerDiaSemana(fechaStr) {
  try {
    const fecha = new Date(fechaStr + 'T00:00:00');
    return capitalizar(fecha.toLocaleDateString('es-PE', { weekday: 'long' }));
  } catch {
    return '';
  }
}

// Obtener indice de dia (0=Lun, 1=Mar, ..., 6=Dom)
function getDiaIdx(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  const diaJS = fecha.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  return diaJS === 0 ? 6 : diaJS - 1; // Lunes=0, Domingo=6
}

// Obtener numero de semana ISO (aproximado)
function getSemanaDelAno(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  const inicioAno = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha - inicioAno) / (24 * 60 * 60 * 1000));
  return Math.ceil((dias + inicioAno.getDay() + 1) / 7);
}

// Helper seguro para aplicar estilos a celdas Excel
function aplicarEstilo(ws, ref, estilo) {
  if (!ws[ref]) {
    ws[ref] = { t: 's', v: '' };
  }
  ws[ref].s = estilo;
}

export default function ReporteEstudiante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const estudianteIdParam = searchParams.get('estudiante_id');

  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [historialCompleto, setHistorialCompleto] = useState([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        const endpoint = user?.isAdmin ? '/estudiantes' : '/mis-estudiantes';
        const { data } = await api.get(endpoint);
        if (estudianteIdParam) {
          const id = parseInt(estudianteIdParam, 10);
          const encontrado = (data || []).find((e) => e.id === id);
          if (encontrado) {
            setEstudianteSeleccionado(encontrado);
          }
        }
      } catch (err) {
        console.error('Error cargando estudiantes:', err);
      }
    }
    cargar();
  }, [estudianteIdParam, user]);

  useEffect(() => {
    if (!estudianteSeleccionado) {
      setHistorialCompleto([]);
      return;
    }
    async function cargarHistorial() {
      try {
        setLoading(true);
        const { data } = await api.get('/reporte-asistencia');
        const delEstudiante = (data || []).filter(
          (r) => r.estudiante_id === estudianteSeleccionado.id
        );
        setHistorialCompleto(delEstudiante);
      } catch (err) {
        console.error('Error cargando historial:', err);
      } finally {
        setLoading(false);
      }
    }
    cargarHistorial();
  }, [estudianteSeleccionado]);

  const historialFiltrado = useMemo(() => {
    let h = historialCompleto;
    if (fechaDesde) h = h.filter((r) => r.fecha >= fechaDesde);
    if (fechaHasta) h = h.filter((r) => r.fecha <= fechaHasta);
    return [...h].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }, [historialCompleto, fechaDesde, fechaHasta]);

  const stats = useMemo(() => {
    const total = historialFiltrado.length;
    const c = { presente: 0, ausente: 0, tardanza: 0, justificado: 0 };
    historialFiltrado.forEach((r) => {
      if (c[r.estado] !== undefined) c[r.estado]++;
    });
    const asistidos = c.presente + c.tardanza + c.justificado;
    const pct = total > 0 ? Math.round((asistidos / total) * 100) : 0;
    return { total, ...c, pct, asistidos };
  }, [historialFiltrado]);

  // Construir matriz del mapa de calor (semanas x dias)
  const mapaCalor = useMemo(() => {
    if (historialFiltrado.length === 0) return { semanas: [], porDia: {} };

    const porSemana = {}; // { "2026-W15": { 0: 'presente', 1: 'ausente', ... } }
    const porDia = {
      0: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      1: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      2: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      3: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      4: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      5: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
      6: { presente: 0, tardanza: 0, ausente: 0, justificado: 0, total: 0 },
    };

    historialFiltrado.forEach((r) => {
      const dia = getDiaIdx(r.fecha);
      const fecha = new Date(r.fecha + 'T00:00:00');
      const semana = `${fecha.getFullYear()}-W${String(getSemanaDelAno(r.fecha)).padStart(2, '0')}`;
      if (!porSemana[semana]) porSemana[semana] = {};
      porSemana[semana][dia] = { estado: r.estado, fecha: r.fecha };

      if (r.estado && porDia[dia][r.estado] !== undefined) {
        porDia[dia][r.estado]++;
        porDia[dia].total++;
      }
    });

    const semanasOrdenadas = Object.keys(porSemana).sort();
    return {
      semanas: semanasOrdenadas.map((clave) => ({
        clave,
        label: clave.split('-W')[1], // Solo el numero de semana
        dias: porSemana[clave],
      })),
      porDia,
    };
  }, [historialFiltrado]);

  function limpiarSeleccion() {
    setEstudianteSeleccionado(null);
    setHistorialCompleto([]);
    setFechaDesde('');
    setFechaHasta('');
    setSearchParams({});
    navigate('/estudiantes');
  }

  async function exportarExcel() {
    if (!estudianteSeleccionado || historialFiltrado.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    try {
      setExportando(true);
      const XLSXModule = await import("xlsx-js-style");
      const XLSX = XLSXModule.default ?? XLSXModule;

      const { nombre, seccion } = estudianteSeleccionado;
      const fechaHoy = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const rangoTexto =
        fechaDesde || fechaHasta
          ? `${fechaDesde || 'inicio'} a ${fechaHasta || 'hoy'}`
          : 'Todo el periodo';

      const historialOrdenadoAsc = [...historialFiltrado].sort((a, b) =>
        (a.fecha || '').localeCompare(b.fecha || '')
      );

      const pctTxt = (n) =>
        stats.total > 0 ? Math.round((n / stats.total) * 100) + '%' : '0%';

      // ========================================================
      // HOJA 1: Reporte general
      // ========================================================
      const aoa = [];
      aoa.push(['REPORTE DE ASISTENCIA INDIVIDUAL', '', '', '']);
      aoa.push([`Estudiante: ${nombre}`, '', '', '']);
      aoa.push([`Seccion: ${seccion}  |  Rango: ${rangoTexto}  |  Total dias: ${stats.total}`, '', '', '']);
      aoa.push([`Asistencia acumulada: ${stats.pct}%`, '', '', '']);
      aoa.push(['', '', '', '']);
      aoa.push([`Fecha de emision: ${fechaHoy}`, '', '', '']);
      aoa.push(['', '', '', '']);
      aoa.push(['RESUMEN', '', '', '']);
      aoa.push(['ESTADO', 'CANTIDAD', 'PORCENTAJE', '']);
      aoa.push(['Presente', stats.presente, pctTxt(stats.presente), '']);
      aoa.push(['Tardanza', stats.tardanza, pctTxt(stats.tardanza), '']);
      aoa.push(['Ausente', stats.ausente, pctTxt(stats.ausente), '']);
      aoa.push(['Justificado', stats.justificado, pctTxt(stats.justificado), '']);
      aoa.push(['', '', '', '']);
      aoa.push(['DETALLE DIA POR DIA', '', '', '']);
      aoa.push(['N', 'FECHA', 'DIA', 'ESTADO']);

      historialOrdenadoAsc.forEach((r, idx) => {
        const etiqueta = ETIQUETAS_ESTADO[r.estado]?.texto || r.estado;
        aoa.push([idx + 1, r.fecha, obtenerDiaSemana(r.fecha), etiqueta]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
        { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } },
        { s: { r: 14, c: 0 }, e: { r: 14, c: 3 } },
      ];

      const borde = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      };

      aplicarEstilo(ws, 'A1', {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      });
      aplicarEstilo(ws, 'A2', {
        font: { bold: true, sz: 12, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
      });
      aplicarEstilo(ws, 'A3', {
        font: { sz: 10, color: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
      });
      aplicarEstilo(ws, 'A4', {
        font: { bold: true, sz: 13, color: { rgb: '1E40AF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
      });
      aplicarEstilo(ws, 'A6', {
        font: { sz: 9, italic: true, color: { rgb: '64748B' } },
        alignment: { horizontal: 'right', vertical: 'center' },
      });
      aplicarEstilo(ws, 'A8', {
        font: { bold: true, sz: 12, color: { rgb: '1E40AF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      });

      ['A9', 'B9', 'C9'].forEach((ref) => {
        aplicarEstilo(ws, ref, {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
          border: borde,
        });
      });
      for (let r = 10; r <= 13; r++) {
        ['A', 'B', 'C'].forEach((col) => {
          const ref = `${col}${r}`;
          const alt = r % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
          aplicarEstilo(ws, ref, {
            font: { sz: 10, color: { rgb: '0F172A' } },
            alignment: {
              horizontal: col === 'A' ? 'left' : 'center',
              vertical: 'center',
            },
            fill: { patternType: 'solid', fgColor: { rgb: alt } },
            border: borde,
          });
        });
      }
      aplicarEstilo(ws, 'A15', {
        font: { bold: true, sz: 12, color: { rgb: '1E40AF' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      });
      ['A16', 'B16', 'C16', 'D16'].forEach((ref) => {
        aplicarEstilo(ws, ref, {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
          border: borde,
        });
      });
      historialOrdenadoAsc.forEach((_, idx) => {
        const rowNum = 17 + idx;
        const esPar = idx % 2 === 0;
        const fondoAlterno = esPar ? 'FFFFFF' : 'F8FAFC';
        ['A', 'B', 'C', 'D'].forEach((col) => {
          const ref = `${col}${rowNum}`;
          aplicarEstilo(ws, ref, {
            font: { sz: 10, color: { rgb: '0F172A' } },
            alignment: {
              horizontal: col === 'A' || col === 'B' || col === 'D' ? 'center' : 'left',
              vertical: 'center',
            },
            fill: { patternType: 'solid', fgColor: { rgb: fondoAlterno } },
            border: borde,
          });
        });
      });

      // ========================================================
      // HOJA 2: Mapa de Calor por dia de semana
      // ========================================================
      const { semanas, porDia } = mapaCalor;

      const aoaMapa = [];
      aoaMapa.push(['MAPA DE CALOR - PATRONES POR DIA DE SEMANA']);
      aoaMapa.push([`Estudiante: ${nombre}  |  Seccion: ${seccion}`]);
      aoaMapa.push([]);

      // Cabecera: Dia | Sem1 | Sem2 | ... | TOTAL P | T | A | J | % Asist
      const cabMapa = ['DIA'];
      semanas.forEach((s) => cabMapa.push(`S${s.label}`));
      cabMapa.push('PRES', 'TARD', 'AUS', 'JUST', '% ASIST');
      aoaMapa.push(cabMapa);

      // Filas: un dia por fila (Lun a Dom)
      DIAS_SEMANA.forEach((nombreDia, diaIdx) => {
        const fila = [nombreDia];
        semanas.forEach((s) => {
          const celda = s.dias[diaIdx];
          if (celda) {
            fila.push(ETIQUETAS_ESTADO[celda.estado]?.texto.charAt(0) || '?');
          } else {
            fila.push('');
          }
        });
        const stDia = porDia[diaIdx];
        fila.push(stDia.presente, stDia.tardanza, stDia.ausente, stDia.justificado);
        const asistDia = stDia.presente + stDia.tardanza + stDia.justificado;
        fila.push(
          stDia.total > 0 ? Math.round((asistDia / stDia.total) * 100) + '%' : '-'
        );
        aoaMapa.push(fila);
      });

      aoaMapa.push([]);
      aoaMapa.push(['LEYENDA:']);
      aoaMapa.push(['P = Presente', 'T = Tardanza', 'A = Ausente', 'J = Justificado']);

      const wsMapa = XLSX.utils.aoa_to_sheet(aoaMapa);

      // Anchos: Dia ancho, semanas angostas, totales medianos
      const colsMapa = [{ wch: 12 }];
      semanas.forEach(() => colsMapa.push({ wch: 6 }));
      colsMapa.push({ wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 10 });
      wsMapa['!cols'] = colsMapa;

      wsMapa['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: cabMapa.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: cabMapa.length - 1 } },
      ];

      // Titulo mapa
      aplicarEstilo(wsMapa, 'A1', {
        font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      });
      aplicarEstilo(wsMapa, 'A2', {
        font: { sz: 10, color: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
      });

      // Cabecera de columnas (fila 4 en Excel = indice 3)
      function colLetter(col) {
        // Soporta hasta columna AZ (52 columnas es mas que suficiente)
        if (col < 26) return String.fromCharCode(65 + col);
        return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26));
      }

      for (let c = 0; c < cabMapa.length; c++) {
        const ref = `${colLetter(c)}4`;
        aplicarEstilo(wsMapa, ref, {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
          border: borde,
        });
      }

      // Filas de datos (Lun a Dom): filas 5 a 11 en Excel
      DIAS_SEMANA.forEach((_, diaIdx) => {
        const rowNum = 5 + diaIdx;
        // Columna A: nombre del dia
        aplicarEstilo(wsMapa, `A${rowNum}`, {
          font: { bold: true, sz: 10, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
          border: borde,
        });
        // Columnas de semanas: color segun estado
        semanas.forEach((s, sIdx) => {
          const celda = s.dias[diaIdx];
          const ref = `${colLetter(1 + sIdx)}${rowNum}`;
          let fill = 'F1F5F9'; // Sin registro
          let textColor = '94A3B8';
          if (celda) {
            fill = ETIQUETAS_ESTADO[celda.estado]?.excelRGB || 'F1F5F9';
            textColor = 'FFFFFF';
          }
          aplicarEstilo(wsMapa, ref, {
            font: { bold: true, sz: 9, color: { rgb: textColor } },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: { patternType: 'solid', fgColor: { rgb: fill } },
            border: borde,
          });
        });
        // Columnas de totales al final (5 columnas)
        const baseTotales = 1 + semanas.length;
        for (let t = 0; t < 5; t++) {
          const ref = `${colLetter(baseTotales + t)}${rowNum}`;
          aplicarEstilo(wsMapa, ref, {
            font: { sz: 10, color: { rgb: '0F172A' }, bold: t === 4 },
            alignment: { horizontal: 'center', vertical: 'center' },
            fill: {
              patternType: 'solid',
              fgColor: { rgb: t === 4 ? 'DBEAFE' : 'FFFFFF' },
            },
            border: borde,
          });
        }
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Individual');
      XLSX.utils.book_append_sheet(wb, wsMapa, 'Mapa de Calor');

      const nombreLimpio = (nombre || 'estudiante')
        .replace(/[,.]/g, '')
        .replace(/\s+/g, '_')
        .toUpperCase();

      const nombreArchivo = `Reporte_${nombreLimpio}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      XLSX.writeFile(wb, nombreArchivo);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      alert('Ocurrio un error al exportar: ' + (err.message || 'desconocido'));
    } finally {
      setExportando(false);
    }
  }

  // ============ RENDER ============

  if (!estudianteSeleccionado) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Reporte por Estudiante</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Ve a "Mis Estudiantes" y haz clic en "Ver reporte" de un estudiante
        </p>
        <button
          onClick={() => navigate('/estudiantes')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Ir a Mis Estudiantes
        </button>
      </div>
    );
  }

  const color = SECTION_COLORS[estudianteSeleccionado.seccion] || DEFAULT_COLOR;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Encabezado */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          padding: '20px 24px',
          borderRadius: 12,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: '#fff', fontWeight: 700 }}>
            Reporte por Estudiante
          </h1>
          <p style={{ margin: '4px 0 0', color: '#dbeafe', fontSize: 13 }}>
            {estudianteSeleccionado.nombre}
          </p>
        </div>
        <button
          onClick={limpiarSeleccion}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            background: '#f59e0b',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cambiar estudiante
        </button>
      </div>

      {/* Ficha */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
          border: `1px solid ${color.border}33`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: color.bg,
            color: color.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            border: `3px solid ${color.border}`,
            flexShrink: 0,
          }}
        >
          {getIniciales(estudianteSeleccionado.nombre)}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            {estudianteSeleccionado.nombre}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 14px',
                borderRadius: 999,
                background: color.bg,
                color: color.text,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Seccion {estudianteSeleccionado.seccion}
            </span>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {stats.total} registros totales
            </span>
          </div>
        </div>
        <button
          onClick={exportarExcel}
          disabled={exportando || historialFiltrado.length === 0}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: exportando ? '#94a3b8' : '#16a34a',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: exportando ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
          }}
        >
          {exportando ? 'Generando...' : '📊 Exportar Excel'}
        </button>
      </div>

      {/* Filtros de fecha */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            DESDE
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            HASTA
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 14,
            }}
          />
        </div>
        {(fechaDesde || fechaHasta) && (
          <button
            onClick={() => {
              setFechaDesde('');
              setFechaHasta('');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#64748b',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Limpiar fechas
          </button>
        )}
      </div>

      {/* Banner % acumulado */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
          borderRadius: 12,
          padding: '32px 24px',
          textAlign: 'center',
          color: '#fff',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#dbeafe',
            marginBottom: 8,
          }}
        >
          Asistencia Acumulada
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
          {stats.pct}%
        </div>
        <div style={{ fontSize: 13, color: '#dbeafe' }}>
          De {stats.total} dias registrados
        </div>
      </div>

      {/* Tarjetas de conteo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {['presente', 'ausente', 'tardanza', 'justificado'].map((estado) => {
          const et = ETIQUETAS_ESTADO[estado];
          const cantidad = stats[estado];
          const pct = stats.total > 0 ? Math.round((cantidad / stats.total) * 100) : 0;
          return (
            <div
              key={estado}
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                {et.texto + 's'}
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: et.color, lineHeight: 1 }}>
                {cantidad}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                {pct}% del total
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== MAPA DE CALOR ==================== */}
      {historialFiltrado.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#1e40af',
              }}
            >
              🔥 Mapa de Calor - Patrones por día de semana
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Detecta patrones (ej: "falta siempre los viernes")
            </p>
          </div>

          {/* Leyenda */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 16,
              flexWrap: 'wrap',
              fontSize: 12,
            }}
          >
            {['presente', 'tardanza', 'ausente', 'justificado'].map((estado) => {
              const et = ETIQUETAS_ESTADO[estado];
              return (
                <div
                  key={estado}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: et.color,
                    }}
                  />
                  <span style={{ color: '#334155' }}>{et.texto}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                }}
              />
              <span style={{ color: '#334155' }}>Sin registro</span>
            </div>
          </div>

          {/* Tabla mapa de calor */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                borderCollapse: 'separate',
                borderSpacing: 3,
                fontSize: 11,
                minWidth: '100%',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '6px 10px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    DÍA
                  </th>
                  {mapaCalor.semanas.map((s) => (
                    <th
                      key={s.clave}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#64748b',
                        minWidth: 32,
                      }}
                      title={s.clave}
                    >
                      S{s.label}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '6px 10px',
                      textAlign: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#1e40af',
                      borderLeft: '2px solid #e2e8f0',
                      paddingLeft: 14,
                    }}
                  >
                    % ASIST
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((nombreDia, diaIdx) => {
                  const stDia = mapaCalor.porDia[diaIdx];
                  const asistDia = stDia.presente + stDia.tardanza + stDia.justificado;
                  const pctDia =
                    stDia.total > 0
                      ? Math.round((asistDia / stDia.total) * 100)
                      : null;
                  // Destacar dias problematicos (< 70% asistencia)
                  const esProblema = pctDia !== null && pctDia < 70;

                  return (
                    <tr key={diaIdx}>
                      <td
                        style={{
                          padding: '6px 10px',
                          fontWeight: 600,
                          color: esProblema ? '#dc2626' : '#334155',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {DIAS_SEMANA_CORTO[diaIdx]}
                      </td>
                      {mapaCalor.semanas.map((s) => {
                        const celda = s.dias[diaIdx];
                        const et = celda ? ETIQUETAS_ESTADO[celda.estado] : null;
                        return (
                          <td
                            key={s.clave}
                            style={{
                              padding: 0,
                              textAlign: 'center',
                            }}
                          >
                            <div
                              title={
                                celda
                                  ? `${celda.fecha}: ${et?.texto}`
                                  : 'Sin registro'
                              }
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 4,
                                background: celda ? et.color : '#f1f5f9',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                border: celda
                                  ? 'none'
                                  : '1px solid #e2e8f0',
                                cursor: celda ? 'help' : 'default',
                                margin: '0 auto',
                              }}
                            >
                              {celda ? et.texto.charAt(0) : ''}
                            </div>
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          color: esProblema
                            ? '#dc2626'
                            : pctDia !== null && pctDia >= 90
                            ? '#16a34a'
                            : '#0f172a',
                          borderLeft: '2px solid #e2e8f0',
                          paddingLeft: 14,
                        }}
                      >
                        {pctDia !== null ? `${pctDia}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Insights automaticos */}
          {(() => {
            const diasProblema = DIAS_SEMANA.map((nombre, idx) => {
              const st = mapaCalor.porDia[idx];
              const asist = st.presente + st.tardanza + st.justificado;
              const pct = st.total > 0 ? (asist / st.total) * 100 : 100;
              return { nombre, pct, total: st.total };
            })
              .filter((d) => d.total >= 2 && d.pct < 70)
              .sort((a, b) => a.pct - b.pct);

            if (diasProblema.length === 0) return null;

            return (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#991b1b',
                }}
              >
                ⚠️ <strong>Patrón detectado:</strong> asistencia baja los{' '}
                {diasProblema.map((d, i) => (
                  <span key={d.nombre}>
                    <strong>{d.nombre}</strong> ({Math.round(d.pct)}%)
                    {i < diasProblema.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tabla historial */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            background: '#dbeafe',
            borderBottom: '2px solid #3b82f6',
          }}
        >
          <strong style={{ color: '#1e40af', fontSize: 15 }}>
            Historial de Asistencias ({historialFiltrado.length} registros)
          </strong>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Cargando historial...
          </div>
        ) : historialFiltrado.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No hay registros en este rango
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  FECHA
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  DIA
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  ESTADO
                </th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((r, idx) => {
                const et = ETIQUETAS_ESTADO[r.estado] || {
                  texto: r.estado,
                  color: '#64748b',
                  bg: '#f1f5f9',
                  icono: '•',
                };
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#0f172a' }}>
                      {r.fecha}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#334155' }}>
                      {obtenerDiaSemana(r.fecha)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 999,
                          background: et.bg,
                          color: et.color,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {et.icono} {et.texto}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
