# Catálogo recuperado de migraciones del ERP

Fecha: 20/09/2026. Estado: evidencia recuperada y validación estática; NO listo para despliegue.

## Contenido y procedencia

14 migraciones originales sin modificaciones. Trece proceden de la copia de `/app/alembic/versions_production` del contenedor `erp_api` (imagen declarada `erp-backend:evaluacion-p1-r2-20260906T025500Z`). V1Q procede del commit `da991c76f7b62b429ef76843278b005ecb6b9f5e`, ruta `backend_v1n/alembic/versions_production/20260823_v1q_mora_calendario_expand.py`.

Las huellas del ZIP recibido coinciden con las salidas de recuperación facilitadas por el usuario. No se ha verificado una firma criptográfica del origen. El manifiesto permite detectar cambios accidentales, no alteraciones coordinadas del manifiesto y los archivos.

Rama local del VPS ya creada por el usuario: `recovery/migration-catalog-20260920`, basada en `2931a3321238c330cbe5bee5de3dd076e1f73784`. Este paquete NO es un clon ni contiene todos los cambios del ERP.

## Comprobación local segura

Dentro de esta carpeta, con Python 3:

```bash
python3 -B validate_catalog.py
```

En PowerShell puede usarse `py -3 -B validate_catalog.py`.

El validador solo lee archivos y analiza sintaxis con AST. No importa módulos de migraciones, no necesita Alembic, no abre conexiones y no modifica archivos. Devuelve código 0 si pasa y 1 si falla.

## Validación automática

El workflow `.github/workflows/migration-catalog.yml` ejecuta el validador y sus cuatro pruebas en las pull requests hacia `main` que cambien este catálogo o el propio workflow. Usa Python 3 del runner y solo la biblioteca estándar, con permisos de lectura del repositorio. No ejecuta Alembic, SQL ni despliegues. El resultado de cada ejecución se consulta en Checks de la PR.

## Límites obligatorios

- El baseline es no-op: requiere un esquema preexistente. No permite instalación desde cero.
- No ejecutar upgrade, downgrade ni stamp en producción como parte de esta recuperación.
- No marcar una base vacía como baseline. Tampoco restaurar el esquema actual y volver a ejecutar toda la cadena sin diseñar la prueba.
- No se incluye alembic.ini ni env.py: este es un catálogo separado, no una configuración operativa.
- No mezclar `migrations` con múltiples copias de las mismas revisiones presentes en otros directorios del repositorio.
- No usar git add . sobre el worktree de recuperación; contiene otras copias y evidencia histórica.
- El catálogo está publicado en la rama `recovery/migration-catalog-only-20260920` y propuesto en la PR #1. No se han ejecutado pruebas SQL ni desplegado estas migraciones.

## Hallazgos pendientes

1. Muchas FK enlazan por ID sin tenant. No aseguran por sí solas coherencia entre tenants; comprobar aplicación, RLS y restricciones reales antes de proponer nuevas migraciones.
2. V1N actualiza pagos e inserta aplicaciones de pago: no es solo DDL. El límite LEAST se aplica por pago, no a la suma de pagos de una obligación. Probar pagos múltiples, excedentes y obligaciones con monto cero antes de reproducir el backfill.
3. Finanzas usa estudiantes.id, mientras matrícula/academia usa usuarios.id. Validar correspondencia real.
4. Doce downgrades eliminan objetos; V1Q lanza error y el baseline es no-op. Reversión no uniforme; un rollback de aplicación también requiere pruebas de compatibilidad.
5. Asistencia declara AUSENTE. Verificar contrato activo frente a cambios que mencionan FALTA.
6. V1Q permite NULL en calendario. Las decisiones de huella opcional y vencimientos corresponden al backend, no se corrigen editando esta migración histórica.
7. Evaluación añade algunas FK compuestas con tenant, pero no prueba coherencia total de matrícula, estudiante y asignación.
8. No se observaron credenciales literales en la revisión de estas 14 migraciones. Esto no certifica el resto del repositorio ni su historial.

## Secuencia de integración pendiente

Revisar el paquete; acordar una ubicación única del catálogo en el repositorio; preparar configuración aislada y esquema previo verificable; probar contra PostgreSQL de prueba sin datos personales; revisar diferencias y secretos de futuros cambios; solicitar aprobación explícita antes de fusionar o desplegar. Mantener intactas las migraciones recuperadas: correcciones futuras van en nuevas revisiones.

La consulta previa de asistencia_db registró evaluacion_competencia_p1 y comprobó tres columnas V1Q y dos restricciones; no certificó todo el esquema ni demostró que esa sea la conexión efectiva de la API.

La auditoría de colas sigue abierta: detectar solo uvicorn mediante /proc/comm no descarta workers llamados python; un archivo no analizable no distingue error de lectura de error de sintaxis. Las búsquedas de Alembic anteriores tampoco prueban toda la configuración efectiva del despliegue.
