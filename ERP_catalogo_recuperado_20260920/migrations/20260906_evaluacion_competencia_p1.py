"""Recover competencias/evaluaciones/resultados_evaluacion on the current core.

Sources: historical 077d0387fcec and 086dda7dd191. Legacy estudiantes references
converge to usuarios + matriculas; academic context comes from AsignacionDocente.
No IA logs or Aula Virtual records are promoted to official results.
"""
revision = 'evaluacion_competencia_p1'
down_revision = 'v1q_mora_calendario_expand'
branch_labels = None
depends_on = None

STATEMENTS = [
    """CREATE TABLE competencias (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        curso_id integer NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
        nombre varchar(200) NOT NULL, descripcion text, area varchar(100),
        activo boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, curso_id, nombre), UNIQUE (tenant_id, id, curso_id)
    )""",
    """CREATE TABLE evaluaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        curso_id integer NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
        periodo_id integer NOT NULL REFERENCES periodos_academicos(id) ON DELETE RESTRICT,
        seccion_id integer NOT NULL REFERENCES secciones_academicas(id) ON DELETE RESTRICT,
        asignacion_id integer NOT NULL REFERENCES asignaciones_docente(id) ON DELETE RESTRICT,
        competencia_id uuid NOT NULL,
        titulo varchar(250) NOT NULL, descripcion text, fecha_aplicacion date NOT NULL,
        peso numeric(5,2), activo boolean NOT NULL DEFAULT true,
        creado_por integer NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, id),
        FOREIGN KEY (tenant_id, competencia_id, curso_id)
          REFERENCES competencias(tenant_id, id, curso_id) ON DELETE RESTRICT
    )""",
    """CREATE TABLE resultados_evaluacion (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        evaluacion_id uuid NOT NULL,
        estudiante_id integer NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        matricula_id integer NOT NULL REFERENCES matriculas(id) ON DELETE RESTRICT,
        puntaje numeric(10,2) CHECK (puntaje BETWEEN 0 AND 20),
        nivel_logro varchar(50) NOT NULL CHECK (nivel_logro IN ('AD','A','B','C')),
        retroalimentacion text,
        evaluado_por_ia boolean NOT NULL DEFAULT false,
        validado_docente boolean NOT NULL DEFAULT true,
        creado_por integer NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        actualizado_por integer NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, evaluacion_id, estudiante_id),
        FOREIGN KEY (tenant_id, evaluacion_id) REFERENCES evaluaciones(tenant_id,id) ON DELETE RESTRICT
    )""",
    'CREATE INDEX ix_evaluaciones_tenant_asignacion ON evaluaciones(tenant_id,asignacion_id)',
    'CREATE INDEX ix_resultados_tenant_estudiante ON resultados_evaluacion(tenant_id,estudiante_id)',
]


def upgrade():
    from alembic import op
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    from alembic import op
    for table in ['resultados_evaluacion', 'evaluaciones', 'competencias']:
        op.drop_table(table)
