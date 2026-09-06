ARG FRONTEND_BASE=erp-erp-frontend
FROM ${FRONTEND_BASE}
COPY dist/ /usr/share/nginx/html/
