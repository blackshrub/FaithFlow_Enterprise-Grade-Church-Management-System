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
        shell-backend shell-mongo shell-redis \
        backup restore prune

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

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
	@echo "  make rebuild-backend  Rebuild and restart backend (no cache)"
	@echo "  make rebuild-frontend Rebuild and restart frontend (no cache)"
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
	docker compose -f docker/compose/prod.yml down
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
	docker compose -f docker/compose/prod.yml logs -f --tail=100

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
	docker compose -f docker/compose/dev.yml up -d
	@echo "$(GREEN)✓ Development mode started$(RESET)"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Frontend: http://localhost:3000"

## Rebuild and start development
dev-build:
	@echo "$(CYAN)Rebuilding development mode...$(RESET)"
	docker compose -f docker/compose/dev.yml up -d --build
	@echo "$(GREEN)✓ Development rebuilt and started$(RESET)"

# =============================================================================
# PRODUCTION MODE
# =============================================================================

## Start production services
prod:
	@echo "$(CYAN)Starting production services...$(RESET)"
	docker compose -f docker/compose/prod.yml up -d
	@echo "$(GREEN)✓ Production services started$(RESET)"

## Rebuild and start production
prod-build:
	@echo "$(CYAN)Rebuilding production...$(RESET)"
	DOCKER_BUILDKIT=1 docker compose -f docker/compose/prod.yml up -d --build
	@echo "$(GREEN)✓ Production rebuilt and started$(RESET)"

## Full deploy: prune old resources, rebuild with no cache, start
deploy:
	@echo "$(CYAN)Full production deploy...$(RESET)"
	@echo "$(YELLOW)Step 1/3: Pruning old resources...$(RESET)"
	docker image prune -f --filter "until=24h"
	docker builder prune -f --filter "until=24h"
	@echo "$(YELLOW)Step 2/3: Rebuilding services...$(RESET)"
	DOCKER_BUILDKIT=1 docker compose -f docker/compose/prod.yml build --no-cache
	@echo "$(YELLOW)Step 3/3: Starting services...$(RESET)"
	docker compose -f docker/compose/prod.yml up -d
	@echo "$(GREEN)✓ Deploy complete!$(RESET)"
	@docker system df

# =============================================================================
# INDIVIDUAL SERVICES
# =============================================================================

## Restart only backend (fast, no rebuild)
restart-backend:
	@echo "$(CYAN)Restarting backend...$(RESET)"
	docker compose -f docker/compose/prod.yml restart backend
	@echo "$(GREEN)✓ Backend restarted$(RESET)"

## Restart only frontend (fast, no rebuild)
restart-frontend:
	@echo "$(CYAN)Restarting frontend...$(RESET)"
	docker compose -f docker/compose/prod.yml restart frontend
	@echo "$(GREEN)✓ Frontend restarted$(RESET)"

## Rebuild backend with no cache and restart
rebuild-backend:
	@echo "$(CYAN)Rebuilding backend (no cache)...$(RESET)"
	docker compose -f docker/compose/prod.yml build --no-cache backend
	docker compose -f docker/compose/prod.yml up -d backend
	@echo "$(GREEN)✓ Backend rebuilt and started$(RESET)"

## Rebuild frontend with no cache and restart
rebuild-frontend:
	@echo "$(CYAN)Rebuilding frontend (no cache)...$(RESET)"
	docker compose -f docker/compose/prod.yml build --no-cache frontend
	docker compose -f docker/compose/prod.yml up -d frontend
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

## Open Redis CLI
shell-redis:
	docker exec -it faithflow-redis redis-cli

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
	docker compose -f docker/compose/prod.yml down -v
	@echo "$(GREEN)✓ All services and volumes removed$(RESET)"

# =============================================================================
# SHORTCUTS
# =============================================================================

## Alias: restart backend
rb: restart-backend

## Alias: restart frontend
rf: restart-frontend

## Alias: logs backend
lb: logs-backend

## Alias: logs frontend
lf: logs-frontend

## Alias: status
s: status

## Alias: logs
l: logs
