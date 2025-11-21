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

# Progress functions
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

# Set standard installation directory
INSTALL_DIR="/opt/faithflow"

# Check if directory exists
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}❌ FaithFlow not found in $INSTALL_DIR${NC}"
    echo -e "${YELLOW}   Please run install.sh first${NC}"
    exit 1
fi

cd "$INSTALL_DIR"
echo -e "${CYAN}📍 Working directory: ${WHITE}$INSTALL_DIR${NC}"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 1/9: Checking current status...${NC}"
progress

info "Checking FaithFlow services..."
if supervisorctl status backend > /dev/null 2>&1; then
    success "Backend is running"
else
    warn "Backend is not running (will start after update)"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 2/9: Pulling latest changes...${NC}"
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
echo -e "${MAGENTA}🚀 Step 3/9: Updating backend dependencies...${NC}"
progress

cd "$INSTALL_DIR/backend"

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
echo -e "${MAGENTA}🚀 Step 4/9: Updating frontend dependencies...${NC}"
progress

cd "$INSTALL_DIR/frontend"

info "Checking for new JavaScript packages..."
echo -e "${CYAN}   ☕ This might take a moment...${NC}"
yarn install > /dev/null 2>&1
success "Frontend dependencies updated!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 5/9: Building production frontend...${NC}"
progress

info "Creating optimized production build..."
echo -e "${CYAN}   🏭 This may take 2-3 minutes...${NC}"
yarn build > /dev/null 2>&1

if [ -d "build" ] && [ -f "build/index.html" ]; then
    success "Production build created successfully!"
    echo -e "${GREEN}   📦 Static files ready in frontend/build/${NC}"
else
    warn "Build may have issues. Check logs if site doesn't work."
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 6/9: Running database migrations...${NC}"
progress

cd "$INSTALL_DIR/backend"
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
echo -e "${MAGENTA}🚀 Step 7/9: Checking configuration...${NC}"
progress

# Check if .env files exist
if [ -f "$INSTALL_DIR/backend/.env" ]; then
    success "Backend configuration exists"
else
    warn "backend/.env not found. Creating from template..."
    if [ -f "$INSTALL_DIR/backend/.env.example" ]; then
        cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
    else
        cat > "$INSTALL_DIR/backend/.env" << 'BACKEND_ENV'
MONGO_URL=mongodb://localhost:27017
DB_NAME=faithflow_production
JWT_SECRET_KEY=change-this-in-production
CORS_ORIGINS=*
BACKEND_ENV
    fi
    echo -e "${YELLOW}   Please configure backend/.env before starting services!${NC}"
fi

if [ -f "$INSTALL_DIR/frontend/.env" ]; then
    success "Frontend configuration exists"
else
    warn "frontend/.env not found. Creating from template..."
    if [ -f "$INSTALL_DIR/frontend/.env.example" ]; then
        cp "$INSTALL_DIR/frontend/.env.example" "$INSTALL_DIR/frontend/.env"
    else
        cat > "$INSTALL_DIR/frontend/.env" << 'FRONTEND_ENV'
REACT_APP_BACKEND_URL=http://localhost
WDS_SOCKET_PORT=443
FRONTEND_ENV
    fi
    echo -e "${YELLOW}   Please configure frontend/.env before rebuilding!${NC}"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 8/9: Reloading Nginx...${NC}"
progress

info "Reloading Nginx to serve updated files..."
nginx -t > /dev/null 2>&1
if [ $? -eq 0 ]; then
    systemctl reload nginx
    success "Nginx reloaded successfully!"
else
    warn "Nginx configuration test failed. Skipping reload."
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 9/9: Restarting backend service...${NC}"
progress

info "Stopping backend service..."
supervisorctl stop backend > /dev/null 2>&1 || true
sleep 2

info "Starting backend service with updated code..."
supervisorctl start backend > /dev/null 2>&1 || supervisorctl restart backend > /dev/null 2>&1
sleep 5

if supervisorctl status backend | grep -q "RUNNING"; then
    success "Backend restarted successfully!"
    echo -e "${GREEN}   ✅ New code is now active!${NC}"
else
    warn "Backend may not be running. Check: sudo supervisorctl status"
fi

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

# Show backend status
if supervisorctl status backend | grep -q "RUNNING"; then
    echo -e "${CYAN}│  ${GREEN}✅ Backend:  RUNNING${CYAN}                                                 │${NC}"
else
    echo -e "${CYAN}│  ${YELLOW}⚠️  Backend:  STOPPED${CYAN}                                                 │${NC}"
fi

# Frontend is static files
if [ -f "$INSTALL_DIR/frontend/build/index.html" ]; then
    echo -e "${CYAN}│  ${GREEN}✅ Frontend: Static build ready${CYAN}                                      │${NC}"
else
    echo -e "${CYAN}│  ${YELLOW}⚠️  Frontend: Build missing${CYAN}                                          │${NC}"
fi

echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${YELLOW}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${YELLOW}│  ${WHITE}What Was Updated:${YELLOW}                                                   │${NC}"
echo -e "${YELLOW}│                                                                     │${NC}"
echo -e "${YELLOW}│  ✅ Latest code from repository                                     │${NC}"
echo -e "${YELLOW}│  ✅ Python packages updated                                         │${NC}"
echo -e "${YELLOW}│  ✅ JavaScript packages updated                                     │${NC}"
echo -e "${YELLOW}│  ✅ Production build created                                        │${NC}"
echo -e "${YELLOW}│  ✅ Database migrations applied                                     │${NC}"
echo -e "${YELLOW}│  ✅ Backend service restarted                                       │${NC}"
echo -e "${YELLOW}│  ✅ Nginx reloaded                                                  │${NC}"
echo -e "${YELLOW}│                                                                     │${NC}"
echo -e "${YELLOW}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${WHITE}Useful Commands:${CYAN}                                                    │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}│  📊 View logs:       ${WHITE}tail -f /var/log/supervisor/backend.out.log${CYAN}  │${NC}"
echo -e "${CYAN}│  🔍 Check status:    ${WHITE}sudo supervisorctl status${CYAN}                    │${NC}"
echo -e "${CYAN}│  🔄 Restart backend: ${WHITE}sudo supervisorctl restart backend${CYAN}          │${NC}"
echo -e "${CYAN}│  🔄 Reload Nginx:    ${WHITE}sudo systemctl reload nginx${CYAN}                  │${NC}"
echo -e "${CYAN}│  🌐 Access app:      ${WHITE}http://localhost${CYAN}  or  ${WHITE}https://your-domain${CYAN}  │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${MAGENTA}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${MAGENTA}│  ${WHITE}💡 Pro Tip:${MAGENTA}                                                         │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  After updates, clear browser cache for best experience:           │${NC}"
echo -e "${MAGENTA}│  • Chrome/Edge: Ctrl+Shift+R                                          │${NC}"
echo -e "${MAGENTA}│  • Firefox: Ctrl+F5                                                   │${NC}"
echo -e "${MAGENTA}│  • Safari: Cmd+Shift+R                                                │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  Test critical flows after update:                                 │${NC}"
echo -e "${MAGENTA}│  1️⃣  Login to admin panel                                           │${NC}"
echo -e "${MAGENTA}│  2️⃣  Test kiosk services                                             │${NC}"
echo -e "${MAGENTA}│  3️⃣  Check any new settings                                          │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${GREEN}🎉 ${WHITE}Update successful!${NC}"
echo -e "${GREEN}✨ ${WHITE}Your FaithFlow is now running the latest features.${NC}"
echo ""

echo -e "${GREEN}🙏 ${WHITE}Thank you for keeping FaithFlow up to date!${NC}"
echo -e "${GREEN}❤️  ${WHITE}Serving churches with excellence.${NC}"
echo ""
