#!/bin/bash

################################################################################
# FaithFlow Installation Script for Debian 12
# 
# This script automates the installation of FaithFlow Church Management System
# on a fresh Debian 12 server.
#
# Usage: sudo ./install.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "==========================================================="
echo "  FaithFlow Church Management System"
echo "  Installation Script for Debian 12"
echo "==========================================================="
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}Please run as root (use sudo)${NC}"
   exit 1
fi

# Check Debian version
if [ ! -f /etc/debian_version ]; then
    echo -e "${RED}This script is designed for Debian 12${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}Step 2: Installing Python 3.11...${NC}"
apt install -y python3.11 python3.11-venv python3-pip python3.11-dev build-essential

echo -e "${GREEN}Step 3: Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}Step 4: Installing Yarn...${NC}"
npm install -g yarn

echo -e "${GREEN}Step 5: Installing MongoDB 7.0...${NC}"
apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt-get update
apt-get install -y mongodb-org

echo -e "${GREEN}Step 6: Starting MongoDB...${NC}"
systemctl start mongod
systemctl enable mongod
sleep 3
systemctl status mongod --no-pager

echo -e "${GREEN}Step 7: Installing Supervisor...${NC}"
apt install -y supervisor

echo -e "${GREEN}Step 8: Installing Nginx...${NC}"
apt install -y nginx

echo -e "${GREEN}Step 9: Creating application directory...${NC}"
mkdir -p /opt/faithflow
cd /opt/faithflow

echo -e "${GREEN}Step 10: Cloning repository...${NC}"
echo -e "${YELLOW}Please enter your Git repository URL:${NC}"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${YELLOW}No repository URL provided. Skipping clone.${NC}"
    echo -e "${YELLOW}Please manually clone your repository to /opt/faithflow${NC}"
else
    git clone "$REPO_URL" .
fi

echo -e "${GREEN}Step 11: Setting up backend...${NC}"
cd /opt/faithflow/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file. Please configure it before starting services.${NC}"
fi

echo -e "${GREEN}Step 12: Setting up frontend...${NC}"
cd /opt/faithflow/frontend

# Create .env if doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file. Please configure it before starting services.${NC}"
fi

yarn install

echo -e "${GREEN}Step 13: Configuring Supervisor...${NC}"
cp /opt/faithflow/supervisord.conf /etc/supervisor/conf.d/faithflow.conf

mkdir -p /var/log/supervisor
touch /var/log/supervisor/backend.out.log
touch /var/log/supervisor/backend.err.log
touch /var/log/supervisor/frontend.out.log
touch /var/log/supervisor/frontend.err.log

supervisorctl reread
supervisorctl update

echo -e "${GREEN}Step 14: Setting up Nginx...${NC}"
echo -e "${YELLOW}Do you want to configure Nginx now? (y/n)${NC}"
read -p "Configure Nginx? " CONFIGURE_NGINX

if [ "$CONFIGURE_NGINX" = "y" ] || [ "$CONFIGURE_NGINX" = "Y" ]; then
    echo -e "${YELLOW}Please enter your domain name:${NC}"
    read -p "Domain: " DOMAIN_NAME
    
    if [ -n "$DOMAIN_NAME" ]; then
        cat > /etc/nginx/sites-available/faithflow << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
NGINX_EOF
        
        ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl restart nginx
        
        echo -e "${GREEN}Nginx configured for $DOMAIN_NAME${NC}"
        echo -e "${YELLOW}Run 'sudo certbot --nginx -d $DOMAIN_NAME' to add SSL${NC}"
    fi
fi

echo -e "${GREEN}Step 15: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

echo -e "${GREEN}"
echo "==========================================================="
echo "  Installation Complete!"
echo "==========================================================="
echo -e "${NC}"

echo -e "${GREEN}Services Status:${NC}"
supervisorctl status

echo -e "\n${GREEN}Next Steps:${NC}"
echo "1. Configure backend/.env with your settings"
echo "2. Configure frontend/.env with your domain"
echo "3. Run: cd /opt/faithflow/backend && source venv/bin/activate && python3 create_admin.py"
echo "4. Restart services: sudo supervisorctl restart all"
echo "5. Access admin: http://your-domain.com/admin"
echo "6. Access kiosk: http://your-domain.com/"

echo -e "\n${YELLOW}Important:${NC}"
echo "- Change admin password after first login"
echo "- Change staff PINs from 000000"
echo "- Configure WhatsApp in Settings for OTP"
echo "- Setup SSL with: sudo certbot --nginx -d your-domain.com"

echo -e "\n${GREEN}Installation log saved to: /var/log/faithflow-install.log${NC}"
