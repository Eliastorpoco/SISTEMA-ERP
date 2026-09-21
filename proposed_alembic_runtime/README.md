# Entorno Alembic candidato

Estado: propuesta en borrador, sin despliegue. No conecta a la aplicación ni importa sus modelos. No sirve para autogenerate ni instalación desde cero.

## Preparación

El catálogo de 14 revisiones pertenece a la PR #1. Fuente remota revisada: commit `2eb7d7a4759e4374143cd004b86210a6870e419d`, carpeta `ERP_catalogo_recuperado_20260920`. No se duplica el catálogo en esta PR.

Desde un checkout que contenga esta propuesta:

```bash
python3 proposed_alembic_runtime/prepare_versions.py --catalog /ruta/al/ERP_catalogo_recuperado_20260920
```

El script solo lee archivos y crea `versions/`, ignorada por Git. Comprueba 14 entradas, nombres únicos, sintaxis y SHA-256 de cada revisión según el manifiesto, más la huella fija de la candidata. Rechaza una carpeta versions existente; no sobrescribe el paquete preparado. El manifiesto debe proceder del catálogo revisado: sus hashes no autentican por sí solos la procedencia.

Requiere para ejecutar Alembic el entorno probado: Python 3.11, Alembic 1.16.5, SQLAlchemy 2.0.49 y psycopg2-binary 2.9.11. Esta propuesta no modifica la imagen API.

## Configuración y transacciones

`alembic.ini` resuelve script_location respecto a su propia carpeta. `env.py` es el código de configuración facilitado en esta conversación y probado en el VPS según la salida del usuario. El script de preparación es nuevo y se verificó localmente sobre los archivos remotos y sus huellas.

- En pruebas, acepta una conexión en `config.attributes["connection"]` para participar en una transacción externa.
- Sin conexión inyectada, exige DATABASE_URL, crea un engine independiente y lo libera al terminar. No guarda credenciales en el INI ni carga .env.
- Usa public.alembic_version y DDL transaccional.
- El modo offline está deshabilitado. target_metadata=None: no usar para generar revisiones automáticas.
- No incluye comprobaciones automáticas del destino o de la revisión inicial: el operador debe verificarlos antes de cualquier ejecución.

No hay comandos de despliegue ni stamp productivo en este paquete.

## Evidencia del VPS, recibida el 21/09/2026

El usuario confirmó la prueba del entorno guardado en proposed_alembic_runtime, montado en solo lectura, usando la imagen erp-migration-test:20260920 y la red del PostgreSQL aislado erp_schema_review_20260920 (NetworkMode=none):

1. Huella candidata: 123552febaf763f46bd49df9f84463ca9887e0bdf0f8c3bc08ad90838c2463d0.
2. Grafo: 15 revisiones, una raíz y una cabeza.
3. Conexión externa: stamp a evaluacion_competencia_p1 y upgrade a pensiones_tenant_fk_v1, dentro de una transacción.
4. Cuatro restricciones creadas en las tablas correctas y validadas.
5. ROLLBACK; ausencia de restricciones y tabla de versiones nuevamente sin filas, comprobadas fuera de la transacción de prueba.

Estas son salidas facilitadas por el usuario, no ejecución PostgreSQL local del asistente ni CI. Se probó la rama de conexión inyectada de env.py. La rama que abre su propia conexión desde DATABASE_URL todavía requiere prueba aislada.

## Estado productivo observado y límites

Consultas de solo lectura mostraron asistencia_db, PostgreSQL 16.14, revisión evaluacion_competencia_p1, columnas implicadas NOT NULL y ausencia de las cuatro restricciones candidatas. Una conexión construida desde DATABASE_URL dentro de erp_api llegó a esa base y revisión. La clase SQLDatabaseConnection usa esa variable cuando no recibe un argumento explícito; no se inspeccionó el engine del proceso activo.

No ejecutar stamp en producción para aplicar esta candidata: la revisión anterior ya está registrada. La marca usada en pruebas solo corresponde a la copia aislada sin filas en alembic_version.

Pendientes: prueba aislada de la conexión autónoma de env.py, reconciliar el paquete con el checkout del VPS, revisión de escrituras de la aplicación, nueva comprobación de datos, tamaños/bloqueos, respaldo y plan de ejecución aprobado. No se ejecutó la historia desde cero. El downgrade está bloqueado; la reversión probada fue transaccional. No fusionar ni desplegar sin aprobación explícita.
