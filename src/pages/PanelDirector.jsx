import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function PanelDirector() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await client.get('/reporte-asistencia');
      setRegistros(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error cargando panel director:', error);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  const resumenSecciones = useMemo(() => {
    const secciones = {};

    registros.forEach((r) => {
      if (!secciones[r.seccion]) {
        secciones[r.seccion] = {
          seccion: r.seccion,
          presentes: 0,
          faltas: 0,
          tardanzas: 0,
          justificados: 0,
          total: 0,
        };
      }

      secciones[r.seccion].total += 1;

      if (r.estado === 'presente') secciones[r.seccion].presentes += 1;
      if (r.estado === 'ausente') secciones[r.seccion].faltas += 1;
      if (r.estado === 'tardanza') secciones[r.seccion].tardanzas += 1;
      if (r.estado === 'justificado') secciones[r.seccion].justificados += 1;
    });

    return Object.values(secciones).map((s) => ({
      ...s,
      porcentaje: s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0,
    }));
  }, [registros]);

  const rankingEstudiantes = useMemo(() => {
    const estudiantes = {};

    registros.forEach((r) => {
      if (!estudiantes[r.nombre]) {
        estudiantes[r.nombre] = {
          nombre: r.nombre,
          seccion: r.seccion,
          presentes: 0,
          faltas: 0,
          tardanzas: 0,
          justificados: 0,
          total: 0,
        };
      }

      estudiantes[r.nombre].total += 1;

      if (r.estado === 'presente') estudiantes[r.nombre].presentes += 1;
      if (r.estado === 'ausente') estudiantes[r.nombre].faltas += 1;
      if (r.estado === 'tardanza') estudiantes[r.nombre].tardanzas += 1;
      if (r.estado === 'justificado') estudiantes[r.nombre].justificados += 1;
    });

    return Object.values(estudiantes)
      .map((e) => ({
        ...e,
        porcentaje: e.total > 0 ? Math.round((e.presentes / e.total) * 100) : 0,
      }))
      .sort((a, b) => a.porcentaje - b.porcentaje)
      .slice(0, 10);
  }, [registros]);

  const total = registros.length;
  const presentes = registros.filter((r) => r.estado === 'presente').length;
  const faltas = registros.filter((r) => r.estado === 'ausente').length;
  const tardanzas = registros.filter((r) => r.estado === 'tardanza').length;
  const justificados = registros.filter((r) => r.estado === 'justificado').length;

  const pieData = [
    { name: 'Presentes', value: presentes },
    { name: 'Faltas', value: faltas },
    { name: 'Tardanzas', value: tardanzas },
    { name: 'Justificados', value: justificados },
  ];

  const COLORS = ['#1D9E75', '#E24B4A', '#EF9F27', '#378ADD'];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Cargando Panel Director...
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: '#1a4a8a',
        padding: '14px 1.5rem',
        borderRadius: '10px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
          Panel Director
        </div>
        <div style={{ color: '#a8c4e8', fontSize: '12px', marginTop: '2px' }}>
          Vista general institucional de asistencia por secciones y estudiantes
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        marginBottom: '1.5rem',
      }}>
        <Card titulo="Total registros" valor={total} color="#1a4a8a" />
        <Card titulo="Presentes" valor={presentes} color="#1D9E75" />
        <Card titulo="Faltas" valor={faltas} color="#E24B4A" />
        <Card titulo="Tardanzas" valor={tardanzas} color="#EF9F27" />
        <Card titulo="Justificados" valor={justificados} color="#378ADD" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={panelStyle}>
          <h3 style={titleStyle}>📊 Comparación por sección</h3>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={resumenSecciones}>
                <XAxis dataKey="seccion" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="presentes" name="Presentes" fill="#1D9E75" />
                <Bar dataKey="faltas" name="Faltas" fill="#E24B4A" />
                <Bar dataKey="tardanzas" name="Tardanzas" fill="#EF9F27" />
                <Bar dataKey="justificados" name="Justificados" fill="#378ADD" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={titleStyle}>🥧 Distribución general</h3>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
      }}>
        <div style={panelStyle}>
          <h3 style={titleStyle}>🏫 Resumen por sección</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Sección</th>
                <th>Total</th>
                <th>Presentes</th>
                <th>Faltas</th>
                <th>% Asist.</th>
              </tr>
            </thead>
            <tbody>
              {resumenSecciones.map((s) => (
                <tr key={s.seccion}>
                  <td>{s.seccion}</td>
                  <td>{s.total}</td>
                  <td>{s.presentes}</td>
                  <td>{s.faltas}</td>
                  <td>{s.porcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={panelStyle}>
          <h3 style={titleStyle}>🚨 Estudiantes en riesgo</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Sección</th>
                <th>Faltas</th>
                <th>% Asist.</th>
              </tr>
            </thead>
            <tbody>
              {rankingEstudiantes.map((e) => (
                <tr key={e.nombre}>
                  <td>{e.nombre}</td>
                  <td>{e.seccion}</td>
                  <td style={{ color: '#E24B4A', fontWeight: '700' }}>
                    {e.faltas}
                  </td>
                  <td>{e.porcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, valor, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      padding: '1rem',
      border: '1px solid #e5e7eb',
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{
        fontSize: '11px',
        color: '#666',
        textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        {titulo}
      </div>
      <div style={{
        fontSize: '26px',
        fontWeight: '700',
        color,
      }}>
        {valor}
      </div>
    </div>
  );
}

const panelStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1rem',
};

const titleStyle = {
  fontSize: '15px',
  color: '#0C447C',
  marginBottom: '1rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};