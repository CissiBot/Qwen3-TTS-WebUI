FROM node:20-alpine AS builder

WORKDIR /app

COPY qwen3-tts-frontend/package*.json ./
RUN npm ci

COPY qwen3-tts-frontend/ .
ARG VITE_API_URL=/api
ARG VITE_AUTH_DISABLED=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_DISABLED=$VITE_AUTH_DISABLED
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
