# =============================================================================
# FaithFlow Frontend Dockerfile
# Multi-stage build: Node for build, Nginx for serving
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_NAME=FaithFlow
ARG REACT_APP_VERSION=2.0.0

# Set environment variables for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL} \
    REACT_APP_NAME=${REACT_APP_NAME} \
    REACT_APP_VERSION=${REACT_APP_VERSION} \
    NODE_OPTIONS="--max-old-space-size=4096"

# Build production bundle
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
