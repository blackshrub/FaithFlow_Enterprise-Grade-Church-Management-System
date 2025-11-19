# FaithFlow - Debian Server Deployment Guide

**Complete deployment options for production environment**

---

## Deployment Options

### Option 1: Automated Installation (Recommended)

**Use the one-click installer for easiest deployment:**

```bash
# On your fresh Debian 12 server:
sudo bash install.sh
```

**Features:**
- ✅ Interactive prompts for configuration
- ✅ Automated installation of all dependencies
- ✅ Complete setup in 15-20 minutes
- ✅ Verbose logging
- ✅ Error handling and verification
- ✅ Creates backups and security setup

**See:** `README.md` for installer usage

---

### Option 2: Manual Step-by-Step Deployment

**Follow this guide if you:**
- Need custom configuration
- Want to understand each step
- Are installing on non-Debian systems
- Have special requirements

---

This guide assumes:
- Fresh Debian 12 server
- Root or sudo access
- Basic command-line knowledge
- Domain name pointed to server (for HTTPS)

---

## Table of Contents

1. [Server Preparation](#1-server-preparation)
2. [Install System Dependencies](#2-install-system-dependencies)
3. [Install MongoDB](#3-install-mongodb)
4. [Clone Repository](#4-clone-repository)
5. [Backend Setup](#5-backend-setup)
6. [Frontend Build](#6-frontend-build)
7. [Configure Nginx](#7-configure-nginx)
8. [SSL Certificate](#8-ssl-certificate)
9. [Systemd Services](#9-systemd-services)
10. [Initialize Data](#10-initialize-data)
11. [Smoke Testing](#11-smoke-testing)
12. [Backup Setup](#12-backup-setup)

---

## 1. Server Preparation

### Update System

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

### Create Application User

```bash
sudo adduser faithflow --disabled-password
sudo usermod -aG sudo faithflow
```

### Create Application Directory

```bash
sudo mkdir -p /opt/faithflow
sudo chown faithflow:faithflow /opt/faithflow
```

---

## 2. Install System Dependencies

### Install Build Tools

```bash
sudo apt install -y build-essential git curl wget
sudo apt install -y libssl-dev libffi-dev
sudo apt install -y python3 python3-pip python3-venv
```

### Install Node.js (v18 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v18.x.x
npm --version
```

### Install Git LFS (for large files)

```bash
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash
sudo apt install -y git-lfs
git lfs install
```

### Install FFmpeg (for TTS)

```bash
sudo apt install -y ffmpeg
```

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 3. Install MongoDB

### Option A: Managed MongoDB (Recommended)

Use MongoDB Atlas or managed service:
1. Create cluster
2. Get connection string
3. Whitelist server IP
4. Skip to step 4

### Option B: Local MongoDB Installation

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod

# Verify
sudo systemctl status mongod
```

### Secure MongoDB

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "faithflow_admin",
  pwd: "CHANGE_THIS_STRONG_PASSWORD",
  roles: [{ role: "root", db: "admin" }]
})

# Create application user
use church_management
db.createUser({
  user: "faithflow_app",
  pwd: "CHANGE_THIS_APP_PASSWORD",
  roles: [{ role: "readWrite", db: "church_management" }]
})

exit
```

### Enable Authentication

```bash
sudo nano /etc/mongod.conf
```

Add:
```yaml
security:
  authorization: enabled
```

Restart:
```bash
sudo systemctl restart mongod
```

---

## 4. Clone Repository

### Switch to Application User

```bash
sudo su - faithflow
cd /opt/faithflow
```

### Clone from GitHub

```bash
git clone https://github.com/YOUR-ORG/faithflow.git .

# Pull Git LFS files (Bible data + TTS models)
git lfs pull
```

### Verify Large Files

```bash
# Check Bible files (should be ~35MB total)
ls -lh backend/data/bible/*.json

# Check TTS model (should be ~330MB)
ls -lh backend/models/tts_indonesian/checkpoint.pth
ls -lh backend/models/tts_indonesian/config.json
ls -lh backend/models/tts_indonesian/speakers.pth

# If files are missing or small, Git LFS didn't pull:
git lfs install
git lfs pull
```

---

## 5. Backend Setup

### Create Virtual Environment

```bash
cd /opt/faithflow/backend
python3 -m venv venv
source venv/bin/activate
```

### Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt

# Key dependencies installed:
# - fastapi, uvicorn (web framework)
# - motor (async MongoDB driver)
# - pydantic (data validation)
# - python-jose, passlib (authentication)
# - python-multipart (file uploads)
# - qrcode, pillow (QR code generation)
# - TTS, g2p-id (Indonesian TTS)
# - apscheduler (background jobs for accounting & articles)
# - python-slugify (URL slug generation)
# - bleach (HTML sanitization)

# Installation may take 10-15 minutes
```

### Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env`:

```bash
# MongoDB Connection
MONGO_URL="mongodb://faithflow_app:YOUR_APP_PASSWORD@localhost:27017"
DB_NAME="church_management"

# Security
JWT_SECRET_KEY="GENERATE_LONG_RANDOM_STRING_HERE_MIN_32_CHARS"

# CORS (your domain)
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# WhatsApp Gateway (optional)
WHATSAPP_API_URL="http://your-whatsapp-gateway:3001"
WHATSAPP_USERNAME=""
WHATSAPP_PASSWORD=""
```

**Generate JWT Secret:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Initialize Database

**Import Bible Data:**

```bash
python3 scripts/import_tb_chs.py
python3 scripts/import_english_bibles.py

# Verify
python3 << EOF
from pymongo import MongoClient
c = MongoClient('YOUR_MONGO_URL')
db = c.church_management
print(f"Bible verses: {db.bible_verses.count_documents({})}")
print(f"Should be: 186,592")
EOF
```

**Create Initial Super Admin:**

```bash
python3 scripts/init_db.py

# Or manually via MongoDB:
mongosh YOUR_MONGO_URL
use church_management

db.users.insertOne({
  id: "admin-uuid",
  email: "admin@yourdomain.com",
  password_hash: "BCRYPT_HASH",  # Generate with bcrypt
  role: "super_admin",
  full_name: "System Administrator",
  church_id: null,
  is_active: true,
  created_at: new Date()
})
```

### Test Backend

```bash
# Start in development mode
uvicorn server:app --host 0.0.0.0 --port 8001

# In another terminal, test:
curl http://localhost:8001/api/health
# Should return: {"status": "healthy"}

# Test Bible API:
curl http://localhost:8001/api/bible/versions
# Should return 6 Bible versions

# Stop server (Ctrl+C)
```

---

## 6. Frontend Build

### Install Dependencies

```bash
cd /opt/faithflow/frontend
npm install

# This installs:
# - React, React Router
# - TanStack React Query
# - Tailwind CSS
# - shadcn/ui components
# - Tiptap editor
# - i18n libraries
# May take 5-10 minutes
```

### Configure Frontend Environment

```bash
cp .env.example .env
nano .env
```

Edit:
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
```

**Important:** Use your actual domain (for production)

### Build for Production

```bash
npm run build

# Output will be in: build/
# Verify:
ls -lh build/
# Should see: index.html, static/, etc.
```

---

## 7. Configure Nginx

### Create Site Configuration

```bash
sudo nano /etc/nginx/sites-available/faithflow
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve React frontend
    root /opt/faithflow/frontend/build;
    index index.html;

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to FastAPI backend
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for TTS generation (120 seconds)
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Static files
    location /static {
        alias /opt/faithflow/frontend/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test configuration
sudo nginx -t

# If OK, reload
sudo systemctl reload nginx
```

---

## 8. SSL Certificate (HTTPS)

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renews via systemd timer
sudo systemctl status certbot.timer
```

---

## 9. Systemd Services

### Backend Service

Create service file:

```bash
sudo nano /etc/systemd/system/faithflow-backend.service
```

Paste:

```ini
[Unit]
Description=FaithFlow Backend (FastAPI)
After=network.target mongod.service

[Service]
Type=simple
User=faithflow
Group=faithflow
WorkingDirectory=/opt/faithflow/backend
Environment="PATH=/opt/faithflow/backend/venv/bin"
ExecStart=/opt/faithflow/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/faithflow/backend.log
StandardError=append:/var/log/faithflow/backend-error.log

[Install]
WantedBy=multi-user.target
```

### Create Log Directory

```bash
sudo mkdir -p /var/log/faithflow
sudo chown faithflow:faithflow /var/log/faithflow
```

### Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable faithflow-backend
sudo systemctl start faithflow-backend

# Check status
sudo systemctl status faithflow-backend

# View logs
sudo tail -f /var/log/faithflow/backend.log
```

### Troubleshooting Backend

If service fails:

```bash
# Check logs
journalctl -u faithflow-backend -n 50

# Check if port 8001 is in use
sudo netstat -tulpn | grep 8001

# Test manually
cd /opt/faithflow/backend
source venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

---

## 10. Initialize Data

### Verify Bible Data

```bash
cd /opt/faithflow/backend
source venv/bin/activate

python3 << EOF
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
c = MongoClient(os.environ['MONGO_URL'])
db = c[os.environ['DB_NAME']]

print(f"Bible verses: {db.bible_verses.count_documents({}):,}")
print(f"Bible versions: {db.bible_versions.count_documents({})}")
print(f"Bible books: {db.bible_books.count_documents({})}")

if db.bible_verses.count_documents({}) < 180000:
    print("\nWARNING: Bible data incomplete!")
    print("Run: python3 scripts/import_tb_chs.py")
    print("Run: python3 scripts/import_english_bibles.py")
else:
    print("\n✅ Bible database complete!")
EOF
```

### Create Initial Church

```bash
mongosh YOUR_MONGO_URL

use church_management

db.churches.insertOne({
  id: "church-uuid-1",
  name: "My Church Name",
  address: "Church Address",
  is_active: true,
  created_at: new Date()
})
```

### Create Admin User

Use the initialization script:

```bash
python3 scripts/create_admin.py

# Or manually (requires bcrypt):
python3 << EOF
import bcrypt
password = "your_admin_password"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(f"Hashed password: {hashed.decode('utf-8')}")
EOF

# Then insert to MongoDB:
db.users.insertOne({
  id: "admin-uuid",
  email: "admin@yourdomain.com",
  password_hash: "PASTE_BCRYPT_HASH_HERE",
  role: "admin",
  church_id: "church-uuid-1",
  full_name: "Administrator",
  is_active: true,
  created_at: new Date()
})
```

### Create Accounting Database Indexes ⭐ NEW

**CRITICAL for accounting performance:**

```bash
cd /opt/faithflow/backend
source venv/bin/activate

# Create all accounting indexes (24+ indexes)
python3 scripts/create_accounting_indexes.py
```

**What it does:**
- Creates unique compound indexes for multi-tenancy
- Optimizes queries on `church_id`, `date`, `status`
- Ensures code uniqueness per church (COA, assets, banks)
- Improves pagination performance
- Required for fiscal period enforcement

**Expected output:**
```
Creating accounting indexes...
✓ Chart of Accounts indexes created
✓ Responsibility Centers indexes created
✓ Journals indexes created
✓ Fiscal Periods indexes created
✓ Budgets indexes created
✓ Fixed Assets indexes created
... (16 total)
✅ All accounting indexes created successfully!
```

### Create Uploads Directory ⭐ NEW

For file attachments (receipts, invoices, etc.):

```bash
sudo mkdir -p /app/uploads
sudo chown www-data:www-data /app/uploads
sudo chmod 755 /app/uploads
```

---

## 11. Smoke Testing

### Test Backend API

```bash
# Health check
curl https://yourdomain.com/api/health
# Expected: {"status": "healthy", "database": "connected"}

# Bible API
curl https://yourdomain.com/api/bible/versions
# Expected: Array of 6 Bible versions

# Devotions API (requires auth)
curl https://yourdomain.com/api/devotions/
# Expected: 401 Unauthorized (correct - needs auth)
```

### Test Frontend

1. Open browser: `https://yourdomain.com`
2. Should see FaithFlow login page
3. Login with admin credentials
4. Should redirect to dashboard

### Test Key Features

**Members:**
1. Navigate to Members
2. Click "Add Member"
3. Fill form, save
4. Member should appear in list with personal QR code

**Events:**
1. Navigate to Events
2. Create seat layout (5x10 grid)
3. Create event with RSVP
4. Verify event appears

**Devotions:**
1. Navigate to Content → Devotions
2. Create devotion
3. Add verse (select TB, Kejadian 1:1)
4. Fetch verse → Text should appear
5. Write content
6. Click "Generate Audio"
7. Wait 60-90s → Audio player appears
8. Play audio → Wibowo voice should be clear

**Kiosk:**
1. Navigate to Events → Kiosk Mode
2. Select event
3. Should see fullscreen layout
4. Camera should activate
5. Search should work

---

## 12. Backup Setup

### MongoDB Backup Script

Create `/opt/faithflow/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/faithflow/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="YOUR_MONGO_URL" --out="$BACKUP_DIR/mongo_$DATE"

# Compress
tar -czf "$BACKUP_DIR/mongo_$DATE.tar.gz" "$BACKUP_DIR/mongo_$DATE"
rm -rf "$BACKUP_DIR/mongo_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -name "mongo_*.tar.gz" -mtime +7 -delete

echo "Backup completed: mongo_$DATE.tar.gz"
```

Make executable:
```bash
chmod +x /opt/faithflow/backup.sh
```

### Schedule Daily Backup

```bash
crontab -e
```

Add:
```
0 2 * * * /opt/faithflow/backup.sh >> /var/log/faithflow/backup.log 2>&1
```

### Backup Important Files

```bash
# Environment file
cp /opt/faithflow/backend/.env /opt/faithflow/backups/env_backup

# Bible data (if modified)
tar -czf /opt/faithflow/backups/bible_data.tar.gz /opt/faithflow/backend/data/bible/

# TTS models (if modified)
tar -czf /opt/faithflow/backups/tts_models.tar.gz /opt/faithflow/backend/models/tts_indonesian/
```

### Restore from Backup

```bash
# Restore MongoDB
mongorestore --uri="YOUR_MONGO_URL" --drop /path/to/backup/folder/

# Restore files
tar -xzf bible_data.tar.gz -C /
tar -xzf tts_models.tar.gz -C /
```

---

## Performance Tuning

### MongoDB Indexes

Create indexes for performance:

```javascript
mongosh YOUR_MONGO_URL
use church_management

// Multi-tenant queries
db.members.createIndex({"church_id": 1})
db.events.createIndex({"church_id": 1, "date": -1})
db.devotions.createIndex({"church_id": 1, "date": -1})

// Bible lookups
db.bible_verses.createIndex({"version_code": 1, "book_number": 1, "chapter": 1, "verse": 1})

// Member search
db.members.createIndex({"church_id": 1, "full_name": "text"})
db.members.createIndex({"church_id": 1, "phone_whatsapp": 1})
```

### Uvicorn Workers

Adjust workers based on CPU:
```bash
# In systemd service file:
ExecStart=.../uvicorn server:app --workers 4

# Formula: (2 × CPU cores) + 1
# 2 cores → 5 workers
# 4 cores → 9 workers
```

---

## Monitoring

### Check Service Status

```bash
# Backend
sudo systemctl status faithflow-backend

# Nginx
sudo systemctl status nginx

# MongoDB
sudo systemctl status mongod
```

### View Logs

```bash
# Backend logs
sudo tail -f /var/log/faithflow/backend.log
sudo tail -f /var/log/faithflow/backend-error.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Disk Space

```bash
# Check disk usage
df -h

# FaithFlow directory size
du -sh /opt/faithflow

# MongoDB size
du -sh /var/lib/mongodb

# Bible data: ~35MB
# TTS models: ~330MB
# MongoDB data: Varies (grows with usage)
```

---

## Firewall Setup (Optional)

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable
sudo ufw enable

# Check status
sudo ufw status
```

---

## Updates & Maintenance

### Update Application Code

```bash
cd /opt/faithflow
sudo su - faithflow

# Pull latest code
git pull origin main
git lfs pull  # If models/data updated

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt  # If dependencies changed

# Frontend
cd ../frontend
npm install  # If dependencies changed
npm run build

# Restart services
sudo systemctl restart faithflow-backend
sudo systemctl reload nginx
```

### Database Migrations

If schema changes:
```bash
python3 scripts/migrate_v1_to_v2.py  # If migration script exists
```

---

## Troubleshooting

### Backend Won't Start

**Check:**
1. MongoDB running: `sudo systemctl status mongod`
2. MongoDB connection in `.env`
3. Virtual environment activated
4. All dependencies installed: `pip list | grep -i fastapi`
5. Port 8001 available: `sudo netstat -tulpn | grep 8001`

**Logs:**
```bash
journalctl -u faithflow-backend -n 100
```

### Bible Verses Not Loading

**Check:**
1. Bible data imported:
   ```bash
   python3 -c "from pymongo import MongoClient; print(MongoClient('MONGO_URL').church_management.bible_verses.count_documents({}))"
   ```
2. Should be: 186,592
3. If not, re-run import scripts

### TTS Generation Fails

**Check:**
1. TTS model files exist:
   ```bash
   ls -lh /opt/faithflow/backend/models/tts_indonesian/
   # Should see: checkpoint.pth (330MB), config.json, speakers.pth
   ```
2. Python dependencies:
   ```bash
   pip list | grep -E "TTS|g2p-id|scipy|numpy"
   ```
3. Falls back to gTTS automatically
4. Check backend logs for TTS errors

### Frontend Shows Blank Page

**Check:**
1. Build completed: `ls /opt/faithflow/frontend/build/`
2. Nginx serving correct directory
3. Browser console for errors
4. API connection: Check `REACT_APP_BACKEND_URL` in frontend `.env`

---

## Resource Requirements

### Minimum

- **CPU:** 2 cores
- **RAM:** 4GB
- **Disk:** 20GB
- **Network:** 10 Mbps

### Recommended

- **CPU:** 4 cores (for TTS generation)
- **RAM:** 8GB (TTS model in memory)
- **Disk:** 50GB (for growth)
- **Network:** 100 Mbps

### Storage Breakdown

- Application code: ~500MB
- Bible data: ~35MB
- TTS models: ~330MB
- Node modules: ~500MB
- Python packages: ~2GB
- MongoDB data: Varies (starts small, grows)
- Logs: ~100MB/month

---

## Security Checklist

☐ MongoDB authentication enabled
☐ Strong JWT secret (32+ characters)
☐ HTTPS/SSL configured
☐ Firewall enabled (UFW)
☐ `.env` files NOT committed to git
☐ Regular backups scheduled
☐ Admin password changed from default
☐ Nginx security headers enabled
☐ MongoDB not exposed to internet
☐ Application runs as non-root user

---

## Production Checklist

☐ All services running (backend, nginx, mongodb)
☐ SSL certificate valid
☐ Login works
☐ Can create church/members/events
☐ Bible verse fetch works
☐ TTS audio generates (test short devotion)
☐ Kiosk mode accessible
☐ QR codes generate and scan
☐ WhatsApp configured (if using)
☐ Backups scheduled
☐ Monitoring set up

---

## Support

For issues:
1. Check `/docs/TROUBLESHOOTING.md`
2. Review logs (backend, nginx)
3. Verify all services running
4. Check GitHub issues

---

**Deployment complete! Your FaithFlow system is live! 🎉**
