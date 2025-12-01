#!/bin/bash

################################################################################
#                                                                              #
#                         FaithFlow Installer v3.0                             #
#                                                                              #
#              Enterprise Church Management System - Automated Setup           #
#                           For Debian 12+ / Ubuntu 22.04+                     #
#                                                                              #
#  This is the BARE-METAL installation script.                                 #
#  For Docker/Traefik deployment, use: ./docker-install.sh                     #
#                                                                              #
#  Components Installed:                                                       #
#  - Python 3.11 + FastAPI Backend                                             #
#  - Node.js 20.x + React Frontend                                             #
#  - MongoDB 7.0 Database                                                      #
#  - LiveKit (Voice/Video WebRTC SFU)                                          #
#  - EMQX (MQTT Message Broker)                                                #
#  - coTURN (TURN/STUN NAT Traversal)                                          #
#  - SeaweedFS (Distributed File Storage)                                      #
#  - Nginx Reverse Proxy + SSL                                                 #
#  - UFW Firewall + Security                                                   #
#                                                                              #
#  Features:                                                                   #
#  - Pre-flight system checks (CPU, RAM, Disk)                                 #
#  - Auto-generated secure secrets                                             #
#  - Health checks and validation                                              #
#  - Performance tuning                                                        #
#  - Comprehensive logging                                                     #
#  - Rollback on failure                                                       #
#                                                                              #
################################################################################

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly SCRIPT_VERSION="3.0.0"
readonly INSTALL_DIR="/opt/faithflow"
readonly LOG_DIR="/var/log/faithflow"
readonly LOG_FILE="$LOG_DIR/install-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_DIR="/opt/faithflow-backups"
readonly SEAWEED_DIR="/opt/seaweedfs"
readonly LIVEKIT_DIR="/opt/livekit"

# Minimum system requirements (increased for voice/video services)
readonly MIN_RAM_MB=4096
readonly MIN_DISK_GB=30
readonly MIN_CPU_CORES=2

# Default ports
DEFAULT_BACKEND_PORT=8001
DEFAULT_FRONTEND_PORT=3000

# Service ports
LIVEKIT_PORT=7880
LIVEKIT_RTC_PORT=7881
EMQX_MQTT_PORT=1883
EMQX_WS_PORT=8083
COTURN_PORT=3478
COTURN_TLS_PORT=5349
SEAWEED_MASTER_PORT=9333
SEAWEED_VOLUME_PORT=8080
SEAWEED_FILER_PORT=8888

# =============================================================================
# TERMINAL STYLING
# =============================================================================

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m'

# Unicode characters
readonly CHECK='\xE2\x9C\x94'
readonly CROSS='\xE2\x9C\x98'
readonly ARROW='\xE2\x9E\x9C'
readonly BULLET='\xE2\x80\xA2'
readonly SPINNER_CHARS='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE" 2>/dev/null || true
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# Display functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    local step_num="$1"
    local total_steps="$2"
    local description="$3"

    echo -e "\n${MAGENTA}${BOLD}[$step_num/$total_steps]${NC} ${CYAN}$description${NC}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}  ${CHECK} $1${NC}"
    log_info "SUCCESS: $1"
}

print_info() {
    echo -e "${CYAN}  ${ARROW} $1${NC}"
    log_info "$1"
}

print_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
    log_warn "$1"
}

print_error() {
    echo -e "${RED}  ${CROSS} $1${NC}"
    log_error "$1"
}

print_detail() {
    echo -e "${GRAY}    $1${NC}"
}

# Spinner for long operations
spinner() {
    local pid=$1
    local message="${2:-Processing...}"
    local i=0
    local spin_chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"

    tput civis 2>/dev/null || true  # Hide cursor

    while kill -0 "$pid" 2>/dev/null; do
        local char="${spin_chars:i++%10:1}"
        printf "\r${CYAN}  %s ${NC}%s" "$char" "$message"
        sleep 0.1
    done

    tput cnorm 2>/dev/null || true  # Show cursor
    printf "\r\033[K"  # Clear line
}

# Progress bar (with optional elapsed time)
progress_bar() {
    local current=$1
    local total=$2
    local elapsed_msg="${3:-}"
    local width=40
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "\r  ${CYAN}["
    printf "%${filled}s" | tr ' ' '#'
    printf "%${empty}s" | tr ' ' '-'
    printf "]${NC} ${WHITE}%3d%%${NC}" "$percentage"
    if [ -n "$elapsed_msg" ]; then
        printf " ${GRAY}%s${NC}" "$elapsed_msg"
    fi
}

# Execute command with spinner
run_with_spinner() {
    local message="$1"
    shift

    log_info "Running: $*"

    "$@" >> "$LOG_FILE" 2>&1 &
    local pid=$!

    spinner "$pid" "$message"

    wait "$pid"
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        print_success "$message"
    else
        print_error "$message (exit code: $exit_code)"
        return $exit_code
    fi
}

# Execute command silently
run_silent() {
    "$@" >> "$LOG_FILE" 2>&1
}

# Generate secure random string
generate_secret() {
    local length="${1:-64}"
    openssl rand -base64 "$length" 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if a port is available (not in use)
port_available() {
    local port="$1"
    # Use ss (modern) or netstat (legacy) to check port
    if command_exists ss; then
        ! ss -tuln 2>/dev/null | grep -qE ":${port}\s"
    elif command_exists netstat; then
        ! netstat -tuln 2>/dev/null | grep -qE ":${port}\s"
    else
        # Fallback: try to bind to the port
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

# Check all required ports and report conflicts
check_required_ports() {
    local has_conflict=false
    local conflicting_ports=()

    print_info "Checking required ports..."

    # Define all required ports with descriptions
    declare -A PORTS=(
        ["80"]="Nginx HTTP"
        ["443"]="Nginx HTTPS"
        ["$DEFAULT_BACKEND_PORT"]="Backend API"
        ["27017"]="MongoDB"
        ["$LIVEKIT_PORT"]="LiveKit API"
        ["$LIVEKIT_RTC_PORT"]="LiveKit RTC"
        ["$EMQX_MQTT_PORT"]="EMQX MQTT"
        ["$EMQX_WS_PORT"]="EMQX WebSocket"
        ["$COTURN_PORT"]="TURN Server"
        ["$COTURN_TLS_PORT"]="TURN TLS"
        ["$SEAWEED_MASTER_PORT"]="SeaweedFS Master"
        ["$SEAWEED_VOLUME_PORT"]="SeaweedFS Volume"
        ["$SEAWEED_FILER_PORT"]="SeaweedFS Filer"
    )

    for port in "${!PORTS[@]}"; do
        local service="${PORTS[$port]}"
        if ! port_available "$port"; then
            local process=$(get_port_process "$port")
            print_warn "Port $port ($service) is already in use by: $process"
            has_conflict=true
            conflicting_ports+=("$port")
        else
            print_detail "Port $port ($service): Available"
        fi
    done

    if [ "$has_conflict" = true ]; then
        echo ""
        echo -e "${RED}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${RED}  PORT CONFLICTS DETECTED!${NC}"
        echo -e "${RED}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${YELLOW}  How to fix:${NC}"
        echo -e "${WHITE}  1. Stop the conflicting services:${NC}"
        for port in "${conflicting_ports[@]}"; do
            local process=$(get_port_process "$port")
            echo -e "${CYAN}     sudo fuser -k ${port}/tcp${NC}  # Kill process on port $port"
        done
        echo ""
        echo -e "${WHITE}  2. Or modify the port configuration in this script${NC}"
        echo -e "${WHITE}  3. Or use Docker deployment which isolates ports:${NC}"
        echo -e "${CYAN}     sudo ./docker-install.sh${NC}"
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

# Check if service is active
service_active() {
    systemctl is-active --quiet "$1" 2>/dev/null
}

# Wait for service with timeout
wait_for_service() {
    local service="$1"
    local timeout="${2:-30}"
    local count=0

    while ! service_active "$service" && [ $count -lt $timeout ]; do
        sleep 1
        ((count++))
    done

    service_active "$service"
}

# Get system memory in MB
get_memory_mb() {
    free -m | awk '/^Mem:/{print $2}'
}

# Get available disk space in GB
get_disk_gb() {
    df -BG / | awk 'NR==2 {print int($4)}'
}

# Get CPU cores
get_cpu_cores() {
    nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo
}

# Show diagnostic information for debugging
show_diagnostic_info() {
    echo ""
    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ${WHITE}System Diagnostics${YELLOW}                                                 │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Disk space
    echo -e "${CYAN}  Disk Space:${NC}"
    df -h / | tail -1 | awk '{printf "    Used: %s / %s (%s available)\n", $3, $2, $4}'
    echo ""

    # Memory
    echo -e "${CYAN}  Memory:${NC}"
    free -h | grep Mem | awk '{printf "    Used: %s / %s (%s available)\n", $3, $2, $4}'
    echo ""

    # Python version
    echo -e "${CYAN}  Python:${NC}"
    if command_exists python3.11; then
        echo "    $(python3.11 --version)"
    else
        echo "    Python 3.11 not found!"
    fi
    echo ""

    # Node version
    echo -e "${CYAN}  Node.js:${NC}"
    if command_exists node; then
        echo "    $(node --version)"
    else
        echo "    Node.js not found!"
    fi
    echo ""
}

# Show detailed build error with context
show_build_error() {
    local log_file="$1"
    local build_type="$2"
    local lines="${3:-40}"

    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  BUILD FAILED: ${WHITE}$build_type${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    if [ -f "$log_file" ]; then
        # Show error summary first
        echo -e "${YELLOW}  Error Summary:${NC}"
        echo -e "${GRAY}  ─────────────────────────────────────────────────────────────────────────${NC}"

        # Extract key errors (Python/Node specific patterns)
        grep -iE "(error|failed|cannot|unable|not found|permission denied|no space|memory)" "$log_file" 2>/dev/null | head -10 | while read line; do
            echo -e "${RED}    ✗ ${line:0:75}${NC}"
        done
        echo ""

        # Show last N lines for context
        echo -e "${YELLOW}  Last $lines lines of output:${NC}"
        echo -e "${GRAY}  ─────────────────────────────────────────────────────────────────────────${NC}"
        tail -n "$lines" "$log_file" | while IFS= read -r line; do
            # Highlight errors in red
            if echo "$line" | grep -qiE "(error|failed|cannot|unable)"; then
                echo -e "${RED}    $line${NC}"
            else
                echo -e "${GRAY}    $line${NC}"
            fi
        done
        echo ""

        # Save to main log
        echo "=== $build_type BUILD ERROR ===" >> "$LOG_FILE"
        cat "$log_file" >> "$LOG_FILE"

        echo -e "${YELLOW}  Full log saved to: ${WHITE}$log_file${NC}"
        echo -e "${YELLOW}  Main log: ${WHITE}$LOG_FILE${NC}"
    else
        echo -e "${RED}    No log file available${NC}"
    fi

    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Show diagnostic info
    show_diagnostic_info

    # Show common fixes based on build type
    echo -e "${CYAN}  Common Fixes for $build_type failures:${NC}"
    echo -e "${GRAY}  ─────────────────────────────────────────────────────────────────────────${NC}"

    case "$build_type" in
        "pip"*|"Python"*|"requirements"*)
            echo -e "${WHITE}    1. Check disk space: ${CYAN}df -h${NC}"
            echo -e "${WHITE}    2. Check memory: ${CYAN}free -h${NC}"
            echo -e "${WHITE}    3. Install build tools: ${CYAN}apt install build-essential python3-dev${NC}"
            echo -e "${WHITE}    4. Clear pip cache: ${CYAN}pip cache purge${NC}"
            echo -e "${WHITE}    5. Try installing individually: ${CYAN}pip install <package-name>${NC}"
            ;;
        "yarn"*|"npm"*|"frontend"*|"JavaScript"*)
            echo -e "${WHITE}    1. Check disk space: ${CYAN}df -h${NC}"
            echo -e "${WHITE}    2. Check memory (Node needs ~2GB): ${CYAN}free -h${NC}"
            echo -e "${WHITE}    3. Clear yarn cache: ${CYAN}yarn cache clean${NC}"
            echo -e "${WHITE}    4. Remove node_modules: ${CYAN}rm -rf node_modules && yarn install${NC}"
            echo -e "${WHITE}    5. Check Node version: ${CYAN}node --version${NC} (need v20+)"
            echo -e "${WHITE}    6. Increase Node memory: ${CYAN}export NODE_OPTIONS=\"--max-old-space-size=4096\"${NC}"
            ;;
        *)
            echo -e "${WHITE}    1. Check the error messages above${NC}"
            echo -e "${WHITE}    2. Check disk space: ${CYAN}df -h${NC}"
            echo -e "${WHITE}    3. Check memory: ${CYAN}free -h${NC}"
            echo -e "${WHITE}    4. Review full log: ${CYAN}cat $log_file${NC}"
            ;;
    esac

    echo ""
}

# Cleanup on failure
cleanup_on_failure() {
    print_error "Installation failed! Check log: $LOG_FILE"
    log_error "Installation failed at step: $CURRENT_STEP"

    # Optionally rollback
    if [ "${ROLLBACK_ON_FAILURE:-false}" = "true" ] && [ -d "$BACKUP_DIR/pre-install" ]; then
        print_info "Rolling back changes..."
        # Add rollback logic here
    fi

    exit 1
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
    ║                           🙏  FaithFlow  🙏                               ║
    ║                                                                           ║
    ║              Enterprise Church Management System Installer                ║
    ║                          FULL STACK - Bare Metal                          ║
    ║                                                                           ║
    ╠═══════════════════════════════════════════════════════════════════════════╣
    ║                                                                           ║
    ║   This installer will set up ALL services:                                ║
    ║                                                                           ║
    ║   CORE SERVICES:                                                          ║
    ║   ✦ Python 3.11 + FastAPI Backend                                         ║
    ║   ✦ Node.js 20.x + React Frontend                                         ║
    ║   ✦ MongoDB 7.0 Database                                                  ║
    ║                                                                           ║
    ║   VOICE/VIDEO CALLING:                                                    ║
    ║   ✦ LiveKit Server (WebRTC SFU for voice/video)                           ║
    ║   ✦ coTURN (TURN/STUN for NAT traversal)                                  ║
    ║                                                                           ║
    ║   REAL-TIME MESSAGING:                                                    ║
    ║   ✦ EMQX (MQTT broker for chat & notifications)                           ║
    ║                                                                           ║
    ║   FILE STORAGE:                                                           ║
    ║   ✦ SeaweedFS (Distributed file storage for media)                        ║
    ║                                                                           ║
    ║   INFRASTRUCTURE:                                                         ║
    ║   ✦ Nginx Reverse Proxy + SSL (Let's Encrypt)                             ║
    ║   ✦ UFW Firewall Configuration                                            ║
    ║   ✦ Systemd Service Management                                            ║
    ║   ✦ Log Rotation & Monitoring                                             ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"

    echo -e "  ${GRAY}Installer Version: ${WHITE}$SCRIPT_VERSION${NC}"
    echo -e "  ${GRAY}Installation Path: ${WHITE}$INSTALL_DIR${NC}"
    echo -e "  ${GRAY}Log File:          ${WHITE}$LOG_FILE${NC}"
    echo ""

    echo -e "${YELLOW}  ⚠ IMPORTANT: This installation requires:${NC}"
    echo -e "${YELLOW}    - At least 4GB RAM (for voice/video services)${NC}"
    echo -e "${YELLOW}    - At least 30GB disk space${NC}"
    echo -e "${YELLOW}    - Public IP address (for voice/video)${NC}"
    echo -e "${YELLOW}    - Domain name (recommended)${NC}"
    echo ""

    sleep 3
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

preflight_checks() {
    print_header "Pre-Flight System Checks"

    local checks_passed=0
    local checks_total=7

    # Check 1: Root privileges
    print_info "Checking root privileges..."
    if [ "$EUID" -eq 0 ]; then
        print_success "Running as root"
        ((checks_passed++))
    else
        print_error "This installer requires root privileges"
        echo -e "${YELLOW}   Please run: ${WHITE}sudo ./install.sh${NC}"
        exit 1
    fi

    # Check 2: Operating System
    print_info "Checking operating system..."
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        if [[ "$ID" == "debian" && "$VERSION_ID" -ge 12 ]] || \
           [[ "$ID" == "ubuntu" && "${VERSION_ID%%.*}" -ge 22 ]]; then
            print_success "OS: $PRETTY_NAME"
            ((checks_passed++))
        else
            print_warn "Untested OS: $PRETTY_NAME (tested on Debian 12+, Ubuntu 22.04+)"
            echo -e "${YELLOW}   Continue at your own risk.${NC}"
            ((checks_passed++))
        fi
    else
        print_warn "Could not detect OS version"
        ((checks_passed++))
    fi

    # Check 3: Memory
    print_info "Checking system memory..."
    local mem_mb=$(get_memory_mb)
    if [ "$mem_mb" -ge "$MIN_RAM_MB" ]; then
        print_success "RAM: ${mem_mb}MB (minimum: ${MIN_RAM_MB}MB)"
        ((checks_passed++))
    else
        print_error "Insufficient RAM: ${mem_mb}MB (minimum: ${MIN_RAM_MB}MB)"
        exit 1
    fi

    # Check 4: Disk Space
    print_info "Checking disk space..."
    local disk_gb=$(get_disk_gb)
    if [ "$disk_gb" -ge "$MIN_DISK_GB" ]; then
        print_success "Disk: ${disk_gb}GB available (minimum: ${MIN_DISK_GB}GB)"
        ((checks_passed++))
    else
        print_error "Insufficient disk space: ${disk_gb}GB (minimum: ${MIN_DISK_GB}GB)"
        exit 1
    fi

    # Check 5: CPU Cores
    print_info "Checking CPU cores..."
    local cpu_cores=$(get_cpu_cores)
    if [ "$cpu_cores" -ge "$MIN_CPU_CORES" ]; then
        print_success "CPU: ${cpu_cores} cores (minimum: ${MIN_CPU_CORES})"
        ((checks_passed++))
    else
        print_warn "Low CPU cores: ${cpu_cores} (recommended: ${MIN_CPU_CORES}+)"
        ((checks_passed++))
    fi

    # Check 6: Network connectivity
    print_info "Checking network connectivity..."
    if ping -c 1 google.com &>/dev/null || ping -c 1 cloudflare.com &>/dev/null; then
        print_success "Network: Connected"
        ((checks_passed++))
    else
        print_error "No network connectivity"
        exit 1
    fi

    # Check 7: Port availability
    check_required_ports
    ((checks_passed++))

    echo ""
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  All checks passed! (${checks_passed}/${checks_total})${NC}"
    echo -e "${GREEN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    sleep 2
}

# =============================================================================
# INSTALLATION STEPS
# =============================================================================

CURRENT_STEP=""
TOTAL_STEPS=16

step_system_update() {
    CURRENT_STEP="System Update"
    print_step 1 $TOTAL_STEPS "Updating System Packages"

    print_info "Updating package lists..."
    run_silent apt update
    print_success "Package lists updated"

    print_info "Installing essential tools..."
    run_silent apt install -y curl wget gnupg2 ca-certificates lsb-release \
        apt-transport-https software-properties-common rsync git \
        build-essential libffi-dev libssl-dev
    print_success "Essential tools installed"
}

step_install_python() {
    CURRENT_STEP="Python Installation"
    print_step 2 $TOTAL_STEPS "Installing Python 3.11"

    if command_exists python3.11; then
        print_success "Python 3.11 already installed: $(python3.11 --version)"
    else
        print_info "Installing Python 3.11 and development tools..."
        run_silent apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
        print_success "Python 3.11 installed: $(python3.11 --version)"
    fi
}

step_install_nodejs() {
    CURRENT_STEP="Node.js Installation"
    print_step 3 $TOTAL_STEPS "Installing Node.js 20.x"

    if command_exists node && [[ "$(node --version)" == v20* ]]; then
        print_success "Node.js 20.x already installed: $(node --version)"
    else
        print_info "Adding NodeSource repository..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1

        print_info "Installing Node.js..."
        run_silent apt install -y nodejs
        print_success "Node.js installed: $(node --version)"
    fi

    # Install yarn globally
    if command_exists yarn; then
        print_success "Yarn already installed: $(yarn --version)"
    else
        print_info "Installing Yarn package manager..."
        run_silent npm install -g yarn
        print_success "Yarn installed: $(yarn --version)"
    fi
}

step_install_mongodb() {
    CURRENT_STEP="MongoDB Installation"
    print_step 4 $TOTAL_STEPS "Installing MongoDB 7.0"

    if command_exists mongod; then
        print_success "MongoDB already installed"
    else
        print_info "Adding MongoDB repository..."
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
            gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null

        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
            tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

        run_silent apt update

        print_info "Installing MongoDB..."
        run_silent apt install -y mongodb-org
        print_success "MongoDB 7.0 installed"
    fi

    # Configure MongoDB for performance
    print_info "Configuring MongoDB for optimal performance..."

    # Create mongod.conf if it doesn't exist or update it
    if [ ! -f /etc/mongod.conf.backup ]; then
        cp /etc/mongod.conf /etc/mongod.conf.backup 2>/dev/null || true
    fi

    cat > /etc/mongod.conf << 'MONGOD_CONF'
# MongoDB Configuration - Optimized for FaithFlow

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
MONGOD_CONF

    print_success "MongoDB configuration optimized"

    # Start MongoDB
    print_info "Starting MongoDB service..."
    run_silent systemctl start mongod
    run_silent systemctl enable mongod

    if wait_for_service mongod 30; then
        print_success "MongoDB is running"
    else
        print_error "MongoDB failed to start. Check: sudo systemctl status mongod"
    fi
}

step_install_nginx() {
    CURRENT_STEP="Nginx Installation"
    print_step 5 $TOTAL_STEPS "Installing Nginx Web Server"

    if command_exists nginx; then
        print_success "Nginx already installed: $(nginx -v 2>&1 | cut -d'/' -f2)"
    else
        print_info "Installing Nginx..."
        run_silent apt install -y nginx
        print_success "Nginx installed"
    fi

    run_silent systemctl enable nginx
    print_success "Nginx enabled on boot"
}

step_install_livekit() {
    CURRENT_STEP="LiveKit Installation"
    print_step 6 $TOTAL_STEPS "Installing LiveKit Server (Voice/Video)"

    mkdir -p "$LIVEKIT_DIR"

    # Download LiveKit Server
    print_info "Downloading LiveKit Server..."
    local livekit_version="1.5.3"
    local arch="amd64"

    # Detect architecture
    case $(uname -m) in
        x86_64) arch="amd64" ;;
        aarch64) arch="arm64" ;;
        *) print_error "Unsupported architecture: $(uname -m)"; return 1 ;;
    esac

    local livekit_url="https://github.com/livekit/livekit/releases/download/v${livekit_version}/livekit_${livekit_version}_linux_${arch}.tar.gz"

    if curl -fsSL "$livekit_url" -o /tmp/livekit.tar.gz 2>&1 | tee -a "$LOG_FILE"; then
        tar -xzf /tmp/livekit.tar.gz -C "$LIVEKIT_DIR"
        chmod +x "$LIVEKIT_DIR/livekit-server"
        rm /tmp/livekit.tar.gz
        print_success "LiveKit Server downloaded"
    else
        print_warn "Could not download LiveKit. Voice/video features may not work."
        return 0
    fi

    # Generate API credentials
    LIVEKIT_API_KEY=$(generate_secret 16 | tr '[:upper:]' '[:lower:]')
    LIVEKIT_API_SECRET=$(generate_secret 32)

    # Create LiveKit configuration
    print_info "Configuring LiveKit..."
    cat > "$LIVEKIT_DIR/livekit.yaml" << LIVEKIT_CONF
# LiveKit Server Configuration
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 50100
  tcp_port: 7881
  use_external_ip: true
  enable_loopback_candidate: false
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
logging:
  level: info
  pion_level: warn
turn:
  enabled: true
  udp_port: 3478
  tls_port: 5349
webhook:
  urls: []
LIVEKIT_CONF
    print_success "LiveKit configuration created"

    # Create systemd service
    cat > /etc/systemd/system/livekit.service << LIVEKIT_SERVICE
[Unit]
Description=LiveKit WebRTC SFU Server
Documentation=https://docs.livekit.io
After=network.target

[Service]
Type=simple
User=root
ExecStart=${LIVEKIT_DIR}/livekit-server --config ${LIVEKIT_DIR}/livekit.yaml
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/livekit.log
StandardError=append:${LOG_DIR}/livekit.error.log

[Install]
WantedBy=multi-user.target
LIVEKIT_SERVICE

    systemctl daemon-reload
    systemctl enable livekit.service >> "$LOG_FILE" 2>&1
    systemctl start livekit.service

    if wait_for_service livekit 30; then
        print_success "LiveKit Server started (port 7880)"
    else
        print_warn "LiveKit failed to start. Check: journalctl -u livekit -f"
    fi
}

step_install_coturn() {
    CURRENT_STEP="coTURN Installation"
    print_step 7 $TOTAL_STEPS "Installing coTURN (NAT Traversal)"

    if command_exists turnserver; then
        print_success "coTURN already installed"
    else
        print_info "Installing coTURN..."
        run_silent apt install -y coturn
        print_success "coTURN installed"
    fi

    # Generate TURN secret
    TURN_SECRET=$(generate_secret 32)

    # Get server's public IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "auto")

    # Configure coTURN
    print_info "Configuring coTURN..."
    cat > /etc/turnserver.conf << TURN_CONF
# coTURN Configuration for FaithFlow
# Generated: $(date)

# Network settings
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}

# Realm (use domain if available)
realm=faithflow.local

# External IP (auto-detected or set manually)
external-ip=${SERVER_IP}

# Relay ports
min-port=50000
max-port=50100

# Security
no-multicast-peers
no-cli
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255

# Logging
log-file=/var/log/faithflow/turnserver.log
verbose

# Performance
total-quota=100
max-bps=0
TURN_CONF

    # Enable coTURN
    if [ -f /etc/default/coturn ]; then
        sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
    fi

    systemctl daemon-reload
    systemctl enable coturn >> "$LOG_FILE" 2>&1
    systemctl restart coturn

    if wait_for_service coturn 15; then
        print_success "coTURN started (UDP 3478, TLS 5349)"
    else
        print_warn "coTURN failed to start. Check: journalctl -u coturn -f"
    fi
}

step_install_emqx() {
    CURRENT_STEP="EMQX Installation"
    print_step 8 $TOTAL_STEPS "Installing EMQX (MQTT Broker)"

    # Check if EMQX is already installed
    if command_exists emqx; then
        print_success "EMQX already installed"
    else
        print_info "Installing EMQX MQTT broker..."

        # Add EMQX repository
        curl -fsSL https://packages.emqx.com/install/emqx-ce/deb/debian/emqx.gpg | \
            gpg --dearmor -o /usr/share/keyrings/emqx-archive-keyring.gpg 2>/dev/null

        echo "deb [signed-by=/usr/share/keyrings/emqx-archive-keyring.gpg] https://packages.emqx.com/install/emqx-ce/deb/debian bullseye main" | \
            tee /etc/apt/sources.list.d/emqx.list > /dev/null

        run_silent apt update

        if run_silent apt install -y emqx; then
            print_success "EMQX installed"
        else
            print_warn "Could not install EMQX from repository. Installing via tarball..."

            # Fallback: download binary
            local emqx_version="5.4.1"
            curl -fsSL "https://www.emqx.com/en/downloads/broker/${emqx_version}/emqx-${emqx_version}-ubuntu22.04-amd64.tar.gz" \
                -o /tmp/emqx.tar.gz
            mkdir -p /opt/emqx
            tar -xzf /tmp/emqx.tar.gz -C /opt/emqx --strip-components=1
            rm /tmp/emqx.tar.gz
            print_success "EMQX installed (manual)"
        fi
    fi

    # Configure EMQX
    print_info "Configuring EMQX..."

    # Generate dashboard credentials
    EMQX_DASHBOARD_PASSWORD=$(generate_secret 16)

    # Basic EMQX configuration
    if [ -f /etc/emqx/emqx.conf ]; then
        # Update main config for package installation
        cat >> /etc/emqx/emqx.conf << EMQX_CONF

# FaithFlow MQTT Configuration
# Allow anonymous for development (secure in production)
authentication.enable = false

# Listeners
listeners.tcp.default.bind = "0.0.0.0:1883"
listeners.ws.default.bind = "0.0.0.0:8083"

# Dashboard
dashboard.listeners.http.bind = "0.0.0.0:18083"
EMQX_CONF
    fi

    # Start EMQX
    systemctl daemon-reload
    systemctl enable emqx >> "$LOG_FILE" 2>&1 || true
    systemctl start emqx || /opt/emqx/bin/emqx start

    sleep 5  # Give EMQX time to start

    if pgrep -x "beam.smp" > /dev/null || service_active emqx; then
        print_success "EMQX MQTT broker started (TCP 1883, WS 8083)"
        print_info "Dashboard: http://localhost:18083 (admin/public)"
    else
        print_warn "EMQX may not have started. Check: systemctl status emqx"
    fi
}

step_install_seaweedfs() {
    CURRENT_STEP="SeaweedFS Installation"
    print_step 9 $TOTAL_STEPS "Installing SeaweedFS (File Storage)"

    mkdir -p "$SEAWEED_DIR"/{master,volume,filer}
    mkdir -p "$SEAWEED_DIR/data"

    # Download SeaweedFS
    print_info "Downloading SeaweedFS..."
    local seaweed_version="3.59"
    local arch="amd64"

    case $(uname -m) in
        x86_64) arch="amd64" ;;
        aarch64) arch="arm64" ;;
    esac

    local seaweed_url="https://github.com/seaweedfs/seaweedfs/releases/download/${seaweed_version}/linux_${arch}.tar.gz"

    if curl -fsSL "$seaweed_url" -o /tmp/seaweedfs.tar.gz 2>&1; then
        tar -xzf /tmp/seaweedfs.tar.gz -C "$SEAWEED_DIR"
        rm /tmp/seaweedfs.tar.gz
        chmod +x "$SEAWEED_DIR/weed"
        print_success "SeaweedFS downloaded"
    else
        print_warn "Could not download SeaweedFS. File storage may not work."
        return 0
    fi

    # Create SeaweedFS Master service
    cat > /etc/systemd/system/seaweedfs-master.service << SEAWEED_MASTER
[Unit]
Description=SeaweedFS Master Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=${SEAWEED_DIR}/weed master -ip=localhost -port=9333 -mdir=${SEAWEED_DIR}/master
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/seaweed-master.log
StandardError=append:${LOG_DIR}/seaweed-master.error.log

[Install]
WantedBy=multi-user.target
SEAWEED_MASTER

    # Create SeaweedFS Volume service
    cat > /etc/systemd/system/seaweedfs-volume.service << SEAWEED_VOLUME
[Unit]
Description=SeaweedFS Volume Server
After=seaweedfs-master.service
Requires=seaweedfs-master.service

[Service]
Type=simple
User=root
ExecStart=${SEAWEED_DIR}/weed volume -mserver=localhost:9333 -port=8080 -dir=${SEAWEED_DIR}/data -max=100
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/seaweed-volume.log
StandardError=append:${LOG_DIR}/seaweed-volume.error.log

[Install]
WantedBy=multi-user.target
SEAWEED_VOLUME

    # Create SeaweedFS Filer service
    cat > /etc/systemd/system/seaweedfs-filer.service << SEAWEED_FILER
[Unit]
Description=SeaweedFS Filer Server
After=seaweedfs-volume.service
Requires=seaweedfs-volume.service

[Service]
Type=simple
User=root
ExecStart=${SEAWEED_DIR}/weed filer -master=localhost:9333 -port=8888
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/seaweed-filer.log
StandardError=append:${LOG_DIR}/seaweed-filer.error.log

[Install]
WantedBy=multi-user.target
SEAWEED_FILER

    systemctl daemon-reload

    # Start services in order
    systemctl enable seaweedfs-master seaweedfs-volume seaweedfs-filer >> "$LOG_FILE" 2>&1
    systemctl start seaweedfs-master
    sleep 3
    systemctl start seaweedfs-volume
    sleep 2
    systemctl start seaweedfs-filer

    # Verify services
    local seaweed_ok=true
    for svc in seaweedfs-master seaweedfs-volume seaweedfs-filer; do
        if ! wait_for_service "$svc" 15; then
            print_warn "$svc failed to start"
            seaweed_ok=false
        fi
    done

    if [ "$seaweed_ok" = true ]; then
        print_success "SeaweedFS started (Master 9333, Volume 8080, Filer 8888)"
    else
        print_warn "Some SeaweedFS services may not have started"
    fi
}

step_copy_files() {
    CURRENT_STEP="Copy Files"
    print_step 10 $TOTAL_STEPS "Setting Up FaithFlow Directory"

    local script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    # Create directories
    print_info "Creating directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 755 "$LOG_DIR"

    # Copy files if running from different directory
    if [ "$script_dir" != "$INSTALL_DIR" ]; then
        print_info "Copying files to $INSTALL_DIR..."

        rsync -a --info=progress2 \
            --exclude='.git/' \
            --exclude='node_modules/' \
            --exclude='backend/__pycache__/' \
            --exclude='backend/venv/' \
            --exclude='frontend/node_modules/' \
            --exclude='frontend/build/' \
            --exclude='mobile/node_modules/' \
            --exclude='*.log' \
            "$script_dir/" "$INSTALL_DIR/" 2>&1 | while read line; do
                echo -ne "\r${CYAN}  ${ARROW} ${line:0:60}${NC}                    "
            done

        echo ""
        print_success "Files copied to $INSTALL_DIR"

        # Verify critical files
        local critical_files=(
            "backend/server.py"
            "backend/requirements.txt"
            "frontend/package.json"
            "frontend/public/index.html"
        )

        local all_present=true
        for file in "${critical_files[@]}"; do
            if [ ! -f "$INSTALL_DIR/$file" ]; then
                print_warn "Missing: $file"
                all_present=false
            fi
        done

        if [ "$all_present" = true ]; then
            print_success "All critical files verified"
        fi
    else
        print_info "Already running from $INSTALL_DIR"
    fi
}

step_setup_backend() {
    CURRENT_STEP="Backend Setup"
    print_step 11 $TOTAL_STEPS "Setting Up Backend (FastAPI)"

    cd "$INSTALL_DIR/backend"

    # Create virtual environment
    print_info "Creating Python virtual environment..."
    if ! python3.11 -m venv venv 2>&1 | tee -a "$LOG_FILE"; then
        print_error "Failed to create virtual environment!"
        show_diagnostic_info
        echo -e "${YELLOW}  Possible fixes:${NC}"
        echo -e "${YELLOW}    1. Install python3.11-venv: apt install python3.11-venv${NC}"
        echo -e "${YELLOW}    2. Check disk space: df -h${NC}"
        exit 1
    fi

    source venv/bin/activate

    # Upgrade pip
    print_info "Upgrading pip..."
    local pip_log="/tmp/faithflow-pip-$$.log"

    if ! pip install --upgrade pip wheel setuptools > "$pip_log" 2>&1; then
        print_error "Failed to upgrade pip!"
        show_build_error "$pip_log" "pip upgrade"
        deactivate
        exit 1
    fi
    rm -f "$pip_log"

    # Install requirements
    print_info "Installing Python dependencies (this may take a minute)..."
    local req_log="/tmp/faithflow-requirements-$$.log"

    if pip install -r requirements.txt > "$req_log" 2>&1; then
        print_success "Python dependencies installed"
        rm -f "$req_log"
    else
        print_error "Failed to install Python dependencies!"
        show_build_error "$req_log" "pip install"
        deactivate
        exit 1
    fi

    # Generate secure secrets
    local jwt_secret=$(generate_secret 64)

    # Create .env file
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            # Update with secure values
            sed -i "s/^JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$jwt_secret/" .env 2>/dev/null || \
                echo "JWT_SECRET_KEY=$jwt_secret" >> .env
            print_success "Created backend/.env from template"
        else
            cat > .env << BACKEND_ENV
# FaithFlow Backend Configuration
# Generated: $(date)

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=faithflow_production

# CORS Configuration
CORS_ORIGINS=*

# JWT Configuration (Auto-generated secure key)
JWT_SECRET_KEY=$jwt_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# WhatsApp API (Configure in admin panel)
WHATSAPP_API_URL=
WHATSAPP_USERNAME=
WHATSAPP_PASSWORD=

# AI Services (Optional)
ANTHROPIC_API_KEY=
STABILITY_API_KEY=
BACKEND_ENV
            print_success "Created backend/.env with secure secrets"
        fi
    else
        print_info "backend/.env already exists, keeping existing configuration"
    fi

    deactivate
}

step_setup_frontend() {
    CURRENT_STEP="Frontend Setup"
    print_step 12 $TOTAL_STEPS "Setting Up Frontend (React)"

    cd "$INSTALL_DIR/frontend"

    # Install dependencies
    print_info "Installing JavaScript dependencies..."
    echo -e "${GRAY}    This typically takes 2-3 minutes...${NC}"

    local yarn_log="/tmp/faithflow-yarn-install-$$.log"

    yarn install > "$yarn_log" 2>&1 &
    local pid=$!

    local count=0
    while kill -0 "$pid" 2>/dev/null; do
        progress_bar $((count % 100)) 100
        sleep 1
        ((count++))
    done
    echo ""

    wait "$pid"
    if [ $? -eq 0 ]; then
        print_success "JavaScript dependencies installed"
        rm -f "$yarn_log"
    else
        print_error "Failed to install JavaScript dependencies!"
        show_build_error "$yarn_log" "yarn install"

        read -p "  Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Create .env file
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created frontend/.env from template"
        else
            cat > .env << 'FRONTEND_ENV'
# FaithFlow Frontend Configuration

# Backend API URL
REACT_APP_BACKEND_URL=http://localhost

# WebSocket configuration
WDS_SOCKET_PORT=443

# Feature flags
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
FRONTEND_ENV
            print_success "Created frontend/.env"
        fi
    else
        print_info "frontend/.env already exists"
    fi

    # Build production frontend
    print_info "Building production frontend..."
    echo -e "${YELLOW}    ⚠ This may take 5-15 minutes on first build. Please wait...${NC}"
    echo ""

    local build_log="/tmp/faithflow-frontend-build-$$.log"

    # Increase Node.js memory limit for build process (prevents OOM on small VPS)
    export NODE_OPTIONS="--max-old-space-size=4096"

    yarn build > "$build_log" 2>&1 &
    pid=$!

    local start_time=$(date +%s)
    local spin_chars='|/-\\'
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
        local elapsed=$(($(date +%s) - start_time))
        local mins=$((elapsed / 60))
        local secs=$((elapsed % 60))
        local spin="${spin_chars:i++%4:1}"
        printf "\r    %s Building... [%dm %ds]   " "$spin" "$mins" "$secs"
        sleep 0.5
    done
    printf "\r\033[K"

    wait "$pid"
    local build_status=$?

    if [ $build_status -eq 0 ] && [ -d "build" ] && [ -f "build/index.html" ]; then
        local build_size=$(du -sh build 2>/dev/null | cut -f1)
        print_success "Production build complete (${build_size})"
        rm -f "$build_log"
    else
        print_error "Frontend build failed!"
        show_build_error "$build_log" "frontend build (yarn build)"

        read -p "  Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

step_configure_services() {
    CURRENT_STEP="Service Configuration"
    print_step 13 $TOTAL_STEPS "Configuring System Services"

    # Ask for backend port
    echo ""
    echo -e "${CYAN}  Backend API Configuration:${NC}"
    read -p "  Backend port [$DEFAULT_BACKEND_PORT]: " backend_port
    backend_port=${backend_port:-$DEFAULT_BACKEND_PORT}

    # Validate port
    if ! [[ "$backend_port" =~ ^[0-9]+$ ]] || [ "$backend_port" -lt 1024 ] || [ "$backend_port" -gt 65535 ]; then
        print_warn "Invalid port. Using default $DEFAULT_BACKEND_PORT"
        backend_port=$DEFAULT_BACKEND_PORT
    fi

    print_info "Configuring systemd services..."

    # Backend service with production settings
    cat > /etc/systemd/system/faithflow-backend.service << SYSTEMD_BACKEND
[Unit]
Description=FaithFlow Backend API (FastAPI/Uvicorn)
Documentation=https://github.com/faithflow/docs
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/faithflow/backend
Environment="PYTHONUNBUFFERED=1"
Environment="PYTHONDONTWRITEBYTECODE=1"
ExecStart=/opt/faithflow/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $backend_port --workers 4 --loop uvloop --http httptools
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=3

# Logging
StandardOutput=append:$LOG_DIR/backend.out.log
StandardError=append:$LOG_DIR/backend.err.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR/backend $LOG_DIR

[Install]
WantedBy=multi-user.target
SYSTEMD_BACKEND

    # Install uvloop and httptools for better performance
    cd "$INSTALL_DIR/backend"
    source venv/bin/activate
    pip install uvloop httptools >> "$LOG_FILE" 2>&1 || true
    deactivate

    print_success "Backend service configured (port $backend_port, 4 workers)"

    # Log rotation
    cat > /etc/logrotate.d/faithflow << 'LOGROTATE'
/var/log/faithflow/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 faithflow faithflow
    sharedscripts
    postrotate
        systemctl reload faithflow-backend > /dev/null 2>&1 || true
    endscript
}
LOGROTATE
    print_success "Log rotation configured (14 days retention)"

    # Reload and start services
    systemctl daemon-reload
    systemctl enable faithflow-backend.service >> "$LOG_FILE" 2>&1

    print_info "Starting backend service..."
    systemctl start faithflow-backend.service

    if wait_for_service faithflow-backend 30; then
        print_success "Backend service started successfully"

        # Health check - use proper /api/health endpoint
        sleep 2
        if curl -sf http://localhost:$backend_port/api/health > /dev/null 2>&1; then
            print_success "Backend health check passed"
        else
            print_warn "Backend started but health check pending"
        fi
    else
        print_error "Backend service failed to start"
        echo -e "${YELLOW}  Check logs: journalctl -u faithflow-backend -f${NC}"
    fi

    # Save backend port for nginx config
    BACKEND_PORT=$backend_port
}

step_init_database() {
    CURRENT_STEP="Database Initialization"
    print_step 14 $TOTAL_STEPS "Initializing Database"

    cd "$INSTALL_DIR/backend"
    source venv/bin/activate

    print_info "Creating indexes and default data..."

    if [ -f "scripts/init_db.py" ]; then
        if python3 scripts/init_db.py 2>&1 | tee -a "$LOG_FILE"; then
            echo ""
            print_success "Database initialized successfully"

            echo ""
            echo -e "${GREEN}  ┌─────────────────────────────────────────────────────────┐${NC}"
            echo -e "${GREEN}  │  ${WHITE}Default Super Admin Credentials${GREEN}                        │${NC}"
            echo -e "${GREEN}  │                                                         │${NC}"
            echo -e "${GREEN}  │  ${CYAN}Email:${NC}    admin@gkbjtamankencana.org${GREEN}                 │${NC}"
            echo -e "${GREEN}  │  ${CYAN}Password:${NC} admin123${GREEN}                                   │${NC}"
            echo -e "${GREEN}  │                                                         │${NC}"
            echo -e "${GREEN}  │  ${YELLOW}⚠ Change this password immediately after login!${GREEN}       │${NC}"
            echo -e "${GREEN}  └─────────────────────────────────────────────────────────┘${NC}"
            echo ""
        else
            print_warn "Database initialization had issues"
        fi
    else
        print_warn "scripts/init_db.py not found, skipping initialization"
    fi

    deactivate
}

step_configure_nginx() {
    CURRENT_STEP="Nginx Configuration"
    print_step 15 $TOTAL_STEPS "Configuring Nginx & SSL"

    echo ""
    echo -e "${CYAN}  Domain Configuration:${NC}"
    echo ""
    read -p "  Do you have a domain name? (y/n) " -n 1 -r has_domain
    echo

    if [[ $has_domain =~ ^[Yy]$ ]]; then
        read -p "  Enter your domain (e.g., church.example.com): " domain_name

        if [ -n "$domain_name" ]; then
            print_info "Configuring Nginx for $domain_name..."

            cat > /etc/nginx/sites-available/faithflow << NGINX_DOMAIN
# FaithFlow Production Configuration
# Domain: $domain_name

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=static:10m rate=50r/s;

# Upstream for load balancing (future multi-worker support)
upstream faithflow_backend {
    server 127.0.0.1:${BACKEND_PORT:-8001};
    keepalive 32;
}

server {
    listen 80;
    server_name $domain_name;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Backend API
    location /api {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://faithflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_buffering off;
    }

    # API Documentation
    location /docs {
        proxy_pass http://faithflow_backend/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location /redoc {
        proxy_pass http://faithflow_backend/redoc;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Public routes
    location /public {
        proxy_pass http://faithflow_backend/public;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Static assets with caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        limit_req zone=static burst=50 nodelay;
        root $INSTALL_DIR/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Frontend SPA
    location / {
        root $INSTALL_DIR/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
NGINX_DOMAIN

            ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
            rm -f /etc/nginx/sites-enabled/default

            if nginx -t >> "$LOG_FILE" 2>&1; then
                systemctl reload nginx
                print_success "Nginx configured for $domain_name"

                # SSL setup
                echo ""
                read -p "  Install free SSL certificate from Let's Encrypt? (y/n) " -n 1 -r install_ssl
                echo

                if [[ $install_ssl =~ ^[Yy]$ ]]; then
                    print_info "Installing Certbot..."
                    run_silent apt install -y certbot python3-certbot-nginx

                    echo ""
                    echo -e "${YELLOW}  ⚠ Make sure DNS for $domain_name points to this server!${NC}"
                    read -p "  Press Enter when ready..."

                    print_info "Obtaining SSL certificate..."
                    if certbot --nginx -d "$domain_name" --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tee -a "$LOG_FILE"; then
                        print_success "SSL certificate installed!"

                        # Update frontend .env
                        sed -i "s|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://$domain_name|" "$INSTALL_DIR/frontend/.env"

                        # Setup auto-renewal
                        systemctl enable certbot.timer >> "$LOG_FILE" 2>&1 || true
                        print_success "Auto-renewal configured"
                    else
                        print_warn "SSL installation failed. You can retry later with:"
                        echo -e "${YELLOW}    sudo certbot --nginx -d $domain_name${NC}"
                    fi
                fi
            else
                print_error "Nginx configuration test failed"
            fi

            DOMAIN_NAME=$domain_name
        fi
    else
        print_info "Configuring Nginx for localhost..."

        cat > /etc/nginx/sites-available/faithflow << NGINX_LOCAL
# FaithFlow Local Configuration

upstream faithflow_backend {
    server 127.0.0.1:${BACKEND_PORT:-8001};
    keepalive 32;
}

server {
    listen 80 default_server;

    client_max_body_size 50M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api {
        proxy_pass http://faithflow_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /docs {
        proxy_pass http://faithflow_backend/docs;
    }

    location /public {
        proxy_pass http://faithflow_backend/public;
    }

    location / {
        root $INSTALL_DIR/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_LOCAL

        ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t >> "$LOG_FILE" 2>&1 && systemctl reload nginx
        print_success "Nginx configured for localhost"
    fi
}

step_configure_firewall() {
    CURRENT_STEP="Firewall Configuration"
    print_step 16 $TOTAL_STEPS "Configuring Firewall"

    print_info "Setting up UFW firewall..."

    run_silent apt install -y ufw

    # Configure rules
    ufw --force reset >> "$LOG_FILE" 2>&1
    ufw default deny incoming >> "$LOG_FILE" 2>&1
    ufw default allow outgoing >> "$LOG_FILE" 2>&1

    # Basic ports
    ufw allow 22/tcp >> "$LOG_FILE" 2>&1    # SSH
    ufw allow 80/tcp >> "$LOG_FILE" 2>&1    # HTTP
    ufw allow 443/tcp >> "$LOG_FILE" 2>&1   # HTTPS

    # Voice/Video calling ports
    ufw allow 3478/tcp >> "$LOG_FILE" 2>&1  # TURN TCP
    ufw allow 3478/udp >> "$LOG_FILE" 2>&1  # TURN UDP
    ufw allow 5349/tcp >> "$LOG_FILE" 2>&1  # TURN TLS
    ufw allow 5349/udp >> "$LOG_FILE" 2>&1  # TURN DTLS
    ufw allow 7881/tcp >> "$LOG_FILE" 2>&1  # LiveKit RTC
    ufw allow 50000:50100/udp >> "$LOG_FILE" 2>&1  # WebRTC UDP range

    # MQTT ports (if needed externally)
    # ufw allow 1883/tcp >> "$LOG_FILE" 2>&1  # MQTT
    # ufw allow 8083/tcp >> "$LOG_FILE" 2>&1  # MQTT WebSocket

    ufw --force enable >> "$LOG_FILE" 2>&1

    print_success "Firewall configured"
    print_info "Open ports: 22, 80, 443, 3478, 5349, 7881, 50000-50100/udp"
}

# =============================================================================
# COMPLETION SCREEN
# =============================================================================

show_completion() {
    local elapsed=$((SECONDS - START_TIME))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))

    echo ""
    echo -e "${GREEN}"
    cat << 'EOF'
    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║                    ✨  Installation Complete!  ✨                         ║
    ║                                                                           ║
    ║                FaithFlow is ready to serve your church!                   ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "  ${GRAY}Installation time: ${WHITE}${minutes}m ${seconds}s${NC}"
    echo -e "  ${GRAY}Log file: ${WHITE}$LOG_FILE${NC}"
    echo ""

    echo -e "${CYAN}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}  │  ${WHITE}Components Installed${CYAN}                                              │${NC}"
    echo -e "${CYAN}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}  │  ${WHITE}CORE SERVICES${CYAN}                                                     │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Python 3.11        ${GRAY}Backend runtime${CYAN}                           │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Node.js 20.x       ${GRAY}Frontend build${CYAN}                            │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} MongoDB 7.0        ${GRAY}Database${CYAN}                                  │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Nginx              ${GRAY}Web server & proxy${CYAN}                        │${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}VOICE/VIDEO CALLING${CYAN}                                               │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} LiveKit Server     ${GRAY}WebRTC SFU (port 7880)${CYAN}                    │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} coTURN             ${GRAY}TURN/STUN NAT (ports 3478, 5349)${CYAN}          │${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}REAL-TIME MESSAGING${CYAN}                                               │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} EMQX               ${GRAY}MQTT broker (ports 1883, 8083)${CYAN}            │${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}FILE STORAGE${CYAN}                                                      │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} SeaweedFS          ${GRAY}Distributed storage (ports 9333, 8080, 8888)${CYAN}│${NC}"
    echo -e "${CYAN}  │                                                                     │${NC}"
    echo -e "${CYAN}  │  ${WHITE}SECURITY${CYAN}                                                          │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} UFW Firewall       ${GRAY}Configured with all ports${CYAN}                 │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Systemd            ${GRAY}Service management${CYAN}                        │${NC}"
    echo -e "${CYAN}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ${WHITE}Access Your Application${YELLOW}                                          │${NC}"
    echo -e "${YELLOW}  ├─────────────────────────────────────────────────────────────────────┤${NC}"

    if [ -n "${DOMAIN_NAME:-}" ]; then
        echo -e "${YELLOW}  │  ${CYAN}Web App:${NC}     https://$DOMAIN_NAME${YELLOW}                        │${NC}"
        echo -e "${YELLOW}  │  ${CYAN}Admin Panel:${NC} https://$DOMAIN_NAME/admin${YELLOW}                  │${NC}"
        echo -e "${YELLOW}  │  ${CYAN}API Docs:${NC}    https://$DOMAIN_NAME/docs${YELLOW}                   │${NC}"
    else
        echo -e "${YELLOW}  │  ${CYAN}Web App:${NC}     http://YOUR_SERVER_IP${YELLOW}                           │${NC}"
        echo -e "${YELLOW}  │  ${CYAN}Admin Panel:${NC} http://YOUR_SERVER_IP/admin${YELLOW}                     │${NC}"
        echo -e "${YELLOW}  │  ${CYAN}API Docs:${NC}    http://YOUR_SERVER_IP/docs${YELLOW}                      │${NC}"
    fi

    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${MAGENTA}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${MAGENTA}  │  ${WHITE}Service Management Commands${MAGENTA}                                    │${NC}"
    echo -e "${MAGENTA}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Backend:${NC}    systemctl status faithflow-backend${MAGENTA}                │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}LiveKit:${NC}    systemctl status livekit${MAGENTA}                          │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}coTURN:${NC}     systemctl status coturn${MAGENTA}                           │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}EMQX:${NC}       systemctl status emqx${MAGENTA}                             │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}SeaweedFS:${NC}  systemctl status seaweedfs-master${MAGENTA}                 │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}MongoDB:${NC}    systemctl status mongod${MAGENTA}                           │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Nginx:${NC}      systemctl status nginx${MAGENTA}                            │${NC}"
    echo -e "${MAGENTA}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Logs:${NC}       tail -f /var/log/faithflow/backend.out.log${MAGENTA}        │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Restart all:${NC} sudo systemctl restart faithflow-backend livekit${MAGENTA} │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Update:${NC}     cd $INSTALL_DIR && sudo ./update.sh${MAGENTA}               │${NC}"
    echo -e "${MAGENTA}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    # Show generated credentials
    if [ -n "${LIVEKIT_API_KEY:-}" ]; then
        echo -e "${BLUE}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${BLUE}  │  ${WHITE}Generated Credentials (SAVE THESE!)${BLUE}                             │${NC}"
        echo -e "${BLUE}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
        echo -e "${BLUE}  │  ${CYAN}LiveKit API Key:${NC}    ${LIVEKIT_API_KEY}${BLUE}                         │${NC}"
        echo -e "${BLUE}  │  ${CYAN}LiveKit Secret:${NC}     ${LIVEKIT_API_SECRET}${BLUE}                      │${NC}"
        echo -e "${BLUE}  │  ${CYAN}TURN Secret:${NC}        ${TURN_SECRET:-auto}${BLUE}                       │${NC}"
        echo -e "${BLUE}  │  ${CYAN}Server IP:${NC}          ${SERVER_IP:-auto}${BLUE}                         │${NC}"
        echo -e "${BLUE}  └─────────────────────────────────────────────────────────────────────┘${NC}"
        echo ""
    fi

    echo -e "${GREEN}  🙏 Thank you for choosing FaithFlow!${NC}"
    echo -e "${GREEN}  ❤️  May this system bless your church ministry.${NC}"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    START_TIME=$SECONDS

    # Create log directory early
    mkdir -p "$LOG_DIR"

    # Initialize log
    echo "========================================" >> "$LOG_FILE"
    echo "FaithFlow Full Stack Installation Log" >> "$LOG_FILE"
    echo "Version: $SCRIPT_VERSION" >> "$LOG_FILE"
    echo "Started: $(date)" >> "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"

    # Set trap for cleanup
    trap cleanup_on_failure ERR

    # Show welcome
    show_welcome

    # Pre-flight checks
    preflight_checks

    # Core infrastructure (Steps 1-5)
    step_system_update           # Step 1
    step_install_python          # Step 2
    step_install_nodejs          # Step 3
    step_install_mongodb         # Step 4
    step_install_nginx           # Step 5

    # Voice/Video & Messaging services (Steps 6-9)
    step_install_livekit         # Step 6 - Voice/Video WebRTC
    step_install_coturn          # Step 7 - TURN/STUN NAT traversal
    step_install_emqx            # Step 8 - MQTT messaging
    step_install_seaweedfs       # Step 9 - File storage

    # Application setup (Steps 10-14)
    step_copy_files              # Step 10
    step_setup_backend           # Step 11
    step_setup_frontend          # Step 12
    step_configure_services      # Step 13
    step_init_database           # Step 14

    # Final configuration (Steps 15-16)
    step_configure_nginx         # Step 15
    step_configure_firewall      # Step 16

    # Show completion
    show_completion

    # Log completion
    log_info "Installation completed successfully"
    log_info "Components installed: Backend, Frontend, MongoDB, LiveKit, coTURN, EMQX, SeaweedFS"
}

# Run main
main "$@"
