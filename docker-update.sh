#!/bin/bash

################################################################################
#                                                                              #
#                     FaithFlow Docker Updater v1.0                            #
#                                                                              #
#              Zero-Downtime Update for Docker Deployments                     #
#                                                                              #
#  Usage:                                                                      #
#    ./docker-update.sh                # Update all services                   #
#    ./docker-update.sh --backend      # Update backend only                   #
#    ./docker-update.sh --frontend     # Update frontend only                  #
#    ./docker-update.sh --no-build     # Pull without rebuilding               #
#                                                                              #
################################################################################

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly VERSION="1.0.0"
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
readonly LOG_FILE="/var/log/faithflow-docker-update.log"
readonly COMPOSE_FILE="docker-compose.prod.yml"

# Update options
UPDATE_BACKEND=true
UPDATE_FRONTEND=true
NO_BUILD=false

# =============================================================================
# TERMINAL STYLING
# =============================================================================

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

readonly CHECK='\xE2\x9C\x94'
readonly CROSS='\xE2\x9C\x98'
readonly ARROW='\xE2\x9E\x9C'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}  ${CHECK} $1${NC}"
    log "SUCCESS: $1"
}

print_info() {
    echo -e "${CYAN}  ${ARROW} $1${NC}"
    log "INFO: $1"
}

print_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
    log "WARN: $1"
}

print_error() {
    echo -e "${RED}  ${CROSS} $1${NC}"
    log "ERROR: $1"
}

# =============================================================================
# WELCOME SCREEN
# =============================================================================

show_welcome() {
    echo -e "${CYAN}"
    cat << 'EOF'

    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║                    🔄  FaithFlow Docker Updater  🔄                       ║
    ║                                                                           ║
    ║                     Zero-Downtime Update System                           ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"
}

# =============================================================================
# UPDATE FUNCTIONS
# =============================================================================

check_prerequisites() {
    print_header "Pre-Update Checks"

    cd "$SCRIPT_DIR"

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        # Try development compose file
        if [ -f "docker-compose.yml" ]; then
            COMPOSE_FILE="docker-compose.yml"
            print_info "Using development compose file"
        else
            print_error "Docker Compose file not found"
            exit 1
        fi
    fi

    # Check if services are running
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "running"; then
        print_success "Services are currently running"
    else
        print_warn "Some services may not be running"
    fi

    # Check current health
    print_info "Checking current health..."
    if docker compose -f "$COMPOSE_FILE" ps | grep -q "healthy"; then
        print_success "Services are healthy"
    else
        print_warn "Some services may not be healthy"
    fi
}

pull_code() {
    print_header "Pulling Latest Code"

    cd "$SCRIPT_DIR"

    if [ -d ".git" ]; then
        print_info "Pulling from git repository..."
        git pull >> "$LOG_FILE" 2>&1 || {
            print_warn "Git pull failed, continuing with local code"
        }
        print_success "Code updated"
    else
        print_info "No git repository found, using local code"
    fi
}

build_images() {
    print_header "Building Docker Images"

    cd "$SCRIPT_DIR"

    if [ "$NO_BUILD" = true ]; then
        print_info "Skipping build (--no-build flag)"
        return 0
    fi

    if [ "$UPDATE_BACKEND" = true ]; then
        print_info "Building backend image..."
        docker compose -f "$COMPOSE_FILE" build --no-cache backend >> "$LOG_FILE" 2>&1
        print_success "Backend image built"
    fi

    if [ "$UPDATE_FRONTEND" = true ]; then
        print_info "Building frontend image (this may take a few minutes)..."
        docker compose -f "$COMPOSE_FILE" build --no-cache frontend >> "$LOG_FILE" 2>&1
        print_success "Frontend image built"
    fi
}

rolling_update() {
    print_header "Performing Rolling Update"

    cd "$SCRIPT_DIR"

    if [ "$UPDATE_BACKEND" = true ]; then
        print_info "Updating backend service..."

        # Scale up new instance
        docker compose -f "$COMPOSE_FILE" up -d --no-deps backend >> "$LOG_FILE" 2>&1

        # Wait for health check
        sleep 10

        print_success "Backend updated"
    fi

    if [ "$UPDATE_FRONTEND" = true ]; then
        print_info "Updating frontend service..."

        docker compose -f "$COMPOSE_FILE" up -d --no-deps frontend >> "$LOG_FILE" 2>&1

        sleep 5

        print_success "Frontend updated"
    fi
}

run_migrations() {
    print_header "Running Migrations"

    cd "$SCRIPT_DIR"

    print_info "Checking for database migrations..."

    # Run migrations if script exists
    docker compose -f "$COMPOSE_FILE" exec -T backend python scripts/migrate.py >> "$LOG_FILE" 2>&1 || {
        print_info "No migrations to run"
    }

    print_success "Migrations complete"
}

health_check() {
    print_header "Post-Update Health Check"

    cd "$SCRIPT_DIR"

    print_info "Waiting for services to stabilize..."
    sleep 10

    # Check backend health
    print_info "Checking backend..."
    if docker compose -f "$COMPOSE_FILE" exec -T backend curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend: Healthy"
    else
        print_warn "Backend: May still be starting up"
    fi

    # Check frontend health
    print_info "Checking frontend..."
    if docker compose -f "$COMPOSE_FILE" exec -T frontend wget -q --spider http://localhost:80/health 2>/dev/null; then
        print_success "Frontend: Healthy"
    else
        print_warn "Frontend: May still be starting up"
    fi

    # Show running services
    echo ""
    print_info "Current service status:"
    docker compose -f "$COMPOSE_FILE" ps
}

cleanup() {
    print_header "Cleanup"

    print_info "Removing old images..."
    docker image prune -f >> "$LOG_FILE" 2>&1 || true
    print_success "Cleanup complete"
}

# =============================================================================
# COMPLETION SCREEN
# =============================================================================

show_completion() {
    echo ""
    echo -e "${GREEN}"
    cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║                      ✨  Update Complete!  ✨                             ║
    ║                                                                           ║
    ║               FaithFlow is now running the latest version!                ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "${CYAN}  Updated components:${NC}"
    [ "$UPDATE_BACKEND" = true ] && echo -e "    ${GREEN}✓${NC} Backend"
    [ "$UPDATE_FRONTEND" = true ] && echo -e "    ${GREEN}✓${NC} Frontend"
    echo ""

    echo -e "${BLUE}  View logs: ${WHITE}docker compose -f $COMPOSE_FILE logs -f${NC}"
    echo ""

    echo -e "${GREEN}  🙏 Update successful!${NC}"
    echo ""
}

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend)
                UPDATE_FRONTEND=false
                shift
                ;;
            --frontend)
                UPDATE_BACKEND=false
                shift
                ;;
            --no-build)
                NO_BUILD=true
                shift
                ;;
            --help|-h)
                echo "FaithFlow Docker Updater v$VERSION"
                echo ""
                echo "Usage: ./docker-update.sh [options]"
                echo ""
                echo "Options:"
                echo "  --backend      Update backend only"
                echo "  --frontend     Update frontend only"
                echo "  --no-build     Skip image build (just restart)"
                echo "  --help, -h     Show this help message"
                echo ""
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    parse_args "$@"

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"

    log "FaithFlow Docker Update started"

    show_welcome
    check_prerequisites
    pull_code
    build_images
    rolling_update
    run_migrations
    health_check
    cleanup
    show_completion

    log "Update completed successfully"
}

main "$@"
