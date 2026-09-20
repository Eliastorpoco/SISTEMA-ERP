# Candidata: integridad tenant en pensiones

Estado: propuesta para revisión; no desplegada. Evidencias recibidas del usuario el 20/09/2026, mediante salidas del VPS. No son resultados de GitHub Actions ni de acceso SSH del asistente.

## Problema y cambio

Las FK por ID permiten que una pensión de un tenant referencie estudiantes y conceptos de otro tenant. Se comprobó el cruce mediante SQL directo en una copia aislada de la estructura; esto no demuestra que la API permita realizarlo.

La candidata `20260920_pensiones_tenant_fk_v1.py` añade:
- UNIQUE (tenant_id, id) en estudiantes.
- UNIQUE (tenant_id, id) en conceptos_pago.
- FK (tenant_id, estudiante_id) en pensiones hacia estudiantes.
- FK (tenant_id, concepto_id) en pensiones hacia conceptos_pago.

Conserva las FK existentes y no modifica datos. No añade RLS ni cambia los controles de autorización de la API.

## Evidencias confirmadas

| Prueba | Resultado |
| --- | --- |
| Exportación schema-only de public, PostgreSQL 16.14 | SHA-256 c098b2b45f9c8181b0a1b16d1498e3debb4530a106640dbdc3e9e833b151d5b0 |
| Restauración en erp_schema_review, contenedor sin red externa | 54 tablas; 0 restricciones no validadas |
| Estado previo: obligación con estudiante y concepto de otro tenant | Aceptada por las restricciones existentes |
| Restricciones existentes de duplicidad y día de vencimiento | Rechazaron obligación duplicada y día 29 |
| Consulta de producción, solo lectura | 1 pensión; 0 estudiantes inexistentes; 0 conceptos inexistentes; 0 cruces de tenant en ambas relaciones |
| SQL candidato: obligaciones válidas de tenants A y B | Ambas aceptadas |
| SQL candidato: cruce de estudiante y cruce de concepto por separado | Ambos rechazados por la FK nueva correspondiente |
| Archivo candidato: upgrade() mediante MigrationContext y Operations de Alembic | 4 restricciones creadas y validadas |
| Fin de las pruebas de cambio | ROLLBACK; ausencia posterior de las cuatro restricciones candidatas comprobada |

La prueba del SQL y la ejecución de upgrade() fueron pruebas separadas. El esquema restaurado no contenía filas productivas. La consulta de producción es una observación puntual, no una garantía sobre escrituras posteriores.

## Entorno utilizado

La imagen API inspeccionada no incluía el paquete Alembic. Se creó una imagen de prueba independiente `erp-migration-test:20260920`, con Python 3.11, Alembic 1.16.5, SQLAlchemy 2.0.49 y psycopg2-binary 2.9.11; pip check terminó sin incompatibilidades.

La ejecución usó la red del contenedor PostgreSQL aislado, raíz de solo lectura y únicamente la candidata montada en lectura. La API y la base productiva no se modificaron.

## Integración pendiente

La revisión declara `down_revision = evaluacion_competencia_p1`. Su historia se recupera en la PR #1. Esta carpeta es una propuesta separada: no está conectada a una configuración Alembic operativa ni habilita despliegues.

Antes de desplegar:
1. Integrar una única línea de revisiones y verificar la conexión y revisión efectivas de la base destino.
2. Probar el recorrido con el comando Alembic y su tabla de versiones. La prueba realizada invocó upgrade() mediante la API de operaciones; no ejecutó el historial ni actualizó alembic_version.
3. Volver a comprobar referencias y cruces, medir tamaños y planificar los bloqueos de ALTER TABLE. Los límites locales de espera son 5 s para locks y 30 s por sentencia; deben revisarse con datos representativos.
4. Ejecutar en una transacción PostgreSQL. El rollback probado fue transaccional, no la función downgrade(), que está bloqueada explícitamente.
5. Revisar compatibilidad de escrituras de la aplicación y obtener aprobación explícita para producción.

No se conserva el dump SQL en esta PR. Las migraciones históricas y su manifiesto de la PR #1 permanecen intactos.
