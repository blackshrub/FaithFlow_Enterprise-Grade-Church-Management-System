# FaithFlow Installation Guide - Debian 12

## 💻 System Requirements

### **Minimum Requirements**
- **OS:** Debian 12 (Bookworm)
- **RAM:** 2GB minimum, 4GB recommended
- **CPU:** 2 cores minimum
- **Storage:** 10GB minimum
- **Network:** Internet connection required

### **Recommended Production**
- **RAM:** 8GB+
- **CPU:** 4+ cores
- **Storage:** 50GB+ SSD
- **Network:** Static IP, domain name

---

## 🚀 Quick Installation (Automated)

### **One-Command Install:**

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/faithflow/main/install.sh | bash
```

OR download and run:

```bash
wget https://raw.githubusercontent.com/your-repo/faithflow/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

---

## 🛠️ Manual Installation

### **Step 1: System Update**

```bash
sudo apt update && sudo apt upgrade -y
```

### **Step 2: Install Dependencies**

```bash
# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
sudo npm install -g yarn

# Install MongoDB 7.0
sudo apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Supervisor
sudo apt install -y supervisor
```

### **Step 3: Clone Repository**

```bash
cd /opt
sudo git clone https://github.com/your-repo/faithflow.git
sudo chown -R $USER:$USER /opt/faithflow
cd /opt/faithflow
```

### **Step 4: Backend Setup**

```bash
cd /opt/faithflow/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Configure .env:**
```bash
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=faithflow_production

# CORS Configuration
CORS_ORIGINS=*

# JWT Secret (generate with: python3 -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_SECRET_KEY=your-super-secret-key-here

# WhatsApp API (Optional - configure later in admin panel)
WHATSAPP_API_URL=
WHATSAPP_USERNAME=
WHATSAPP_PASSWORD=
```

### **Step 5: Frontend Setup**

```bash
cd /opt/faithflow/frontend

# Create .env file
cp .env.example .env

# Edit .env
nano .env
```

**Configure .env:**
```bash
# Backend API URL
REACT_APP_BACKEND_URL=https://your-domain.com

# Or for local development:
# REACT_APP_BACKEND_URL=http://localhost:8001

# WebSocket configuration
WDS_SOCKET_PORT=443

# Feature flags
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

**Install dependencies:**
```bash
yarn install
```

### **Step 6: Create Supervisor Configuration**

```bash
sudo nano /etc/supervisor/conf.d/faithflow.conf
```

**Add configuration:**
```ini
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
logfile_maxbytes=50MB
logfile_backups=10
loglevel=info
pidfile=/var/run/supervisord.pid

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
```

**Create log directory:**
```bash
sudo mkdir -p /var/log/supervisor
sudo touch /var/log/supervisor/backend.out.log
sudo touch /var/log/supervisor/backend.err.log
sudo touch /var/log/supervisor/frontend.out.log
sudo touch /var/log/supervisor/frontend.err.log
```

**Reload supervisor:**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

### **Step 7: Create Initial Admin User**

```bash
cd /opt/faithflow/backend
source venv/bin/activate
python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import uuid
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Create church
    church_id = str(uuid.uuid4())
    church = {
        "id": church_id,
        "name": "My Church",
        "address": "123 Main Street",
        "phone": "+1234567890",
        "email": "info@mychurch.com",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.churches.insert_one(church)
    print(f"✅ Church created: {church['name']} ({church_id})")
    
    # Create admin user
    password = "admin123"  # Change this!
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "email": "admin@mychurch.com",
        "full_name": "Admin User",
        "password_hash": hashed.decode('utf-8'),
        "role": "admin",
        "is_active": True,
        "kiosk_pin": "000000",
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    print(f"✅ Admin user created: {user['email']}")
    print(f"   Password: {password}")
    print(f"   Kiosk PIN: 000000")
    
    # Create church settings
    settings = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "date_format": "DD-MM-YYYY",
        "time_format": "24h",
        "currency": "USD",
        "timezone": "UTC",
        "default_language": "en",
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
            "timeout_minutes": 2
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.church_settings.insert_one(settings)
    print(f"✅ Church settings created")
    
    client.close()
    print("\n🎉 Setup complete!")
    print("\nLogin at: http://your-domain.com/admin")
    print(f"Email: {user['email']}")
    print(f"Password: {password}")
    print("\n⚠️  IMPORTANT: Change the password after first login!")

asyncio.run(create_admin())
EOF
```

### **Step 8: Configure Nginx (Production)**

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/faithflow
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (if using build)
    # location / {
    #     root /opt/faithflow/frontend/build;
    #     try_files $uri $uri/ /index.html;
    # }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **Step 9: SSL Certificate (Let's Encrypt)**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### **Step 10: Firewall**

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

---

## 📋 Post-Installation

### **1. Access Application**

```
Admin Panel: https://your-domain.com/admin
Public Kiosk: https://your-domain.com/
```

### **2. Initial Configuration**

1. Login with admin credentials
2. Go to Settings
3. Configure:
   - General settings (timezone, language, currency)
   - WhatsApp API (for OTP and notifications)
   - Kiosk settings (enable/disable services)
   - Member statuses
   - Event categories

### **3. Import Initial Data**

1. Go to Data Admin → Import/Export
2. Download sample Excel template
3. Fill with your member data
4. Import members

### **4. Create Counselors**

1. Go to Spiritual Care → Counseling & Prayer → Counselors
2. Add counselor profiles
3. Set availability rules
4. System will auto-generate time slots

### **5. Create Groups**

1. Go to Groups
2. Create small groups
3. Add leaders and members
4. Configure join settings

### **6. Setup Events**

1. Go to Worship & Events → Events
2. Create event categories
3. Create events
4. Configure RSVP settings

### **7. Configure Kiosk**

1. Go to Settings → Kiosk
2. Enable desired services
3. Set Pre-Visitor default status
4. Configure timeout
5. Set default language
6. Deploy kiosk device (see KIOSK_SETUP.md)

---

## 🔧 Maintenance

### **View Logs**

```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log

# Supervisor status
sudo supervisorctl status
```

### **Restart Services**

```bash
# Restart all
sudo supervisorctl restart all

# Restart backend only
sudo supervisorctl restart backend

# Restart frontend only
sudo supervisorctl restart frontend
```

### **Update Application**

```bash
cd /opt/faithflow
git pull

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd ../frontend
yarn install

# Restart services
sudo supervisorctl restart all
```

### **Database Backup**

```bash
# Create backup
mongodump --db faithflow_production --out /backup/faithflow-$(date +%Y%m%d)

# Restore backup
mongorestore --db faithflow_production /backup/faithflow-20250101
```

### **Automated Daily Backup**

```bash
sudo nano /etc/cron.daily/faithflow-backup
```

**Add:**
```bash
#!/bin/bash
BACKUP_DIR="/backup/faithflow"
mkdir -p $BACKUP_DIR
mongodump --db faithflow_production --out $BACKUP_DIR/$(date +%Y%m%d)
# Keep only last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

```bash
sudo chmod +x /etc/cron.daily/faithflow-backup
```

---

## ✅ Verification

### **Check All Services Running**

```bash
sudo supervisorctl status
```

**Should show:**
```
backend    RUNNING   pid 1234, uptime 0:05:00
frontend   RUNNING   pid 5678, uptime 0:05:00
```

### **Test Endpoints**

```bash
# Test backend
curl http://localhost:8001/api/churches/public/list

# Test frontend
curl http://localhost:3000
```

### **Test Application**

1. Open browser: https://your-domain.com
2. Should see: Church selector (kiosk)
3. Open: https://your-domain.com/admin
4. Should see: Login page
5. Login with admin credentials
6. Should see: Dashboard

---

## 🌐 Production Checklist

**Before going live:**

- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Database backups automated
- [ ] Admin password changed
- [ ] Staff PINs changed from 000000
- [ ] WhatsApp API configured
- [ ] Domain name configured
- [ ] Email tested (if using)
- [ ] All services tested
- [ ] Kiosk tested on actual device
- [ ] Performance tested
- [ ] Security audit completed

---

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

---

## 📞 Support

For installation support:
- Check logs: `/var/log/supervisor/`
- Check MongoDB: `sudo systemctl status mongod`
- Check services: `sudo supervisorctl status`

For technical issues, contact your system administrator.
