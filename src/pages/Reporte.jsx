import { useEffect, useMemo, useRef, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/useAuth';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function Reporte() {
  const { user } = useAuth();
  const reporteRef = useRef(null);
  const [seccion, setSeccion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState('');
  const [cargadoInicial, setCargadoInicial] = useState(false);

  // Secciones disponibles para el usuario
  // Incluye la opción TODAS por defecto.
  const seccionesDisponibles = useMemo(() => {
    const base = user?.isAdmin
      ? ['4A', '4B', '5A', '5B']
      : user?.secciones || [];

    return ['TODAS', ...base];
  }, [user]);

  // Valores por defecto: TODAS + fecha de hoy.
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setSeccion('TODAS');
    setDesde(hoy);
    setHasta(hoy);
  }, []);

  const buscar = async () => {
    if (desde && hasta && desde > hasta) {
      setError("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
      return;
    }

    setLoading(true);
    setBuscado(true);
    setError('');
    try {
      const res = await client.get('/reporte-asistencia');
      let data = Array.isArray(res.data) ? res.data : [];

      if (seccion && seccion !== 'TODAS') {
        data = data.filter((r) => r.seccion === seccion);
      } else if (!user?.isAdmin && Array.isArray(user?.secciones)) {
        data = data.filter((r) => user.secciones.includes(r.seccion));
      }
      if (desde) data = data.filter((r) => r.fecha >= desde);
      if (hasta) data = data.filter((r) => r.fecha <= hasta);

      data = data.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      setRegistros(data);
    } catch (err) {
      console.error('Error al buscar reporte:', err);
      setRegistros([]);
      setError('No se pudo cargar el reporte. Verifica tu conexión o intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Carga automática inicial: TODAS + fecha de hoy, sin presionar Buscar.
  useEffect(() => {
    if (!cargadoInicial && seccion && desde && hasta) {
      buscar();
      setCargadoInicial(true);
    }
  }, [seccion, desde, hasta, cargadoInicial]);

  const aplicarHoy = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setSeccion('TODAS');
    setDesde(hoy);
    setHasta(hoy);
  };

  const limpiarFiltros = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setSeccion('TODAS');
    setDesde(hoy);
    setHasta(hoy);
    setRegistros([]);
    setBuscado(false);
    setError('');
  };

  const total = registros.length;
  const presentes = registros.filter((r) => r.estado === 'presente').length;
  const faltas = registros.filter((r) => r.estado === 'ausente').length;
  const tardanzas = registros.filter((r) => r.estado === 'tardanza').length;
  const justificados = registros.filter((r) => r.estado === 'justificado').length;
  const pct = (v) => (total > 0 ? Math.round((v / total) * 100) : 0);

  const chartData = [
    { name: 'Presentes', value: presentes, color: '#1D9E75' },
    { name: 'Faltas', value: faltas, color: '#E24B4A' },
    { name: 'Tardanzas', value: tardanzas, color: '#EF9F27' },
    { name: 'Justificados', value: justificados, color: '#378ADD' },
  ];

  const resumenPorSeccion = useMemo(() => {
    const mapa = {};
    registros.forEach((r) => {
      const sec = r.seccion || 'Sin sección';
      if (!mapa[sec]) {
        mapa[sec] = { seccion: sec, presentes: 0, faltas: 0, tardanzas: 0, justificados: 0, total: 0 };
      }
      mapa[sec].total += 1;
      if (r.estado === 'presente') mapa[sec].presentes += 1;
      if (r.estado === 'ausente') mapa[sec].faltas += 1;
      if (r.estado === 'tardanza') mapa[sec].tardanzas += 1;
      if (r.estado === 'justificado') mapa[sec].justificados += 1;
    });
    return Object.values(mapa).sort((a, b) => a.seccion.localeCompare(b.seccion));
  }, [registros]);

  const alertasInteligentes = useMemo(() => {
    const mapa = {};
    registros.forEach((r) => {
      const nombre = r.nombre || 'Sin nombre';
      if (!mapa[nombre]) {
        mapa[nombre] = { nombre, seccion: r.seccion, total: 0, presentes: 0, faltas: 0, tardanzas: 0, justificados: 0 };
      }
      mapa[nombre].total += 1;
      if (r.estado === 'presente') mapa[nombre].presentes += 1;
      if (r.estado === 'ausente') mapa[nombre].faltas += 1;
      if (r.estado === 'tardanza') mapa[nombre].tardanzas += 1;
      if (r.estado === 'justificado') mapa[nombre].justificados += 1;
    });

    return Object.values(mapa)
      .map((item) => {
        const porcentaje = item.total > 0 ? Math.round((item.presentes / item.total) * 100) : 0;
        let nivel = '';
        let mensaje = '';

        if (item.faltas >= 3) {
          nivel = 'alta';
          mensaje = `Tiene ${item.faltas} faltas registradas`;
        } else if (porcentaje < 70 && item.total >= 3) {
          nivel = 'media';
          mensaje = `Asistencia baja: ${porcentaje}%`;
        } else if (item.tardanzas >= 3) {
          nivel = 'media';
          mensaje = `Tiene ${item.tardanzas} tardanzas registradas`;
        }

        return { ...item, porcentaje, nivel, mensaje };
      })
      .filter((item) => item.nivel)
      .sort((a, b) => b.faltas - a.faltas || a.porcentaje - b.porcentaje)
      .slice(0, 8);
  }, [registros]);

  // Badge: muestra "Falta" en singular (SIAGIE)
  const badge = (estado) => {
    const estilos = {
      presente: { bg: '#E1F5EE', color: '#085041', texto: 'Presente' },
      ausente: { bg: '#FCEBEB', color: '#791F1F', texto: 'Falta' },
      tardanza: { bg: '#FAEEDA', color: '#633806', texto: 'Tardanza' },
      justificado: { bg: '#E6F1FB', color: '#0C447C', texto: 'Justificado' },
    };
    const e = estilos[estado] || { bg: '#f0f0f0', color: '#666', texto: estado };
    return (
      <span
        style={{
          background: e.bg,
          color: e.color,
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '600',
        }}
      >
        {e.texto}
      </span>
    );
  };

  const exportarExcel = () => {
    if (registros.length === 0) return;

    // Agrupar por estudiante y fecha
    const estudiantesMap = {};
    const fechasSet = new Set();

    registros.forEach((r) => {
      if (!estudiantesMap[r.nombre]) {
        estudiantesMap[r.nombre] = { seccion: r.seccion, fechas: {} };
      }
      estudiantesMap[r.nombre].fechas[r.fecha] = r.estado;
      fechasSet.add(r.fecha);
    });

    const fechas = [...fechasSet].sort();
    const estudiantes = Object.keys(estudiantesMap).sort();

    // Encabezados (P/F/T/J en formato SIAGIE)
    const headers = [
      'N°',
      'ESTUDIANTE',
      'SECCIÓN',
      ...fechas.map((f) => {
        const [, m, d] = f.split('-');
        return `${d}/${m}`;
      }),
      'P',
      'F',
      'T',
      'J',
      '% ASIST',
    ];

    // Filas (estados como letras SIAGIE)
    const rows = estudiantes.map((nombre, i) => {
      const data = estudiantesMap[nombre];
      const estados = fechas.map((f) => {
        const est = data.fechas[f];
        if (est === 'presente') return 'P';
        if (est === 'ausente') return 'F';
        if (est === 'tardanza') return 'T';
        if (est === 'justificado') return 'J';
        return '-';
      });
      const p = estados.filter((e) => e === 'P').length;
      const f = estados.filter((e) => e === 'F').length;
      const t = estados.filter((e) => e === 'T').length;
      const j = estados.filter((e) => e === 'J').length;
      const totalEst = p + f + t + j;
      const pctEst = totalEst > 0 ? Math.round((p / totalEst) * 100) + '%' : '0%';
      return [i + 1, nombre, data.seccion, ...estados, p, f, t, j, pctEst];
    });

    const totalesRow = [
      '',
      'TOTAL POR DÍA',
      '',
      ...fechas.map(
        (f) =>
          registros.filter((r) => r.fecha === f && r.estado === 'presente').length
      ),
      '',
      '',
      '',
      '',
      '',
    ];

    const wsData = [
      [`REPORTE DE ASISTENCIA - ${seccion === 'TODAS' ? 'TODAS LAS SECCIONES' : `SECCIÓN ${seccion}`}`],
      [`Período: ${desde || 'Inicio'} al ${hasta || 'Hoy'}`],
      [`Generado: ${new Date().toLocaleDateString('es-PE')}`],
      [],
      headers,
      ...rows,
      totalesRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const range = XLSX.utils.decode_range(ws['!ref']);

    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1A4A8A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
    ];

    ['A2', 'A3'].forEach((cell) => {
      if (ws[cell]) {
        ws[cell].s = {
          font: { italic: true, sz: 11, color: { rgb: '555555' } },
          alignment: { horizontal: 'center' },
        };
      }
    });

    for (let c = 0; c <= range.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '1A4A8A' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        };
      }
    }

    const colores = {
      P: { fg: 'E1F5EE', txt: '085041' },
      F: { fg: 'FCEBEB', txt: '791F1F' },
      T: { fg: 'FAEEDA', txt: '633806' },
      J: { fg: 'E6F1FB', txt: '0C447C' },
    };

    for (let r = 5; r < 5 + rows.length; r++) {
      const isEven = (r - 5) % 2 === 0;
      for (let c = 0; c <= range.e.c; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (!ws[cell]) continue;
        const val = ws[cell].v;
        let fill = { fgColor: { rgb: isEven ? 'FFFFFF' : 'F5F8FB' } };
        let fontColor = '333333';
        let bold = false;

        if (c >= 3 && c < 3 + fechas.length && colores[val]) {
          fill = { fgColor: { rgb: colores[val].fg } };
          fontColor = colores[val].txt;
          bold = true;
        }

        const lastCols = range.e.c;
        if (c === lastCols - 4 && val > 0) { fontColor = '085041'; bold = true; }
        if (c === lastCols - 3 && val > 0) { fontColor = '791F1F'; bold = true; }
        if (c === lastCols - 2 && val > 0) { fontColor = '633806'; bold = true; }
        if (c === lastCols - 1 && val > 0) { fontColor = '0C447C'; bold = true; }
        if (c === lastCols) { bold = true; }

        ws[cell].s = {
          font: { sz: 10, color: { rgb: fontColor }, bold },
          fill,
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'DDDDDD' } },
            bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
            left: { style: 'thin', color: { rgb: 'DDDDDD' } },
            right: { style: 'thin', color: { rgb: 'DDDDDD' } },
          },
        };
      }
    }

    const totRow = 5 + rows.length;
    for (let c = 0; c <= range.e.c; c++) {
      const cell = XLSX.utils.encode_cell({ r: totRow, c });
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '378ADD' } },
          alignment: { horizontal: 'center' },
          border: {
            top: { style: 'medium', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
          },
        };
      }
    }

    ws['!cols'] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 10 },
      ...fechas.map(() => ({ wch: 7 })),
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 10 },
    ];

    ws['!rows'] = [
      { hpt: 28 }, { hpt: 18 }, { hpt: 18 }, { hpt: 10 }, { hpt: 32 },
      ...rows.map(() => ({ hpt: 22 })),
      { hpt: 26 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, seccion === 'TODAS' ? 'Asistencia Todas' : `Asistencia ${seccion}`);

    // ============ PESTAÑA 3: RESUMEN ESTADÍSTICO ============
    const totalRegs = registros.length;
    const totalP = registros.filter((r) => r.estado === 'presente').length;
    const totalF = registros.filter((r) => r.estado === 'ausente').length;
    const totalT = registros.filter((r) => r.estado === 'tardanza').length;
    const totalJ = registros.filter((r) => r.estado === 'justificado').length;
    const pctGen = totalRegs > 0 ? Math.round((totalP / totalRegs) * 100) : 0;

    const rankingData = estudiantes.map((nombre) => {
      const data = estudiantesMap[nombre];
      const estados = Object.values(data.fechas);
      const p = estados.filter((e) => e === 'presente').length;
      const f = estados.filter((e) => e === 'ausente').length;
      const t = estados.filter((e) => e === 'tardanza').length;
      const j = estados.filter((e) => e === 'justificado').length;
      const tot = estados.length;
      const pct = tot > 0 ? Math.round((p / tot) * 100) : 0;
      return { nombre, p, f, t, j, pct };
    });

    const topAsist = [...rankingData].sort((a, b) => b.pct - a.pct).slice(0, 5);
    const topFaltas = [...rankingData]
      .sort((a, b) => b.f - a.f)
      .slice(0, 5)
      .filter((r) => r.f > 0);

    const porDia = fechas.map((f) => {
      const regs = registros.filter((r) => r.fecha === f);
      const p = regs.filter((r) => r.estado === 'presente').length;
      const ff = regs.filter((r) => r.estado === 'ausente').length;
      const t = regs.filter((r) => r.estado === 'tardanza').length;
      const j = regs.filter((r) => r.estado === 'justificado').length;
      const tot = regs.length;
      const [y, m, d] = f.split('-');
      return [
        `${d}/${m}/${y}`,
        p,
        ff,
        t,
        j,
        tot,
        tot > 0 ? Math.round((p / tot) * 100) + '%' : '0%',
      ];
    });

    const statsData = [];
    let idxTitulo, idxPeriodo, idxIndicadores, idxTopAsist, idxHeaderTopAsist,
        idxTopFaltas, idxHeaderTopFaltas, idxPorDia, idxHeaderPorDia;

    idxTitulo = statsData.length;
    statsData.push(['', `RESUMEN ESTADÍSTICO - ${seccion === 'TODAS' ? 'TODAS LAS SECCIONES' : `SECCIÓN ${seccion}`}`]);

    idxPeriodo = statsData.length;
    statsData.push(['', `Período: ${desde || 'Inicio'} al ${hasta || 'Hoy'}`]);

    statsData.push([]);

    idxIndicadores = statsData.length;
    statsData.push(['', 'INDICADORES GENERALES']);

    statsData.push(['', 'Total de registros', totalRegs]);
    statsData.push(['', 'Presentes', totalP, `${totalRegs > 0 ? Math.round((totalP / totalRegs) * 100) : 0}%`]);
    // SIAGIE: Faltas en lugar de Ausentes
    statsData.push(['', 'Faltas', totalF, `${totalRegs > 0 ? Math.round((totalF / totalRegs) * 100) : 0}%`]);
    statsData.push(['', 'Tardanzas', totalT, `${totalRegs > 0 ? Math.round((totalT / totalRegs) * 100) : 0}%`]);
    statsData.push(['', 'Justificados', totalJ, `${totalRegs > 0 ? Math.round((totalJ / totalRegs) * 100) : 0}%`]);
    statsData.push(['', '% Asistencia general', `${pctGen}%`]);

    statsData.push([]);

    idxTopAsist = statsData.length;
    statsData.push(['', 'TOP 5 ESTUDIANTES CON MEJOR ASISTENCIA']);

    idxHeaderTopAsist = statsData.length;
    statsData.push(['', '#', 'Estudiante', 'Presentes', 'Faltas', 'Tardanzas', 'Justificados', '% Asist.']);

    const topAsistStart = statsData.length;
    topAsist.forEach((r, i) => {
      statsData.push(['', i + 1, r.nombre, r.p, r.f, r.t, r.j, `${r.pct}%`]);
    });

    statsData.push([]);

    idxTopFaltas = statsData.length;
    statsData.push(['', 'TOP 5 ESTUDIANTES CON MÁS FALTAS']);

    idxHeaderTopFaltas = statsData.length;
    statsData.push(['', '#', 'Estudiante', 'Presentes', 'Faltas', 'Tardanzas', 'Justificados', '% Asist.']);

    const topFaltasStartRow = statsData.length;
    if (topFaltas.length > 0) {
      topFaltas.forEach((r, i) => {
        statsData.push(['', i + 1, r.nombre, r.p, r.f, r.t, r.j, `${r.pct}%`]);
      });
    } else {
      statsData.push(['', '', 'Sin faltas registradas', '', '', '', '', '']);
    }

    statsData.push([]);

    idxPorDia = statsData.length;
    statsData.push(['', 'ASISTENCIA POR DÍA']);

    idxHeaderPorDia = statsData.length;
    statsData.push(['', 'Fecha', 'Presentes', 'Faltas', 'Tardanzas', 'Justificados', 'Total', '% Asist.']);

    const porDiaStartRow = statsData.length;
    porDia.forEach((d) => {
      statsData.push(['', ...d]);
    });

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    wsStats['!cols'] = [
      { wch: 2 }, { wch: 10 }, { wch: 35 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ];

    wsStats['!merges'] = [
      { s: { r: idxTitulo, c: 1 }, e: { r: idxTitulo, c: 7 } },
      { s: { r: idxPeriodo, c: 1 }, e: { r: idxPeriodo, c: 7 } },
      { s: { r: idxIndicadores, c: 1 }, e: { r: idxIndicadores, c: 7 } },
      { s: { r: idxTopAsist, c: 1 }, e: { r: idxTopAsist, c: 7 } },
      { s: { r: idxTopFaltas, c: 1 }, e: { r: idxTopFaltas, c: 7 } },
      { s: { r: idxPorDia, c: 1 }, e: { r: idxPorDia, c: 7 } },
    ];

    const titCell = XLSX.utils.encode_cell({ r: idxTitulo, c: 1 });
    if (wsStats[titCell]) {
      wsStats[titCell].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1A4A8A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    const perCell = XLSX.utils.encode_cell({ r: idxPeriodo, c: 1 });
    if (wsStats[perCell]) {
      wsStats[perCell].s = {
        font: { italic: true, sz: 11, color: { rgb: '555555' } },
        alignment: { horizontal: 'center' },
      };
    }

    [idxIndicadores, idxTopAsist, idxTopFaltas, idxPorDia].forEach((r) => {
      const cell = XLSX.utils.encode_cell({ r, c: 1 });
      if (wsStats[cell]) {
        wsStats[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '378ADD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
      for (let c = 2; c <= 7; c++) {
        const cMerge = XLSX.utils.encode_cell({ r, c });
        if (wsStats[cMerge]) {
          wsStats[cMerge].s = {
            fill: { fgColor: { rgb: '378ADD' } },
          };
        }
      }
    });

    for (let i = 1; i <= 6; i++) {
      const r = idxIndicadores + i;
      const colors = {
        2: { fg: 'E1F5EE', txt: '085041' },
        3: { fg: 'FCEBEB', txt: '791F1F' },
        4: { fg: 'FAEEDA', txt: '633806' },
        5: { fg: 'E6F1FB', txt: '0C447C' },
      };
      const clr = colors[i] || { fg: 'F5F8FB', txt: '333333' };
      for (let c = 1; c <= 3; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (wsStats[cell]) {
          wsStats[cell].s = {
            font: {
              bold: c === 1 || i === 6,
              sz: i === 6 ? 14 : 11,
              color: { rgb: clr.txt },
            },
            fill: { fgColor: { rgb: clr.fg } },
            alignment: {
              horizontal: c === 1 ? 'left' : 'center',
              vertical: 'center',
              indent: c === 1 ? 1 : 0,
            },
            border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
          };
        }
      }
    }

    [idxHeaderTopAsist, idxHeaderTopFaltas, idxHeaderPorDia].forEach((r) => {
      for (let c = 1; c <= 7; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (wsStats[cell]) {
          wsStats[cell].s = {
            font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1A4A8A' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
          };
        }
      }
    });

    topAsist.forEach((r, i) => {
      const rowIdx = topAsistStart + i;
      let bg, fg, bold;
      if (r.pct >= 95) { bg = '1D9E75'; fg = 'FFFFFF'; bold = true; }
      else if (r.pct >= 85) { bg = '5DCAA5'; fg = '04342C'; bold = true; }
      else if (r.pct >= 70) { bg = '9FE1CB'; fg = '085041'; bold = false; }
      else { bg = 'E1F5EE'; fg = '085041'; bold = false; }

      for (let c = 1; c <= 7; c++) {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (wsStats[cell]) {
          wsStats[cell].s = {
            font: { bold, sz: 10, color: { rgb: fg } },
            fill: { fgColor: { rgb: bg } },
            alignment: {
              horizontal: c === 2 ? 'left' : 'center',
              vertical: 'center',
              indent: c === 2 ? 1 : 0,
            },
            border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
          };
        }
      }
    });

    if (topFaltas.length > 0) {
      const maxFaltas = Math.max(...topFaltas.map((r) => r.f));
      topFaltas.forEach((r, i) => {
        const rowIdx = topFaltasStartRow + i;
        const intensity = maxFaltas > 0 ? r.f / maxFaltas : 0;
        let bg, fg, bold;
        if (intensity >= 0.75) { bg = 'E24B4A'; fg = 'FFFFFF'; bold = true; }
        else if (intensity >= 0.5) { bg = 'F09595'; fg = '4A1313'; bold = true; }
        else if (intensity >= 0.25) { bg = 'F7C1C1'; fg = '791F1F'; bold = false; }
        else { bg = 'FCEBEB'; fg = '791F1F'; bold = false; }

        for (let c = 1; c <= 7; c++) {
          const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (wsStats[cell]) {
            wsStats[cell].s = {
              font: { bold, sz: 10, color: { rgb: fg } },
              fill: { fgColor: { rgb: bg } },
              alignment: {
                horizontal: c === 2 ? 'left' : 'center',
                vertical: 'center',
                indent: c === 2 ? 1 : 0,
              },
              border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
            };
          }
        }
      });
    }

    porDia.forEach((d, i) => {
      const rowIdx = porDiaStartRow + i;
      for (let c = 1; c <= 7; c++) {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (wsStats[cell]) {
          wsStats[cell].s = {
            font: { sz: 10, color: { rgb: '333333' } },
            fill: { fgColor: { rgb: i % 2 === 0 ? 'FFFFFF' : 'F5F8FB' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
          };
        }
      }
    });

    const rowCount = statsData.length;
    wsStats['!rows'] = Array(rowCount).fill({ hpt: 22 });
    wsStats['!rows'][idxTitulo] = { hpt: 32 };
    wsStats['!rows'][idxPeriodo] = { hpt: 18 };
    [idxIndicadores, idxTopAsist, idxTopFaltas, idxPorDia].forEach((r) => {
      wsStats['!rows'][r] = { hpt: 26 };
    });
    [idxHeaderTopAsist, idxHeaderTopFaltas, idxHeaderPorDia].forEach((r) => {
      wsStats['!rows'][r] = { hpt: 24 };
    });

    XLSX.utils.book_append_sheet(wb, wsStats, 'Resumen Estadístico');

    // ============ PESTAÑA 2: LEYENDA (con código SIAGIE) ============
    const legendData = [
      ['LEYENDA DE ESTADOS - FORMATO SIAGIE'],
      [],
      ['Código', 'Estado', 'Descripción'],
      ['P', 'Presente', 'Estudiante asistió puntualmente'],
      ['F', 'Falta', 'Estudiante no asistió (sin justificación)'],
      ['T', 'Tardanza', 'Estudiante llegó tarde'],
      ['J', 'Justificado', 'Falta justificada'],
    ];
    const wsLeg = XLSX.utils.aoa_to_sheet(legendData);
    wsLeg['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 45 }];
    if (wsLeg['A1']) {
      wsLeg['A1'].s = {
        font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1A4A8A' } },
        alignment: { horizontal: 'center' },
      };
    }
    wsLeg['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, wsLeg, 'Leyenda');

    // ============ PESTAÑA 4: GRÁFICO VISUAL ============
    const maxBarLen = 40;

    const graphData = [
      [`ANÁLISIS VISUAL - ${seccion === 'TODAS' ? 'TODAS LAS SECCIONES' : `SECCIÓN ${seccion}`}`],
      [`Período: ${desde || 'Inicio'} al ${hasta || 'Hoy'}`],
      [],
      ['DISTRIBUCIÓN GENERAL DE ESTADOS'],
      [],
      ['Estado', 'Cantidad', '%', 'Barra visual'],
    ];

    const estadosStats = [
      { label: 'Presentes', val: totalP, color: '1D9E75', lightColor: 'E1F5EE' },
      // SIAGIE: "Faltas" en lugar de "Ausentes"
      { label: 'Faltas', val: totalF, color: 'E24B4A', lightColor: 'FCEBEB' },
      { label: 'Tardanzas', val: totalT, color: 'EF9F27', lightColor: 'FAEEDA' },
      { label: 'Justificados', val: totalJ, color: '378ADD', lightColor: 'E6F1FB' },
    ];

    const maxEstado = Math.max(...estadosStats.map((e) => e.val));
    estadosStats.forEach((e) => {
      const p = totalRegs > 0 ? Math.round((e.val / totalRegs) * 100) : 0;
      const barLen = maxEstado > 0 ? Math.round((e.val / maxEstado) * maxBarLen) : 0;
      const bar = '█'.repeat(barLen) + '░'.repeat(maxBarLen - barLen);
      graphData.push([e.label, e.val, `${p}%`, bar]);
    });

    graphData.push([]);
    graphData.push(['MAPA DE CALOR - ASISTENCIA POR DÍA']);
    graphData.push([]);
    graphData.push(['Fecha', 'Presentes', 'Faltas', 'Tardanzas', 'Justificados', '% Asist.']);

    const mapaCalorStartRow = graphData.length;
    porDia.forEach((d) => {
      graphData.push([d[0], d[1], d[2], d[3], d[4], d[6]]);
    });

    graphData.push([]);
    graphData.push(['RANKING VISUAL DE ASISTENCIA (Todos los estudiantes)']);
    graphData.push([]);
    graphData.push(['#', 'Estudiante', '% Asist.', 'Barra visual']);

    const rankingVisualStart = graphData.length;
    const rankingOrdenado = [...rankingData].sort((a, b) => b.pct - a.pct);
    rankingOrdenado.forEach((r, i) => {
      const barLen = Math.round((r.pct / 100) * maxBarLen);
      const bar = '█'.repeat(barLen) + '░'.repeat(maxBarLen - barLen);
      graphData.push([i + 1, r.nombre, `${r.pct}%`, bar]);
    });

    const wsGraph = XLSX.utils.aoa_to_sheet(graphData);
    wsGraph['!cols'] = [
      { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
    ];

    if (wsGraph['A1']) {
      wsGraph['A1'].s = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1A4A8A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    if (wsGraph['A2']) {
      wsGraph['A2'].s = {
        font: { italic: true, sz: 11, color: { rgb: '555555' } },
        alignment: { horizontal: 'center' },
      };
    }
    wsGraph['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
      { s: { r: 11, c: 0 }, e: { r: 11, c: 5 } },
      { s: { r: mapaCalorStartRow + porDia.length + 1, c: 0 }, e: { r: mapaCalorStartRow + porDia.length + 1, c: 5 } },
    ];

    [3, 11, mapaCalorStartRow + porDia.length + 1].forEach((r) => {
      const cell = XLSX.utils.encode_cell({ r, c: 0 });
      if (wsGraph[cell]) {
        wsGraph[cell].s = {
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '378ADD' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    });

    estadosStats.forEach((e, i) => {
      const r = 6 + i;
      for (let c = 0; c <= 3; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (wsGraph[cell]) {
          wsGraph[cell].s = {
            font: {
              bold: c === 0 || c === 1,
              sz: c === 3 ? 9 : 11,
              color: { rgb: c === 3 ? e.color : '333333' },
              name: c === 3 ? 'Consolas' : 'Calibri',
            },
            fill: { fgColor: { rgb: e.lightColor } },
            alignment: { horizontal: c === 3 ? 'left' : 'center', vertical: 'center' },
            border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
          };
        }
      }
    });

    for (let c = 0; c <= 5; c++) {
      const cell = XLSX.utils.encode_cell({ r: mapaCalorStartRow - 1, c });
      if (wsGraph[cell]) {
        wsGraph[cell].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1A4A8A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
        };
      }
    }

    porDia.forEach((d, i) => {
      const r = mapaCalorStartRow + i;
      const pctDia = parseInt(d[6]);
      let bgPct, fgPct;
      if (pctDia >= 90) { bgPct = '1D9E75'; fgPct = 'FFFFFF'; }
      else if (pctDia >= 75) { bgPct = '5DCAA5'; fgPct = '04342C'; }
      else if (pctDia >= 50) { bgPct = 'EF9F27'; fgPct = '412402'; }
      else { bgPct = 'E24B4A'; fgPct = 'FFFFFF'; }

      for (let c = 0; c <= 5; c++) {
        const cell = XLSX.utils.encode_cell({ r, c });
        if (wsGraph[cell]) {
          const colors = { 1: 'E1F5EE', 2: 'FCEBEB', 3: 'FAEEDA', 4: 'E6F1FB' };
          const txtColors = { 1: '085041', 2: '791F1F', 3: '633806', 4: '0C447C' };
          let bg = colors[c] || 'FFFFFF';
          let fg = txtColors[c] || '333333';
          let bold = false;
          if (c === 5) { bg = bgPct; fg = fgPct; bold = true; }
          if (c === 0) { bold = true; bg = 'F5F8FB'; }

          wsGraph[cell].s = {
            font: { bold, sz: 10, color: { rgb: fg } },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'DDDDDD' } },
              bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
              left: { style: 'thin', color: { rgb: 'DDDDDD' } },
              right: { style: 'thin', color: { rgb: 'DDDDDD' } },
            },
          };
        }
      }
    });

    const rankHeaderRow = rankingVisualStart - 1;
    for (let c = 0; c <= 3; c++) {
      const cell = XLSX.utils.encode_cell({ r: rankHeaderRow, c });
      if (wsGraph[cell]) {
        wsGraph[cell].s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1A4A8A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    rankingOrdenado.forEach((r, i) => {
      const rowIdx = rankingVisualStart + i;
      let bg, fg, barColor;
      if (r.pct >= 95) { bg = 'E1F5EE'; fg = '085041'; barColor = '1D9E75'; }
      else if (r.pct >= 80) { bg = 'EAF3DE'; fg = '173404'; barColor = '639922'; }
      else if (r.pct >= 60) { bg = 'FAEEDA'; fg = '633806'; barColor = 'EF9F27'; }
      else { bg = 'FCEBEB'; fg = '791F1F'; barColor = 'E24B4A'; }

      for (let c = 0; c <= 3; c++) {
        const cell = XLSX.utils.encode_cell({ r: rowIdx, c });
        if (wsGraph[cell]) {
          wsGraph[cell].s = {
            font: {
              bold: c === 2,
              sz: c === 3 ? 9 : 10,
              color: { rgb: c === 3 ? barColor : fg },
              name: c === 3 ? 'Consolas' : 'Calibri',
            },
            fill: { fgColor: { rgb: bg } },
            alignment: {
              horizontal: c === 3 ? 'left' : c === 1 ? 'left' : 'center',
              vertical: 'center',
              indent: c === 1 ? 1 : 0,
            },
            border: { bottom: { style: 'thin', color: { rgb: 'DDDDDD' } } },
          };
        }
      }
    });

    XLSX.utils.book_append_sheet(wb, wsGraph, 'Gráfico Visual');

    XLSX.writeFile(wb, `Asistencia_${seccion === 'TODAS' ? 'Todas' : seccion}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarPDF = async () => {
    if (!reporteRef.current || registros.length === 0) return;

    try {
      const canvas = await html2canvas(reporteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f5f6f8',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 16;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 8;

      pdf.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + 8;
        pdf.addImage(imgData, 'PNG', 8, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Reporte_Asistencia_${seccion === 'TODAS' ? 'Todas' : seccion}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setError('No se pudo exportar el PDF. Intenta nuevamente.');
    }
  };

  return (
    <div ref={reporteRef}>
      <div style={{ background: '#1a4a8a', padding: '12px 1.5rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
        <div style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>Reporte de Asistencia</div>
        <div style={{ color: '#a8c4e8', fontSize: '12px', marginTop: '2px' }}>Consulta el historial por sección y rango de fechas</div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Sección</label>
            <select value={seccion} onChange={(e) => setSeccion(e.target.value)}
              style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', background: 'white', minWidth: '120px' }}>
              {seccionesDisponibles.map((s) => (
                <option key={s} value={s}>
                  {s === 'TODAS' ? 'Todas' : s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
          </div>
          <button onClick={buscar} disabled={loading}
            style={{ height: '36px', padding: '0 1.25rem', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button onClick={aplicarHoy}
            style={{ height: '36px', padding: '0 12px', background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Hoy
          </button>
          <button onClick={exportarExcel} disabled={registros.length === 0}
            style={{ height: '36px', padding: '0 1.25rem', background: '#1a4a8a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: registros.length === 0 ? 'not-allowed' : 'pointer', opacity: registros.length === 0 ? 0.5 : 1 }}>
            📊 Exportar Excel
          </button>
          <button onClick={exportarPDF} disabled={registros.length === 0}
            style={{ height: '36px', padding: '0 1.25rem', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: registros.length === 0 ? 'not-allowed' : 'pointer', opacity: registros.length === 0 ? 0.5 : 1 }}>
            📄 Exportar PDF
          </button>
          {(desde || hasta) && (
            <button onClick={limpiarFiltros}
              style={{ height: '36px', padding: '0 12px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F7C1C1', borderRadius: '10px', padding: '12px 1rem', marginBottom: '1rem', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '10px',
            padding: '2rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔄</div>
          <div style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
            Cargando datos del reporte...
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Por favor espera unos segundos
          </div>
        </div>
      )}

      {buscado && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-4">
            <div style={{ background: 'white', borderTop: '4px solid #1a4a8a', borderRadius: '8px', padding: '12px 1rem', border: '1px solid #1a4a8a22' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Total</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a4a8a' }}>{total}</div>
            </div>
            <div style={{ background: 'white', borderTop: '4px solid #1D9E75', borderRadius: '8px', padding: '12px 1rem', border: '1px solid #1D9E7522' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Presentes</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1D9E75' }}>{presentes}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{pct(presentes)}%</div>
            </div>
            {/* SIAGIE: Faltas en lugar de Ausentes */}
            <div style={{ background: 'white', borderTop: '4px solid #E24B4A', borderRadius: '8px', padding: '12px 1rem', border: '1px solid #E24B4A22' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Faltas</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#E24B4A' }}>{faltas}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{pct(faltas)}%</div>
            </div>
            <div style={{ background: 'white', borderTop: '4px solid #EF9F27', borderRadius: '8px', padding: '12px 1rem', border: '1px solid #EF9F2722' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Tardanzas</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#EF9F27' }}>{tardanzas}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{pct(tardanzas)}%</div>
            </div>
            <div style={{ background: 'white', borderTop: '4px solid #378ADD', borderRadius: '8px', padding: '12px 1rem', border: '1px solid #378ADD22' }}>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Justificados</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#378ADD' }}>{justificados}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{pct(justificados)}%</div>
            </div>
          </div>

          {registros.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a4a8a', marginBottom: '12px' }}>
                    🏫 Dashboard por sección
                  </div>
                  {resumenPorSeccion.length === 0 ? (
                    <div style={{ color: '#888', fontSize: '13px' }}>No hay datos por sección.</div>
                  ) : (
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={resumenPorSeccion}>
                          <XAxis dataKey="seccion" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="presentes" name="Presentes" fill="#1D9E75" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="faltas" name="Faltas" fill="#E24B4A" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="tardanzas" name="Tardanzas" fill="#EF9F27" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a4a8a', marginBottom: '12px' }}>
                    🚨 Alertas inteligentes
                  </div>
                  {alertasInteligentes.length === 0 ? (
                    <div style={{ background: '#E1F5EE', color: '#085041', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                      Sin alertas críticas en el rango seleccionado.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                      {alertasInteligentes.map((a) => (
                        <div key={a.nombre} style={{ border: `1px solid ${a.nivel === 'alta' ? '#F7C1C1' : '#fed7aa'}`, background: a.nivel === 'alta' ? '#FCEBEB' : '#fff7ed', borderRadius: '8px', padding: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: a.nivel === 'alta' ? '#791F1F' : '#9a3412' }}>
                            {a.nombre}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            Sección {a.seccion} · {a.mensaje} · Asistencia {a.porcentaje}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {registros.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a4a8a', marginBottom: '12px' }}>
                  📊 Resumen por estado
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a4a8a', marginBottom: '12px' }}>
                  🟢 Distribución porcentual
                </div>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
            {registros.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                No se encontraron registros para la sección y fechas seleccionadas
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '420px' }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '10px 1rem', textAlign: 'left', fontSize: '11px', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Fecha</th>
                      <th style={{ padding: '10px 1rem', textAlign: 'left', fontSize: '11px', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Estudiante</th>
                      <th style={{ padding: '10px 1rem', textAlign: 'left', fontSize: '11px', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Sección</th>
                      <th style={{ padding: '10px 1rem', textAlign: 'left', fontSize: '11px', color: '#666', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '10px 1rem', color: '#555' }}>{r.fecha}</td>
                        <td style={{ padding: '10px 1rem', fontWeight: '500' }}>{r.nombre}</td>
                        <td style={{ padding: '10px 1rem' }}>
                          <span style={{ background: '#E6F1FB', color: '#0C447C', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{r.seccion}</span>
                        </td>
                        <td style={{ padding: '10px 1rem' }}>{badge(r.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
