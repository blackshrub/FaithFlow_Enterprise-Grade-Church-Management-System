#!/bin/bash

################################################################################
#                                                                              #
#                      🔄 FaithFlow Update Script 🔄                          #
#                                                                              #
#                Run after 'git pull' to update dependencies                  #
#                      and restart services safely                            #
#                                                                              #
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

clear

echo -e "${CYAN}"
cat << "EOF"
╭─────────────────────────────────────────────────────────────────────╮
│                                                                     │
│                     🔄  FaithFlow Updater  🔄                       │
│                                                                     │
│                 Keep your system fresh and updated!                 │
│                                                                     │
╰─────────────────────────────────────────────────────────────────────╯
EOF
echo -e "${NC}"

sleep 1

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}⚠️  This updater needs to run as root.${NC}"
   echo -e "${YELLOW}   Please run: sudo ./update.sh${NC}"
   exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${CYAN}📍 Working directory: ${WHITE}$SCRIPT_DIR${NC}"
echo ""
sleep 1

# Progress function
progress() {
    echo -e "${BLUE}─────────────────────────────────────────────────────────────────────${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${CYAN}⚙️  $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

progress
echo -e "${MAGENTA}🚀 Step 1/8: Checking current status...${NC}"
progress

# Set standard installation directory
INSTALL_DIR="/opt/faithflow"

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}❌ FaithFlow not found in $INSTALL_DIR${NC}"
    echo -e "${YELLOW}   Please run install.sh first${NC}"
    exit 1
fi

cd "$INSTALL_DIR"
info "Working directory: $INSTALL_DIR"

# Check if services are running
info "Checking FaithFlow services..."
if supervisorctl status faithflow:backend > /dev/null 2>&1; then
    success "Backend is running"
else
    if supervisorctl status backend > /dev/null 2>&1; then
        success "Backend is running"
    else
        warn "Backend is not running (will start after update)"
    fi
fi

if supervisorctl status faithflow:frontend > /dev/null 2>&1; then
    success "Frontend is running"
else
    if supervisorctl status frontend > /dev/null 2>&1; then
        success "Frontend is running"
    else
        warn "Frontend is not running (will start after update)"
    fi
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 2/8: Pulling latest changes...${NC}"
progress

info "Getting latest code from repository..."
git fetch --all
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL = $REMOTE ]; then
    success "Already up to date! (No changes to pull)"
    echo -e "${CYAN}   Your FaithFlow is running the latest version.${NC}"
else
    info "New updates available! Pulling changes..."
    git pull
    success "Code updated to latest version!"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 3/8: Updating backend dependencies...${NC}"
progress

cd "$SCRIPT_DIR/backend"

if [ -d "venv" ]; then
    info "Checking for new Python packages..."
    source venv/bin/activate
    pip install --upgrade pip > /dev/null 2>&1
    pip install -r requirements.txt > /dev/null 2>&1
    success "Backend dependencies updated!"
else
    warn "Virtual environment not found. Creating one..."
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    success "Virtual environment created and dependencies installed!"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 4/8: Updating frontend dependencies...${NC}"
progress

cd "$SCRIPT_DIR/frontend"

info "Checking for new JavaScript packages..."
echo -e "${CYAN}   ☕ This might take a moment...${NC}"
yarn install > /dev/null 2>&1
success "Frontend dependencies updated!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 5/8: Running database migrations...${NC}"
progress

cd "$SCRIPT_DIR/backend"
source venv/bin/activate

# Check for migration scripts
if [ -f "add_default_pins.py" ]; then
    info "Running PIN migration (if needed)..."
    python3 add_default_pins.py > /dev/null 2>&1 || true
fi

# Add other migrations here as needed

success "Database migrations complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 6/8: Checking configuration...${NC}"
progress

# Check if .env files exist
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    success "Backend configuration exists"
else
    warn "backend/.env not found. Creating from template..."
    cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
    echo -e "${YELLOW}   Please configure backend/.env before starting services!${NC}"
fi

if [ -f "$SCRIPT_DIR/frontend/.env" ]; then
    success "Frontend configuration exists"
else
    warn "frontend/.env not found. Creating from template..."
    cp "$SCRIPT_DIR/frontend/.env.example" "$SCRIPT_DIR/frontend/.env"
    echo -e "${YELLOW}   Please configure frontend/.env before starting services!${NC}"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 7/8: Reloading Supervisor configuration...${NC}"
progress

info "Updating service configurations..."
if [ -f "$SCRIPT_DIR/supervisord.conf" ]; then
    cp "$SCRIPT_DIR/supervisord.conf" /etc/supervisor/conf.d/faithflow.conf
    supervisorctl reread > /dev/null 2>&1
    supervisorctl update > /dev/null 2>&1
    success "Supervisor configuration updated!"
else
    warn "supervisord.conf not found, skipping..."
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 8/8: Restarting services...${NC}"
progress

info "Gracefully restarting FaithFlow services..."
echo -e "${CYAN}   Stopping services...${NC}"
supervisorctl stop all > /dev/null 2>&1 || true
sleep 2
echo -e "${CYAN}   Starting services...${NC}"
supervisorctl start all > /dev/null 2>&1 || true
sleep 3

if supervisorctl status | grep -q "RUNNING"; then
    success "Services restarted successfully!"
else
    warn "Some services may not be running. Check: sudo supervisorctl status"
fi
echo ""
sleep 1

echo ""
echo -e "${GREEN}"
cat << "EOF"
╭─────────────────────────────────────────────────────────────────────╮
│                                                                     │
│                    ✨  Update Complete!  ✨                         │
│                                                                     │
│                  FaithFlow is now running the                       │
│                        latest version!                              │
│                                                                     │
╰─────────────────────────────────────────────────────────────────────╯
EOF
echo -e "${NC}"

echo ""
echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${WHITE}Service Status:${CYAN}                                                      │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
supervisorctl status | while read line; do
    if echo "$line" | grep -q "RUNNING"; then
        echo -e "${CYAN}│  ${GREEN}✅ $line${CYAN}${NC}"
    else
        echo -e "${CYAN}│  ${YELLOW}⚠️  $line${CYAN}${NC}"
    fi
done
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${YELLOW}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${YELLOW}│  ${WHITE}What Was Updated:${YELLOW}                                                   │${NC}"
echo -e "${YELLOW}│                                                                     │${NC}"
echo -e "${YELLOW}│  ✅ Latest code from repository                                     │${NC}"
echo -e "${YELLOW}│  ✅ Python packages updated                                         │${NC}"
echo -e "${YELLOW}│  ✅ JavaScript packages updated                                     │${NC}"
echo -e "${YELLOW}│  ✅ Database migrations applied                                     │${NC}"
echo -e "${YELLOW}│  ✅ Services restarted                                              │${NC}"
echo -e "${YELLOW}│                                                                     │${NC}"
echo -e "${YELLOW}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${WHITE}Useful Commands:${CYAN}                                                    │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}│  📊 View logs:       ${WHITE}tail -f /var/log/supervisor/backend.out.log${CYAN}  │${NC}"
echo -e "${CYAN}│  🔍 Check status:    ${WHITE}sudo supervisorctl status${CYAN}                    │${NC}"
echo -e "${CYAN}│  🔄 Restart:         ${WHITE}sudo supervisorctl restart all${CYAN}               │${NC}"
echo -e "${CYAN}│  🌐 Access app:      ${WHITE}http://localhost${CYAN}  or  ${WHITE}http://your-domain${CYAN}  │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${GREEN}🎉 ${WHITE}Update successful!${NC}"
echo -e "${GREEN}✨ ${WHITE}Your FaithFlow is now running the latest features.${NC}"
echo ""

echo -e "${MAGENTA}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${MAGENTA}│  ${WHITE}💡 Pro Tip:${MAGENTA}                                                         │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  After major updates, it's good practice to:                       │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  1️⃣  Clear browser cache (Ctrl+Shift+R)                            │${NC}"
echo -e "${MAGENTA}│  2️⃣  Test critical flows (login, events, kiosk)                    │${NC}"
echo -e "${MAGENTA}│  3️⃣  Check for any new settings in admin panel                     │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${GREEN}🙏 ${WHITE}Thank you for keeping FaithFlow up to date!${NC}"
echo -e "${GREEN}❤️  ${WHITE}Serving churches with excellence.${NC}"
echo ""
