#!/bin/bash

################################################################################
#                                                                              #
#                    FaithFlow Docker Installer v1.0                           #
#                                                                              #
#              Enterprise Church Management System - Docker Setup              #
#                     With Traefik + Let's Encrypt SSL                         #
#                                                                              #
#  Architecture:                                                               #
#    - api.yourdomain.com  -> Backend API (FastAPI)                            #
#    - yourdomain.com      -> Frontend (React)                                 #
#    - traefik.yourdomain.com -> Traefik Dashboard                             #
#                                                                              #
#  Usage:                                                                      #
#    sudo ./docker-install.sh                                                  #
#    sudo ./docker-install.sh --dev     # Development mode (no SSL)            #
#                                                                              #
################################################################################

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly VERSION="1.0.0"
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
readonly LOG_FILE="/var/log/faithflow-docker-install.log"

# Default values
DEV_MODE=false
DOMAIN=""
ACME_EMAIL=""

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

generate_secret() {
    openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64
}

# =============================================================================
# WELCOME SCREEN
# =============================================================================

show_welcome() {
    clear
    echo -e "${CYAN}"
    cat << 'EOF'

    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║                    🐳  FaithFlow Docker Installer  🐳                     ║
    ║                                                                           ║
    ║              Enterprise Church Management System                          ║
    ║            With Traefik Reverse Proxy & Auto SSL                          ║
    ║                                                                           ║
    ╠═══════════════════════════════════════════════════════════════════════════╣
    ║                                                                           ║
    ║   Architecture:                                                           ║
    ║                                                                           ║
    ║   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                ║
    ║   │   Traefik   │────▸│   Backend   │────▸│   MongoDB   │                ║
    ║   │ :80 / :443  │     │  api.domain │     │   :27017    │                ║
    ║   └──────┬──────┘     └─────────────┘     └─────────────┘                ║
    ║          │                                                                ║
    ║          ▼                                                                ║
    ║   ┌─────────────┐                                                        ║
    ║   │  Frontend   │                                                        ║
    ║   │   domain    │                                                        ║
    ║   └─────────────┘                                                        ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"

    echo -e "  ${WHITE}Installer Version: ${CYAN}$VERSION${NC}"
    echo ""

    sleep 2
}

# =============================================================================
# INSTALLATION STEPS
# =============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script requires root privileges"
        echo -e "${YELLOW}   Please run: sudo ./docker-install.sh${NC}"
        exit 1
    fi
    print_success "Running as root"

    # Check Docker
    if command_exists docker; then
        print_success "Docker installed: $(docker --version | cut -d',' -f1)"
    else
        print_info "Installing Docker..."
        curl -fsSL https://get.docker.com | bash >> "$LOG_FILE" 2>&1
        systemctl enable docker >> "$LOG_FILE" 2>&1
        systemctl start docker >> "$LOG_FILE" 2>&1
        print_success "Docker installed"
    fi

    # Check Docker Compose
    if docker compose version &>/dev/null; then
        print_success "Docker Compose installed: $(docker compose version --short)"
    else
        print_error "Docker Compose (v2) not found. Please install Docker with Compose v2"
        exit 1
    fi

    # Check if running from correct directory
    if [ ! -f "$SCRIPT_DIR/docker-compose.prod.yml" ]; then
        print_error "docker-compose.prod.yml not found in $SCRIPT_DIR"
        exit 1
    fi
    print_success "Docker Compose files found"
}

configure_environment() {
    print_header "Configuration"

    if [ "$DEV_MODE" = true ]; then
        print_info "Development mode enabled (no SSL, localhost)"
        DOMAIN="localhost"
        ACME_EMAIL="dev@localhost"
    else
        echo ""
        echo -e "${CYAN}  Domain Configuration:${NC}"
        echo ""

        read -p "  Enter your domain (e.g., faithflow.church): " DOMAIN

        if [ -z "$DOMAIN" ]; then
            print_error "Domain is required"
            exit 1
        fi

        read -p "  Enter email for SSL certificate (Let's Encrypt): " ACME_EMAIL

        if [ -z "$ACME_EMAIL" ]; then
            ACME_EMAIL="admin@$DOMAIN"
            print_warn "Using default email: $ACME_EMAIL"
        fi
    fi

    print_success "Domain: $DOMAIN"
    print_success "Email: $ACME_EMAIL"

    # Generate secrets
    JWT_SECRET=$(generate_secret)

    # Create .env file
    print_info "Creating environment configuration..."

    cat > "$SCRIPT_DIR/.env" << EOF
# FaithFlow Docker Configuration
# Generated: $(date)

# Domain Configuration
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

# Security
JWT_SECRET=$JWT_SECRET

# Traefik Dashboard Auth (admin:admin - CHANGE THIS!)
# Generate with: htpasswd -nb admin yourpassword
TRAEFIK_DASHBOARD_AUTH=admin:\$apr1\$ruca84Hq\$mbjdMZBAG.KWn7vfN/SNK/

# Database
MONGO_URL=mongodb://mongodb:27017
DB_NAME=faithflow

# Optional Services (configure in admin dashboard after installation)
ANTHROPIC_API_KEY=
STABILITY_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_USERNAME=
WHATSAPP_PASSWORD=
EOF

    print_success "Environment file created: $SCRIPT_DIR/.env"

    # Update backend .env for subdomain mode
    print_info "Configuring backend for subdomain mode..."
    if [ -f "$SCRIPT_DIR/backend/.env" ]; then
        sed -i 's/^API_PREFIX=.*/API_PREFIX=/' "$SCRIPT_DIR/backend/.env" 2>/dev/null || true
    else
        echo "API_PREFIX=" > "$SCRIPT_DIR/backend/.env"
        echo "MONGO_URL=mongodb://mongodb:27017" >> "$SCRIPT_DIR/backend/.env"
        echo "DB_NAME=faithflow" >> "$SCRIPT_DIR/backend/.env"
        echo "JWT_SECRET=$JWT_SECRET" >> "$SCRIPT_DIR/backend/.env"
        echo "CORS_ORIGINS=https://$DOMAIN,https://app.$DOMAIN" >> "$SCRIPT_DIR/backend/.env"
    fi
    print_success "Backend configured for subdomain mode"
}

build_images() {
    print_header "Building Docker Images"

    cd "$SCRIPT_DIR"

    print_info "Building backend image..."
    docker compose -f docker-compose.prod.yml build backend >> "$LOG_FILE" 2>&1
    print_success "Backend image built"

    print_info "Building frontend image (this may take a few minutes)..."
    docker compose -f docker-compose.prod.yml build frontend >> "$LOG_FILE" 2>&1
    print_success "Frontend image built"
}

start_services() {
    print_header "Starting Services"

    cd "$SCRIPT_DIR"

    if [ "$DEV_MODE" = true ]; then
        print_info "Starting development stack..."
        docker compose up -d >> "$LOG_FILE" 2>&1
    else
        print_info "Starting production stack with Traefik..."
        docker compose -f docker-compose.prod.yml up -d >> "$LOG_FILE" 2>&1
    fi

    print_success "Services started"

    # Wait for services to be ready
    print_info "Waiting for services to initialize (30 seconds)..."
    sleep 30

    # Check service health
    print_info "Checking service health..."

    if docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        print_success "Services are healthy"
    else
        print_warn "Some services may still be starting up"
    fi
}

initialize_database() {
    print_header "Initializing Database"

    cd "$SCRIPT_DIR"

    print_info "Running database initialization..."

    # Execute init script in backend container
    docker compose -f docker-compose.prod.yml exec -T backend python scripts/init_db.py >> "$LOG_FILE" 2>&1 || {
        print_warn "Database initialization script not found or failed"
        print_info "You can initialize the database later via the admin panel"
    }

    print_success "Database initialized"
}

configure_firewall() {
    print_header "Configuring Firewall"

    if command_exists ufw; then
        print_info "Configuring UFW firewall..."
        ufw allow 80/tcp >> "$LOG_FILE" 2>&1 || true
        ufw allow 443/tcp >> "$LOG_FILE" 2>&1 || true
        ufw allow 22/tcp >> "$LOG_FILE" 2>&1 || true
        print_success "Firewall configured (HTTP, HTTPS, SSH allowed)"
    else
        print_info "UFW not installed, skipping firewall configuration"
    fi
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
    ║                    ✨  Installation Complete!  ✨                         ║
    ║                                                                           ║
    ║               FaithFlow is now running with Docker!                       ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "${CYAN}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}  │  ${WHITE}Access Your Application${CYAN}                                          │${NC}"
    echo -e "${CYAN}  ├─────────────────────────────────────────────────────────────────────┤${NC}"

    if [ "$DEV_MODE" = true ]; then
        echo -e "${CYAN}  │  ${WHITE}Frontend:${NC}   http://localhost:3000${CYAN}                              │${NC}"
        echo -e "${CYAN}  │  ${WHITE}Backend:${NC}    http://localhost:8000${CYAN}                              │${NC}"
        echo -e "${CYAN}  │  ${WHITE}API Docs:${NC}   http://localhost:8000/docs${CYAN}                         │${NC}"
    else
        echo -e "${CYAN}  │  ${WHITE}Frontend:${NC}   https://$DOMAIN${CYAN}                              │${NC}"
        echo -e "${CYAN}  │  ${WHITE}API:${NC}        https://api.$DOMAIN${CYAN}                          │${NC}"
        echo -e "${CYAN}  │  ${WHITE}API Docs:${NC}   https://api.$DOMAIN/docs${CYAN}                      │${NC}"
        echo -e "${CYAN}  │  ${WHITE}Traefik:${NC}    https://traefik.$DOMAIN${CYAN}                       │${NC}"
    fi

    echo -e "${CYAN}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ${WHITE}Default Admin Credentials${YELLOW}                                        │${NC}"
    echo -e "${YELLOW}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${YELLOW}  │  ${CYAN}Email:${NC}    admin@gkbjtamankencana.org${YELLOW}                          │${NC}"
    echo -e "${YELLOW}  │  ${CYAN}Password:${NC} admin123${YELLOW}                                            │${NC}"
    echo -e "${YELLOW}  │                                                                     │${NC}"
    echo -e "${YELLOW}  │  ${RED}⚠ Change this password immediately after login!${YELLOW}                │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${BLUE}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}  │  ${WHITE}Useful Docker Commands${BLUE}                                            │${NC}"
    echo -e "${BLUE}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BLUE}  │  ${CYAN}View logs:${NC}      docker compose -f docker-compose.prod.yml logs -f${BLUE}│${NC}"
    echo -e "${BLUE}  │  ${CYAN}Stop:${NC}           docker compose -f docker-compose.prod.yml down${BLUE}   │${NC}"
    echo -e "${BLUE}  │  ${CYAN}Restart:${NC}        docker compose -f docker-compose.prod.yml restart${BLUE}│${NC}"
    echo -e "${BLUE}  │  ${CYAN}Update:${NC}         ./docker-update.sh${BLUE}                              │${NC}"
    echo -e "${BLUE}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    if [ "$DEV_MODE" = false ]; then
        echo -e "${YELLOW}  ⚠ Make sure DNS for $DOMAIN and api.$DOMAIN point to this server!${NC}"
        echo ""
    fi

    echo -e "${GREEN}  🙏 Thank you for choosing FaithFlow!${NC}"
    echo ""
}

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev|--development)
                DEV_MODE=true
                shift
                ;;
            --help|-h)
                echo "FaithFlow Docker Installer v$VERSION"
                echo ""
                echo "Usage: sudo ./docker-install.sh [options]"
                echo ""
                echo "Options:"
                echo "  --dev, --development    Install in development mode (localhost, no SSL)"
                echo "  --help, -h              Show this help message"
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

    log "FaithFlow Docker Installation started"

    show_welcome
    check_prerequisites
    configure_environment
    build_images
    start_services
    initialize_database
    configure_firewall
    show_completion

    log "Installation completed successfully"
}

main "$@"
