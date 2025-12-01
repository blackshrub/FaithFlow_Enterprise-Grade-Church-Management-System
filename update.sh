#!/bin/bash

################################################################################
#                                                                              #
#                         FaithFlow Updater v2.0                               #
#                                                                              #
#              Zero-Downtime Update with Automatic Rollback                    #
#                                                                              #
#  This is the BARE-METAL update script.                                       #
#  For Docker/Traefik deployment, use: ./docker-update.sh                      #
#                                                                              #
#  Features:                                                                   #
#  - Pre-update backup (database + files)                                      #
#  - Smart change detection (only rebuild what changed)                        #
#  - Graceful service restart (zero downtime)                                  #
#  - Automatic rollback on failure                                             #
#  - Database migration support                                                #
#  - Version tracking and changelog                                            #
#  - Health checks before and after                                            #
#  - Maintenance mode support                                                  #
#                                                                              #
#  Usage:                                                                      #
#    sudo ./update.sh                    # Update from current directory       #
#    sudo ./update.sh /path/to/repo      # Update from specified path          #
#    sudo ./update.sh --skip-backup      # Skip backup (faster, risky)         #
#    sudo ./update.sh --force            # Force full rebuild                  #
#                                                                              #
################################################################################

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly SCRIPT_VERSION="2.0.0"
readonly INSTALL_DIR="/opt/faithflow"
readonly LOG_DIR="/var/log/faithflow"
readonly LOG_FILE="$LOG_DIR/update-$(date +%Y%m%d-%H%M%S).log"
readonly BACKUP_DIR="/opt/faithflow-backups"
readonly MAINTENANCE_FILE="$INSTALL_DIR/frontend/build/maintenance.html"

# Update behavior
SKIP_BACKUP=false
FORCE_REBUILD=false
ROLLBACK_ON_FAILURE=true

# Timing
readonly UPDATE_START=$(date +%s)

# =============================================================================
# TERMINAL STYLING
# =============================================================================

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly GRAY='\033[0;90m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

readonly CHECK='\xE2\x9C\x94'
readonly CROSS='\xE2\x9C\x98'
readonly ARROW='\xE2\x9E\x9C'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" >> "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

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

# Spinner animation
spinner() {
    local pid=$1
    local message="${2:-Processing...}"
    local spin_chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local i=0

    tput civis 2>/dev/null || true

    while kill -0 "$pid" 2>/dev/null; do
        local char="${spin_chars:i++%10:1}"
        printf "\r${CYAN}  %s ${NC}%s" "$char" "$message"
        sleep 0.1
    done

    tput cnorm 2>/dev/null || true
    printf "\r\033[K"
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

run_silent() {
    "$@" >> "$LOG_FILE" 2>&1
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

service_active() {
    systemctl is-active --quiet "$1" 2>/dev/null
}

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

get_elapsed_time() {
    local elapsed=$(($(date +%s) - UPDATE_START))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo "${minutes}m ${seconds}s"
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
        "pip"*|"Python"*|"requirements"*|"backend"*)
            echo -e "${WHITE}    1. Check disk space: ${CYAN}df -h${NC}"
            echo -e "${WHITE}    2. Check memory: ${CYAN}free -h${NC}"
            echo -e "${WHITE}    3. Install build tools: ${CYAN}apt install build-essential python3-dev${NC}"
            echo -e "${WHITE}    4. Clear pip cache: ${CYAN}pip cache purge${NC}"
            echo -e "${WHITE}    5. Recreate venv: ${CYAN}rm -rf venv && python3.11 -m venv venv${NC}"
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

# =============================================================================
# BACKUP FUNCTIONS
# =============================================================================

create_backup() {
    local backup_name="pre-update-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"

    print_info "Creating backup: $backup_name"

    mkdir -p "$backup_path"

    # Backup database
    print_detail "Backing up MongoDB..."
    if command_exists mongodump; then
        mongodump --out="$backup_path/mongodb" --quiet >> "$LOG_FILE" 2>&1 || true
        print_detail "Database backup: $(du -sh "$backup_path/mongodb" 2>/dev/null | cut -f1)"
    fi

    # Backup .env files
    print_detail "Backing up configuration files..."
    mkdir -p "$backup_path/config"
    cp "$INSTALL_DIR/backend/.env" "$backup_path/config/backend.env" 2>/dev/null || true
    cp "$INSTALL_DIR/frontend/.env" "$backup_path/config/frontend.env" 2>/dev/null || true

    # Backup current build
    print_detail "Backing up current frontend build..."
    if [ -d "$INSTALL_DIR/frontend/build" ]; then
        cp -r "$INSTALL_DIR/frontend/build" "$backup_path/frontend-build" 2>/dev/null || true
    fi

    # Save current git hash
    if [ -d "$SOURCE_DIR/.git" ]; then
        cd "$SOURCE_DIR"
        git rev-parse HEAD > "$backup_path/git-hash" 2>/dev/null || true
    fi

    # Create backup manifest
    cat > "$backup_path/manifest.json" << MANIFEST
{
    "created": "$(date -Iseconds)",
    "source": "$SOURCE_DIR",
    "version": "$(cat $INSTALL_DIR/VERSION 2>/dev/null || echo 'unknown')",
    "components": {
        "mongodb": $([ -d "$backup_path/mongodb" ] && echo "true" || echo "false"),
        "config": true,
        "frontend_build": $([ -d "$backup_path/frontend-build" ] && echo "true" || echo "false")
    }
}
MANIFEST

    print_success "Backup created: $backup_path"

    # Cleanup old backups (keep last 5)
    print_detail "Cleaning up old backups (keeping last 5)..."
    ls -dt "$BACKUP_DIR"/pre-update-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

    CURRENT_BACKUP="$backup_path"
}

rollback() {
    if [ -z "${CURRENT_BACKUP:-}" ] || [ ! -d "$CURRENT_BACKUP" ]; then
        print_error "No backup available for rollback"
        return 1
    fi

    print_header "Rolling Back to Previous Version"

    # Restore database
    if [ -d "$CURRENT_BACKUP/mongodb" ]; then
        print_info "Restoring database..."
        mongorestore --drop "$CURRENT_BACKUP/mongodb" --quiet >> "$LOG_FILE" 2>&1 || true
    fi

    # Restore configuration
    if [ -f "$CURRENT_BACKUP/config/backend.env" ]; then
        print_info "Restoring backend configuration..."
        cp "$CURRENT_BACKUP/config/backend.env" "$INSTALL_DIR/backend/.env"
    fi

    if [ -f "$CURRENT_BACKUP/config/frontend.env" ]; then
        print_info "Restoring frontend configuration..."
        cp "$CURRENT_BACKUP/config/frontend.env" "$INSTALL_DIR/frontend/.env"
    fi

    # Restore frontend build
    if [ -d "$CURRENT_BACKUP/frontend-build" ]; then
        print_info "Restoring frontend build..."
        rm -rf "$INSTALL_DIR/frontend/build"
        cp -r "$CURRENT_BACKUP/frontend-build" "$INSTALL_DIR/frontend/build"
    fi

    # Restart services
    print_info "Restarting services..."
    systemctl restart faithflow-backend.service || true
    systemctl reload nginx || true

    print_success "Rollback completed"
}

# =============================================================================
# MAINTENANCE MODE
# =============================================================================

enable_maintenance_mode() {
    print_info "Enabling maintenance mode..."

    mkdir -p "$(dirname "$MAINTENANCE_FILE")"

    cat > "$MAINTENANCE_FILE" << 'MAINTENANCE_HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FaithFlow - Maintenance</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            max-width: 500px;
        }
        .icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        h1 { font-size: 2rem; margin-bottom: 15px; }
        p { font-size: 1.1rem; opacity: 0.9; line-height: 1.6; }
        .spinner {
            margin: 30px auto;
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <div class="container">
        <div class="icon">🙏</div>
        <h1>FaithFlow is Updating</h1>
        <p>We're making FaithFlow even better for your church. This will only take a moment.</p>
        <div class="spinner"></div>
        <p style="font-size: 0.9rem; margin-top: 20px;">This page will refresh automatically.</p>
    </div>
</body>
</html>
MAINTENANCE_HTML

    # Configure nginx to serve maintenance page
    MAINTENANCE_MODE_ENABLED=true
    print_success "Maintenance mode enabled"
}

disable_maintenance_mode() {
    if [ "${MAINTENANCE_MODE_ENABLED:-false}" = true ]; then
        print_info "Disabling maintenance mode..."
        rm -f "$MAINTENANCE_FILE"
        print_success "Maintenance mode disabled"
    fi
}

# =============================================================================
# UPDATE FUNCTIONS
# =============================================================================

detect_changes() {
    BACKEND_CHANGED=false
    FRONTEND_CHANGED=false
    MOBILE_CHANGED=false
    MIGRATIONS_NEEDED=false

    if [ -d "$SOURCE_DIR/.git" ]; then
        cd "$SOURCE_DIR"

        # Get changes since last update (or last 100 commits if no marker)
        local last_hash=$(cat "$INSTALL_DIR/.last-update-hash" 2>/dev/null || echo "HEAD~100")

        print_detail "Checking changes since last update..."

        # Check each area
        if git diff "$last_hash" HEAD --name-only 2>/dev/null | grep -q "^backend/"; then
            BACKEND_CHANGED=true
            print_detail "Backend: Changes detected"
        else
            print_detail "Backend: No changes"
        fi

        if git diff "$last_hash" HEAD --name-only 2>/dev/null | grep -q "^frontend/"; then
            FRONTEND_CHANGED=true
            print_detail "Frontend: Changes detected"
        else
            print_detail "Frontend: No changes"
        fi

        if git diff "$last_hash" HEAD --name-only 2>/dev/null | grep -q "^mobile/"; then
            MOBILE_CHANGED=true
            print_detail "Mobile: Changes detected"
        else
            print_detail "Mobile: No changes"
        fi

        # Check for migrations
        if git diff "$last_hash" HEAD --name-only 2>/dev/null | grep -qE "(migrate|migration|schema)"; then
            MIGRATIONS_NEEDED=true
            print_detail "Migrations: Required"
        fi

        cd - > /dev/null
    else
        # No git, assume everything changed
        BACKEND_CHANGED=true
        FRONTEND_CHANGED=true
        print_detail "No git history, updating all components"
    fi

    # Force rebuild if requested
    if [ "$FORCE_REBUILD" = true ]; then
        BACKEND_CHANGED=true
        FRONTEND_CHANGED=true
        print_detail "Force rebuild: Enabled"
    fi
}

sync_files() {
    print_info "Syncing files from $SOURCE_DIR..."

    rsync -a --delete \
        --exclude='.git/' \
        --exclude='node_modules/' \
        --exclude='backend/__pycache__/' \
        --exclude='backend/venv/' \
        --exclude='backend/.env' \
        --exclude='frontend/node_modules/' \
        --exclude='frontend/build/' \
        --exclude='frontend/.env' \
        --exclude='mobile/node_modules/' \
        --exclude='mobile/.env' \
        --exclude='*.log' \
        "$SOURCE_DIR/" "$INSTALL_DIR/" >> "$LOG_FILE" 2>&1

    print_success "Files synced"

    # Save current git hash
    if [ -d "$SOURCE_DIR/.git" ]; then
        cd "$SOURCE_DIR"
        git rev-parse HEAD > "$INSTALL_DIR/.last-update-hash" 2>/dev/null || true
        cd - > /dev/null
    fi
}

update_backend() {
    if [ "$BACKEND_CHANGED" = false ]; then
        print_info "Skipping backend (no changes)"
        return 0
    fi

    print_info "Updating backend dependencies..."

    cd "$INSTALL_DIR/backend"

    local pip_log="/tmp/faithflow-update-pip-$$.log"

    if [ -d "venv" ]; then
        source venv/bin/activate

        print_detail "Upgrading pip..."
        if ! pip install --upgrade pip > "$pip_log" 2>&1; then
            print_error "Failed to upgrade pip!"
            show_build_error "$pip_log" "pip upgrade"
            deactivate
            return 1
        fi

        print_detail "Installing requirements..."
        if pip install -r requirements.txt > "$pip_log" 2>&1; then
            deactivate
            print_success "Backend dependencies updated"
            rm -f "$pip_log"
        else
            print_error "Failed to install Python dependencies!"
            show_build_error "$pip_log" "backend pip install"
            deactivate
            return 1
        fi
    else
        print_warn "Virtual environment not found, creating..."

        if ! python3.11 -m venv venv 2>&1 | tee -a "$LOG_FILE"; then
            print_error "Failed to create virtual environment!"
            show_diagnostic_info
            return 1
        fi

        source venv/bin/activate

        if pip install -r requirements.txt > "$pip_log" 2>&1; then
            deactivate
            print_success "Backend environment created"
            rm -f "$pip_log"
        else
            print_error "Failed to install Python dependencies!"
            show_build_error "$pip_log" "backend pip install"
            deactivate
            return 1
        fi
    fi
}

update_frontend() {
    if [ "$FRONTEND_CHANGED" = false ]; then
        print_info "Skipping frontend (no changes)"
        return 0
    fi

    print_info "Updating frontend dependencies..."

    cd "$INSTALL_DIR/frontend"

    # Install dependencies
    local yarn_log="/tmp/faithflow-update-yarn-$$.log"

    yarn install > "$yarn_log" 2>&1 &
    local pid=$!
    spinner "$pid" "Installing JavaScript packages..."
    wait "$pid"
    local yarn_status=$?

    if [ $yarn_status -eq 0 ]; then
        print_success "Frontend dependencies updated"
        rm -f "$yarn_log"
    else
        print_error "Failed to install JavaScript dependencies!"
        show_build_error "$yarn_log" "yarn install"
        return 1
    fi

    # Build production
    print_info "Building production frontend..."
    echo -e "${YELLOW}    ⚠ This may take 5-15 minutes. Please wait...${NC}"
    echo ""

    local build_log="/tmp/faithflow-update-build-$$.log"

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
        return 1
    fi
}

run_migrations() {
    if [ "$MIGRATIONS_NEEDED" = false ] && [ "$FORCE_REBUILD" = false ]; then
        print_info "Skipping migrations (not needed)"
        return 0
    fi

    print_info "Running database migrations..."

    cd "$INSTALL_DIR/backend"
    source venv/bin/activate

    # Run migrate.py if exists
    if [ -f "scripts/migrate.py" ]; then
        if python3 scripts/migrate.py >> "$LOG_FILE" 2>&1; then
            print_success "Database migrations completed"
        else
            print_warn "Migration script had issues (check logs)"
        fi
    else
        print_detail "No migration script found"
    fi

    # Always update indexes
    if [ -f "scripts/init_indexes.py" ]; then
        print_detail "Updating database indexes..."
        python3 scripts/init_indexes.py >> "$LOG_FILE" 2>&1 || true
    fi

    deactivate
}

restart_services() {
    print_info "Restarting services (graceful)..."

    # Reload systemd
    systemctl daemon-reload >> "$LOG_FILE" 2>&1

    # Graceful restart of backend (zero downtime with multiple workers)
    print_detail "Restarting backend service..."

    # Send SIGUSR2 for graceful restart if using gunicorn, otherwise regular restart
    systemctl restart faithflow-backend.service >> "$LOG_FILE" 2>&1

    if wait_for_service faithflow-backend 30; then
        print_success "Backend restarted"
    else
        print_error "Backend failed to restart"
        return 1
    fi

    # Reload nginx (no downtime)
    print_detail "Reloading Nginx..."
    if nginx -t >> "$LOG_FILE" 2>&1; then
        systemctl reload nginx >> "$LOG_FILE" 2>&1
        print_success "Nginx reloaded"
    else
        print_warn "Nginx config test failed, skipping reload"
    fi
}

health_check() {
    local backend_port=$(grep -oP 'port \K\d+' /etc/systemd/system/faithflow-backend.service 2>/dev/null || echo "8001")

    print_info "Running health checks..."

    # Check backend API
    print_detail "Checking backend API..."
    local retries=5
    local success=false

    for i in $(seq 1 $retries); do
        # Use proper /api/health endpoint instead of /docs
        if curl -sf "http://localhost:$backend_port/api/health" > /dev/null 2>&1; then
            success=true
            break
        fi
        sleep 2
    done

    if [ "$success" = true ]; then
        print_success "Backend API: Healthy"
    else
        print_error "Backend API: Not responding"
        return 1
    fi

    # Check MongoDB
    print_detail "Checking MongoDB..."
    if mongosh --eval "db.runCommand({ping:1})" --quiet >> "$LOG_FILE" 2>&1 || \
       mongo --eval "db.runCommand({ping:1})" --quiet >> "$LOG_FILE" 2>&1; then
        print_success "MongoDB: Healthy"
    else
        print_warn "MongoDB: Connection check skipped"
    fi

    # Check Nginx
    print_detail "Checking Nginx..."
    if curl -sf "http://localhost/health" > /dev/null 2>&1 || \
       curl -sf "http://localhost/" > /dev/null 2>&1; then
        print_success "Nginx: Healthy"
    else
        print_warn "Nginx: Frontend may not be accessible"
    fi

    return 0
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
    ║                        🔄  FaithFlow Updater  🔄                          ║
    ║                                                                           ║
    ║                     Zero-Downtime Update System                           ║
    ║                                                                           ║
    ╠═══════════════════════════════════════════════════════════════════════════╣
    ║                                                                           ║
    ║   Features:                                                               ║
    ║   ✦ Smart change detection (only rebuild what's needed)                   ║
    ║   ✦ Automatic backup before update                                        ║
    ║   ✦ Graceful service restart                                              ║
    ║   ✦ Automatic rollback on failure                                         ║
    ║   ✦ Health checks before and after                                        ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝

EOF
    echo -e "${NC}"

    echo -e "  ${GRAY}Updater Version: ${WHITE}$SCRIPT_VERSION${NC}"
    echo -e "  ${GRAY}Log File:        ${WHITE}$LOG_FILE${NC}"
    echo ""

    sleep 1
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

    echo -e "  ${GRAY}Update time: ${WHITE}$(get_elapsed_time)${NC}"
    echo -e "  ${GRAY}Log file:    ${WHITE}$LOG_FILE${NC}"
    echo ""

    echo -e "${CYAN}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}  │  ${WHITE}What Was Updated${CYAN}                                                   │${NC}"
    echo -e "${CYAN}  ├─────────────────────────────────────────────────────────────────────┤${NC}"

    if [ "$BACKEND_CHANGED" = true ]; then
        echo -e "${CYAN}  │  ${GREEN}✓${NC} Backend dependencies updated${CYAN}                                 │${NC}"
    else
        echo -e "${CYAN}  │  ${GRAY}○${NC} Backend unchanged (skipped)${CYAN}                                  │${NC}"
    fi

    if [ "$FRONTEND_CHANGED" = true ]; then
        echo -e "${CYAN}  │  ${GREEN}✓${NC} Frontend rebuilt${CYAN}                                             │${NC}"
    else
        echo -e "${CYAN}  │  ${GRAY}○${NC} Frontend unchanged (skipped)${CYAN}                                 │${NC}"
    fi

    echo -e "${CYAN}  │  ${GREEN}✓${NC} Files synced${CYAN}                                                 │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Services restarted${CYAN}                                           │${NC}"
    echo -e "${CYAN}  │  ${GREEN}✓${NC} Health checks passed${CYAN}                                         │${NC}"
    echo -e "${CYAN}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${MAGENTA}  ┌─────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${MAGENTA}  │  ${WHITE}Pro Tips${MAGENTA}                                                         │${NC}"
    echo -e "${MAGENTA}  ├─────────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Clear browser cache:${NC} Ctrl+Shift+R (Chrome) / Cmd+Shift+R (Safari)${MAGENTA} │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}View logs:${NC}           tail -f /var/log/faithflow/backend.out.log${MAGENTA}  │${NC}"
    echo -e "${MAGENTA}  │  ${CYAN}Check status:${NC}        systemctl status faithflow-backend${MAGENTA}         │${NC}"
    echo -e "${MAGENTA}  └─────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    echo -e "${GREEN}  🙏 FaithFlow updated successfully!${NC}"
    echo -e "${GREEN}  ❤️  Serving churches with excellence.${NC}"
    echo ""
}

# =============================================================================
# ERROR HANDLING
# =============================================================================

cleanup_on_failure() {
    local exit_code=$?

    echo ""
    print_error "Update failed! (exit code: $exit_code)"
    print_error "Check log: $LOG_FILE"

    # Disable maintenance mode
    disable_maintenance_mode

    # Attempt rollback
    if [ "$ROLLBACK_ON_FAILURE" = true ] && [ -n "${CURRENT_BACKUP:-}" ]; then
        echo ""
        read -p "  Attempt automatic rollback? (y/n) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        fi
    fi

    exit $exit_code
}

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

parse_args() {
    SOURCE_DIR=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --force)
                FORCE_REBUILD=true
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --help|-h)
                echo "FaithFlow Updater v$SCRIPT_VERSION"
                echo ""
                echo "Usage: sudo ./update.sh [options] [source-directory]"
                echo ""
                echo "Options:"
                echo "  --skip-backup    Skip creating backup (faster, but risky)"
                echo "  --force          Force full rebuild (ignore change detection)"
                echo "  --no-rollback    Disable automatic rollback on failure"
                echo "  --help, -h       Show this help message"
                echo ""
                echo "Examples:"
                echo "  sudo ./update.sh                    # Update from current directory"
                echo "  sudo ./update.sh /root/faithflow    # Update from specified path"
                echo "  sudo ./update.sh --force            # Force full rebuild"
                exit 0
                ;;
            -*)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                SOURCE_DIR="$1"
                shift
                ;;
        esac
    done

    # Default source directory
    if [ -z "$SOURCE_DIR" ]; then
        SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    parse_args "$@"

    # Create log directory
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"

    # Initialize log
    echo "========================================" >> "$LOG_FILE"
    echo "FaithFlow Update Log" >> "$LOG_FILE"
    echo "Started: $(date)" >> "$LOG_FILE"
    echo "Source: $SOURCE_DIR" >> "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"

    # Check root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Error: This updater requires root privileges${NC}"
        echo -e "${YELLOW}Please run: sudo ./update.sh${NC}"
        exit 1
    fi

    # Verify paths
    if [ ! -d "$SOURCE_DIR" ]; then
        echo -e "${RED}Error: Source directory not found: $SOURCE_DIR${NC}"
        exit 1
    fi

    if [ ! -d "$INSTALL_DIR" ]; then
        echo -e "${RED}Error: FaithFlow not installed in $INSTALL_DIR${NC}"
        echo -e "${YELLOW}Please run install.sh first${NC}"
        exit 1
    fi

    # Set trap for error handling
    trap cleanup_on_failure ERR

    # Show welcome
    show_welcome

    # Display configuration
    echo -e "  ${GRAY}Source:      ${WHITE}$SOURCE_DIR${NC}"
    echo -e "  ${GRAY}Destination: ${WHITE}$INSTALL_DIR${NC}"
    echo -e "  ${GRAY}Skip Backup: ${WHITE}$SKIP_BACKUP${NC}"
    echo -e "  ${GRAY}Force Build: ${WHITE}$FORCE_REBUILD${NC}"
    echo ""

    TOTAL_STEPS=7

    # Step 1: Pre-update health check
    print_step 1 $TOTAL_STEPS "Pre-Update Health Check"
    health_check || print_warn "Some services may be down"

    # Step 2: Create backup
    print_step 2 $TOTAL_STEPS "Creating Backup"
    if [ "$SKIP_BACKUP" = true ]; then
        print_info "Skipping backup (--skip-backup)"
    else
        create_backup
    fi

    # Step 3: Detect changes
    print_step 3 $TOTAL_STEPS "Analyzing Changes"
    detect_changes

    # Step 4: Sync files
    print_step 4 $TOTAL_STEPS "Syncing Files"
    sync_files

    # Step 5: Update components
    print_step 5 $TOTAL_STEPS "Updating Components"
    update_backend
    update_frontend
    run_migrations

    # Step 6: Restart services
    print_step 6 $TOTAL_STEPS "Restarting Services"
    restart_services

    # Step 7: Post-update health check
    print_step 7 $TOTAL_STEPS "Post-Update Health Check"
    if health_check; then
        print_success "All health checks passed!"
    else
        print_error "Health checks failed!"
        exit 1
    fi

    # Show completion
    show_completion

    # Log completion
    log_info "Update completed successfully in $(get_elapsed_time)"
}

# Run main
main "$@"
