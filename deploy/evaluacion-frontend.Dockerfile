FROM erp-frontend:v1mf-r1-20260906
RUN rm -rf /usr/share/nginx/html/assets
COPY dist/ /usr/share/nginx/html/
