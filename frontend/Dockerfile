# =============================================================================
# FaithFlow Frontend Dockerfile
# Multi-stage build: Node for build, Nginx for serving
# Using Vite for fast builds (~15s)
#
# For even faster builds, use pre-built deps image:
#   1. Build deps image: docker build -f Dockerfile.deps -t faithflow-frontend-deps .
#   2. Use it: docker compose build --build-arg BASE_IMAGE=faithflow-frontend-deps frontend
# =============================================================================

# Allow using pre-built deps image for faster builds
ARG BASE_IMAGE=node:20-alpine

# Stage 1: Build
FROM ${BASE_IMAGE} AS builder

WORKDIR /app

# Copy package files (for cache invalidation check)
COPY package.json yarn.lock ./

# Install deps only if not using pre-built image (checks if node_modules exists)
RUN if [ ! -d "node_modules" ]; then \
      yarn install --frozen-lockfile --network-timeout 600000; \
    fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME=FaithFlow
ARG VITE_APP_VERSION=2.0.0

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_APP_VERSION=${VITE_APP_VERSION}

# Build production bundle with Vite
RUN yarn build

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

LABEL maintainer="FaithFlow Team"
LABEL description="FaithFlow Frontend - React SPA"
LABEL version="2.0.0"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Add script for runtime environment variable injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Use custom entrypoint for runtime env injection
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
