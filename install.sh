#!/bin/bash

################################################################################
#                                                                              #
#                         🙏 FaithFlow Installer 🙏                          #
#                                                                              #
#              Church Management System - Automated Setup                     #
#                         For Debian 12 (Bookworm)                            #
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
NC='\033[0m' # No Color

# Emojis for better UX
CHECK="✅"
ROCKET="🚀"
CHURCH="⛪"
GEAR="⚙️"
BOX="📦"
KEY="🔑"
GLOBE="🌍"
SPARKLES="✨"

clear

echo -e "${CYAN}"
cat << "EOF"
╭─────────────────────────────────────────────────────────────────────╮
│                                                                             │
│                     🙏  Welcome to FaithFlow  🙏                          │
│                                                                             │
│                   Church Management System Installer                       │
│                                                                             │
│              This installer will set up everything you need!              │
│                                                                             │
╰─────────────────────────────────────────────────────────────────────╯
EOF
echo -e "${NC}"

sleep 1

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}${CHECK} Oops! This installer needs to run as root.${NC}"
   echo -e "${YELLOW}   Please run: sudo ./install.sh${NC}"
   exit 1
fi

# Check Debian version
if [ ! -f /etc/debian_version ]; then
    echo -e "${RED}${CHECK} This installer is designed for Debian 12${NC}"
    exit 1
fi

DEBIAN_VERSION=$(cat /etc/debian_version | cut -d. -f1)
if [ "$DEBIAN_VERSION" -lt 12 ]; then
    echo -e "${YELLOW}⚠️  Warning: Debian version is $DEBIAN_VERSION. This installer is tested on Debian 12.${NC}"
    read -p "Continue anyway? (y/n) " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

echo -e "${GREEN}${CHECK} System check passed! Let's begin...${NC}"
echo ""
sleep 1

# Progress function
progress() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Success function
success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

# Info function  
info() {
    echo -e "${CYAN}${GEAR} $1${NC}"
}

# Warning function
warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

progress
echo -e "${MAGENTA}${ROCKET} Step 1/12: Preparing your system...${NC}"
progress
info "Updating package lists and upgrading system..."
apt update > /dev/null 2>&1 && apt upgrade -y > /dev/null 2>&1
success "System updated successfully!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 2/12: Installing Python 3.11...${NC}"
progress
info "Python is the backend engine of FaithFlow..."
apt install -y python3.11 python3.11-venv python3-pip python3.11-dev build-essential > /dev/null 2>&1
success "Python 3.11 installed!"
python3.11 --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 3/12: Installing Node.js 20.x...${NC}"
progress
info "Node.js powers the beautiful frontend..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs > /dev/null 2>&1
success "Node.js installed!"
node --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 4/12: Installing Yarn package manager...${NC}"
progress
npm install -g yarn > /dev/null 2>&1
success "Yarn installed!"
yarn --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 5/12: Installing MongoDB 7.0...${NC}"
progress
info "MongoDB will store all your church data securely..."
apt-get install -y gnupg curl > /dev/null 2>&1
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
apt-get update > /dev/null 2>&1
apt-get install -y mongodb-org > /dev/null 2>&1
success "MongoDB installed!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 6/12: Starting MongoDB...${NC}"
progress
systemctl start mongod
systemctl enable mongod > /dev/null 2>&1
sleep 2
if systemctl is-active --quiet mongod; then
    success "MongoDB is running!"
else
    warn "MongoDB failed to start. Please check: sudo systemctl status mongod"
fi
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 7/12: Installing Supervisor...${NC}"
progress
info "Supervisor manages your services automatically..."
apt install -y supervisor > /dev/null 2>&1
success "Supervisor installed!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 8/12: Installing Nginx web server...${NC}"
progress
info "Nginx will serve your application to the world..."
apt install -y nginx > /dev/null 2>&1
success "Nginx installed!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 9/12: Setting up FaithFlow backend...${NC}"
progress

# Get current directory (where script is run from)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

info "Creating Python virtual environment..."
cd backend
python3.11 -m venv venv > /dev/null 2>&1
source venv/bin/activate
info "Installing Python packages (this may take a minute)..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Create .env if doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    success "Created backend/.env from template"
else
    info "backend/.env already exists, keeping it"
fi

success "Backend setup complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 10/12: Setting up FaithFlow frontend...${NC}"
progress
cd "$SCRIPT_DIR/frontend"

info "Installing JavaScript packages (this will take 2-3 minutes)..."
echo -e "${CYAN}   ☕ Grab a coffee while we prepare the beautiful interface...${NC}"
yarn install > /dev/null 2>&1

# Create .env if doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    success "Created frontend/.env from template"
else
    info "frontend/.env already exists, keeping it"
fi

success "Frontend setup complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 11/12: Configuring services...${NC}"
progress

info "Setting up Supervisor to manage FaithFlow..."
cp "$SCRIPT_DIR/supervisord.conf" /etc/supervisor/conf.d/faithflow.conf

mkdir -p /var/log/supervisor
touch /var/log/supervisor/backend.out.log
touch /var/log/supervisor/backend.err.log
touch /var/log/supervisor/frontend.out.log
touch /var/log/supervisor/frontend.err.log

supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1
success "Supervisor configured!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 12/12: Configuring firewall...${NC}"
progress
info "Installing and configuring UFW firewall..."
apt install -y ufw > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1  # SSH
ufw allow 80/tcp > /dev/null 2>&1  # HTTP
ufw allow 443/tcp > /dev/null 2>&1 # HTTPS
success "Firewall configured! (SSH, HTTP, HTTPS allowed)"
echo ""
sleep 1

echo ""
echo -e "${GREEN}"
cat << "EOF"
╭─────────────────────────────────────────────────────────────────────╮
│                                                                             │
│                    ✨  Installation Complete!  ✨                          │
│                                                                             │
│                  FaithFlow is ready to transform your                      │
│                      church management!                                    │
│                                                                             │
╰─────────────────────────────────────────────────────────────────────╯
EOF
echo -e "${NC}"

echo ""
echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${WHITE}What's Installed:${CYAN}                                                      │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}│  ${CHECK} Python 3.11      - Backend engine                                     │${NC}"
echo -e "${CYAN}│  ${CHECK} Node.js 20.x     - Frontend framework                                 │${NC}"
echo -e "${CYAN}│  ${CHECK} MongoDB 7.0      - Database                                          │${NC}"
echo -e "${CYAN}│  ${CHECK} Nginx            - Web server                                        │${NC}"
echo -e "${CYAN}│  ${CHECK} Supervisor       - Service manager                                   │${NC}"
echo -e "${CYAN}│  ${CHECK} UFW Firewall     - Security                                          │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"
echo ""

echo -e "${YELLOW}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${YELLOW}│  ${KEY} Next Steps (Important!):${YELLOW}                                         │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  1️⃣  Configure environment:                                              │${NC}"
echo -e "${YELLOW}│     ${WHITE}nano $SCRIPT_DIR/backend/.env${YELLOW}                                  │${NC}"
echo -e "${YELLOW}│     Set MONGO_URL and JWT_SECRET_KEY                                    │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  2️⃣  Configure frontend:                                                 │${NC}"
echo -e "${YELLOW}│     ${WHITE}nano $SCRIPT_DIR/frontend/.env${YELLOW}                                 │${NC}"
echo -e "${YELLOW}│     Set REACT_APP_BACKEND_URL to your domain                            │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  3️⃣  Create your admin account:                                          │${NC}"
echo -e "${YELLOW}│     ${WHITE}cd $SCRIPT_DIR/backend${YELLOW}                                         │${NC}"
echo -e "${YELLOW}│     ${WHITE}source venv/bin/activate${YELLOW}                                       │${NC}"
echo -e "${YELLOW}│     ${WHITE}python3 add_default_pins.py${YELLOW}                                    │${NC}"
echo -e "${YELLOW}│     (Then create admin via application)                                 │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  4️⃣  Start services:                                                     │${NC}"
echo -e "${YELLOW}│     ${WHITE}sudo supervisorctl restart all${YELLOW}                                  │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  5️⃣  Access your application:                                            │${NC}"
echo -e "${YELLOW}│     ${GREEN}Public Kiosk:${YELLOW} http://localhost${YELLOW}  or  ${GREEN}http://your-domain.com${YELLOW}     │${NC}"
echo -e "${YELLOW}│     ${GREEN}Admin Panel:${YELLOW}  http://localhost/admin${YELLOW}                           │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}╰─────────────────────────────────────────────────────────────────────╯${NC}"
echo ""

echo -e "${CYAN}╭─────────────────────────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│  ${GLOBE} Optional: Setup Domain & SSL${CYAN}                                       │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}│  To enable HTTPS with your domain:                                        │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}│  1. Configure Nginx for your domain                                       │${NC}"
echo -e "${CYAN}│  2. Install SSL certificate:                                              │${NC}"
echo -e "${CYAN}│     ${WHITE}apt install -y certbot python3-certbot-nginx${CYAN}                      │${NC}"
echo -e "${CYAN}│     ${WHITE}certbot --nginx -d your-domain.com${CYAN}                                │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}│  See INSTALLATION.md for detailed Nginx configuration.                    │${NC}"
echo -e "${CYAN}│                                                                             │${NC}"
echo -e "${CYAN}╰─────────────────────────────────────────────────────────────────────╯${NC}"
echo ""

echo -e "${MAGENTA}"
cat << "EOF"
╭─────────────────────────────────────────────────────────────────────╮
│                                                                             │
│  📚  Need Help?                                                              │
│                                                                             │
│  Documentation: $SCRIPT_DIR/INSTALLATION.md                                │
│  Logs: tail -f /var/log/supervisor/backend.out.log                        │
│  Status: sudo supervisorctl status                                        │
│  Restart: sudo supervisorctl restart all                                  │
│                                                                             │
╰─────────────────────────────────────────────────────────────────────╯
EOF
echo -e "${NC}"

echo ""
echo -e "${GREEN}🎉 ${WHITE}Thank you for choosing FaithFlow!${NC}"
echo -e "${GREEN}❤️  ${WHITE}May this system bless your church ministry.${NC}"
echo ""
