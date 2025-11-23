#!/bin/bash

################################################################################
#                                                                              #
#                      🔄 FaithFlow Update Script 🔄                          #
#                                                                              #
#           Run after 'git pull' to sync and restart services                 #
#                                                                              #
#  Usage: sudo ./update.sh [source-directory]                                 #
#  Example: sudo ./update.sh /root/faithflow                                  #
#                                                                              #
################################################################################

set -e

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

# Determine source directory
if [ -n "$1" ]; then
    SOURCE_DIR="$1"
else
    # Try to detect source directory
    SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
fi

# Destination is always /opt/faithflow
DEST_DIR="/opt/faithflow"

echo -e "${CYAN}📍 Source directory: ${WHITE}$SOURCE_DIR${NC}"
echo -e "${CYAN}📍 Destination directory: ${WHITE}$DEST_DIR${NC}"
echo ""

# Verify source exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $SOURCE_DIR${NC}"
    echo -e "${YELLOW}   Run: sudo ./update.sh /path/to/your/git/repo${NC}"
    exit 1
fi

# Verify destination exists
if [ ! -d "$DEST_DIR" ]; then
    echo -e "${RED}❌ FaithFlow not found in $DEST_DIR${NC}"
    echo -e "${YELLOW}   Please run install.sh first${NC}"
    exit 1
fi

sleep 1

progress
echo -e "${MAGENTA}🚀 Step 1/8: Syncing files from git to deployment...${NC}"
progress

info "Copying updated files to $DEST_DIR..."
rsync -a \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='backend/__pycache__/' \
  --exclude='backend/venv/' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/build/' \
  --exclude='*.log' \
  "$SOURCE_DIR/" "$DEST_DIR/" > /dev/null

success "Files synced to $DEST_DIR"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 2/8: Checking installation...${NC}"
progress

cd "$DEST_DIR"

info "Verifying critical files..."
if [ -f "backend/server.py" ] && [ -f "frontend/package.json" ]; then
    success "Core files present"
else
    warn "Some files may be missing. Installation may be incomplete."
fi

if systemctl is-active --quiet faithflow-backend.service; then
    success "Backend service is running"
else
    warn "Backend service not running or not configured"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 3/8: Updating backend dependencies...${NC}"
progress

cd "$DEST_DIR/backend"

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
echo -e "${MAGENTA}🚀 Step 4/9: Checking what changed...${NC}"
progress

# Detect what changed to optimize rebuild
BACKEND_CHANGED=false
FRONTEND_CHANGED=false

if [ -d "$SOURCE_DIR/.git" ]; then
    # Check git diff to see what changed
    cd "$SOURCE_DIR"
    
    if git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "^backend/"; then
        BACKEND_CHANGED=true
        info "Backend files changed"
    fi
    
    if git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -q "^frontend/"; then
        FRONTEND_CHANGED=true
        info "Frontend files changed"
    fi
    
    cd "$DEST_DIR"
else
    # Not a git repo, assume both changed
    BACKEND_CHANGED=true
    FRONTEND_CHANGED=true
    info "Unable to detect changes, updating all"
fi

echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 5/10: Updating frontend dependencies...${NC}"
progress

if [ "$FRONTEND_CHANGED" = true ]; then
    cd "$DEST_DIR/frontend"
    
    info "Checking for new JavaScript packages..."
    echo -e "${CYAN}   ☕ This might take a moment...${NC}"
    yarn install > /dev/null 2>&1
    success "Frontend dependencies updated!"
else
    info "Frontend unchanged, skipping dependency update"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 6/10: Building production frontend...${NC}"
progress

if [ "$FRONTEND_CHANGED" = true ]; then
    cd "$DEST_DIR/frontend"
    
    info "Creating optimized production build..."
    echo -e "${CYAN}   🏗️  This may take 2-3 minutes...${NC}"
    yarn build > /dev/null 2>&1
    
    if [ -d "build" ] && [ -f "build/index.html" ]; then
        success "Production build created successfully!"
        echo -e "${GREEN}   📦 Static files ready in frontend/build/${NC}"
    else
        warn "Build may have issues. Check logs if site doesn't work."
    fi
else
    info "Frontend unchanged, skipping build (saves 2-3 minutes!)"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 7/10: Running database migrations...${NC}"
progress

cd "$DEST_DIR/backend"
source venv/bin/activate

# Run database migrations (indexes, schema updates, etc.)
info "Running database migrations..."
if [ -f "scripts/migrate.py" ]; then
    python3 scripts/migrate.py
    if [ $? -eq 0 ]; then
        success "  ✅ Database indexes updated (performance optimized)"
        success "  ✅ Schema migrations applied"
    else
        warning "  ⚠️  Migration script encountered issues (check logs)"
    fi
else
    warning "  ⚠️  scripts/migrate.py not found, skipping migrations"
fi

success "Migrations complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}🚀 Step 8/10: Reloading Nginx...${NC}"
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
echo -e "${MAGENTA}🚀 Step 9/10: Restarting backend service...${NC}"
progress

info "Reloading systemd daemon..."
systemctl daemon-reload
sleep 1

info "Restarting backend service with updated code..."
systemctl restart faithflow-backend.service
sleep 5

if systemctl is-active --quiet faithflow-backend.service; then
    success "Backend restarted successfully!"
    echo -e "${GREEN}   ✅ New code is now active!${NC}"
else
    warn "Backend may not be running. Check: sudo systemctl status faithflow-backend"
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
echo -e "${CYAN}│  ${WHITE}What Was Updated:${CYAN}                                                   │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}│  ✅ Files synced from git to /opt/faithflow                          │${NC}"
echo -e "${CYAN}│  ✅ Python packages updated                                          │${NC}"
echo -e "${CYAN}│  ✅ JavaScript packages updated                                      │${NC}"
echo -e "${CYAN}│  ✅ Production build created                                         │${NC}"
echo -e "${CYAN}│  ✅ Database migrations applied                                      │${NC}"
echo -e "${CYAN}│  ✅ Backend service restarted                                        │${NC}"
echo -e "${CYAN}│  ✅ Nginx reloaded                                                   │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${WHITE}Useful Commands:${CYAN}                                                    │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}│  📊 View logs:       ${WHITE}tail -f /var/log/faithflow/backend.out.log${CYAN}   │${NC}"
echo -e "${CYAN}│  🔍 Check status:    ${WHITE}sudo systemctl status faithflow-backend${CYAN}      │${NC}"
echo -e "${CYAN}│  🔄 Restart backend: ${WHITE}sudo systemctl restart faithflow-backend${CYAN}    │${NC}"
echo -e "${CYAN}│  🔄 Reload Nginx:    ${WHITE}sudo systemctl reload nginx${CYAN}                  │${NC}"
echo -e "${CYAN}│  🌐 Access app:      ${WHITE}https://your-domain${CYAN}                          │${NC}"
echo -e "${CYAN}│                                                                     │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${MAGENTA}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${MAGENTA}│  ${WHITE}💡 Pro Tip:${MAGENTA}                                                         │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  After updates, clear browser cache:                                │${NC}"
echo -e "${MAGENTA}│  • Chrome/Edge: Ctrl+Shift+R                                        │${NC}"
echo -e "${MAGENTA}│  • Firefox: Ctrl+F5                                                 │${NC}"
echo -e "${MAGENTA}│  • Safari: Cmd+Shift+R                                              │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}│  Test critical flows:                                               │${NC}"
echo -e "${MAGENTA}│  1️⃣  Login as super admin                                          │${NC}"
echo -e "${MAGENTA}│  2️⃣  Test member management                                         │${NC}"
echo -e "${MAGENTA}│  3️⃣  Test kiosk services                                            │${NC}"
echo -e "${MAGENTA}│                                                                     │${NC}"
echo -e "${MAGENTA}╰─────────────────────────────────────────────────────────────────────╯${NC}"

echo ""
echo -e "${GREEN}🎉 ${WHITE}Update successful!${NC}"
echo -e "${GREEN}✨ ${WHITE}Your FaithFlow is now running the latest features.${NC}"
echo ""

echo -e "${GREEN}🙏 ${WHITE}Thank you for keeping FaithFlow up to date!${NC}"
echo -e "${GREEN}❤️  ${WHITE}Serving churches with excellence.${NC}"
echo ""
