# FaithFlow - Church Management System

> Enterprise-grade, multi-tenant church management system with voice/video calling, real-time messaging, and mobile app support.

---

## Table of Contents

1. [What is FaithFlow?](#what-is-faithflow)
2. [Features](#features)
3. [System Requirements](#system-requirements)
4. [Deployment Options](#deployment-options)
5. [Docker Installation (Recommended)](#docker-installation-recommended)
6. [Manual Installation](#manual-installation-bare-metal)
7. [Updating FaithFlow](#updating-faithflow)
8. [Troubleshooting](#troubleshooting)
9. [File Storage (SeaweedFS)](#file-storage-seaweedfs)
10. [Mobile App Setup](#mobile-app-setup)
11. [FAQ](#faq)
12. [Architecture Overview](#architecture-overview)

---

## What is FaithFlow?

FaithFlow is a complete church management system that helps you:

- **Manage Members**: Track members, visitors, attendance, and demographics
- **Organize Events**: Create events, manage RSVPs, and handle check-ins
- **Voice/Video Calls**: Make calls directly in the app (like WhatsApp)
- **Groups & Communities**: Manage small groups, ministries, and cell groups
- **Spiritual Care**: Handle prayer requests and counseling appointments
- **Giving & Finance**: Track donations and manage church finances
- **Content Publishing**: Post devotionals, articles, and announcements
- **Multi-Church Support**: One installation can serve multiple churches

---

## Features

### For Church Staff

| Feature | Description |
|---------|-------------|
| Member Management | Complete database with photos, contact info, family relationships |
| Event Management | Create events, manage RSVPs, seat assignments, QR tickets |
| Group Management | Small groups, ministries, join/leave workflows |
| Prayer Requests | Receive and track prayer requests |
| Counseling | Book appointments with counselors |
| Content | Publish devotionals, articles, announcements |
| Finance | Accounting, donations, budgets, reports |
| Reports | Attendance, growth, giving reports |

### For Members (Mobile App)

| Feature | Description |
|---------|-------------|
| Voice/Video Calls | Call other members directly |
| Chat | Send messages, photos, files |
| Events | View and register for events |
| Groups | Join groups, see members |
| Bible & Devotions | Daily readings, Bible study |
| Giving | Make donations securely |
| Profile | Update personal information |

### Technical Features

| Feature | Description |
|---------|-------------|
| Multi-tenant | One server, multiple churches |
| Role-based Access | Admin, Staff, Member roles |
| API-first | RESTful API for mobile apps |
| Real-time | Live updates via MQTT |
| Secure | JWT auth, encrypted data |
| Multi-language | English + Indonesian |

---

## System Requirements

### Minimum Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 2 GB | 4 GB |
| **Storage** | 20 GB | 50 GB SSD |
| **OS** | Ubuntu 22.04 or Debian 12 | Ubuntu 22.04 LTS |
| **Network** | Public IP, ports 80/443 | Static IP |

### Required Software

**For Docker Installation:**
- Docker Engine 24+
- Docker Compose v2+

**For Manual Installation:**
- Python 3.11+
- Node.js 20+
- MongoDB 7.0
- Nginx

### Domain & DNS

You need a domain name (e.g., `mychurch.com`) with these DNS records:

| Record Type | Name | Points To | Purpose | Required |
|-------------|------|-----------|---------|----------|
| A | `@` or `mychurch.com` | Your server IP | Main website | Yes |
| A | `api` | Your server IP | Backend API | Yes |
| A | `livekit` | Your server IP | Voice/Video calls | Yes |
| A | `files` | Your server IP | Media file storage | Yes |
| A | `traefik` | Your server IP | Traefik admin dashboard | Optional |
| A | `emqx` | Your server IP | EMQX admin dashboard | Optional |

---

## Deployment Options

| Method | Best For | Difficulty | SSL |
|--------|----------|------------|-----|
| **Docker** (Recommended) | Most users | Easy | Automatic |
| **Manual** | Custom setups | Advanced | Manual |

**We recommend Docker** for most users because:
- One-command installation
- Automatic SSL certificates
- Easy updates
- All services included

---

## Docker Installation (Recommended)

This guide assumes you're starting with a fresh server. Follow every step exactly.

### Step 1: Get a Server

**Option A: Cloud VPS (Recommended)**

Popular providers:
- [DigitalOcean](https://www.digitalocean.com/) - $12/month for 2GB RAM
- [Vultr](https://www.vultr.com/) - $10/month for 2GB RAM
- [Linode](https://www.linode.com/) - $10/month for 2GB RAM
- [Hetzner](https://www.hetzner.com/) - €4/month for 2GB RAM

When creating your server:
- **Choose**: Ubuntu 22.04 LTS
- **Size**: At least 2GB RAM, 2 CPU cores
- **Region**: Choose one close to your users

**Option B: Your Own Server**

Make sure it:
- Has a public IP address
- Can receive traffic on ports 80 and 443
- Runs Ubuntu 22.04 or Debian 12

### Step 2: Connect to Your Server

**On Mac/Linux:**
Open Terminal and run:
```bash
ssh root@YOUR_SERVER_IP
```

**On Windows:**
1. Download [PuTTY](https://www.putty.org/)
2. Enter your server IP
3. Click "Open"
4. Login as `root`

**What you should see:**
```
root@your-server:~#
```

### Step 3: Update Your Server

Copy and paste these commands one at a time:

```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y

# Install required tools
apt install -y curl git
```

**What each command does:**
- `apt update`: Refreshes the list of available software
- `apt upgrade -y`: Updates all installed software to latest versions
- `apt install -y curl git`: Installs tools needed for installation

### Step 4: Set Up Your Domain

Before continuing, you need DNS records pointing to your server.

**Find Your Server IP:**
```bash
curl ifconfig.me
```
This shows your server's public IP address. Write it down.

**Add DNS Records:**

Go to your domain registrar (where you bought your domain) and add these records:

| Type | Name | Value | TTL | Required |
|------|------|-------|-----|----------|
| A | @ | YOUR_SERVER_IP | 3600 | Yes |
| A | api | YOUR_SERVER_IP | 3600 | Yes |
| A | livekit | YOUR_SERVER_IP | 3600 | Yes |
| A | files | YOUR_SERVER_IP | 3600 | Yes |
| A | traefik | YOUR_SERVER_IP | 3600 | Optional |
| A | emqx | YOUR_SERVER_IP | 3600 | Optional |

**Examples by Provider:**

<details>
<summary>Cloudflare</summary>

1. Go to your domain's DNS settings
2. Click "Add record"
3. For each record:
   - Type: A
   - Name: @ (or api, or livekit)
   - IPv4 address: Your server IP
   - Proxy status: DNS only (gray cloud)
   - TTL: Auto
4. Click "Save"
</details>

<details>
<summary>Namecheap</summary>

1. Go to Domain List → Manage → Advanced DNS
2. Click "Add New Record"
3. For each record:
   - Type: A Record
   - Host: @ (or api, or livekit)
   - Value: Your server IP
   - TTL: Automatic
4. Click the checkmark to save
</details>

<details>
<summary>GoDaddy</summary>

1. Go to My Products → DNS
2. Click "Add" under Records
3. For each record:
   - Type: A
   - Name: @ (or api, or livekit)
   - Value: Your server IP
   - TTL: 1 Hour
4. Click "Add Record"
</details>

**Wait for DNS to propagate:**
DNS changes take 5-30 minutes. Verify with:
```bash
dig +short yourdomain.com
dig +short api.yourdomain.com
```
Both should show your server IP.

### Step 5: Download FaithFlow

```bash
# Go to home directory
cd ~

# Clone the repository
git clone https://github.com/your-org/faithflow.git

# Enter the directory
cd faithflow
```

**If git clone fails:**
```bash
# Alternative: Download as zip
wget https://github.com/your-org/faithflow/archive/main.zip
unzip main.zip
mv faithflow-main faithflow
cd faithflow
```

### Step 6: Run the Installer

```bash
# Make the installer executable
chmod +x docker-install.sh

# Run the installer
sudo ./docker-install.sh
```

**The installer will:**
1. Check your server meets requirements
2. Install Docker (if not installed)
3. Ask for your domain name
4. Ask for your email (for SSL certificates)
5. Generate secure passwords
6. Build and start all services
7. Initialize the database

**You'll be asked:**
```
Enter your domain name (e.g., faithflow.church): mychurch.com
Enter email for SSL certificates: admin@mychurch.com
```

**Installation takes 5-15 minutes** depending on your server speed.

### Step 7: Verify Installation

After installation completes, check that everything is running:

```bash
docker compose -f docker-compose.prod.yml ps
```

**You should see:**
```
NAME                        STATUS          PORTS
faithflow-backend           Up (healthy)    8000/tcp
faithflow-coturn            Up (healthy)    3478/tcp, 5349/tcp
faithflow-emqx              Up (healthy)    1883/tcp, 8083/tcp
faithflow-frontend          Up (healthy)    80/tcp
faithflow-livekit           Up (healthy)    7880/tcp, 7881/tcp
faithflow-mongodb           Up (healthy)    27017/tcp
faithflow-seaweedfs-master  Up (healthy)    9333/tcp
faithflow-seaweedfs-volume  Up              8080/tcp
faithflow-seaweedfs-filer   Up              8888/tcp
faithflow-traefik           Up (healthy)    80/tcp, 443/tcp
```

### Step 8: Access Your Application

Wait 2-3 minutes for SSL certificates to be generated, then:

| Service | URL | Notes |
|---------|-----|-------|
| **Web App** | https://yourdomain.com | Main application |
| **Admin Panel** | https://yourdomain.com/admin | Church admin dashboard |
| **API Docs** | https://api.yourdomain.com/docs | Swagger API documentation |
| **Files/Media** | https://files.yourdomain.com | SeaweedFS file storage |
| **Traefik Dashboard** | https://traefik.yourdomain.com | Reverse proxy admin (optional) |
| **EMQX Dashboard** | https://emqx.yourdomain.com | MQTT broker admin (optional) |

**Default Login Credentials:**
```
Email: admin@gkbjtamankencana.org
Password: admin123
```

**IMPORTANT: Change this password immediately after first login!**

### Step 9: First Login

1. Go to https://yourdomain.com
2. Click "Login" or go to /admin
3. Enter the default credentials
4. Go to Settings → Profile
5. Change your password

### Congratulations!

FaithFlow is now installed. See [After Installation](#after-installation) for next steps.

---

## Manual Installation (Bare Metal)

For advanced users who want more control over their setup.

### Prerequisites

- Ubuntu 22.04 LTS or Debian 12
- Root access
- Basic command line knowledge

### Step 1: Update System

```bash
apt update && apt upgrade -y
```

### Step 2: Install Python 3.11

```bash
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
```

### Step 3: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

### Step 4: Install MongoDB 7.0

```bash
# Add MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
apt update
apt install -y mongodb-org

# Start and enable
systemctl start mongod
systemctl enable mongod
```

### Step 5: Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
```

### Step 6: Download FaithFlow

```bash
cd /opt
git clone https://github.com/your-org/faithflow.git
cd faithflow
```

### Step 7: Setup Backend

```bash
cd /opt/faithflow/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure .env:**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=faithflow
JWT_SECRET=your-64-character-secret-here
CORS_ORIGINS=https://yourdomain.com
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

### Step 8: Setup Frontend

```bash
cd /opt/faithflow/frontend

# Install dependencies
yarn install

# Create environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure .env:**
```
REACT_APP_BACKEND_URL=https://yourdomain.com
```

**Build production:**
```bash
yarn build
```

### Step 9: Create Systemd Service

```bash
cat > /etc/systemd/system/faithflow-backend.service << 'EOF'
[Unit]
Description=FaithFlow Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/faithflow/backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/faithflow/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable faithflow-backend
systemctl start faithflow-backend
```

### Step 10: Configure Nginx

```bash
cat > /etc/nginx/sites-available/faithflow << 'EOF'
upstream backend {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 50M;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /docs {
        proxy_pass http://backend;
    }

    location /public {
        proxy_pass http://backend;
    }

    location / {
        root /opt/faithflow/frontend/build;
        try_files $uri /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/faithflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Step 11: Install SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### Step 12: Initialize Database

```bash
cd /opt/faithflow/backend
source venv/bin/activate
python scripts/init_db.py
```

### Step 13: Configure Firewall

```bash
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## Updating FaithFlow

### Docker Update

```bash
cd ~/faithflow

# Pull latest code
git pull

# Run update script
sudo ./docker-update.sh
```

### Manual Update

```bash
cd /opt/faithflow

# Pull latest code
git pull

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Update frontend
cd ../frontend
yarn install
yarn build

# Restart services
systemctl restart faithflow-backend
systemctl reload nginx
```

---

## Troubleshooting

### Common Issues

#### SSL Certificate Not Working

**Symptoms:** Browser shows "Not Secure" or certificate errors

**Solutions:**
1. Wait 2-3 minutes - certificates take time to generate
2. Check DNS is correct: `dig +short yourdomain.com`
3. Check Traefik logs: `docker compose logs traefik`
4. Verify ports 80/443 are open: `ufw status`

#### Services Not Starting

**Symptoms:** `docker compose ps` shows services as "Exited"

**Solutions:**
1. Check logs: `docker compose -f docker-compose.prod.yml logs backend`
2. Check disk space: `df -h`
3. Check memory: `free -h`
4. Restart: `docker compose -f docker-compose.prod.yml restart`

#### Cannot Login

**Symptoms:** Login page shows error

**Solutions:**
1. Check backend is running: `docker compose ps`
2. Check API: `curl https://api.yourdomain.com/health`
3. Check logs: `docker compose logs backend`
4. Try default credentials exactly as shown

#### Voice/Video Calls Not Working

**Symptoms:** Calls fail to connect

**Solutions:**
1. Check LiveKit is running: `docker compose ps livekit`
2. Check firewall ports:
   ```bash
   ufw status
   # Should show: 3478, 5349, 7881, 50000:50100/udp
   ```
3. Check TURN server: `docker compose logs coturn`
4. Verify SERVER_IP is correct in .env file

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f traefik
docker compose -f docker-compose.prod.yml logs -f mongodb
```

### Restarting Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Access

```bash
# Access MongoDB shell
docker compose -f docker-compose.prod.yml exec mongodb mongosh faithflow

# Backup database
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)
```

---

## File Storage (SeaweedFS)

FaithFlow uses **SeaweedFS** for storing all media files - photos, videos, documents, and attachments. This section explains how it works and how to verify it's running correctly.

### What is SeaweedFS?

SeaweedFS is a distributed file storage system. Think of it like "Dropbox for your server" - it stores files and makes them accessible via URLs. It's much better than storing files directly in your database or on the filesystem because:

- **Scalable**: Can handle millions of files
- **Fast**: Optimized for file serving
- **Reliable**: Data is stored with redundancy
- **S3-Compatible**: Works with existing tools

### How SeaweedFS Works

SeaweedFS has three main components (all run automatically in Docker):

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     MASTER      │      │     VOLUME      │      │     FILER       │
│   (Manager)     │◀────▶│   (Storage)     │◀────▶│    (Access)     │
│   Port: 9333    │      │   Port: 8080    │      │   Port: 8888    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                         │                        │
        │    Manages file IDs     │   Stores actual       │   Provides URLs &
        │    and locations        │   file bytes          │   S3-compatible API
        └─────────────────────────┴────────────────────────┘
```

**Simple explanation:**
1. **Master** = The manager who knows where all files are stored
2. **Volume** = The warehouse where actual file data is saved
3. **Filer** = The front desk that gives you URLs to access files

### Accessing Your Files

After installation, your files are available at:

| URL | Purpose |
|-----|---------|
| `https://files.yourdomain.com/` | Public file access |
| `https://files.yourdomain.com/ui/` | Web-based file browser |

### Verifying SeaweedFS is Working

**Step 1: Check containers are running**

```bash
docker compose -f docker-compose.prod.yml ps | grep seaweed
```

You should see:
```
faithflow-seaweedfs-master  Up (healthy)    9333/tcp
faithflow-seaweedfs-volume  Up              8080/tcp
faithflow-seaweedfs-filer   Up              8888/tcp
```

**Step 2: Check the health endpoint**

```bash
curl http://localhost:9333/cluster/status
```

You should see JSON output showing the cluster is healthy.

**Step 3: Test file upload (from inside the server)**

```bash
# Create a test file
echo "Hello FaithFlow!" > /tmp/test.txt

# Upload it via curl
curl -F file=@/tmp/test.txt "http://localhost:8888/test/"

# You should get a response with the file path
```

**Step 4: Access via browser**

1. Open `https://files.yourdomain.com/ui/`
2. You should see a file browser interface
3. Navigate to see your uploaded files

### Understanding File URLs

When you upload a file through FaithFlow, it gets a URL like:

```
https://files.yourdomain.com/members/photos/abc123.jpg
```

The structure is:
- `files.yourdomain.com` - Your file server
- `members/photos/` - Category folder
- `abc123.jpg` - The actual file

### Storage Location

Files are stored in Docker volumes:
- `seaweedfs_master_data` - Metadata about files
- `seaweedfs_volume_data` - Actual file contents
- `seaweedfs_filer_data` - File system index

To see storage usage:
```bash
docker volume ls | grep seaweed
docker system df -v | grep seaweed
```

### Backing Up SeaweedFS Data

**Option 1: Volume backup (recommended)**
```bash
# Stop services first
docker compose -f docker-compose.prod.yml stop

# Backup volumes
docker run --rm -v faithflow_seaweedfs_volume_data:/data -v $(pwd):/backup \
    alpine tar czf /backup/seaweedfs-backup-$(date +%Y%m%d).tar.gz /data

# Restart services
docker compose -f docker-compose.prod.yml start
```

**Option 2: Export via Filer**
```bash
# Export all files to a local directory
docker compose exec seaweedfs-filer sh -c "weed filer.backup -dir /data/export"
```

### Restoring SeaweedFS Data

```bash
# Stop services
docker compose -f docker-compose.prod.yml stop

# Remove old volume
docker volume rm faithflow_seaweedfs_volume_data

# Restore from backup
docker run --rm -v faithflow_seaweedfs_volume_data:/data -v $(pwd):/backup \
    alpine tar xzf /backup/seaweedfs-backup-YYYYMMDD.tar.gz -C /

# Start services
docker compose -f docker-compose.prod.yml start
```

### Troubleshooting SeaweedFS

#### Files Not Loading

**Symptoms:** Images/files show as broken in the app

**Solutions:**
1. Check Filer is running: `docker compose ps seaweedfs-filer`
2. Check DNS: `dig +short files.yourdomain.com`
3. Check SSL: `curl -v https://files.yourdomain.com/`
4. View logs: `docker compose logs seaweedfs-filer`

#### Upload Fails

**Symptoms:** File upload returns error

**Solutions:**
1. Check Volume server: `docker compose ps seaweedfs-volume`
2. Check disk space: `df -h`
3. Check file size limit (default 100MB)
4. View logs: `docker compose logs seaweedfs-volume`

#### Master Not Healthy

**Symptoms:** Health check fails

**Solutions:**
1. Restart master: `docker compose restart seaweedfs-master`
2. Check port 9333 is not in use: `netstat -tlnp | grep 9333`
3. View logs: `docker compose logs seaweedfs-master`

### File Size Limits

Default limits in FaithFlow:
- Images: 10 MB
- Videos: 100 MB
- Documents: 25 MB

To change limits, edit your `.env` file:
```
SEAWEEDFS_MAX_IMAGE_SIZE=10485760
SEAWEEDFS_MAX_VIDEO_SIZE=104857600
SEAWEEDFS_MAX_DOCUMENT_SIZE=26214400
```

---

## Mobile App Setup

### For Developers

The mobile app is built with React Native (Expo).

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start
```

### Building for Production

```bash
# iOS (requires Mac)
eas build --platform ios

# Android
eas build --platform android
```

### Configuring the Mobile App

Edit `mobile/app.json`:
```json
{
  "extra": {
    "apiUrl": "https://api.yourdomain.com"
  }
}
```

---

## FAQ

### General Questions

**Q: How much does FaithFlow cost?**
A: FaithFlow is open-source and free to use. You only pay for server hosting.

**Q: Can I use FaithFlow for multiple churches?**
A: Yes! FaithFlow is multi-tenant. One installation can serve multiple churches with complete data isolation.

**Q: Do I need technical knowledge to install?**
A: The Docker installation is designed to be simple. If you can follow instructions, you can install FaithFlow.

### Technical Questions

**Q: Can I use my own MongoDB?**
A: Yes. Edit the MONGO_URL in your .env file.

**Q: How do I backup my data?**
A: For Docker:
```bash
docker compose exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./my-backup
```

**Q: How do I restore from backup?**
A:
```bash
docker cp ./my-backup faithflow-mongodb:/backup
docker compose exec mongodb mongorestore /backup
```

**Q: What ports need to be open?**
A:
- 80 (HTTP)
- 443 (HTTPS)
- 3478/udp, 3478/tcp (STUN/TURN)
- 5349/tcp, 5349/udp (STUN/TURN TLS)
- 7881/tcp (LiveKit)
- 50000-50100/udp (WebRTC)

### Support

**Q: Where can I get help?**
A:
- GitHub Issues: Report bugs and request features
- Documentation: This README and /docs folder
- Community: Join our Discord server

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                  INTERNET                                      │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          TRAEFIK (Reverse Proxy)                               │
│                    Handles SSL, routing, load balancing                        │
│                              Ports: 80, 443                                    │
│   yourdomain.com │ api.* │ livekit.* │ files.*                                │
└────┬─────────────────┬───────────────┬───────────────┬───────────────┬────────┘
     │                 │               │               │               │
     ▼                 ▼               ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ FRONTEND │    │ BACKEND  │    │ LIVEKIT  │    │ SEAWEED  │    │   EMQX   │
│  (React) │    │(FastAPI) │    │ (WebRTC) │    │ (Files)  │    │  (MQTT)  │
│ Port: 80 │    │Port: 8000│    │Port: 7880│    │Port: 8888│    │Port: 1883│
└──────────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └──────────┘
                     │               │               │
                     ▼               ▼               ▼
               ┌──────────┐    ┌──────────┐    ┌──────────────────────────┐
               │ MONGODB  │    │  COTURN  │    │      SEAWEEDFS           │
               │ Database │    │(TURN/NAT)│    │ Master (9333)            │
               │Port:27017│    │Port: 3478│    │ Volume (8080)            │
               └──────────┘    └──────────┘    │ Filer  (8888)            │
                                               └──────────────────────────┘
```

**Service Roles:**

| Service | Purpose | Access URL |
|---------|---------|------------|
| **Traefik** | SSL termination, routing | Internal |
| **Frontend** | Web application UI | https://yourdomain.com |
| **Backend** | REST API, business logic | https://api.yourdomain.com |
| **LiveKit** | Voice/video calls | https://livekit.yourdomain.com |
| **SeaweedFS** | File storage (photos, videos) | https://files.yourdomain.com |
| **EMQX** | Real-time messaging (MQTT) | wss://yourdomain.com/mqtt |
| **MongoDB** | Database | Internal only |
| **coTURN** | NAT traversal for calls | Internal (UDP 3478, 5349) |

---

## License

Proprietary - All rights reserved

---

## Credits

Built with these amazing open-source projects:

| Technology | Purpose | Website |
|------------|---------|---------|
| **FastAPI** | Backend API framework | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) |
| **React** | Frontend web framework | [react.dev](https://react.dev/) |
| **React Native** | Mobile app framework | [reactnative.dev](https://reactnative.dev/) |
| **MongoDB** | Database | [mongodb.com](https://www.mongodb.com/) |
| **LiveKit** | Voice/Video WebRTC SFU | [livekit.io](https://livekit.io/) |
| **EMQX** | MQTT message broker | [emqx.io](https://www.emqx.io/) |
| **coTURN** | TURN/STUN server for NAT | [github.com/coturn](https://github.com/coturn/coturn) |
| **SeaweedFS** | Distributed file storage | [seaweedfs.com](https://seaweedfs.com/) |
| **Traefik** | Reverse proxy & SSL | [traefik.io](https://traefik.io/) |
| **Docker** | Containerization | [docker.com](https://www.docker.com/) |

---

*FaithFlow - Empowering churches with technology*
