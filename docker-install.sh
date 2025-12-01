#!/bin/bash

################################################################################
#                                                                              #
#                    FaithFlow Docker Installer v2.0                           #
#                                                                              #
#              Enterprise Church Management System - Docker Setup              #
#                     With Traefik + Let's Encrypt SSL                         #
#                                                                              #
#  This script will:                                                           #
#  1. Check your server meets minimum requirements                             #
#  2. Install Docker if not already installed                                  #
#  3. Configure your domain and SSL certificates                               #
#  4. Start all FaithFlow services                                             #
#  5. Initialize the database with default admin account                       #
#                                                                              #
#  What gets installed:                                                        #
#  - FaithFlow Web Application (React frontend)                                #
#  - FaithFlow API Server (FastAPI backend)                                    #
#  - MongoDB Database                                                          #
#  - Traefik Reverse Proxy with automatic SSL                                  #
#  - LiveKit (Voice/Video Calling)                                             #
#  - coTURN (NAT Traversal for video calls)                                    #
#  - EMQX (Real-time messaging)                                                #
#                                                                              #
#  Architecture (all on your server):                                          #
#    yourdomain.com         -> Frontend (React app)                            #
#    api.yourdomain.com     -> Backend API (FastAPI)                           #
#    livekit.yourdomain.com -> Voice/Video Server                              #
#    files.yourdomain.com   -> File Storage (SeaweedFS)                        #
#    traefik.yourdomain.com -> Traefik Dashboard (admin)                       #
#    emqx.yourdomain.com    -> EMQX Dashboard (admin)                          #
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

readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
readonly LOG_FILE="/var/log/faithflow-docker-install.log"

# Default values
DEV_MODE=false
EXTERNAL_TRAEFIK=false
EXTERNAL_TRAEFIK_NETWORK=""
DOMAIN=""
ACME_EMAIL=""
SERVER_IP=""

# Minimum requirements
readonly MIN_RAM_MB=2048
readonly MIN_DISK_GB=20

# =============================================================================
# TERMINAL STYLING
# =============================================================================

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly GRAY='\033[0;90m'
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

print_detail() {
    echo -e "${GRAY}    $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a port is available (not in use)
port_available() {
    local port="$1"
    if command_exists ss; then
        ! ss -tuln 2>/dev/null | grep -qE ":${port}\s"
    elif command_exists netstat; then
        ! netstat -tuln 2>/dev/null | grep -qE ":${port}\s"
    else
        (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null && return 1 || return 0
    fi
}

# Get process using a specific port
get_port_process() {
    local port="$1"
    if command_exists ss; then
        ss -tulnp 2>/dev/null | grep ":${port}\s" | awk '{print $NF}' | head -1
    elif command_exists netstat; then
        netstat -tulnp 2>/dev/null | grep ":${port}\s" | awk '{print $NF}' | head -1
    else
        echo "unknown"
    fi
}

# Check required ports for Docker deployment
check_required_ports() {
    local has_conflict=false
    local conflicting_ports=()

    print_info "Checking required ports..."

    # Docker deployment uses fewer host ports (Traefik handles routing)
    # When using external Traefik, skip 80/443 port checks
    local -a PORTS
    local -a NAMES

    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        PORTS=("3478" "5349" "7881")
        NAMES=("TURN" "TURN-TLS" "LiveKit-RTC")
        print_info "Using external Traefik - skipping port 80/443 checks"
    else
        PORTS=("80" "443" "3478" "5349" "7881")
        NAMES=("HTTP" "HTTPS" "TURN" "TURN-TLS" "LiveKit-RTC")
    fi

    for i in "${!PORTS[@]}"; do
        local port="${PORTS[$i]}"
        local name="${NAMES[$i]}"
        if ! port_available "$port"; then
            local process=$(get_port_process "$port")
            print_warn "Port $port ($name) is in use by: $process"
            has_conflict=true
            conflicting_ports+=("$port")
        else
            print_detail "Port $port ($name): Available"
        fi
    done

    if [ "$has_conflict" = true ]; then
        echo ""
        echo -e "${RED}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}  PORT CONFLICTS DETECTED!${NC}"
        echo -e "${RED}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}  Stop the conflicting services:${NC}"
        for port in "${conflicting_ports[@]}"; do
            echo -e "${CYAN}     sudo fuser -k ${port}/tcp${NC}"
        done
        echo ""
        echo -e "${WHITE}  Common conflicts:${NC}"
        echo -e "${GRAY}    Port 80/443: Apache, Nginx, or another web server${NC}"
        echo -e "${GRAY}    Port 3478: Another TURN server${NC}"
        echo ""

        read -p "  Continue anyway? (may cause failures) [y/N]: " continue_choice
        continue_choice=${continue_choice:-N}

        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            print_error "Installation aborted due to port conflicts"
            exit 1
        fi
        print_warn "Continuing with port conflicts - some services may fail"
    else
        print_success "All required ports are available"
    fi
}

generate_secret() {
    openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
}

# Resolve DNS to IP address with multiple fallback methods
# Handles CNAME records and works without dig installed
resolve_dns() {
    local domain="$1"
    local ip=""

    # Method 1: Try dig (most reliable when available)
    if command_exists dig; then
        # Use +trace to follow CNAMEs, grep for A records, get last IP
        ip=$(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | tail -1)
        if [ -n "$ip" ]; then
            echo "$ip"
            return 0
        fi
    fi

    # Method 2: Try host command
    if command_exists host; then
        ip=$(host "$domain" 2>/dev/null | grep -E 'has address' | head -1 | awk '{print $NF}')
        if [ -n "$ip" ]; then
            echo "$ip"
            return 0
        fi
    fi

    # Method 3: Try nslookup
    if command_exists nslookup; then
        ip=$(nslookup "$domain" 2>/dev/null | grep -A1 'Name:' | grep 'Address:' | head -1 | awk '{print $2}')
        if [ -n "$ip" ]; then
            echo "$ip"
            return 0
        fi
    fi

    # Method 4: Try getent (uses system resolver)
    if command_exists getent; then
        ip=$(getent hosts "$domain" 2>/dev/null | awk '{print $1}' | head -1)
        if [ -n "$ip" ]; then
            echo "$ip"
            return 0
        fi
    fi

    # No resolution possible
    echo ""
    return 1
}

get_public_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo ""
}

get_memory_mb() {
    free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0"
}

get_disk_gb() {
    df -BG / 2>/dev/null | awk 'NR==2 {print int($4)}' || echo "0"
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
    ║              Enterprise Church Management System v2.0                     ║
    ║            With Traefik Reverse Proxy & Auto SSL                          ║
    ║                                                                           ║
    ╠═══════════════════════════════════════════════════════════════════════════╣
    ║                                                                           ║
    ║   What this installer does:                                               ║
    ║                                                                           ║
    ║   1. Checks your server meets requirements                                ║
    ║   2. Installs Docker (if not already installed)                           ║
    ║   3. Sets up your domain with automatic SSL                               ║
    ║   4. Starts all FaithFlow services                                        ║
    ║   5. Creates your admin account                                           ║
    ║                                                                           ║
    ║   Services included:                                                      ║
    ║   ✦ Web Dashboard & Mobile API                                            ║
    ║   ✦ Voice/Video Calling (LiveKit)                                         ║
    ║   ✦ Real-time Messaging (MQTT)                                            ║
    ║   ✦ Automatic HTTPS (Let's Encrypt)                                       ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"

    echo -e "  ${WHITE}Installer Version: ${CYAN}$SCRIPT_VERSION${NC}"
    echo ""

    sleep 2
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

check_prerequisites() {
    print_header "Step 1/7: Checking Prerequisites"

    # Check root
    print_info "Checking if running as root..."
    if [ "$EUID" -ne 0 ]; then
        print_error "This script requires root privileges"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Run the command with sudo:${NC}"
        echo -e "${CYAN}    sudo ./docker-install.sh${NC}"
        echo ""
        exit 1
    fi
    print_success "Running as root"

    # Check OS
    print_info "Checking operating system..."
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        print_success "Operating System: $PRETTY_NAME"
    else
        print_warn "Could not detect OS version"
    fi

    # Install essential tools for DNS verification
    print_info "Installing required tools..."
    if command_exists apt-get; then
        apt-get update -qq >> "$LOG_FILE" 2>&1 || true
        apt-get install -y -qq dnsutils curl wget >> "$LOG_FILE" 2>&1 || true
    elif command_exists yum; then
        yum install -y -q bind-utils curl wget >> "$LOG_FILE" 2>&1 || true
    elif command_exists dnf; then
        dnf install -y -q bind-utils curl wget >> "$LOG_FILE" 2>&1 || true
    fi
    print_success "Required tools installed"

    # Check memory
    print_info "Checking system memory..."
    local mem_mb=$(get_memory_mb)
    if [ "$mem_mb" -ge "$MIN_RAM_MB" ]; then
        print_success "RAM: ${mem_mb}MB (minimum required: ${MIN_RAM_MB}MB)"
    else
        print_error "Insufficient RAM: ${mem_mb}MB (minimum required: ${MIN_RAM_MB}MB)"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Upgrade your server to at least 2GB RAM${NC}"
        echo ""
        exit 1
    fi

    # Check and create swap space if needed (prevents OOM during frontend build)
    # Frontend React build needs ~3-4GB memory, so we need swap on small VPS
    print_info "Checking swap space..."
    local swap_mb=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo "0")
    local total_available=$((mem_mb + swap_mb))

    if [ "$total_available" -lt 4096 ]; then
        print_warn "Total memory (RAM + Swap): ${total_available}MB - may cause build failures"
        echo ""
        echo -e "${YELLOW}  Frontend builds require ~4GB memory. Creating swap space...${NC}"

        # Calculate swap size: aim for 4GB total (RAM + Swap)
        local swap_needed=$((4096 - mem_mb))
        if [ "$swap_needed" -lt 1024 ]; then
            swap_needed=1024  # Minimum 1GB swap
        fi

        # Check if swap file already exists
        if [ -f /swapfile ]; then
            print_info "Existing swap file found, extending if needed..."
            swapoff /swapfile 2>/dev/null || true
            rm -f /swapfile
        fi

        # Create swap file
        print_info "Creating ${swap_needed}MB swap file (this may take a minute)..."
        if dd if=/dev/zero of=/swapfile bs=1M count=$swap_needed status=progress >> "$LOG_FILE" 2>&1; then
            chmod 600 /swapfile
            mkswap /swapfile >> "$LOG_FILE" 2>&1
            swapon /swapfile >> "$LOG_FILE" 2>&1

            # Add to fstab for persistence (if not already there)
            if ! grep -q "/swapfile" /etc/fstab 2>/dev/null; then
                echo "/swapfile none swap sw 0 0" >> /etc/fstab
            fi

            local new_swap_mb=$(free -m | awk '/^Swap:/{print $2}')
            print_success "Swap space created: ${new_swap_mb}MB"
            print_success "Total available memory: $((mem_mb + new_swap_mb))MB"
        else
            print_warn "Could not create swap file - build may fail on low-memory systems"
        fi
    else
        print_success "Swap: ${swap_mb}MB (Total RAM+Swap: ${total_available}MB - sufficient)"
    fi

    # Check disk
    print_info "Checking disk space..."
    local disk_gb=$(get_disk_gb)
    if [ "$disk_gb" -ge "$MIN_DISK_GB" ]; then
        print_success "Disk Space: ${disk_gb}GB available (minimum required: ${MIN_DISK_GB}GB)"
    else
        print_error "Insufficient disk space: ${disk_gb}GB (minimum required: ${MIN_DISK_GB}GB)"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Free up disk space or upgrade your server${NC}"
        echo ""
        exit 1
    fi

    # Check network
    print_info "Checking network connectivity..."
    if ping -c 1 google.com &>/dev/null || ping -c 1 cloudflare.com &>/dev/null; then
        print_success "Network: Connected to internet"
    else
        print_error "No internet connection"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Make sure your server has internet access${NC}"
        echo ""
        exit 1
    fi

    # Check required files
    print_info "Checking required files..."
    if [ ! -f "$SCRIPT_DIR/docker-compose.prod.yml" ]; then
        print_error "docker-compose.prod.yml not found"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}    Make sure you're running from the FaithFlow directory${NC}"
        echo -e "${WHITE}    The docker-compose.prod.yml file should be in the same folder${NC}"
        echo ""
        exit 1
    fi
    print_success "All required files found"

    # Check port availability
    check_required_ports

    echo ""
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  All prerequisite checks passed!${NC}"
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# DOCKER INSTALLATION
# =============================================================================

# Minimum required versions
readonly MIN_DOCKER_VERSION="24.0"
readonly MIN_COMPOSE_VERSION="2.20"

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
    echo -e "${GRAY}    This may take a few minutes...${NC}"
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

install_docker() {
    print_header "Step 2/7: Installing Docker"

    # Check if Docker is already installed
    if command_exists docker; then
        local current_version=$(get_docker_version)
        local docker_info="Docker version $current_version"

        # Check if version meets minimum requirement
        if version_gte "$current_version" "$MIN_DOCKER_VERSION"; then
            print_success "$docker_info (meets minimum $MIN_DOCKER_VERSION)"
        else
            print_warn "$docker_info is OUTDATED (minimum required: $MIN_DOCKER_VERSION)"
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
    else
        print_info "Docker not found. Installing Docker..."
        echo ""
        echo -e "${GRAY}    This may take a few minutes...${NC}"
        echo ""

        # Install Docker using official script
        curl -fsSL https://get.docker.com | bash >> "$LOG_FILE" 2>&1

        if command_exists docker; then
            systemctl enable docker >> "$LOG_FILE" 2>&1
            systemctl start docker >> "$LOG_FILE" 2>&1
            local installed_version=$(get_docker_version)
            print_success "Docker $installed_version installed successfully"
        else
            print_error "Docker installation failed"
            echo ""
            echo -e "${YELLOW}  How to fix:${NC}"
            echo -e "${WHITE}    Try installing Docker manually:${NC}"
            echo -e "${CYAN}    curl -fsSL https://get.docker.com | bash${NC}"
            echo ""
            echo -e "${WHITE}    Check the log file for details:${NC}"
            echo -e "${CYAN}    cat $LOG_FILE${NC}"
            echo ""
            exit 1
        fi
    fi

    # Check Docker Compose
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
        print_info "Docker Compose not found. Installing..."
        apt-get update >> "$LOG_FILE" 2>&1
        apt-get install -y docker-compose-plugin >> "$LOG_FILE" 2>&1

        if docker compose version &>/dev/null; then
            print_success "Docker Compose $(get_compose_version) installed"
        else
            print_error "Docker Compose (v2) installation failed"
            echo ""
            echo -e "${YELLOW}  How to fix:${NC}"
            echo -e "${WHITE}    Install Docker Compose plugin:${NC}"
            echo -e "${CYAN}    apt install docker-compose-plugin${NC}"
            echo ""
            exit 1
        fi
    fi

    echo ""
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Docker environment is ready!${NC}"
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# EXTERNAL TRAEFIK CONFIGURATION
# =============================================================================

configure_external_traefik() {
    if [ "$EXTERNAL_TRAEFIK" != true ]; then
        return
    fi

    print_header "External Traefik Configuration"

    print_info "Detecting existing Traefik network..."

    # List available Docker networks that might be Traefik
    local networks=$(docker network ls --format '{{.Name}}' 2>/dev/null | grep -iE "(traefik|proxy|web)" || true)

    if [ -z "$networks" ]; then
        print_warn "No obvious Traefik network found"
        echo ""
        echo -e "${WHITE}  Available Docker networks:${NC}"
        docker network ls --format '  {{.Name}}' 2>/dev/null | head -20
        echo ""
    else
        print_success "Found possible Traefik networks:"
        echo "$networks" | while read -r net; do
            echo -e "${GREEN}    - $net${NC}"
        done
        echo ""
    fi

    # If network not provided via command line, prompt for it
    if [ -z "$EXTERNAL_TRAEFIK_NETWORK" ]; then
        echo -e "${CYAN}  Enter the name of your existing Traefik Docker network.${NC}"
        echo -e "${CYAN}  This is the network your Traefik container uses to connect to services.${NC}"
        echo ""
        read -p "  Traefik network name [traefik_default]: " EXTERNAL_TRAEFIK_NETWORK
        EXTERNAL_TRAEFIK_NETWORK=${EXTERNAL_TRAEFIK_NETWORK:-traefik_default}
    fi

    # Verify the network exists
    if docker network inspect "$EXTERNAL_TRAEFIK_NETWORK" &>/dev/null; then
        print_success "Network '$EXTERNAL_TRAEFIK_NETWORK' exists"
    else
        print_warn "Network '$EXTERNAL_TRAEFIK_NETWORK' not found"
        echo ""
        echo -e "${YELLOW}  The network will be created as external.${NC}"
        echo -e "${YELLOW}  Make sure your Traefik is connected to this network.${NC}"
        echo ""
        read -p "  Continue anyway? [Y/n]: " continue_choice
        continue_choice=${continue_choice:-Y}
        if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
            print_error "Aborted. Please verify your Traefik network name."
            exit 1
        fi
    fi

    echo ""
    print_success "External Traefik network: $EXTERNAL_TRAEFIK_NETWORK"
    print_info "FaithFlow will connect to your existing Traefik instead of creating its own"
}

# =============================================================================
# DOMAIN CONFIGURATION
# =============================================================================

configure_domain() {
    print_header "Step 3/7: Domain Configuration"

    if [ "$DEV_MODE" = true ]; then
        print_info "Development mode enabled (no SSL, localhost)"
        DOMAIN="localhost"
        ACME_EMAIL="dev@localhost"
        SERVER_IP="127.0.0.1"
        return
    fi

    # Get server's public IP
    print_info "Detecting your server's public IP address..."
    SERVER_IP=$(get_public_ip)

    if [ -n "$SERVER_IP" ]; then
        print_success "Server IP: $SERVER_IP"
    else
        print_warn "Could not auto-detect IP address"
        echo ""
        read -p "  Please enter your server's public IP address: " SERVER_IP
        echo ""
    fi

    # Get domain
    echo ""
    echo -e "${CYAN}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}  │  ${WHITE}IMPORTANT: Before continuing, make sure your DNS is set up!${CYAN}        │${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}You need these DNS records pointing to: ${YELLOW}$SERVER_IP${CYAN}${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}  yourdomain.com         -> $SERVER_IP${CYAN}                         ${NC}"
    echo -e "${CYAN}  │  ${WHITE}  api.yourdomain.com     -> $SERVER_IP${CYAN}                         ${NC}"
    echo -e "${CYAN}  │  ${WHITE}  livekit.yourdomain.com -> $SERVER_IP${CYAN}                         ${NC}"
    echo -e "${CYAN}  │  ${WHITE}  files.yourdomain.com   -> $SERVER_IP${CYAN}                         ${NC}"
    echo -e "${CYAN}  │  ${WHITE}  traefik.yourdomain.com -> $SERVER_IP (optional)${CYAN}              ${NC}"
    echo -e "${CYAN}  │  ${WHITE}  emqx.yourdomain.com    -> $SERVER_IP (optional)${CYAN}              ${NC}"
    echo -e "${CYAN}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    read -p "  Enter your domain name (e.g., faithflow.church): " DOMAIN

    if [ -z "$DOMAIN" ]; then
        print_error "Domain name is required"
        exit 1
    fi

    # Validate domain format
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}$ ]] && [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}$ ]]; then
        print_warn "Domain format looks unusual. Please double-check: $DOMAIN"
    fi

    # Get email for SSL
    read -p "  Enter email for SSL certificates (Let's Encrypt): " ACME_EMAIL

    if [ -z "$ACME_EMAIL" ]; then
        ACME_EMAIL="admin@$DOMAIN"
        print_info "Using default email: $ACME_EMAIL"
    fi

    echo ""
    print_success "Domain: $DOMAIN"
    print_success "Email: $ACME_EMAIL"
    print_success "Server IP: $SERVER_IP"

    # DNS verification
    echo ""
    print_info "Verifying DNS configuration..."

    local dns_ok=true

    # Check main domain
    local domain_ip=$(resolve_dns "$DOMAIN")
    if [ "$domain_ip" = "$SERVER_IP" ]; then
        print_success "$DOMAIN -> $SERVER_IP (correct)"
    else
        print_warn "$DOMAIN -> ${domain_ip:-NOT FOUND} (should be $SERVER_IP)"
        dns_ok=false
    fi

    # Check API subdomain
    local api_ip=$(resolve_dns "api.$DOMAIN")
    if [ "$api_ip" = "$SERVER_IP" ]; then
        print_success "api.$DOMAIN -> $SERVER_IP (correct)"
    else
        print_warn "api.$DOMAIN -> ${api_ip:-NOT FOUND} (should be $SERVER_IP)"
        dns_ok=false
    fi

    # Check LiveKit subdomain
    local livekit_ip=$(resolve_dns "livekit.$DOMAIN")
    if [ "$livekit_ip" = "$SERVER_IP" ]; then
        print_success "livekit.$DOMAIN -> $SERVER_IP (correct)"
    else
        print_warn "livekit.$DOMAIN -> ${livekit_ip:-NOT FOUND} (should be $SERVER_IP)"
        dns_ok=false
    fi

    # Check Files subdomain (SeaweedFS)
    local files_ip=$(resolve_dns "files.$DOMAIN")
    if [ "$files_ip" = "$SERVER_IP" ]; then
        print_success "files.$DOMAIN -> $SERVER_IP (correct)"
    else
        print_warn "files.$DOMAIN -> ${files_ip:-NOT FOUND} (should be $SERVER_IP)"
        dns_ok=false
    fi

    # Check Traefik subdomain (optional admin dashboard)
    local traefik_ip=$(resolve_dns "traefik.$DOMAIN")
    if [ "$traefik_ip" = "$SERVER_IP" ]; then
        print_success "traefik.$DOMAIN -> $SERVER_IP (correct)"
    else
        print_info "traefik.$DOMAIN -> ${traefik_ip:-NOT FOUND} (optional - for admin dashboard)"
    fi

    # Check EMQX subdomain (optional admin dashboard)
    local emqx_ip=$(resolve_dns "emqx.$DOMAIN")
    if [ "$emqx_ip" = "$SERVER_IP" ]; then
        print_success "emqx.$DOMAIN -> $SERVER_IP (correct)"
    else
        print_info "emqx.$DOMAIN -> ${emqx_ip:-NOT FOUND} (optional - for MQTT admin dashboard)"
    fi

    if [ "$dns_ok" = false ]; then
        echo ""
        echo -e "${YELLOW}  ⚠ Some DNS records are not configured correctly.${NC}"
        echo ""
        echo -e "${WHITE}  The installation will continue, but SSL certificates may fail${NC}"
        echo -e "${WHITE}  if DNS is not properly configured.${NC}"
        echo ""
        echo -e "${WHITE}  DNS changes can take 5-30 minutes to propagate.${NC}"
        echo ""
        read -p "  Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${CYAN}  Please configure your DNS and run this script again.${NC}"
            exit 0
        fi
    fi
}

# =============================================================================
# ENVIRONMENT CONFIGURATION
# =============================================================================

create_environment() {
    print_header "Step 4/7: Creating Configuration"

    print_info "Generating secure secrets..."
    local jwt_secret=$(generate_secret)
    local turn_secret=$(generate_secret)
    local livekit_key=$(openssl rand -hex 16 2>/dev/null || echo "faithflow-key")
    local livekit_secret=$(openssl rand -hex 32 2>/dev/null || echo "faithflow-secret-$(date +%s)")

    print_info "Creating environment configuration file..."

    cat > "$SCRIPT_DIR/.env" << EOF
# =============================================================================
# FaithFlow Configuration
# =============================================================================
# Generated: $(date)
# DO NOT share this file - it contains secrets!
# =============================================================================

# Domain Configuration
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
SERVER_IP=$SERVER_IP

# Security (auto-generated - keep these secret!)
JWT_SECRET=$jwt_secret

# Voice/Video Calling (LiveKit)
LIVEKIT_API_KEY=$livekit_key
LIVEKIT_API_SECRET=$livekit_secret
TURN_SECRET=$turn_secret

# Traefik Dashboard (default: admin/admin - CHANGE THIS!)
TRAEFIK_DASHBOARD_AUTH=admin:\$\$apr1\$\$ruca84Hq\$\$mbjdMZBAG.KWn7vfN/SNK/

# EMQX Dashboard
EMQX_DASHBOARD_USER=admin
EMQX_DASHBOARD_PASSWORD=faithflow123

# Internal Configuration (don't change)
COMPOSE_PROJECT_NAME=faithflow
MONGO_URL=mongodb://mongodb:27017
DB_NAME=faithflow
EOF

    # Add external Traefik configuration if using external Traefik
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        cat >> "$SCRIPT_DIR/.env" << EOF

# External Traefik Configuration
# FaithFlow will connect to your existing Traefik instead of creating its own
EXTERNAL_TRAEFIK_NETWORK=$EXTERNAL_TRAEFIK_NETWORK
EOF
        print_success "External Traefik network configured: $EXTERNAL_TRAEFIK_NETWORK"
    fi

    print_success "Environment file created: $SCRIPT_DIR/.env"

    # Update LiveKit configuration with server IP
    print_info "Configuring LiveKit for your server..."

    mkdir -p "$SCRIPT_DIR/docker/livekit"

    cat > "$SCRIPT_DIR/docker/livekit/livekit.yaml" << EOF
# LiveKit Server Configuration
# Generated for: $DOMAIN

port: 7880
log_level: info

keys:
  $livekit_key: $livekit_secret

rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
EOF

    # Add node_ip if we have a server IP
    if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "127.0.0.1" ]; then
        echo "  node_ip: $SERVER_IP" >> "$SCRIPT_DIR/docker/livekit/livekit.yaml"
    fi

    cat >> "$SCRIPT_DIR/docker/livekit/livekit.yaml" << 'EOF'

turn:
  enabled: false

room:
  auto_create: true
  empty_timeout: 300
  max_participants: 100

limit:
  num_tracks: 10
EOF

    print_success "LiveKit configuration created"

    # Update TURN server configuration
    print_info "Configuring TURN server..."

    cat > "$SCRIPT_DIR/docker/livekit/turnserver.conf" << EOF
# coTURN Configuration
# Generated for: $DOMAIN

listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
min-port=49152
max-port=49200

realm=$DOMAIN
static-auth-secret=$turn_secret

lt-cred-mech
fingerprint
no-tlsv1
no-tlsv1_1

relay-threads=4
max-allocate-lifetime=3600
channel-lifetime=600
permission-lifetime=300

log-file=stdout
mobility
max-bps=3000000
EOF

    if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "127.0.0.1" ]; then
        echo "external-ip=$SERVER_IP" >> "$SCRIPT_DIR/docker/livekit/turnserver.conf"
    fi

    print_success "TURN server configuration created"
}

# =============================================================================
# BUILD AND START SERVICES
# =============================================================================

build_and_start() {
    print_header "Step 5/7: Building and Starting Services"

    cd "$SCRIPT_DIR"

    # Determine compose files based on configuration
    local COMPOSE_CMD="docker compose -f docker-compose.prod.yml"
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        COMPOSE_CMD="docker compose -f docker-compose.prod.yml -f docker-compose.external-traefik.yml"
        print_info "Using external Traefik configuration"
    fi

    print_info "Pulling Docker images (this may take a few minutes)..."
    $COMPOSE_CMD pull >> "$LOG_FILE" 2>&1 || true

    print_info "Building custom images..."

    # Build backend
    echo -e "${GRAY}    Building backend (FastAPI)...${NC}"
    if ! $COMPOSE_CMD build backend >> "$LOG_FILE" 2>&1; then
        print_error "Backend build failed. Check log: $LOG_FILE"
        echo -e "${YELLOW}  Last 20 lines of build log:${NC}"
        tail -20 "$LOG_FILE"
        exit 1
    fi
    print_success "Backend image built"

    # Build frontend with progress indicator (can take 5-15 minutes on small VPS)
    echo -e "${GRAY}    Building frontend (React)...${NC}"
    echo -e "${YELLOW}    ⚠ This may take 5-15 minutes on first build. Please wait...${NC}"
    echo ""

    # Run build in background and show progress
    $COMPOSE_CMD build frontend >> "$LOG_FILE" 2>&1 &
    local build_pid=$!

    local start_time=$(date +%s)
    local spin_chars='|/-\\'
    local i=0

    # Wait for build with progress indicator (no timeout - let it complete)
    while kill -0 "$build_pid" 2>/dev/null; do
        local elapsed=$(($(date +%s) - start_time))
        local mins=$((elapsed / 60))
        local secs=$((elapsed % 60))
        local spin="${spin_chars:i++%4:1}"
        printf "\r    %s Building frontend... [%dm %02ds]   " "$spin" "$mins" "$secs"
        sleep 0.5
    done
    printf "\r\033[K"

    # Check if build succeeded
    wait "$build_pid"
    local build_status=$?

    if [ $build_status -ne 0 ]; then
        print_error "Frontend build failed after $(($(date +%s) - start_time)) seconds"
        echo ""
        echo -e "${YELLOW}  Last 30 lines of build log:${NC}"
        echo -e "${GRAY}  ─────────────────────────────────────────────────────────────────${NC}"
        tail -30 "$LOG_FILE" | while IFS= read -r line; do
            if echo "$line" | grep -qiE "(error|failed|cannot)"; then
                echo -e "${RED}    $line${NC}"
            else
                echo -e "${GRAY}    $line${NC}"
            fi
        done
        echo -e "${GRAY}  ─────────────────────────────────────────────────────────────────${NC}"
        echo ""
        echo -e "${YELLOW}  Common causes:${NC}"
        echo -e "${WHITE}    - Insufficient memory (need 2GB+ free for build)${NC}"
        echo -e "${WHITE}    - Disk space full${NC}"
        echo -e "${WHITE}    - Network issues downloading npm packages${NC}"
        echo ""
        echo -e "${CYAN}  Full log: cat $LOG_FILE${NC}"
        exit 1
    fi

    local total_time=$(($(date +%s) - start_time))
    print_success "Frontend image built (took $((total_time / 60))m $((total_time % 60))s)"

    print_success "All images built successfully"

    print_info "Starting all services..."
    $COMPOSE_CMD up -d >> "$LOG_FILE" 2>&1

    print_success "Services started"

    # Wait for services to be healthy
    print_info "Waiting for services to initialize (60 seconds)..."
    echo ""

    # When using external Traefik, don't wait for Traefik service
    local services
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        services=("mongodb" "backend" "frontend")
    else
        services=("mongodb" "backend" "frontend" "traefik")
    fi
    local total=${#services[@]}
    local healthy=0

    for i in {1..60}; do
        healthy=0
        for service in "${services[@]}"; do
            if $COMPOSE_CMD ps "$service" 2>/dev/null | grep -q "healthy\|running"; then
                ((healthy++))
            fi
        done

        # Progress bar
        local pct=$((i * 100 / 60))
        local filled=$((i * 40 / 60))
        local empty=$((40 - filled))
        printf "\r  ${CYAN}[%${filled}s%${empty}s]${NC} %3d%% - Services ready: %d/%d" \
            "$(printf '#%.0s' $(seq 1 $filled 2>/dev/null) || echo "")" \
            "$(printf '-%.0s' $(seq 1 $empty 2>/dev/null) || echo "")" \
            "$pct" "$healthy" "$total"

        if [ "$healthy" -eq "$total" ]; then
            break
        fi

        sleep 1
    done
    echo ""

    if [ "$healthy" -eq "$total" ]; then
        print_success "All core services are running"
    else
        print_warn "Some services may still be starting up"
    fi
}

# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

initialize_database() {
    print_header "Step 6/7: Initializing Database"

    cd "$SCRIPT_DIR"

    # Determine compose files based on configuration
    local COMPOSE_CMD="docker compose -f docker-compose.prod.yml"
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        COMPOSE_CMD="docker compose -f docker-compose.prod.yml -f docker-compose.external-traefik.yml"
    fi

    print_info "Waiting for MongoDB to be ready..."
    sleep 5

    print_info "Creating database indexes and default admin account..."

    # Run init script in backend container
    if $COMPOSE_CMD exec -T backend python scripts/init_db.py >> "$LOG_FILE" 2>&1; then
        print_success "Database initialized successfully"
    else
        print_warn "Database initialization script not found or had issues"
        print_info "You can initialize later via the admin panel"
    fi
}

# =============================================================================
# FIREWALL CONFIGURATION
# =============================================================================

configure_firewall() {
    print_header "Step 7/7: Configuring Firewall"

    if command_exists ufw; then
        print_info "Configuring UFW firewall..."

        ufw allow 22/tcp >> "$LOG_FILE" 2>&1 || true    # SSH
        ufw allow 80/tcp >> "$LOG_FILE" 2>&1 || true    # HTTP
        ufw allow 443/tcp >> "$LOG_FILE" 2>&1 || true   # HTTPS
        ufw allow 3478/udp >> "$LOG_FILE" 2>&1 || true  # STUN/TURN
        ufw allow 3478/tcp >> "$LOG_FILE" 2>&1 || true  # STUN/TURN
        ufw allow 5349/tcp >> "$LOG_FILE" 2>&1 || true  # STUN/TURN TLS
        ufw allow 5349/udp >> "$LOG_FILE" 2>&1 || true  # STUN/TURN TLS
        ufw allow 7881/tcp >> "$LOG_FILE" 2>&1 || true  # LiveKit TCP
        ufw allow 50000:50100/udp >> "$LOG_FILE" 2>&1 || true  # WebRTC UDP
        ufw allow 49152:49200/udp >> "$LOG_FILE" 2>&1 || true  # TURN relay

        print_success "Firewall rules added"
        print_detail "Allowed: SSH(22), HTTP(80), HTTPS(443), TURN(3478,5349), LiveKit(7881,50000-50100)"
    else
        print_info "UFW not installed, skipping firewall configuration"
        print_detail "Make sure ports 80, 443, 3478, 5349, 7881, 50000-50100 are open"
    fi
}

# =============================================================================
# COMPLETION SCREEN
# =============================================================================

show_completion() {
    local elapsed=$SECONDS
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))

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

    echo -e "  ${GRAY}Installation time: ${WHITE}${minutes}m ${seconds}s${NC}"
    echo ""

    echo -e "${CYAN}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}  │  ${WHITE}Access Your Application${CYAN}                                          │${NC}"
    echo -e "${CYAN}  ├─────────────────────────────────────────────────────────────────────┤${NC}"

    if [ "$DEV_MODE" = true ]; then
        echo -e "${CYAN}  │  ${WHITE}Frontend:${NC}   http://localhost:3000${CYAN}                              │${NC}"
        echo -e "${CYAN}  │  ${WHITE}Backend:${NC}    http://localhost:8000${CYAN}                              │${NC}"
        echo -e "${CYAN}  │  ${WHITE}API Docs:${NC}   http://localhost:8000/docs${CYAN}                         │${NC}"
    else
        echo -e "${CYAN}  │  ${WHITE}Web App:${NC}    https://$DOMAIN${CYAN}"
        echo -e "${CYAN}  │  ${WHITE}API:${NC}        https://api.$DOMAIN${CYAN}"
        echo -e "${CYAN}  │  ${WHITE}API Docs:${NC}   https://api.$DOMAIN/docs${CYAN}"
        echo -e "${CYAN}  │  ${WHITE}Files:${NC}      https://files.$DOMAIN${CYAN}"
        if [ "$EXTERNAL_TRAEFIK" != true ]; then
            echo -e "${CYAN}  │  ${WHITE}Traefik:${NC}    https://traefik.$DOMAIN (admin)${CYAN}"
        fi
        echo -e "${CYAN}  │  ${WHITE}EMQX:${NC}       https://emqx.$DOMAIN (admin)${CYAN}"
    fi

    echo -e "${CYAN}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ${WHITE}Default Admin Login${YELLOW}                                              │${NC}"
    echo -e "${YELLOW}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${YELLOW}  │  ${CYAN}Email:${NC}    admin@gkbjtamankencana.org${YELLOW}                          │${NC}"
    echo -e "${YELLOW}  │  ${CYAN}Password:${NC} admin123${YELLOW}                                            │${NC}"
    echo -e "${YELLOW}  │                                                                     │${NC}"
    echo -e "${YELLOW}  │  ${RED}⚠ IMPORTANT: Change this password after first login!${YELLOW}           │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${BLUE}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}  │  ${WHITE}Useful Commands${BLUE}                                                   │${NC}"
    echo -e "${BLUE}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        local COMPOSE_FILES="-f docker-compose.prod.yml -f docker-compose.external-traefik.yml"
        echo -e "${BLUE}  │  ${CYAN}View logs:${NC}    docker compose $COMPOSE_FILES logs -f${BLUE}"
        echo -e "${BLUE}  │  ${CYAN}Check status:${NC} docker compose $COMPOSE_FILES ps${BLUE}"
        echo -e "${BLUE}  │  ${CYAN}Stop all:${NC}     docker compose $COMPOSE_FILES down${BLUE}"
        echo -e "${BLUE}  │  ${CYAN}Restart:${NC}      docker compose $COMPOSE_FILES restart${BLUE}"
        echo -e "${BLUE}  │  ${CYAN}Update:${NC}       ./docker-update.sh --external-traefik${BLUE}"
    else
        echo -e "${BLUE}  │  ${CYAN}View logs:${NC}      docker compose -f docker-compose.prod.yml logs -f${BLUE}│${NC}"
        echo -e "${BLUE}  │  ${CYAN}Check status:${NC}   docker compose -f docker-compose.prod.yml ps${BLUE}     │${NC}"
        echo -e "${BLUE}  │  ${CYAN}Stop all:${NC}       docker compose -f docker-compose.prod.yml down${BLUE}   │${NC}"
        echo -e "${BLUE}  │  ${CYAN}Restart:${NC}        docker compose -f docker-compose.prod.yml restart${BLUE}│${NC}"
        echo -e "${BLUE}  │  ${CYAN}Update:${NC}         ./docker-update.sh${BLUE}                              │${NC}"
    fi
    echo -e "${BLUE}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    if [ "$EXTERNAL_TRAEFIK" = true ]; then
        echo -e "${GREEN}  Using external Traefik:${NC} $EXTERNAL_TRAEFIK_NETWORK"
        echo -e "${GRAY}  SSL certificates are managed by your existing Traefik instance.${NC}"
        echo ""
    elif [ "$DEV_MODE" = false ]; then
        echo -e "${YELLOW}  Note: SSL certificates are being generated. If you see certificate${NC}"
        echo -e "${YELLOW}  errors, wait 2-3 minutes for Let's Encrypt to complete.${NC}"
        echo ""
    fi

    echo -e "${GREEN}  🙏 Thank you for choosing FaithFlow!${NC}"
    echo -e "${GREEN}  ❤️  May this system bless your church ministry.${NC}"
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
            --external-traefik)
                EXTERNAL_TRAEFIK=true
                shift
                # Check for optional network name
                if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
                    EXTERNAL_TRAEFIK_NETWORK="$1"
                    shift
                fi
                ;;
            --help|-h)
                echo "FaithFlow Docker Installer v$SCRIPT_VERSION"
                echo ""
                echo "Usage: sudo ./docker-install.sh [options]"
                echo ""
                echo "Options:"
                echo "  --dev, --development        Install in development mode (localhost, no SSL)"
                echo "  --external-traefik [NET]    Use existing Traefik instance instead of creating new one"
                echo "                              Optional: specify your Traefik network name"
                echo "                              Example: --external-traefik traefik_default"
                echo "  --help, -h                  Show this help message"
                echo ""
                echo "External Traefik Setup:"
                echo "  If you already have Traefik running (e.g., for another project), you can"
                echo "  share it with FaithFlow instead of running a separate Traefik instance."
                echo ""
                echo "  1. Find your Traefik network:  docker network ls | grep traefik"
                echo "  2. Run installer with:         sudo ./docker-install.sh --external-traefik traefik_default"
                echo ""
                echo "  Common Traefik network names: traefik_default, traefik-network, proxy, web"
                echo ""
                echo "Requirements:"
                echo "  - Linux server (Ubuntu 22.04+ or Debian 12+ recommended)"
                echo "  - Minimum 2GB RAM"
                echo "  - Minimum 20GB disk space"
                echo "  - Root/sudo access"
                echo "  - Domain name with DNS pointing to your server"
                echo ""
                echo "DNS records needed (replace yourdomain.com with your domain):"
                echo "  Required:"
                echo "    yourdomain.com         -> Your server IP"
                echo "    api.yourdomain.com     -> Your server IP"
                echo "    livekit.yourdomain.com -> Your server IP"
                echo "    files.yourdomain.com   -> Your server IP"
                echo "  Optional (admin dashboards):"
                echo "    traefik.yourdomain.com -> Your server IP  (not needed with --external-traefik)"
                echo "    emqx.yourdomain.com    -> Your server IP"
                echo ""
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    SECONDS=0
    parse_args "$@"

    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"

    log "=========================================="
    log "FaithFlow Docker Installation started"
    log "Version: $SCRIPT_VERSION"
    log "=========================================="

    show_welcome
    check_prerequisites
    install_docker
    configure_external_traefik    # Only runs if --external-traefik is set
    configure_domain
    create_environment
    build_and_start
    initialize_database
    configure_firewall
    show_completion

    log "Installation completed successfully"
}

main "$@"
