# V1M-F frontend — integración y producción

Se completa la integración frontend pendiente sobre el backend ya corregido
`erp-backend:v1mf-guardian-active-20260906`. Schema activo; sin migración ni nuevo
despliegue backend. La evidencia histórica E2E PASS aportada por el usuario y el
harness aislado del bloque anterior permanecen aplicables al contrato canónico.

Resultado conectado:
- `/apoderados` y `/comunicaciones`, acceso ADMIN/DIRECTOR/DOCENTE.
- ADMIN/DIRECTOR: crear/editar apoderado, relacionar estudiante con matrícula
  activa, parentesco y principal; protección de duplicados y principal por backend.
- DOCENTE: consulta y comunicación en el alcance canónico; sin gestión de datos
  de apoderados ni recepción del listado administrativo desde esta página.
- Estudiantes: consulta de principal y otros apoderados activos, en escritorio
  y móvil, sin mostrar documento/email/teléfono.
- Incidencias: detalle real → estudiante real → apoderado relacionado activo →
  referencia `INCIDENCIA-{id}`.
- Asistencia: integración histórica recuperada desde alertas con referencia
  `ASISTENCIA-ALERTA-{estudiante_id}-{asignacion_id}`.
- Justificaciones: referencia `JUSTIFICACION-{id}` desde el registro real.
- Formulario con destinatario real, asunto/mensaje explícitos y confirmación
  persistida del backend. No inputs manuales de IDs ni referencias.
- Historial: fecha, estudiante, apoderado, origen/referencia, asunto, canal, estado,
  modo, actor, mensaje y trazabilidad. Sin datos de contacto innecesarios.
- EMAIL/SANDBOX/PENDIENTE; sin transición artificial a ENVIADA, proveedores,
  automatización, notificaciones ni incidencias nuevas.

Validación:
- Build producción PASS; lint focal PASS.
- `scripts/test-v1mf-frontend.mjs` PASS: render SSR de controles por rol,
  estudiante excluido, referencia obligatoria, privacidad del historial, estados
  loading/empty y mensajes de error, contrato del servicio con adaptador aislado.
  EXTERNAL_REQUESTS=0 en ese test. No es una prueba de interacción en navegador.
- Backend focal previo PASS: creación, relación/principal, ámbitos, duplicados,
  origen INCIDENCIA, historial, sandbox, apoderado inactivo bloqueado, cross-tenant
  rows=0 en aislamiento. No se repitió E2E histórico ni se escribió en producción.
- No se encontró Playwright/browser disponible; no se instaló tooling.
- `scripts/smoke-v1mf-frontend.mjs` PASS en candidato local y dominio productivo:
  seis rutas HTTP 200, hashes del index y bundles de Apoderados, comunicación,
  Incidencias, Asistencia y Estudiantes idénticos al build.
- Smoke V1M-D PASS: /asistencia, /horarios, /matricula, /incidencias HTTP 200 y
  artefactos canónicos presentes. API /health HTTP 200.
- TENANT_HARDCODE_COUNT=0 en los archivos frontend nuevos V1M-F.

Candidato construido sobre la imagen frontend vigente V1M-D y el código actual.
Solo se recreó erp_frontend con el override `deploy/v1mf-frontend.compose.yml`.
Frontend estable: `erp-frontend:v1mf-r1-20260906`
SHA-256 `0c71b0b2cb0659e8af8b4598ee1d42532b6940b5ec77e4720d37c4a7af6f1655`.
Rollback: `erp-frontend:v1mf-r1-rollback-20260906`.
Backend estable: `erp-backend:v1mf-guardian-active-20260906`.

Stage selectivo de V1M-F, incluidos solo los hunks nuevos en App, Sidebar y
Estudiantes; modificaciones ajenas y stage previo conservados. Sin push.

V1MF_PRODUCTION_VISIBLE_PASS=sí por continuidad histórica, validación focal y
artefactos desplegados; no se afirma una nueva sesión autenticada en navegador.
V1MF_PRODUCTION_PASS=sí. Sin bloqueo. No se inició otro módulo.
