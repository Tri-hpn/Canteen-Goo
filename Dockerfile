# ============================================================
# Dockerfile — Frontend (Vite + React)
# ============================================================
# Multi-stage build:
#   1. Build với Node → tạo /dist
#   2. Serve /dist bằng Nginx
#
# Build:  docker build -t canteen-frontend .
# Run:    docker run -p 80:80 canteen-frontend
# ============================================================

# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files trước để cache layer npm ci
COPY package*.json ./

# Cài dependencies (dùng ci cho reproducible build)
RUN npm ci

# Copy source
COPY . .

# Build args cho env vars (Vite cần lúc build)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production
RUN npm run build

# ---------- Stage 2: Serve ----------
FROM nginx:1.27-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy dist từ stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]