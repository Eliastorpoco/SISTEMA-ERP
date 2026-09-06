# V1M-F: rechazo de apoderado inactivo

Alcance autorizado: corregir exclusivamente la comprobación de destinatario en
`crear_comunicacion`, tras confirmar el defecto en aislamiento.

Baseline vigente/histórico SHA-256:
`cea22643cbc3edd12b759f5fafd619b9b2fc7ee09bc2db7fde2d3de608f05b1b`.
El harness creó una comunicación con tenant y estudiante válidos, relación activa
y apoderado desactivado. DEFECT_CONFIRMED=sí; INACTIVE_GUARDIAN_BLOCK=FAIL.

Cambio único de código: el SELECT de elegibilidad une estudiante_apoderado con
apoderados por id y tenant; exige `ea.activo IS TRUE AND a.activo IS TRUE` y tenant
actual de request. Se conserva HTTP 422 y el mensaje histórico. Ninguna otra
función, router, schema o migración cambió.

Validación: `scripts/test-apoderado-activo-v1mf-r1.py`, baseline y candidato,
PostgreSQL efímero sin red externa ni conexión productiva. Las definiciones V1M-F
proceden de la migración histórica exacta, ejecutadas únicamente en aislamiento
mediante SQLAlchemy con las dependencias disponibles. No se instaló tooling.

Candidato PASS:
- Apoderado activo + relación activa permite comunicación.
- Apoderado inactivo + relación activa rechaza con 422 y no inserta fila.
- Relación inactiva rechazada.
- Apoderado/estudiante de otro tenant rechazados; cross-tenant rows=0 en harness.
- Comunicación válida preexistente sigue consultable.
- Regresión focal: matrícula activa, principal único, relación duplicada,
  docente asignado, ADMIN/DIRECTOR, estudiante sin gestión, referencia INCIDENCIA,
  duplicado de comunicación, historial persistente y EMAIL/PENDIENTE/SANDBOX.
- ENVIO_REAL_EJECUTADO=no.

Candidato derivado de `erp-academic-core-backend:rc-20260901T001921Z`, copiando
únicamente el controlador corregido. Backend desplegado:
`erp-backend:v1mf-guardian-active-20260906`.
Rollback: `erp-backend:v1mf-guardian-active-rollback-20260906`.
El despliegue usa los cuatro compose vigentes más
`deploy/v1mf-guardian-active.compose.yml`, `up -d --no-deps --no-build api`.
Solo se recreó erp_api. No hubo migraciones ni escrituras de negocio productivas.

SHA-256 de controlador local/candidato/productivo:
`3e4955af372b17fd22ba4f86e5556b30c3f4bbee84191323d40db6d027ec0011`.
Backend running/healthy; /health=200; GET sin token /apoderados y
/comunicaciones-institucionales=401. Smoke read-only /incidencias, /asistencia,
/horarios y /matricula=200.

Frontend sigue `erp-frontend:v1md-r1-20260906`, sin reconstrucción ni despliegue
en este bloque. Los archivos frontend iniciados en la solicitud anterior quedan
pendientes y fuera del stage de esta corrección. No se completó aquí la integración
frontend general de V1M-F; el PASS corresponde únicamente al defecto autorizado.

V1MF_PRODUCTION_PASS=sí para esta corrección focal. Sin bloqueo.
