# syntax=docker/dockerfile:1.4
# =============================================================================
# FaithFlow Frontend Dockerfile
# Multi-stage build: Node for build, Nginx for serving
#
# PERFORMANCE: Uses BuildKit cache mounts for ~10x faster rebuilds
# - First build: ~2-3 minutes (downloads all deps)
# - Subsequent builds: ~15-30 seconds (deps cached)
#
# Build command (BuildKit required):
#   DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build frontend
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json yarn.lock ./

# Install dependencies with BuildKit cache mount
# This caches yarn's global cache AND node_modules between builds
# --mount=type=cache persists across builds, dramatically speeding up yarn install
RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    --mount=type=cache,target=/app/node_modules \
    yarn install --frozen-lockfile --network-timeout 600000 && \
    cp -r node_modules node_modules_cache

# Restore cached node_modules (needed because cache mount doesn't persist in image)
RUN rm -rf node_modules && mv node_modules_cache node_modules

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME=FaithFlow
ARG VITE_APP_VERSION=2.0.0
ARG VITE_LIVEKIT_URL

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_APP_VERSION=${VITE_APP_VERSION} \
    VITE_LIVEKIT_URL=${VITE_LIVEKIT_URL}

# Build production bundle with Vite (cached deps make this fast)
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
