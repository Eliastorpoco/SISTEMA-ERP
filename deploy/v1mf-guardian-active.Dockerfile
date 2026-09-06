ARG BACKEND_BASE=erp-academic-core-backend:rc-20260901T001921Z
FROM ${BACKEND_BASE}
COPY backend_v1mf/controllers/apoderados_comunicacion_controller.py /app/controllers/apoderados_comunicacion_controller.py
