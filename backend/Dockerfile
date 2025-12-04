# syntax=docker/dockerfile:1.4
# =============================================================================
# FaithFlow Backend Dockerfile
# Multi-stage build for optimized production image
#
# PERFORMANCE: Uses BuildKit cache mounts for ~5x faster rebuilds
# - First build: ~2-3 minutes (downloads all deps)
# - Subsequent builds: ~30-60 seconds (deps cached)
#
# Build command (BuildKit required):
#   DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build backend
# =============================================================================

# Stage 1: Builder - Install dependencies
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy only requirements first (better layer caching)
COPY requirements.txt .

# Install Python dependencies with BuildKit cache mount
# --mount=type=cache persists pip cache across builds
# --no-compile skips .pyc generation (saves ~10% space)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip wheel && \
    pip install --no-compile -r requirements.txt

# Stage 2: Production - Minimal runtime image
FROM python:3.11-slim-bookworm AS production

LABEL maintainer="FaithFlow Team"
LABEL description="FaithFlow Backend API - FastAPI"
LABEL version="2.0.0"

WORKDIR /app

# Install minimal runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && useradd --create-home --shell /bin/bash --uid 1000 appuser

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code (respects .dockerignore)
COPY --chown=appuser:appuser . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R appuser:appuser /app && \
    # Remove any stray test files that might have slipped through
    find /app -name "*_test.py" -delete 2>/dev/null || true && \
    find /app -name "*.pyc" -delete 2>/dev/null || true && \
    find /app -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PYTHONOPTIMIZE=2 \
    PORT=8000

# Switch to non-root user
USER appuser

# Health check (use 127.0.0.1 to avoid IPv6 issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/health || exit 1

# Expose port
EXPOSE ${PORT}

# Run with Granian (Rust-based ASGI server - 2-3x faster than uvicorn)
# --http auto: Support both HTTP/1.1 and HTTP/2 (needed for healthchecks)
# --workers 2: Number of worker processes
# --backpressure 256: Queue size before rejecting new connections
CMD ["granian", "--interface", "asgi", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--http", "auto", "--backpressure", "256", "server:app"]
