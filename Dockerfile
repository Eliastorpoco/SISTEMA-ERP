FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=https://api.evolonline.online
ARG VITE_API_BASE_URL=https://api.evolonline.online

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
