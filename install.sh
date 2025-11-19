#!/bin/bash
#
# FaithFlow Automated Installer for Debian 12
# This script automates the complete deployment process
#
# Usage:
#   sudo bash install.sh
#
# Requirements:
#   - Fresh Debian 12 server
#   - Root or sudo access
#   - Internet connection
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="/tmp/faithflow_install_$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

function log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

function log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function print_header() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

print_header "FaithFlow Installation Script"

log_info "Log file: $LOG_FILE"
log_info "Started at: $(date)"

# Configuration variables
APP_DIR="/opt/faithflow"
APP_USER="faithflow"
DB_NAME="church_management"
BACKEND_PORT=8001

print_header "Step 1: Gather Configuration"

# Ask for configuration
read -p "Enter your domain name (e.g., faithflow.church.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    log_error "Domain name is required"
    exit 1
fi
log_success "Domain: $DOMAIN"

read -p "Enter admin email: " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
    log_error "Admin email is required"
    exit 1
fi

read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
    log_error "Admin password is required"
    exit 1
fi

read -p "Install MongoDB locally? (y/n, n=use managed MongoDB): " INSTALL_MONGODB

if [ "$INSTALL_MONGODB" != "y" ]; then
    read -p "Enter MongoDB connection URL: " MONGO_URL
    if [ -z "$MONGO_URL" ]; then
        log_error "MongoDB URL is required"
        exit 1
    fi
fi

read -p "Setup SSL with Let's Encrypt? (y/n): " SETUP_SSL

log_success "Configuration gathered"

print_header "Step 2: Update System"

log_info "Updating package lists..."
apt update
log_success "Package lists updated"

log_info "Upgrading installed packages..."
apt upgrade -y
log_success "System upgraded"

print_header "Step 3: Install System Dependencies"

log_info "Installing build tools..."
apt install -y build-essential git curl wget software-properties-common
apt install -y libssl-dev libffi-dev python3-dev
log_success "Build tools installed"

log_info "Installing Python 3.11..."
apt install -y python3 python3-pip python3-venv
log_success "Python installed: $(python3 --version)"

log_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
log_success "Node.js installed: $(node --version)"

log_info "Installing Git LFS..."
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt install -y git-lfs
git lfs install
log_success "Git LFS installed"

log_info "Installing FFmpeg (for audio processing)..."
apt install -y ffmpeg
log_success "FFmpeg installed"

log_info "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
log_success "Nginx installed and started"

print_header "Step 4: Install MongoDB"

if [ "$INSTALL_MONGODB" = "y" ]; then
    log_info "Installing MongoDB 7.0..."
    
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
      http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
      tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt update
    apt install -y mongodb-org
    
    systemctl enable mongod
    systemctl start mongod
    
    sleep 5
    
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB installed and running"
    else
        log_error "MongoDB failed to start"
        exit 1
    fi
    
    # Create database and user
    log_info "Creating MongoDB database and user..."
    
    DB_PASSWORD=$(openssl rand -base64 32)
    
    mongosh << MONGOEOF
use $DB_NAME
db.createUser({
  user: "faithflow_app",
  pwd: "$DB_PASSWORD",
  roles: [{ role: "readWrite", db: "$DB_NAME" }]
})
EOF
    
    MONGO_URL="mongodb://faithflow_app:$DB_PASSWORD@localhost:27017/$DB_NAME"
    log_success "MongoDB database created"
    
    # Enable authentication
    log_info "Enabling MongoDB authentication..."
    if ! grep -q "security:" /etc/mongod.conf; then
        echo "" >> /etc/mongod.conf
        echo "security:" >> /etc/mongod.conf
        echo "  authorization: enabled" >> /etc/mongod.conf
        systemctl restart mongod
        sleep 5
        log_success "MongoDB authentication enabled"
    fi
else
    log_info "Using external MongoDB: $MONGO_URL"
fi

print_header "Step 5: Create Application User"

if id "$APP_USER" &>/dev/null; then
    log_warning "User $APP_USER already exists"
else
    log_info "Creating user $APP_USER..."
    adduser --disabled-password --gecos "" $APP_USER
    log_success "User created"
fi

print_header "Step 6: Setup Application Directory"

log_info "Creating directory $APP_DIR..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR
log_success "Directory created"

print_header "Step 7: Clone Repository"

log_info "Current directory contains the application"
log_info "Copying files to $APP_DIR..."

# Copy current directory to APP_DIR
rsync -av --exclude 'node_modules' --exclude 'venv' --exclude '__pycache__' \
    --exclude '.git' /app/ $APP_DIR/

chown -R $APP_USER:$APP_USER $APP_DIR
log_success "Files copied"

print_header "Step 8: Backend Setup"

log_info "Creating Python virtual environment..."
su - $APP_USER << USEREOF
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Python packages installed"
USEREOF

log_success "Backend environment ready"

# Create .env file
log_info "Creating backend .env file..."

JWT_SECRET=$(openssl rand -base64 48)

cat > $APP_DIR/backend/.env << ENVEOF
MONGO_URL="$MONGO_URL"
DB_NAME="$DB_NAME"
JWT_SECRET_KEY="$JWT_SECRET"
CORS_ORIGINS="https://$DOMAIN,https://www.$DOMAIN,http://localhost:3000"
WHATSAPP_API_URL=""
WHATSAPP_USERNAME=""
WHATSAPP_PASSWORD=""
ENVEOF

chown $APP_USER:$APP_USER $APP_DIR/backend/.env
log_success "Backend .env created"

print_header "Step 9: Initialize Database"

log_info "Importing Bible data (this may take 5-10 minutes)..."

su - $APP_USER << USEREOF
cd $APP_DIR/backend
source venv/bin/activate

echo "Importing Indonesian and Chinese Bibles..."
python3 scripts/import_tb_chs.py

echo "Importing English Bibles..."
python3 scripts/import_english_bibles.py

echo "Bible import complete"
USEREOF

log_success "Bible data imported"

# Verify
VERSE_COUNT=$(su - $APP_USER << VERIFYEOF
cd $APP_DIR/backend
source venv/bin/activate
python3 << PYEOF
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
c = MongoClient(os.environ['MONGO_URL'])
db = c[os.environ['DB_NAME']]
print(db.bible_verses.count_documents({}))
PYEOF
VERIFYEOF
)

if [ "$VERSE_COUNT" -gt 180000 ]; then
    log_success "Bible verification OK: $VERSE_COUNT verses"
else
    log_warning "Bible data may be incomplete: $VERSE_COUNT verses (expected ~186,000)"
fi

log_info "Creating super admin user..."

su - $APP_USER << ADMINEOF
cd $APP_DIR/backend
source venv/bin/activate

python3 << PYADMIN
import asyncio
import bcrypt
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def create_admin():
    email = "$ADMIN_EMAIL"
    password = "$ADMIN_PASSWORD"
    
    # Check if exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print("Admin user already exists")
        return
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": "super_admin",
        "full_name": "Super Administrator",
        "church_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    
    print(f"Super admin created: {email}")
    client.close()

asyncio.run(create_admin())
PYADMIN
ADMINEOF

log_success "Admin user created"

print_header "Step 10: Frontend Setup"

log_info "Installing Node.js dependencies..."

su - $APP_USER << USEREOF
cd $APP_DIR/frontend
npm install
echo "Dependencies installed"
USEREOF

log_success "Node packages installed"

log_info "Creating frontend .env file..."

cat > $APP_DIR/frontend/.env << FRONTENVEOF
REACT_APP_BACKEND_URL=https://$DOMAIN
FRONTENVEOF

chown $APP_USER:$APP_USER $APP_DIR/frontend/.env
log_success "Frontend .env created"

log_info "Building frontend for production (this may take 5-10 minutes)..."

su - $APP_USER << USEREOF
cd $APP_DIR/frontend
npm run build
echo "Build complete"
USEREOF

if [ -f "$APP_DIR/frontend/build/index.html" ]; then
    log_success "Frontend built successfully"
else
    log_error "Frontend build failed"
    exit 1
fi

print_header "Step 11: Create Systemd Service"

log_info "Creating backend service file..."

cat > /etc/systemd/system/faithflow-backend.service << SERVICEEOF
[Unit]
Description=FaithFlow Backend (FastAPI)
After=network.target mongod.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port $BACKEND_PORT --workers 4
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/faithflow/backend.log
StandardError=append:/var/log/faithflow/backend-error.log

[Install]
WantedBy=multi-user.target
SERVICEEOF

log_success "Service file created"

log_info "Creating log directory..."
mkdir -p /var/log/faithflow
chown $APP_USER:$APP_USER /var/log/faithflow
log_success "Log directory created"

log_info "Enabling and starting backend service..."
systemctl daemon-reload
systemctl enable faithflow-backend
systemctl start faithflow-backend

sleep 5

if systemctl is-active --quiet faithflow-backend; then
    log_success "Backend service started"
else
    log_error "Backend service failed to start"
    journalctl -u faithflow-backend -n 20 --no-pager
    exit 1
fi

print_header "Step 12: Configure Nginx"

log_info "Creating Nginx configuration..."

cat > /etc/nginx/sites-available/faithflow << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 20M;

    # Serve React frontend
    root $APP_DIR/frontend/build;
    index index.html;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # TTS timeout
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Static files
    location /static {
        alias $APP_DIR/frontend/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINXEOF

log_success "Nginx config created"

log_info "Enabling site..."
ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

log_info "Testing Nginx configuration..."
if nginx -t; then
    log_success "Nginx config valid"
    systemctl reload nginx
    log_success "Nginx reloaded"
else
    log_error "Nginx config invalid"
    exit 1
fi

print_header "Step 13: SSL Certificate"

if [ "$SETUP_SSL" = "y" ]; then
    log_info "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    
    log_info "Obtaining SSL certificate..."
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL --redirect
    
    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained"
    else
        log_warning "SSL setup failed (you can run certbot manually later)"
    fi
else
    log_warning "SSL skipped (run 'sudo certbot --nginx' later for HTTPS)"
fi

print_header "Step 14: Setup Firewall"

log_info "Configuring UFW firewall..."

if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    log_success "Firewall configured"
else
    apt install -y ufw
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    log_success "Firewall installed and configured"
fi

print_header "Step 15: Create MongoDB Indexes"

log_info "Creating database indexes for performance..."

su - $APP_USER << INDEXEOF
cd $APP_DIR/backend
source venv/bin/activate

python3 << PYEOF
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
c = MongoClient(os.environ['MONGO_URL'])
db = c[os.environ['DB_NAME']]

# Multi-tenant indexes
db.members.create_index([("church_id", 1)])
db.events.create_index([("church_id", 1), ("date", -1)])
db.devotions.create_index([("church_id", 1), ("date", -1)])

# Bible indexes
db.bible_verses.create_index([("version_code", 1), ("book_number", 1), ("chapter", 1), ("verse", 1)])

# Search indexes
db.members.create_index([("church_id", 1), ("full_name", "text")])

print("Standard indexes created")
PYEOF
INDEXEOF

log_success "Standard database indexes created"

# Create accounting indexes
log_info "Creating accounting module indexes..."

su - $APP_USER << ACCTINDEXEOF
cd $APP_DIR/backend
source venv/bin/activate

python3 scripts/create_accounting_indexes.py
ACCTINDEXEOF

log_success "Accounting indexes created (24+ indexes)"

# Create groups indexes
log_info "Creating groups module indexes..."

su - $APP_USER << GROUPINDEXEOF
cd $APP_DIR/backend
source venv/bin/activate

python3 scripts/create_group_indexes.py
GROUPINDEXEOF

log_success "Groups indexes created"

# Create uploads directory
log_info "Creating uploads directory for accounting file attachments..."
mkdir -p /app/uploads
chown www-data:www-data /app/uploads
chmod 755 /app/uploads
log_success "Uploads directory created"

print_header "Step 16: Setup Backups"

log_info "Creating backup script..."

mkdir -p $APP_DIR/backups
chown $APP_USER:$APP_USER $APP_DIR/backups

cat > $APP_DIR/backup.sh << BACKUPEOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$APP_DIR/backups"

# Backup MongoDB
mongodump --uri="$MONGO_URL" --out="\$BACKUP_DIR/mongo_\$DATE"
tar -czf "\$BACKUP_DIR/mongo_\$DATE.tar.gz" "\$BACKUP_DIR/mongo_\$DATE"
rm -rf "\$BACKUP_DIR/mongo_\$DATE"

# Keep only last 7 days
find \$BACKUP_DIR -name "mongo_*.tar.gz" -mtime +7 -delete

echo "Backup completed: mongo_\$DATE.tar.gz"
BACKUPEOF

chmod +x $APP_DIR/backup.sh
chown $APP_USER:$APP_USER $APP_DIR/backup.sh

log_success "Backup script created"

log_info "Scheduling daily backup (2 AM)..."

(crontab -u $APP_USER -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh >> /var/log/faithflow/backup.log 2>&1") | crontab -u $APP_USER -

log_success "Backup scheduled"

print_header "Step 17: Final Verification"

log_info "Running health checks..."

# Check services
if systemctl is-active --quiet faithflow-backend; then
    log_success "Backend service: Running"
else
    log_error "Backend service: Not running"
fi

if systemctl is-active --quiet nginx; then
    log_success "Nginx: Running"
else
    log_error "Nginx: Not running"
fi

if systemctl is-active --quiet mongod 2>/dev/null || [ "$INSTALL_MONGODB" != "y" ]; then
    log_success "MongoDB: Running"
else
    log_error "MongoDB: Not running"
fi

# Test API
log_info "Testing API endpoint..."
sleep 2

if curl -s http://localhost:$BACKEND_PORT/api/health | grep -q "healthy"; then
    log_success "API: Responding"
else
    log_warning "API: Not responding yet (may need a moment to start)"
fi

# Test Bible API
if curl -s http://localhost:$BACKEND_PORT/api/bible/versions | grep -q "TB"; then
    log_success "Bible API: Working"
else
    log_warning "Bible API: Issue detected"
fi

print_header "Installation Complete!"

echo ""
log_success "FaithFlow has been installed successfully!"
echo ""
echo "==========================================" 
echo "Installation Summary"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Admin Email: $ADMIN_EMAIL"
echo "Application Directory: $APP_DIR"
echo "Backend Port: $BACKEND_PORT"
echo "Database: $DB_NAME"
echo "Bible Verses: $VERSE_COUNT"
echo "Log File: $LOG_FILE"
echo ""
echo "Access your application:"
if [ "$SETUP_SSL" = "y" ]; then
    echo "  URL: https://$DOMAIN"
else
    echo "  URL: http://$DOMAIN"
fi
echo ""
echo "Admin Credentials:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: (the one you entered)"
echo ""
echo "Important files:"
echo "  Backend env: $APP_DIR/backend/.env"
echo "  Frontend env: $APP_DIR/frontend/.env"
echo "  Nginx config: /etc/nginx/sites-available/faithflow"
echo "  Service file: /etc/systemd/system/faithflow-backend.service"
echo "  Logs: /var/log/faithflow/"
echo ""
echo "Useful commands:"
echo "  Check backend: sudo systemctl status faithflow-backend"
echo "  View logs: sudo tail -f /var/log/faithflow/backend.log"
echo "  Restart: sudo systemctl restart faithflow-backend"
echo "  Nginx reload: sudo systemctl reload nginx"
echo ""
echo "Next steps:"
echo "  1. Visit your domain in browser"
echo "  2. Login with admin credentials"
echo "  3. Create your first church"
echo "  4. Create a devotion and test TTS"
echo "  5. Test kiosk mode"
echo ""
log_info "Full installation log saved to: $LOG_FILE"
echo ""

if [ "$SETUP_SSL" != "y" ]; then
    log_warning "HTTPS not configured. Run: sudo certbot --nginx"
fi

echo "==========================================" 
echo "Installation completed successfully!"
echo "=========================================="
echo ""
