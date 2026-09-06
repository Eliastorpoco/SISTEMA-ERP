FROM erp-backend:v1mf-guardian-active-20260906
COPY backend_evaluacion/alembic/ /app/backend_evaluacion/alembic/
COPY backend_evaluacion/alembic/versions_production/20260906_evaluacion_competencia_p1.py /app/alembic/versions_production/20260906_evaluacion_competencia_p1.py
COPY backend_evaluacion/migrate.py backend_evaluacion/integrate_router.py /app/backend_evaluacion/
COPY backend_evaluacion/controllers/evaluaciones_controller.py /app/controllers/evaluaciones_controller.py
USER root
RUN python /app/backend_evaluacion/integrate_router.py
USER appuser
