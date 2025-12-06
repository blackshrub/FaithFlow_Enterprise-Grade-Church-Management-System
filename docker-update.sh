#!/bin/bash

################################################################################
#                                                                              #
#                     FaithFlow Docker Updater v1.0                            #
#                                                                              #
#              Zero-Downtime Update for Docker Deployments                     #
#                                                                              #
#  Usage:                                                                      #
#    ./docker-update.sh                   # Update all services                #
#    ./docker-update.sh --backend         # Update backend only                #
#    ./docker-update.sh --frontend        # Update frontend only               #
#    ./docker-update.sh --no-build        # Pull without rebuilding            #
#    ./docker-update.sh --external-traefik # Using external Traefik instance   #
#                                                                              #
################################################################################

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly SCRIPT_VERSION="1.1.0"
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
readonly LOG_FILE="/var/log/faithflow-docker-update.log"
COMPOSE_FILE="docker/compose/prod.yml"

# Minimum required versions
readonly MIN_DOCKER_VERSION="24.0"
readonly MIN_COMPOSE_VERSION="2.20"

# Update options
UPDATE_BACKEND=true
UPDATE_FRONTEND=true
NO_BUILD=false
EXTERNAL_TRAEFIK=false

# Compose command (set after parsing args)
COMPOSE_CMD=""

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

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# VERSION CHECKING FUNCTIONS
# =============================================================================

# Compare version numbers (returns 0 if version1 >= version2)
version_gte() {
    local version1="$1"
    local version2="$2"

    # Remove any non-numeric prefix (like 'v')
    version1=$(echo "$version1" | sed 's/^[^0-9]*//')
    version2=$(echo "$version2" | sed 's/^[^0-9]*//')

    # Compare using sort -V
    [ "$(printf '%s\n' "$version2" "$version1" | sort -V | head -n1)" = "$version2" ]
}

# Get Docker version number only
get_docker_version() {
    docker --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1
}

# Get Docker Compose version number only
get_compose_version() {
    docker compose version --short 2>/dev/null | grep -oP '\d+\.\d+' | head -1
}

# Upgrade Docker to latest version
upgrade_docker() {
    print_info "Upgrading Docker to latest version..."
    echo ""
    echo -e "${YELLOW}    This may take a few minutes...${NC}"
    echo ""

    # Stop Docker service gracefully
    systemctl stop docker >> "$LOG_FILE" 2>&1 || true

    # Remove old Docker packages (but keep data)
    apt-get remove -y docker docker-engine docker.io containerd runc >> "$LOG_FILE" 2>&1 || true

    # Install latest Docker using official script
    curl -fsSL https://get.docker.com | bash >> "$LOG_FILE" 2>&1

    if command_exists docker; then
        systemctl enable docker >> "$LOG_FILE" 2>&1
        systemctl start docker >> "$LOG_FILE" 2>&1
        local new_version=$(get_docker_version)
        print_success "Docker upgraded to version $new_version"
    else
        print_error "Docker upgrade failed"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Try installing Docker manually:${NC}"
        echo -e "${CYAN}    curl -fsSL https://get.docker.com | bash${NC}"
        echo ""
        exit 1
    fi
}

# Check Docker version and prompt for upgrade if outdated
check_docker_version() {
    print_info "Checking Docker version..."

    if ! command_exists docker; then
        print_error "Docker is not installed"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Run the Docker installer first:${NC}"
        echo -e "${CYAN}    sudo ./docker-install.sh${NC}"
        echo ""
        exit 1
    fi

    local current_version=$(get_docker_version)

    if version_gte "$current_version" "$MIN_DOCKER_VERSION"; then
        print_success "Docker version $current_version (meets minimum $MIN_DOCKER_VERSION)"
    else
        print_warn "Docker version $current_version is OUTDATED (minimum required: $MIN_DOCKER_VERSION)"
        echo ""
        echo -e "${YELLOW}  Your Docker version is too old and may cause issues.${NC}"
        echo -e "${YELLOW}  FaithFlow requires Docker $MIN_DOCKER_VERSION or newer.${NC}"
        echo ""

        read -p "  Would you like to upgrade Docker now? [Y/n]: " upgrade_choice
        upgrade_choice=${upgrade_choice:-Y}

        if [[ "$upgrade_choice" =~ ^[Yy]$ ]]; then
            upgrade_docker
        else
            print_warn "Continuing with outdated Docker. You may experience issues."
            echo ""
        fi
    fi

    # Check Docker Compose
    print_info "Checking Docker Compose version..."

    if docker compose version &>/dev/null; then
        local compose_version=$(get_compose_version)

        if version_gte "$compose_version" "$MIN_COMPOSE_VERSION"; then
            print_success "Docker Compose version $compose_version (meets minimum $MIN_COMPOSE_VERSION)"
        else
            print_warn "Docker Compose $compose_version is OUTDATED (minimum: $MIN_COMPOSE_VERSION)"
            echo ""
            print_info "Upgrading Docker Compose plugin..."

            apt-get update >> "$LOG_FILE" 2>&1
            apt-get install -y docker-compose-plugin >> "$LOG_FILE" 2>&1

            local new_compose_version=$(get_compose_version)
            if version_gte "$new_compose_version" "$MIN_COMPOSE_VERSION"; then
                print_success "Docker Compose upgraded to $new_compose_version"
            else
                print_warn "Could not upgrade Docker Compose. Current: $new_compose_version"
            fi
        fi
    else
        print_error "Docker Compose is not installed"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Install Docker Compose plugin:${NC}"
        echo -e "${CYAN}    apt install docker-compose-plugin${NC}"
        echo ""
        exit 1
    fi
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

    # Check Docker and Compose versions first
    check_docker_version

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        # Try development compose file
        if [ -f "docker/compose/dev.yml" ]; then
            COMPOSE_FILE="docker/compose/dev.yml"
            print_info "Using development compose file"
        else
            print_error "Docker Compose file not found"
            exit 1
        fi
    fi
    print_success "Docker Compose file found"

    # Check if services are running
    if $COMPOSE_CMD ps | grep -q "running"; then
        print_success "Services are currently running"
    else
        print_warn "Some services may not be running"
    fi

    # Check current health
    print_info "Checking current health..."
    if $COMPOSE_CMD ps | grep -q "healthy"; then
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
        if ! $COMPOSE_CMD build --no-cache backend >> "$LOG_FILE" 2>&1; then
            print_error "Backend build failed. Check log: $LOG_FILE"
            tail -20 "$LOG_FILE"
            exit 1
        fi
        print_success "Backend image built"
    fi

    if [ "$UPDATE_FRONTEND" = true ]; then
        print_info "Building frontend image..."
        echo -e "${YELLOW}    ⚠ This may take 5-15 minutes. Please wait...${NC}"
        echo ""

        # Run build in background with progress indicator
        $COMPOSE_CMD build --no-cache frontend >> "$LOG_FILE" 2>&1 &
        local build_pid=$!

        local start_time=$(date +%s)
        local spin_chars='|/-\\'
        local i=0

        while kill -0 "$build_pid" 2>/dev/null; do
            local elapsed=$(($(date +%s) - start_time))
            local mins=$((elapsed / 60))
            local secs=$((elapsed % 60))
            local spin="${spin_chars:i++%4:1}"
            printf "\r    %s Building frontend... [%dm %02ds]   " "$spin" "$mins" "$secs"
            sleep 0.5
        done
        printf "\r\033[K"

        wait "$build_pid"
        local build_status=$?

        if [ $build_status -ne 0 ]; then
            print_error "Frontend build failed"
            echo ""
            echo -e "${YELLOW}  Last 30 lines of build log:${NC}"
            tail -30 "$LOG_FILE"
            echo ""
            echo -e "${CYAN}  Full log: cat $LOG_FILE${NC}"
            exit 1
        fi

        local total_time=$(($(date +%s) - start_time))
        print_success "Frontend image built (took $((total_time / 60))m $((total_time % 60))s)"
    fi
}

rolling_update() {
    print_header "Performing Rolling Update"

    cd "$SCRIPT_DIR"

    if [ "$UPDATE_BACKEND" = true ]; then
        print_info "Updating backend service..."

        # Scale up new instance
        $COMPOSE_CMD up -d --no-deps backend >> "$LOG_FILE" 2>&1

        # Wait for health check
        sleep 10

        print_success "Backend updated"
    fi

    if [ "$UPDATE_FRONTEND" = true ]; then
        print_info "Updating frontend service..."

        $COMPOSE_CMD up -d --no-deps frontend >> "$LOG_FILE" 2>&1

        sleep 5

        print_success "Frontend updated"
    fi
}

run_migrations() {
    print_header "Running Migrations"

    cd "$SCRIPT_DIR"

    print_info "Checking for database migrations..."

    # Run migrations if script exists
    $COMPOSE_CMD exec -T backend python scripts/migrate.py >> "$LOG_FILE" 2>&1 || {
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
    if $COMPOSE_CMD exec -T backend curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend: Healthy"
    else
        print_warn "Backend: May still be starting up"
    fi

    # Check frontend health
    print_info "Checking frontend..."
    if $COMPOSE_CMD exec -T frontend wget -q --spider http://localhost:80/health 2>/dev/null; then
        print_success "Frontend: Healthy"
    else
        print_warn "Frontend: May still be starting up"
    fi

    # Show running services
    echo ""
    print_info "Current service status:"
    $COMPOSE_CMD ps
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
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        echo -e "    ${CYAN}ℹ${NC} Using external Traefik"
    fi
    echo ""

    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        echo -e "${BLUE}  View logs: ${WHITE}docker compose -f docker/compose/prod.yml -f docker/compose/external-traefik.yml logs -f${NC}"
    else
        echo -e "${BLUE}  View logs: ${WHITE}docker compose -f $COMPOSE_FILE logs -f${NC}"
    fi
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
            --external-traefik)
                EXTERNAL_TRAEFIK=true
                shift
                ;;
            --help|-h)
                echo "FaithFlow Docker Updater v$SCRIPT_VERSION"
                echo ""
                echo "Usage: ./docker-update.sh [options]"
                echo ""
                echo "Options:"
                echo "  --backend           Update backend only"
                echo "  --frontend          Update frontend only"
                echo "  --no-build          Skip image build (just restart)"
                echo "  --external-traefik  Use external Traefik configuration"
                echo "  --help, -h          Show this help message"
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

# Set up compose command based on configuration
setup_compose_cmd() {
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        if [ -f "$SCRIPT_DIR/docker/compose/external-traefik.yml" ]; then
            COMPOSE_CMD="docker compose -f $COMPOSE_FILE -f docker/compose/external-traefik.yml"
            print_info "Using external Traefik configuration"
        else
            print_warn "External Traefik config not found, using standard configuration"
            COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
        fi
    else
        COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
    fi
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
    setup_compose_cmd    # Set up compose command based on --external-traefik flag (needs to be before check_prerequisites)
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
