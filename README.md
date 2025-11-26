# FaithFlow - Church Management System

## 🎯 Overview

FaithFlow is an enterprise-grade, multi-tenant church management system designed for modern churches. It combines comprehensive admin tools with a public-facing kiosk system for visitor and member self-service.

## ✨ Key Features

### **Member Management**
- Complete CRUD with advanced filtering
- Import/Export (Excel, CSV)
- Photo management with base64 storage
- QR code generation for check-in
- Automated status updates with rule engine
- Soft delete with trash bin (14-day retention)
- Demographics tracking
- Document management

### **Events & Worship**
- Event creation and management
- RSVP system with seat assignments
- QR code ticketing
- Event check-in (web + kiosk)
- Seat layout designer
- Photo uploads for events
- Calendar view (list + grid)
- Attendance tracking

### **Spiritual Care**
- Prayer request management
- Counseling appointment system
  - Counselor profiles
  - Recurring availability rules
  - Time slot generation
  - Appointment workflows (pending → approved → completed)
  - Calendar view

### **Groups & Community**
- Small group management
- Group categories (Cell, Ministry, Activity, Support)
- Member management
- Join/Leave request workflows
- Group directory

### **Content & Communication**
- Devotional management
- Article publishing system
  - Categories and tags
  - Comment moderation
  - Scheduled publishing
  - Preview links
- WhatsApp notifications

### **Finance**
- Full accounting system (Chart of Accounts, Journals, Budgets)
- Fixed assets management
- Bank reconciliation
- Fiscal periods
- Responsibility centers
- Reports and year-end closing
- Audit logs

### **Public Kiosk System** 🆕
- Full-screen public interface
- Event registration
- Prayer request submission
- Counseling appointment booking
- Group join requests
- Member profile updates
- Staff event check-in (PIN-protected)
- Multi-tenant church selector
- Phone + OTP authentication via WhatsApp
- Auto Pre-Visitor creation
- Inactivity timeout
- Multi-language (EN + ID)
- Framer Motion animations

### **Admin Features**
- Multi-tenant with church_id scoping
- Role-based access (Super Admin, Admin, Staff)
- JWT authentication
- Webhook system
- API key management
- Import/Export tools
- Comprehensive settings
- Audit trails

## 🏗️ Tech Stack

### **Backend**
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT
- **Scheduler:** APScheduler
- **Process Manager:** Supervisor

### **Frontend**
- **Framework:** React + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack React Query
- **Routing:** React Router v6
- **Animations:** Framer Motion
- **i18n:** react-i18next (English + Indonesian)
- **Forms:** React Hook Form
- **Icons:** Lucide React

### **Infrastructure**
- **Deployment:** Kubernetes (Emergent platform)
- **Build:** Kaniko
- **Process Management:** Supervisord
- **Database:** MongoDB Atlas (production) / Local MongoDB (development)

## 🌍 Multi-Language Support

- **English (en)**
- **Bahasa Indonesia (id)**
- All UI elements translated
- Admin and kiosk interfaces
- 2000+ translation keys

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- API key system for external integrations
- 6-digit PIN for staff kiosk access
- OTP verification via WhatsApp (4-digit)
- Multi-tenant data isolation
- Audit logging for all actions
- Webhook signature verification

## 📊 Architecture

### **Multi-Tenant Design**
- All data scoped by `church_id`
- Complete data isolation
- Church selector for public kiosk
- Separate settings per church

### **API-First**
- RESTful API design
- OpenAPI/Swagger documentation
- Public and protected endpoints
- Ready for mobile app integration

### **Modular Structure**
```
/app/
├── backend/
│   ├── models/          # Pydantic models
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── server.py        # FastAPI app
└── frontend/
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── hooks/       # Custom hooks
    │   ├── services/    # API services
    │   └── i18n/        # Translations
    └── public/
```

## 📱 Mobile App Ready

- Public API endpoints for mobile
- Member authentication ready
- RESTful API design
- JSON responses
- Ready for React Native integration

## 🚀 Getting Started

### Deployment Options

FaithFlow supports two deployment methods:

| Method | Best For | SSL | Scaling |
|--------|----------|-----|---------|
| **Docker + Traefik** | Production, VPS | Auto (Let's Encrypt) | Easy horizontal |
| **Bare Metal** | Custom setups | Manual (Certbot) | Manual |

---

## 🐳 Docker Deployment (Recommended)

### Prerequisites

- **Server**: Ubuntu 22.04+ or Debian 12+ with 2GB+ RAM
- **Docker**: Docker Engine 24+ and Docker Compose v2+
- **Domain**: A domain name you control
- **DNS Access**: Ability to create A records

### Step 1: Domain & DNS Setup

You need **3 DNS records** pointing to your server's IP address:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `@` or `yourdomain.com` | `YOUR_SERVER_IP` | Frontend (React app) |
| A | `api` | `YOUR_SERVER_IP` | Backend API |
| A | `traefik` | `YOUR_SERVER_IP` | Admin dashboard (optional) |

#### Example DNS Configuration

If your domain is `faithflow.church` and server IP is `203.0.113.50`:

```
faithflow.church.        A    203.0.113.50
api.faithflow.church.    A    203.0.113.50
traefik.faithflow.church. A   203.0.113.50
```

#### How to Add DNS Records

**Cloudflare:**
1. Go to DNS settings for your domain
2. Click "Add record"
3. Type: A, Name: `@`, IPv4: `YOUR_SERVER_IP`, Proxy: OFF (gray cloud)
4. Repeat for `api` and `traefik` subdomains

**Namecheap:**
1. Go to Domain List → Manage → Advanced DNS
2. Add A Record: Host: `@`, Value: `YOUR_SERVER_IP`, TTL: Automatic
3. Add A Record: Host: `api`, Value: `YOUR_SERVER_IP`, TTL: Automatic
4. Add A Record: Host: `traefik`, Value: `YOUR_SERVER_IP`, TTL: Automatic

**GoDaddy:**
1. Go to My Products → DNS
2. Click "Add" under Records
3. Type: A, Name: `@`, Value: `YOUR_SERVER_IP`, TTL: 1 Hour
4. Repeat for `api` and `traefik`

> **Important**: Wait 5-15 minutes for DNS propagation before proceeding.

#### Verify DNS Setup

```bash
# Test DNS resolution (replace with your domain)
dig +short faithflow.church
dig +short api.faithflow.church

# Both should return your server IP
```

### Step 2: Server Preparation

SSH into your server and install Docker:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Log out and back in for group changes
exit
```

### Step 3: Clone Repository

```bash
# Clone FaithFlow
git clone https://github.com/your-org/faithflow.git
cd faithflow

# Or download and extract
wget https://github.com/your-org/faithflow/archive/main.zip
unzip main.zip && cd faithflow-main
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.docker.example .env

# Edit configuration
nano .env
```

**Required settings in `.env`:**

```env
# Your domain (without https://)
DOMAIN=faithflow.church

# Email for Let's Encrypt SSL certificates
ACME_EMAIL=admin@faithflow.church

# Generate secure JWT secret (run this command to generate):
# openssl rand -base64 64 | tr -d '\n'
JWT_SECRET=your-64-character-random-string-here

# Optional: AI features
ANTHROPIC_API_KEY=sk-ant-...
STABILITY_API_KEY=sk-...
```

### Step 5: Deploy with Docker

**Option A: Using the install script (recommended)**

```bash
# Make executable
chmod +x docker-install.sh

# Run installer
sudo ./docker-install.sh
```

**Option B: Manual deployment**

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 6: Verify Deployment

Wait 2-3 minutes for SSL certificates, then test:

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Test endpoints
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com/health
```

### Step 7: Initialize Database

```bash
# Run database initialization
docker compose -f docker-compose.prod.yml exec backend python scripts/init_db.py
```

**Default admin credentials:**
- Email: `admin@gkbjtamankencana.org`
- Password: `admin123`

> ⚠️ **Change this password immediately after first login!**

### Step 8: Access Your Application

| Service | URL |
|---------|-----|
| **Frontend** | `https://yourdomain.com` |
| **Admin Panel** | `https://yourdomain.com/admin` |
| **API Docs** | `https://api.yourdomain.com/docs` |
| **Traefik Dashboard** | `https://traefik.yourdomain.com` |

---

## 🔄 Updating FaithFlow (Docker)

```bash
# Pull latest code
git pull

# Run zero-downtime update
sudo ./docker-update.sh

# Or update specific service
sudo ./docker-update.sh --backend
sudo ./docker-update.sh --frontend
```

---

## 🛠️ Docker Commands Reference

```bash
# View all service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f backend  # specific service

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Access MongoDB shell
docker compose -f docker-compose.prod.yml exec mongodb mongosh faithflow

# Backup database
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)
```

---

## 🖥️ Bare Metal Installation

For traditional installation without Docker:

```bash
# Run bare metal installer
sudo ./install.sh

# Update bare metal installation
sudo ./update.sh
```

See [INSTALLATION.md](INSTALLATION.md) for detailed bare metal setup.

---

## 📖 Documentation

- [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md) - Full Docker/Traefik guide
- [Installation Guide](INSTALLATION.md) - Fresh Debian 12 bare-metal installation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Configuration Guide](CONFIGURATION.md) - System configuration
- [Kiosk Setup](KIOSK_SETUP.md) - Public kiosk deployment
- [API Documentation](API.md) - API endpoints reference
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

## 👥 Team

Built with ❤️ for churches worldwide

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For support, please contact your administrator.
