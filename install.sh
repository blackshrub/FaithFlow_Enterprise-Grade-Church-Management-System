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
echo -e "${MAGENTA}${ROCKET} Step 1/14: Preparing your system...${NC}"
progress
info "Updating package lists and upgrading system..."
apt update > /dev/null 2>&1 && apt upgrade -y > /dev/null 2>&1
info "Installing essential tools (rsync)..."
apt install -y rsync > /dev/null 2>&1
success "System updated successfully!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 2/14: Installing Python 3.11...${NC}"
progress
info "Python is the backend engine of FaithFlow..."
apt install -y python3.11 python3.11-venv python3-pip python3.11-dev build-essential > /dev/null 2>&1
success "Python 3.11 installed!"
python3.11 --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 3/14: Installing Node.js 20.x...${NC}"
progress
info "Node.js powers the beautiful frontend..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs > /dev/null 2>&1
success "Node.js installed!"
node --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 4/14: Installing Yarn package manager...${NC}"
progress
npm install -g yarn > /dev/null 2>&1
success "Yarn installed!"
yarn --version
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 5/14: Installing MongoDB 7.0...${NC}"
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
echo -e "${MAGENTA}${ROCKET} Step 6/14: Starting MongoDB...${NC}"
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
echo -e "${MAGENTA}${ROCKET} Step 7/14: Installing Supervisor...${NC}"
progress
info "Supervisor manages your services automatically..."
apt install -y supervisor > /dev/null 2>&1
success "Supervisor installed!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 8/14: Installing Nginx web server...${NC}"
progress
info "Nginx will serve your application to the world..."
apt install -y nginx > /dev/null 2>&1
success "Nginx installed!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 9/14: Copying FaithFlow to /opt/faithflow...${NC}"
progress

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="/opt/faithflow"

info "Setting up installation directory..."

# Create /opt/faithflow if doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    mkdir -p "$INSTALL_DIR"
    success "Created $INSTALL_DIR"
fi

# If running from different directory, copy files
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
    info "Copying files from $SCRIPT_DIR to $INSTALL_DIR..."
    rsync -a --exclude='.git' --exclude='node_modules' --exclude='__pycache__' --exclude='venv' "$SCRIPT_DIR/" "$INSTALL_DIR/"
    success "Files copied to $INSTALL_DIR"
else
    info "Already in $INSTALL_DIR"
fi

cd "$INSTALL_DIR"
success "Working directory: $INSTALL_DIR"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 10/14: Setting up FaithFlow backend...${NC}"
progress

info "Creating Python virtual environment..."
cd "$INSTALL_DIR/backend"
python3.11 -m venv venv > /dev/null 2>&1
source venv/bin/activate
info "Installing Python packages (this may take a minute)..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

# Create .env if doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success "Created backend/.env from template"
    else
        warn "backend/.env.example not found, creating basic .env..."
        cat > .env << 'BACKEND_ENV'
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=faithflow_production

# CORS Configuration
CORS_ORIGINS=*

# JWT Secret Key (CHANGE THIS!)
JWT_SECRET_KEY=change-this-to-a-secure-random-string

# WhatsApp API (Configure in admin panel)
WHATSAPP_API_URL=
WHATSAPP_USERNAME=
WHATSAPP_PASSWORD=
BACKEND_ENV
        success "Created backend/.env with defaults"
    fi
else
    info "backend/.env already exists, keeping it"
fi

success "Backend setup complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 11/14: Setting up FaithFlow frontend...${NC}"
progress
cd "$INSTALL_DIR/frontend"

info "Installing JavaScript packages (this will take 2-3 minutes)..."
echo -e "${CYAN}   ☕ Grab a coffee while we prepare the beautiful interface...${NC}"
yarn install > /dev/null 2>&1

# Create .env if doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success "Created frontend/.env from template"
    else
        warn "frontend/.env.example not found, creating basic .env..."
        cat > .env << 'FRONTEND_ENV'
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost

# WebSocket configuration
WDS_SOCKET_PORT=443

# Feature flags
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
FRONTEND_ENV
        success "Created frontend/.env with defaults"
    fi
else
    info "frontend/.env already exists, keeping it"
fi

success "Frontend setup complete!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 12/14: Configuring services...${NC}"
progress

info "Setting up Supervisor to manage FaithFlow..."

# Create supervisord.conf with correct paths
cat > /etc/supervisor/conf.d/faithflow.conf << SUPERVISOR_CONF
[supervisord]
nodaemon=false

[program:backend]
command=/opt/faithflow/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/opt/faithflow/backend
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/backend.out.log
stderr_logfile=/var/log/supervisor/backend.err.log
environment=PYTHONUNBUFFERED="1"

[program:frontend]
command=/usr/bin/yarn start
directory=/opt/faithflow/frontend
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.out.log
stderr_logfile=/var/log/supervisor/frontend.err.log
environment=PORT="3000",HOST="0.0.0.0"
SUPERVISOR_CONF

mkdir -p /var/log/supervisor
touch /var/log/supervisor/backend.out.log
touch /var/log/supervisor/backend.err.log
touch /var/log/supervisor/frontend.out.log
touch /var/log/supervisor/frontend.err.log

supervisorctl reread > /dev/null 2>&1
supervisorctl update > /dev/null 2>&1
success "Supervisor configured with /opt/faithflow paths!"
echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 13/14: Configuring firewall...${NC}"
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

progress
echo -e "${MAGENTA}${ROCKET} Step 14/16: Creating your church and admin account...${NC}"
progress

echo ""
echo -e "${CYAN}${CHURCH} Let's set up your church and admin account!${NC}"
echo ""

# Church information
echo -e "${YELLOW}Church Information:${NC}"
echo ""
read -p "Church Name: " CHURCH_NAME
read -p "Church Address: " CHURCH_ADDRESS
read -p "Church Phone: " CHURCH_PHONE
read -p "Church Email: " CHURCH_EMAIL

echo ""
echo -e "${YELLOW}Admin Account:${NC}"
echo ""
read -p "Admin Full Name: " ADMIN_NAME
read -p "Admin Email: " ADMIN_EMAIL
while true; do
    read -s -p "Admin Password: " ADMIN_PASSWORD
    echo ""
    read -s -p "Confirm Password: " ADMIN_PASSWORD2
    echo ""
    if [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD2" ]; then
        break
    else
        echo -e "${RED}Passwords don't match. Try again.${NC}"
    fi
done

# Create initialization script
info "Creating church and admin account..."

cd "$INSTALL_DIR/backend"
source venv/bin/activate

python3 << INIT_SCRIPT
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

async def initialize():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'faithflow_production')]
    
    # Check if church already exists
    existing_church = await db.churches.find_one({})
    if existing_church:
        print("⚠️  Church already exists, skipping creation...")
        church_id = existing_church['id']
    else:
        # Create church
        church_id = str(uuid.uuid4())
        church = {
            "id": church_id,
            "name": "${CHURCH_NAME}",
            "address": "${CHURCH_ADDRESS}",
            "phone": "${CHURCH_PHONE}",
            "email": "${CHURCH_EMAIL}",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.churches.insert_one(church)
        print(f"✅ Church created: {church['name']}")
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"email": "${ADMIN_EMAIL}"})
    if existing_admin:
        print("⚠️  Admin user already exists, skipping creation...")
    else:
        # Create admin user
        password = "${ADMIN_PASSWORD}"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "email": "${ADMIN_EMAIL}",
            "full_name": "${ADMIN_NAME}",
            "password_hash": hashed.decode('utf-8'),
            "role": "admin",
            "is_active": True,
            "kiosk_pin": "000000",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.users.insert_one(user)
        print(f"✅ Admin user created: {user['email']}")
    
    # Create default church settings
    existing_settings = await db.church_settings.find_one({"church_id": church_id})
    if not existing_settings:
        # Create default member status
        previsitor_status_id = str(uuid.uuid4())
        previsitor_status = {
            "id": previsitor_status_id,
            "church_id": church_id,
            "name": "Pre-Visitor",
            "description": "Person registered via kiosk, not yet a member",
            "color": "#FFA500",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.member_statuses.insert_one(previsitor_status)
        
        settings = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "date_format": "DD-MM-YYYY",
            "time_format": "24h",
            "currency": "IDR",
            "timezone": "Asia/Jakarta",
            "default_language": "id",
            "enable_whatsapp_notifications": False,
            "whatsapp_api_url": "",
            "whatsapp_username": "",
            "whatsapp_password": "",
            "kiosk_settings": {
                "enable_kiosk": True,
                "enable_event_registration": True,
                "enable_prayer": True,
                "enable_counseling": True,
                "enable_groups": True,
                "enable_profile_update": True,
                "home_title": "",
                "home_subtitle": "",
                "default_language": "id",
                "previsitor_status_id": previsitor_status_id,
                "timeout_minutes": 2
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.church_settings.insert_one(settings)
        print("✅ Church settings created")
    
    client.close()
    print("\\n🎉 Database initialization complete!")

asyncio.run(initialize())
INIT_SCRIPT

if [ $? -eq 0 ]; then
    success "Church and admin account created successfully!"
else
    warn "Database initialization had issues. You may need to create admin manually."
fi

echo ""
sleep 1

progress
echo -e "${MAGENTA}${ROCKET} Step 15/16: Configuring Nginx web server...${NC}"
progress

echo ""
echo -e "${CYAN}${GLOBE} Let's configure your domain and SSL certificate!${NC}"
echo ""

# Ask for domain
echo -e "${YELLOW}Do you have a domain name for this installation? (y/n)${NC}"
read -p "Answer: " HAS_DOMAIN

if [ "$HAS_DOMAIN" = "y" ] || [ "$HAS_DOMAIN" = "Y" ]; then
    echo ""
    echo -e "${CYAN}Please enter your domain name (e.g., church.example.com):${NC}"
    read -p "Domain: " DOMAIN_NAME
    
    if [ -n "$DOMAIN_NAME" ]; then
        info "Configuring Nginx for: $DOMAIN_NAME"
        
        cat > /etc/nginx/sites-available/faithflow << NGINX_CONFIG
server {
    listen 80;
    server_name $DOMAIN_NAME;

    # Max upload size for photos/documents
    client_max_body_size 50M;

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONFIG
        
        ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        
        nginx -t > /dev/null 2>&1
        systemctl restart nginx
        
        success "Nginx configured for $DOMAIN_NAME"
        echo ""
        
        # Ask about SSL
        echo -e "${CYAN}${KEY} Would you like to install a FREE SSL certificate? (y/n)${NC}"
        echo -e "${CYAN}   This uses Let's Encrypt (recommended for production)${NC}"
        read -p "Install SSL? " INSTALL_SSL
        
        if [ "$INSTALL_SSL" = "y" ] || [ "$INSTALL_SSL" = "Y" ]; then
            echo ""
            info "Installing Certbot..."
            apt install -y certbot python3-certbot-nginx > /dev/null 2>&1
            
            echo ""
            echo -e "${YELLOW}⚠️  Important: Make sure your domain DNS is pointing to this server!${NC}"
            echo -e "${YELLOW}   Domain: $DOMAIN_NAME should resolve to this server's IP${NC}"
            echo ""
            echo -e "${CYAN}Press Enter when ready to continue with SSL setup...${NC}"
            read
            
            info "Obtaining SSL certificate from Let's Encrypt..."
            echo -e "${CYAN}   (You may be asked for your email address)${NC}"
            echo ""
            
            certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --register-unsafely-without-email || \
            certbot --nginx -d "$DOMAIN_NAME"
            
            if [ $? -eq 0 ]; then
                success "SSL certificate installed successfully!"
                echo -e "${GREEN}   🔒 Your site is now secure with HTTPS!${NC}"
                
                # Update frontend .env with HTTPS URL
                if [ -f "$INSTALL_DIR/frontend/.env" ]; then
                    sed -i "s|http://.*|https://$DOMAIN_NAME|g" "$INSTALL_DIR/frontend/.env"
                    sed -i "s|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=https://$DOMAIN_NAME|g" "$INSTALL_DIR/frontend/.env"
                    info "Updated frontend/.env with HTTPS URL"
                fi
            else
                warn "SSL installation had issues. You can retry later with:"
                echo -e "${YELLOW}   sudo certbot --nginx -d $DOMAIN_NAME${NC}"
            fi
        else
            info "Skipping SSL installation"
            echo -e "${YELLOW}   You can install SSL later with:${NC}"
            echo -e "${YELLOW}   sudo apt install certbot python3-certbot-nginx${NC}"
            echo -e "${YELLOW}   sudo certbot --nginx -d $DOMAIN_NAME${NC}"
        fi
        
        # Update frontend .env with domain
        if [ -f "$INSTALL_DIR/frontend/.env" ]; then
            if [ "$INSTALL_SSL" = "y" ] || [ "$INSTALL_SSL" = "Y" ]; then
                # Already updated above with HTTPS
                true
            else
                sed -i "s|REACT_APP_BACKEND_URL=.*|REACT_APP_BACKEND_URL=http://$DOMAIN_NAME|g" "$INSTALL_DIR/frontend/.env"
                info "Updated frontend/.env with HTTP URL"
            fi
        fi
        
    fi
else
    info "Skipping domain configuration"
    echo -e "${YELLOW}   You can configure Nginx later manually${NC}"
    echo -e "${YELLOW}   See INSTALLATION.md for detailed instructions${NC}"
    
    # Configure Nginx for localhost
    info "Configuring Nginx for localhost access..."
    
    cat > /etc/nginx/sites-available/faithflow << NGINX_LOCAL
server {
    listen 80 default_server;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_LOCAL
    
    ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t > /dev/null 2>&1 && systemctl restart nginx
    success "Nginx configured for localhost access"
fi

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
echo -e "${YELLOW}│     ${WHITE}nano /opt/faithflow/backend/.env${YELLOW}                                  │${NC}"
echo -e "${YELLOW}│     Set MONGO_URL and JWT_SECRET_KEY                                    │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  2️⃣  Start services:                                                     │${NC}"
echo -e "${YELLOW}│     ${WHITE}sudo supervisorctl restart all${YELLOW}                                  │${NC}"
echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  3️⃣  Access your application:                                            │${NC}"

if [ -n "$DOMAIN_NAME" ]; then
    if [ "$INSTALL_SSL" = "y" ] || [ "$INSTALL_SSL" = "Y" ]; then
        echo -e "${YELLOW}│     ${GREEN}Public Kiosk:${YELLOW} https://$DOMAIN_NAME${YELLOW}                           │${NC}"
        echo -e "${YELLOW}│     ${GREEN}Admin Panel:${YELLOW}  https://$DOMAIN_NAME/admin${YELLOW}                     │${NC}"
    else
        echo -e "${YELLOW}│     ${GREEN}Public Kiosk:${YELLOW} http://$DOMAIN_NAME${YELLOW}                            │${NC}"
        echo -e "${YELLOW}│     ${GREEN}Admin Panel:${YELLOW}  http://$DOMAIN_NAME/admin${YELLOW}                      │${NC}"
    fi
else
    echo -e "${YELLOW}│     ${GREEN}Public Kiosk:${YELLOW} http://localhost${YELLOW}  or  ${GREEN}http://your-server-ip${YELLOW}     │${NC}"
    echo -e "${YELLOW}│     ${GREEN}Admin Panel:${YELLOW}  http://localhost/admin${YELLOW}                           │${NC}"
fi

echo -e "${YELLOW}│                                                                             │${NC}"
echo -e "${YELLOW}│  4️⃣  Login with:                                                         │${NC}"
echo -e "${YELLOW}│     ${GREEN}Email:${YELLOW}    ${WHITE}${ADMIN_EMAIL}${YELLOW}                                        │${NC}"
echo -e "${YELLOW}│     ${GREEN}Password:${YELLOW} (the one you entered during installation)                │${NC}"
echo -e "${YELLOW}│     ${GREEN}Church:${YELLOW}   ${WHITE}${CHURCH_NAME}${YELLOW}                                        │${NC}"
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
│  Documentation: /opt/faithflow/INSTALLATION.md                            │
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
