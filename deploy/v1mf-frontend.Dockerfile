ARG FRONTEND_BASE=erp-frontend:v1md-r1-20260906
FROM ${FRONTEND_BASE}
COPY dist/ /usr/share/nginx/html/
