// Catalogo central de estados de asistencia
// Formato SIAGIE de MINEDU: F = Falta (en lugar de Ausente)

export const ESTADOS_ASISTENCIA = ['presente', 'tardanza', 'ausente', 'justificado'];

// Etiquetas: cada estado tiene "texto" (singular) y "textoPlural" (para encabezados)
export const ETIQUETAS_ESTADO = {
  presente: {
    texto: 'Presente',
    textoPlural: 'Presentes',
    color: '#16a34a',
    bg: '#dcfce7',
    icono: '✓',
    sigla: 'P',
  },
  tardanza: {
    texto: 'Tardanza',
    textoPlural: 'Tardanzas',
    color: '#d97706',
    bg: '#fef3c7',
    icono: 'T',
    sigla: 'T',
  },
  ausente: {
    texto: 'Falta',
    textoPlural: 'Faltas',
    color: '#dc2626',
    bg: '#fee2e2',
    icono: 'F',
    sigla: 'F',
  },
  justificado: {
    texto: 'Justificado',
    textoPlural: 'Justificados',
    color: '#2563eb',
    bg: '#dbeafe',
    icono: 'J',
    sigla: 'J',
  },
};

export const SECCIONES_VALIDAS = ['4A', '4B', '5A', '5B'];
