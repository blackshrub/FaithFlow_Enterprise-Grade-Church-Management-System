# =============================================================================
# FaithFlow Docker Management
# =============================================================================
#
# Usage:
#   make help          - Show all available commands
#   make up            - Start production (default)
#   make dev           - Start development mode
#   make logs          - View all logs
#   make restart-backend - Restart just the backend
#
# =============================================================================

.PHONY: help up down restart logs build clean dev prod status \
        restart-backend restart-frontend rebuild-backend rebuild-frontend \
        build-backend build-frontend build-all \
        shell-backend shell-mongo shell-redis \
        backup restore prune \
        angie-install angie-setup angie-reload angie-test angie-logs \
        ssl-init migrate-traefik

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Docker Compose with env file
# Default: Use root-level docker-compose.yml (Angie-based, no Traefik)
# Legacy: Use docker/compose/prod.yml (Traefik-based)
COMPOSE := docker compose --env-file .env
COMPOSE_PROD := docker compose --env-file .env
COMPOSE_LEGACY := docker compose -f docker/compose/prod.yml --env-file .env
COMPOSE_DEV := docker compose -f docker/compose/dev.yml --env-file .env

# Project directory (for scripts)
PROJECT_ROOT := $(shell pwd)

# =============================================================================
# HELP
# =============================================================================

help:
	@echo ""
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║           FaithFlow Docker Management Commands                   ║$(RESET)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)▶ QUICK START$(RESET)"
	@echo "  make up               Start production (most common)"
	@echo "  make down             Stop all services"
	@echo "  make status           Show running containers"
	@echo "  make logs             View all logs (follow mode)"
	@echo ""
	@echo "$(GREEN)▶ DEVELOPMENT$(RESET)"
	@echo "  make dev              Start development mode (hot reload)"
	@echo "  make dev-build        Rebuild and start dev mode"
	@echo ""
	@echo "$(GREEN)▶ PRODUCTION$(RESET)"
	@echo "  make prod             Start production (same as 'make up')"
	@echo "  make prod-build       Rebuild and start production"
	@echo "  make deploy           Full deploy (prune + rebuild + start)"
	@echo ""
	@echo "$(GREEN)▶ INDIVIDUAL SERVICES$(RESET)"
	@echo "  make restart-backend  Restart only backend"
	@echo "  make restart-frontend Restart only frontend"
	@echo "  make build-backend    Build and restart backend (with cache)"
	@echo "  make build-frontend   Build and restart frontend (with cache)"
	@echo "  make build-all        Build both backend and frontend (with cache)"
	@echo "  make rebuild-backend  Rebuild backend (no cache, slower)"
	@echo "  make rebuild-frontend Rebuild frontend (no cache, slower)"
	@echo "  make logs-backend     View backend logs only"
	@echo "  make logs-frontend    View frontend logs only"
	@echo ""
	@echo "$(GREEN)▶ DATABASE$(RESET)"
	@echo "  make backup           Backup MongoDB to ./backups/"
	@echo "  make restore          Restore MongoDB (interactive)"
	@echo "  make shell-mongo      Open MongoDB shell"
	@echo "  make shell-redis      Open Redis CLI"
	@echo ""
	@echo "$(GREEN)▶ MAINTENANCE$(RESET)"
	@echo "  make prune            Clean unused Docker resources"
	@echo "  make clean            Stop all + remove volumes (DANGER!)"
	@echo "  make shell-backend    Open bash in backend container"
	@echo ""
	@echo "$(GREEN)▶ SHORTCUTS$(RESET)"
	@echo "  make bb               Build backend (with cache)"
	@echo "  make bf               Build frontend (with cache)"
	@echo "  make ba               Build all (with cache)"
	@echo "  make rb               Restart backend"
	@echo "  make rf               Restart frontend"
	@echo "  make lb               Logs backend"
	@echo "  make lf               Logs frontend"
	@echo ""
	@echo "$(GREEN)▶ ANGIE REVERSE PROXY (Host Level)$(RESET)"
	@echo "  make angie-install    Install Angie web server"
	@echo "  make angie-setup      Setup config symlinks to project"
	@echo "  make ssl-init         Generate SSL certificates (Certbot)"
	@echo "  make angie-reload     Reload Angie configuration"
	@echo "  make angie-test       Test Angie configuration"
	@echo "  make angie-logs       View Angie logs"
	@echo "  make migrate-traefik  Full migration from Traefik to Angie"
	@echo ""
	@echo "$(YELLOW)▶ WHEN TO USE --no-cache (rebuild-*):$(RESET)"
	@echo "  • After changing Dockerfile"
	@echo "  • After changing requirements.txt / package.json"
	@echo "  • When dependencies seem stale"
	@echo "  • After git pull with major changes"
	@echo ""

# =============================================================================
# MAIN COMMANDS
# =============================================================================

## Start production services
up: prod

## Stop all services
down:
	@echo "$(YELLOW)Stopping all services...$(RESET)"
	$(COMPOSE_PROD) down
	@echo "$(GREEN)✓ All services stopped$(RESET)"

## Show status of all containers
status:
	@echo "$(CYAN)Running containers:$(RESET)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "faithflow|NAMES"
	@echo ""
	@echo "$(CYAN)Disk usage:$(RESET)"
	@docker system df

## View all logs
logs:
	$(COMPOSE_PROD) logs -f --tail=100

## View backend logs only
logs-backend:
	docker logs -f --tail=100 faithflow-backend

## View frontend logs only
logs-frontend:
	docker logs -f --tail=100 faithflow-frontend

# =============================================================================
# DEVELOPMENT MODE
# =============================================================================

## Start development mode (with hot reload)
dev:
	@echo "$(CYAN)Starting development mode...$(RESET)"
	$(COMPOSE_DEV) up -d
	@echo "$(GREEN)✓ Development mode started$(RESET)"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Frontend: http://localhost:3000"

## Rebuild and start development
dev-build:
	@echo "$(CYAN)Rebuilding development mode...$(RESET)"
	$(COMPOSE_DEV) up -d --build
	@echo "$(GREEN)✓ Development rebuilt and started$(RESET)"

# =============================================================================
# PRODUCTION MODE
# =============================================================================

## Start production services
prod:
	@echo "$(CYAN)Starting production services...$(RESET)"
	$(COMPOSE_PROD) up -d
	@echo "$(GREEN)✓ Production services started$(RESET)"

## Rebuild and start production
prod-build:
	@echo "$(CYAN)Rebuilding production...$(RESET)"
	DOCKER_BUILDKIT=1 $(COMPOSE_PROD) up -d --build
	@echo "$(GREEN)✓ Production rebuilt and started$(RESET)"

## Full deploy: prune old resources, rebuild with no cache, start
deploy:
	@echo "$(CYAN)Full production deploy...$(RESET)"
	@echo "$(YELLOW)Step 1/3: Pruning old resources...$(RESET)"
	docker image prune -f --filter "until=24h"
	docker builder prune -f --filter "until=24h"
	@echo "$(YELLOW)Step 2/3: Rebuilding services...$(RESET)"
	DOCKER_BUILDKIT=1 $(COMPOSE_PROD) build --no-cache
	@echo "$(YELLOW)Step 3/3: Starting services...$(RESET)"
	$(COMPOSE_PROD) up -d
	@echo "$(GREEN)✓ Deploy complete!$(RESET)"
	@docker system df

# =============================================================================
# INDIVIDUAL SERVICES
# =============================================================================

## Restart only backend (fast, no rebuild)
restart-backend:
	@echo "$(CYAN)Restarting backend...$(RESET)"
	$(COMPOSE_PROD) restart backend
	@echo "$(GREEN)✓ Backend restarted$(RESET)"

## Restart only frontend (fast, no rebuild)
restart-frontend:
	@echo "$(CYAN)Restarting frontend...$(RESET)"
	$(COMPOSE_PROD) restart frontend
	@echo "$(GREEN)✓ Frontend restarted$(RESET)"

## Build backend with cache and restart (fast)
build-backend:
	@echo "$(CYAN)Building backend (with cache)...$(RESET)"
	$(COMPOSE_PROD) build backend
	$(COMPOSE_PROD) up -d backend
	@echo "$(GREEN)✓ Backend built and started$(RESET)"

## Build frontend with cache and restart (fast)
build-frontend:
	@echo "$(CYAN)Building frontend (with cache)...$(RESET)"
	$(COMPOSE_PROD) build frontend
	$(COMPOSE_PROD) up -d frontend
	@echo "$(GREEN)✓ Frontend built and started$(RESET)"

## Build both backend and frontend with cache (fast)
build-all:
	@echo "$(CYAN)Building backend and frontend (with cache)...$(RESET)"
	$(COMPOSE_PROD) build backend frontend
	$(COMPOSE_PROD) up -d backend frontend
	@echo "$(GREEN)✓ Backend and frontend built and started$(RESET)"

## Rebuild backend with no cache and restart (slow, full rebuild)
rebuild-backend:
	@echo "$(CYAN)Rebuilding backend (no cache)...$(RESET)"
	$(COMPOSE_PROD) build --no-cache backend
	$(COMPOSE_PROD) up -d backend
	@echo "$(GREEN)✓ Backend rebuilt and started$(RESET)"

## Rebuild frontend with no cache and restart (slow, full rebuild)
rebuild-frontend:
	@echo "$(CYAN)Rebuilding frontend (no cache)...$(RESET)"
	$(COMPOSE_PROD) build --no-cache frontend
	$(COMPOSE_PROD) up -d frontend
	@echo "$(GREEN)✓ Frontend rebuilt and started$(RESET)"

# =============================================================================
# DATABASE & SHELLS
# =============================================================================

## Backup MongoDB
backup:
	@echo "$(CYAN)Backing up MongoDB...$(RESET)"
	@mkdir -p backups
	./scripts/backup-mongodb.sh
	@echo "$(GREEN)✓ Backup complete$(RESET)"

## Restore MongoDB (interactive)
restore:
	@echo "$(CYAN)Restoring MongoDB...$(RESET)"
	./scripts/restore-mongodb.sh

## Open MongoDB shell
shell-mongo:
	docker exec -it faithflow-mongodb mongosh faithflow

## Open Redis CLI (uses REDIS_PASSWORD from .env)
shell-redis:
	@if [ -f .env ]; then \
		REDIS_PASS=$$(grep REDIS_PASSWORD .env | cut -d '=' -f2); \
		if [ -n "$$REDIS_PASS" ]; then \
			docker exec -it faithflow-redis redis-cli -a $$REDIS_PASS; \
		else \
			docker exec -it faithflow-redis redis-cli; \
		fi \
	else \
		docker exec -it faithflow-redis redis-cli; \
	fi

## Open bash in backend container
shell-backend:
	docker exec -it faithflow-backend bash

# =============================================================================
# MAINTENANCE
# =============================================================================

## Clean unused Docker resources (safe)
prune:
	@echo "$(YELLOW)Pruning unused Docker resources...$(RESET)"
	docker image prune -f
	docker builder prune -f
	docker volume prune -f --filter "label!=keep"
	@echo "$(GREEN)✓ Cleanup complete$(RESET)"
	@docker system df

## Stop all and remove volumes (DANGER - data loss!)
clean:
	@echo "$(RED)WARNING: This will delete all data including database!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(COMPOSE_PROD) down -v
	@echo "$(GREEN)✓ All services and volumes removed$(RESET)"

# =============================================================================
# SHORTCUTS
# =============================================================================

## Alias: restart backend
rb: restart-backend

## Alias: restart frontend
rf: restart-frontend

## Alias: build backend (with cache)
bb: build-backend

## Alias: build frontend (with cache)
bf: build-frontend

## Alias: build all (with cache)
ba: build-all

## Alias: logs backend
lb: logs-backend

## Alias: logs frontend
lf: logs-frontend

## Alias: status
s: status

## Alias: logs
l: logs

# =============================================================================
# ANGIE REVERSE PROXY (Host Level)
# =============================================================================
# Angie runs at host level (not in Docker) and proxies to Docker containers.
# See docker/angie/README.md for detailed documentation.
# =============================================================================

## Install Angie web server
angie-install:
	@echo "$(CYAN)Installing Angie web server...$(RESET)"
	@./docker/scripts/angie-install.sh
	@echo "$(GREEN)✓ Angie installed$(RESET)"

## Setup Angie configuration symlinks
angie-setup:
	@echo "$(CYAN)Setting up Angie configuration symlinks...$(RESET)"
	@if [ -d /etc/angie/conf.d ] && [ ! -L /etc/angie/conf.d ]; then \
		echo "$(YELLOW)Backing up existing conf.d...$(RESET)"; \
		mv /etc/angie/conf.d /etc/angie/conf.d.backup.$$(date +%Y%m%d_%H%M%S); \
	fi
	@ln -sf $(PROJECT_ROOT)/docker/angie/angie.conf /etc/angie/angie.conf
	@rm -rf /etc/angie/conf.d && ln -sf $(PROJECT_ROOT)/docker/angie/conf.d /etc/angie/conf.d
	@rm -rf /etc/angie/sites-available && ln -sf $(PROJECT_ROOT)/docker/angie/sites-available /etc/angie/sites-available
	@rm -rf /etc/angie/sites-enabled && ln -sf $(PROJECT_ROOT)/docker/angie/sites-enabled /etc/angie/sites-enabled
	@echo "$(GREEN)✓ Angie configuration symlinks created$(RESET)"
	@echo ""
	@echo "Symlinks created:"
	@echo "  /etc/angie/angie.conf -> $(PROJECT_ROOT)/docker/angie/angie.conf"
	@echo "  /etc/angie/conf.d -> $(PROJECT_ROOT)/docker/angie/conf.d"
	@echo "  /etc/angie/sites-available -> $(PROJECT_ROOT)/docker/angie/sites-available"
	@echo "  /etc/angie/sites-enabled -> $(PROJECT_ROOT)/docker/angie/sites-enabled"

## Generate SSL certificates with Certbot
ssl-init:
	@echo "$(CYAN)Generating SSL certificates...$(RESET)"
	@./docker/scripts/certbot-init.sh
	@echo "$(GREEN)✓ SSL certificates generated$(RESET)"

## Reload Angie configuration
angie-reload:
	@echo "$(CYAN)Reloading Angie configuration...$(RESET)"
	@angie -t && systemctl reload angie
	@echo "$(GREEN)✓ Angie reloaded$(RESET)"

## Test Angie configuration
angie-test:
	@echo "$(CYAN)Testing Angie configuration...$(RESET)"
	@angie -t
	@echo "$(GREEN)✓ Configuration is valid$(RESET)"

## View Angie logs
angie-logs:
	@tail -f /var/log/angie/access.log /var/log/angie/error.log

## Full migration from Traefik to Angie
migrate-traefik:
	@echo "$(YELLOW)WARNING: This will migrate from Traefik to Angie$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@./docker/scripts/migrate-traefik.sh

# =============================================================================
# LEGACY TRAEFIK COMMANDS (for backwards compatibility)
# =============================================================================

## Start with legacy Traefik compose (docker/compose/prod.yml)
legacy-up:
	@echo "$(CYAN)Starting with legacy Traefik compose...$(RESET)"
	$(COMPOSE_LEGACY) up -d
	@echo "$(GREEN)✓ Legacy Traefik services started$(RESET)"

## Stop legacy Traefik services
legacy-down:
	@echo "$(YELLOW)Stopping legacy Traefik services...$(RESET)"
	$(COMPOSE_LEGACY) down
	@echo "$(GREEN)✓ Legacy services stopped$(RESET)"
