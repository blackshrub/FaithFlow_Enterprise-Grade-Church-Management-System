# FaithFlow - Church Management System

> Enterprise-grade, multi-tenant church management system with WhatsApp-style messaging, voice/video calling, Bible study tools, and mobile app support.

---

## Quick Start (5 Minutes)

**Want to get started right away?** Just run these 3 commands on a fresh Ubuntu 22.04 or Debian 12 server:

```bash
# 1. Download FaithFlow
git clone https://github.com/your-org/faithflow.git && cd faithflow

# 2. Run the installer (it will ask for your domain name)
sudo ./docker-install.sh

# 3. Done! Open https://yourdomain.com in your browser
```

That's it! The installer handles everything automatically.

---

## Table of Contents

1. [What is FaithFlow?](#what-is-faithflow)
2. [Features](#features)
3. [System Requirements](#system-requirements)
4. [Installation Guide](#installation-guide)
   - [Docker Installation (Recommended)](#docker-installation-recommended)
   - [Manual Installation](#manual-installation-bare-metal)
5. [Updating FaithFlow](#updating-faithflow)
6. [Troubleshooting](#troubleshooting)
7. [File Storage (SeaweedFS)](#file-storage-seaweedfs)
8. [Mobile App Setup](#mobile-app-setup)
9. [FAQ](#faq)
10. [Architecture Overview](#architecture-overview)

---

## What is FaithFlow?

FaithFlow is a complete church management system that helps you:

- **Manage Members**: Track members, visitors, attendance, and demographics
- **Organize Events**: Create events, manage RSVPs, QR tickets, and check-ins
- **Voice/Video Calls**: Make calls directly in the app (like WhatsApp)
- **WhatsApp-Style Communities**: Group chats, announcements, subgroups
- **Bible & Devotions**: Daily readings, verse of the day, Bible study tools
- **Spiritual Care**: Handle prayer requests and counseling appointments
- **Giving & Finance**: Track donations and manage church finances
- **Content Publishing**: Post devotionals, articles, and announcements
- **AI Faith Companion**: AI-powered spiritual guidance and Bible study
- **Multi-Church Support**: One installation can serve multiple churches

---

## Features

### Admin Dashboard (Web)

| Category | Features |
|----------|----------|
| **Member Management** | Complete database with photos, contact info, family relationships, custom fields |
| **Event Management** | Create events, manage RSVPs, seat assignments, QR tickets, check-in |
| **Group Management** | Small groups, ministries, cell groups, join/leave workflows |
| **Prayer Requests** | Receive, track, and manage prayer requests |
| **Counseling** | Book appointments with counselors, session management |
| **Content** | Publish devotionals, articles, announcements with scheduling |
| **Finance** | Accounting, donations, budgets, reports, chart of accounts |
| **Reports** | Attendance, growth, giving, custom reports |
| **System Settings** | Multi-language, roles, permissions, church branding |
| **Crash Logs** | Monitor mobile app crashes and errors |

### Mobile App Features

| Category | Features |
|----------|----------|
| **Home** | Personalized dashboard, quick actions, announcements |
| **Bible** | Multiple translations, highlights, notes, bookmarks, audio |
| **Explore** | Daily devotions, verse of the day, Bible figures, quizzes, topical studies |
| **Give** | Secure donations, giving history, recurring giving |
| **Events** | Browse events, RSVP, QR tickets, calendar integration |
| **Groups** | WhatsApp-style communities with threads, announcements, subgroups |
| **Profile** | Update personal info, settings, biometric lock |
| **Voice/Video Calls** | HD calling with other members (like WhatsApp) |
| **AI Companion** | Faith-based AI assistant for spiritual guidance |
| **Voice Reading** | Text-to-speech for devotions and Bible passages |

### WhatsApp-Style Communities

| Feature | Description |
|---------|-------------|
| **Communities** | Group multiple chats under one community |
| **Announcement Threads** | One-way admin announcements |
| **General Discussion** | Two-way group chat |
| **Custom Threads** | Create topic-specific subgroups |
| **Media Sharing** | Photos, videos, documents, voice notes |
| **Polls** | Create and vote on polls |
| **Location Sharing** | Share location with group |
| **Message Search** | Search through message history |
| **Read Receipts** | See who read your messages |
| **Typing Indicators** | See who's typing |

### Technical Features

| Feature | Description |
|---------|-------------|
| **Multi-tenant** | One server, multiple churches, complete data isolation |
| **Role-based Access** | Super Admin, Admin, Staff, Member roles |
| **API-first** | RESTful API for mobile apps and integrations |
| **Real-time** | Live updates via MQTT (EMQX) |
| **Voice/Video** | WebRTC via LiveKit SFU |
| **File Storage** | Distributed storage via SeaweedFS |
| **Secure** | JWT auth, encrypted data, HTTPS |
| **Multi-language** | English + Indonesian (easily extensible) |
| **Dark Mode** | Full dark mode support in mobile app |
| **Biometric Auth** | Face ID / Fingerprint unlock |

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

### Required Ports

| Port | Protocol | Purpose | Required |
|------|----------|---------|----------|
| 80 | TCP | HTTP (redirects to HTTPS) | Yes |
| 443 | TCP | HTTPS (main access) | Yes |
| 3478 | TCP/UDP | STUN/TURN (voice/video) | Yes |
| 5349 | TCP/UDP | STUN/TURN TLS (voice/video) | Yes |
| 7881 | TCP | LiveKit WebRTC | Yes |
| 50000-50100 | UDP | WebRTC media | Yes |

### Domain & DNS

You need a domain name (e.g., `mychurch.com`) with these DNS records:

| Record Type | Name | Points To | Purpose | Required |
|-------------|------|-----------|---------|----------|
| A | `@` or `mychurch.com` | Your server IP | Main website | Yes |
| A | `api` | Your server IP | Backend API | Yes |
| A | `livekit` | Your server IP | Voice/Video calls | Yes |
| A | `files` | Your server IP | Media file storage | Yes |
| A | `traefik` | Your server IP | Admin dashboard | Optional |
| A | `emqx` | Your server IP | MQTT admin | Optional |

---

## Installation Guide

### Which method should I choose?

| Method | Best For | Difficulty | Time |
|--------|----------|------------|------|
| **Docker** (Recommended) | Most users, production | Easy | 5-15 min |
| **Manual** | Custom setups, developers | Advanced | 30-60 min |

**We strongly recommend Docker** because:
- One-command installation
- Automatic SSL certificates
- Easy updates with one command
- All services included and configured
- Works on any Linux server

---

## Docker Installation (Recommended)

### Before You Start

You will need:
- [ ] A server (VPS) with Ubuntu 22.04 or Debian 12
- [ ] A domain name (e.g., mychurch.com)
- [ ] Access to your domain's DNS settings
- [ ] 5-15 minutes of time

### Step 1: Get a Server

**Don't have a server yet?** Here are some affordable options:

| Provider | Price | RAM | Link |
|----------|-------|-----|------|
| Hetzner | €4/mo | 2GB | [hetzner.com](https://www.hetzner.com/) |
| Vultr | $10/mo | 2GB | [vultr.com](https://www.vultr.com/) |
| DigitalOcean | $12/mo | 2GB | [digitalocean.com](https://www.digitalocean.com/) |
| Linode | $10/mo | 2GB | [linode.com](https://www.linode.com/) |

**When creating your server, choose:**
- **Operating System**: Ubuntu 22.04 LTS (or Debian 12)
- **Size**: At least 2GB RAM, 2 CPU cores
- **Region**: Close to your church members

### Step 2: Connect to Your Server

**On Mac or Linux:**
```bash
ssh root@YOUR_SERVER_IP
```

**On Windows:**
1. Download [PuTTY](https://www.putty.org/) or use Windows Terminal
2. Connect to `root@YOUR_SERVER_IP`

**You should see something like:**
```
root@your-server:~#
```

### Step 3: Update Your Server

Copy and paste these commands:

```bash
apt update && apt upgrade -y && apt install -y curl git
```

**What this does:**
- Updates the list of available software
- Upgrades all installed software
- Installs tools needed for installation

### Step 4: Set Up Your Domain

**Find your server's IP address:**
```bash
curl ifconfig.me
```
Write down this IP address (e.g., `123.45.67.89`)

**Add DNS records** at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 3600 |
| A | api | YOUR_SERVER_IP | 3600 |
| A | livekit | YOUR_SERVER_IP | 3600 |
| A | files | YOUR_SERVER_IP | 3600 |

**Wait 5-10 minutes** for DNS to propagate, then verify:
```bash
dig +short yourdomain.com
dig +short api.yourdomain.com
```
Both should show your server IP.

### Step 5: Download and Install FaithFlow

```bash
# Go to home directory
cd ~

# Download FaithFlow
git clone https://github.com/your-org/faithflow.git

# Enter the directory
cd faithflow

# Make the installer executable
chmod +x docker-install.sh

# Run the installer
sudo ./docker-install.sh
```

**The installer will ask you:**
```
Enter your domain name (e.g., faithflow.church): mychurch.com
Enter email for SSL certificates: admin@mychurch.com
```

**Installation takes 5-15 minutes.** The installer will:
1. Check your server meets requirements
2. Install Docker (if not installed)
3. Generate secure passwords
4. Start all services
5. Get SSL certificates
6. Initialize the database

### Step 6: Verify Installation

After installation completes, run:

```bash
docker compose -f docker-compose.prod.yml ps
```

**You should see all services as "Up (healthy)":**
```
NAME                        STATUS
faithflow-backend           Up (healthy)
faithflow-frontend          Up (healthy)
faithflow-mongodb           Up (healthy)
faithflow-redis             Up (healthy)
faithflow-livekit           Up (healthy)
faithflow-coturn            Up (healthy)
faithflow-emqx              Up (healthy)
faithflow-seaweedfs-master  Up (healthy)
faithflow-seaweedfs-volume  Up
faithflow-seaweedfs-filer   Up
faithflow-traefik           Up (healthy)
```

### Step 7: Access Your Application

Wait 2-3 minutes for SSL certificates, then open:

| Service | URL |
|---------|-----|
| **Web App** | https://yourdomain.com |
| **API Docs** | https://api.yourdomain.com/docs |

**Default Login:**
```
Email: admin@gkbjtamankencana.org
Password: admin123
```

**IMPORTANT: Change this password immediately after first login!**

### Congratulations!

FaithFlow is now installed. Go to Settings -> Profile to change your password.

---

## Manual Installation (Bare Metal)

For advanced users who want more control. See [INSTALLATION.md](./INSTALLATION.md) for detailed instructions.

**Quick version:**

```bash
# Run the bare-metal installer
chmod +x install.sh
sudo ./install.sh
```

The installer will guide you through:
- Python 3.11 + FastAPI backend
- Node.js 20 + React frontend
- MongoDB 7.0 database
- Nginx reverse proxy
- LiveKit voice/video
- EMQX MQTT broker
- coTURN NAT traversal
- SeaweedFS file storage
- Let's Encrypt SSL

---

## Updating FaithFlow

### Docker Update (Recommended)

```bash
cd ~/faithflow

# Pull latest code
git pull

# Run update script
sudo ./docker-update.sh
```

**That's it!** The update script will:
- Backup your database
- Pull new code
- Rebuild changed services
- Restart with zero downtime
- Roll back automatically if something fails

### Manual Update (Bare Metal)

```bash
cd /opt/faithflow

# Pull latest code
git pull

# Run update script
sudo ./update.sh
```

---

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check which services are having issues
docker compose -f docker-compose.prod.yml ps

# View logs for a specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Restart all services
docker compose -f docker-compose.prod.yml restart
```

#### SSL Certificate Not Working

```bash
# Check if DNS is correct
dig +short yourdomain.com

# View Traefik logs
docker compose -f docker-compose.prod.yml logs traefik

# Force certificate renewal
docker compose -f docker-compose.prod.yml restart traefik
```

#### Cannot Login

```bash
# Check backend is healthy
curl -k https://api.yourdomain.com/health

# View backend logs
docker compose -f docker-compose.prod.yml logs backend

# Check MongoDB is running
docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval "db.adminCommand('ping')"
```

#### Voice/Video Calls Not Working

```bash
# Check LiveKit is running
docker compose -f docker-compose.prod.yml logs livekit

# Check TURN server
docker compose -f docker-compose.prod.yml logs coturn

# Verify firewall ports are open
ufw status
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service (last 100 lines)
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Backup & Restore

**Backup:**
```bash
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)
```

**Restore:**
```bash
docker cp ./backup-YYYYMMDD faithflow-mongodb:/backup
docker compose -f docker-compose.prod.yml exec mongodb mongorestore /backup
```

---

## File Storage (SeaweedFS)

FaithFlow uses SeaweedFS for storing media files (photos, videos, documents).

### Accessing Files

| URL | Purpose |
|-----|---------|
| `https://files.yourdomain.com/` | Public file access |
| `https://files.yourdomain.com/ui/` | Web file browser |

### Verifying SeaweedFS

```bash
# Check containers are running
docker compose -f docker-compose.prod.yml ps | grep seaweed

# Test file upload
echo "test" > /tmp/test.txt
curl -F file=@/tmp/test.txt "http://localhost:8888/test/"
```

### Backup SeaweedFS

```bash
# Stop services
docker compose -f docker-compose.prod.yml stop

# Backup volume data
docker run --rm -v faithflow_seaweedfs_volume_data:/data -v $(pwd):/backup \
    alpine tar czf /backup/seaweedfs-backup-$(date +%Y%m%d).tar.gz /data

# Start services
docker compose -f docker-compose.prod.yml start
```

---

## Mobile App Setup

### For Users

The mobile app will be available on:
- **iOS**: App Store (coming soon)
- **Android**: Google Play Store (coming soon)

### For Developers

The mobile app is built with React Native (Expo).

```bash
cd mobile

# Install dependencies
yarn install

# Copy environment file
cp constants/secrets.ts.example constants/secrets.ts
# Edit secrets.ts with your API URL

# Start development server
npx expo start
```

### Building for Production

```bash
# iOS (requires Mac with Xcode)
eas build --platform ios

# Android
eas build --platform android
```

### Configuration

Edit `mobile/constants/secrets.ts`:
```typescript
export const API_URL = 'https://api.yourdomain.com';
export const MQTT_URL = 'wss://yourdomain.com/mqtt';
export const LIVEKIT_URL = 'wss://livekit.yourdomain.com';
```

---

## FAQ

### General Questions

**Q: How much does FaithFlow cost?**
A: FaithFlow is open-source and free. You only pay for server hosting (~$10-20/month).

**Q: Can I use FaithFlow for multiple churches?**
A: Yes! FaithFlow is multi-tenant. One installation serves multiple churches with complete data isolation.

**Q: Do I need technical knowledge?**
A: The Docker installation is designed to be simple. If you can follow instructions, you can install FaithFlow.

**Q: What languages are supported?**
A: English and Indonesian. More languages can be easily added.

### Technical Questions

**Q: Can I use my own MongoDB?**
A: Yes. Edit MONGO_URL in your .env file.

**Q: What ports need to be open?**
A: 80, 443, 3478, 5349, 7881, 50000-50100/udp

**Q: How do I add SSL for my own domain?**
A: SSL is automatic with Let's Encrypt. Just add DNS records and run the installer.

**Q: Can I run FaithFlow behind a corporate firewall?**
A: Yes, but you need to open the required ports for voice/video to work.

### Mobile App Questions

**Q: Does the mobile app work offline?**
A: Some features like Bible reading work offline. Messaging requires internet.

**Q: Is the mobile app available on iOS and Android?**
A: Yes, built with React Native/Expo for both platforms.

---

## Architecture Overview

```
                                    INTERNET
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
          ┌──────────┬──────────┐    │         ┌──────────────────────────┐
          │ MONGODB  │  REDIS   │    │         │      SEAWEEDFS           │
          │ Database │  Cache   │    │         │ Master (9333)            │
          │Port:27017│Port: 6379│    │         │ Volume (8080)            │
          └──────────┴──────────┘    │         │ Filer  (8888)            │
                                     ▼         └──────────────────────────┘
                              ┌──────────┐
                              │  COTURN  │
                              │(TURN/NAT)│
                              │Port: 3478│
                              └──────────┘
```

### Service Roles

| Service | Purpose | Access |
|---------|---------|--------|
| **Traefik** | SSL termination, routing | Internal |
| **Frontend** | Web application UI | https://yourdomain.com |
| **Backend** | REST API, business logic | https://api.yourdomain.com |
| **MongoDB** | Database | Internal only |
| **Redis** | Caching, session storage | Internal only |
| **LiveKit** | Voice/video WebRTC SFU | https://livekit.yourdomain.com |
| **coTURN** | NAT traversal for calls | UDP 3478, 5349 |
| **EMQX** | Real-time messaging | wss://yourdomain.com/mqtt |
| **SeaweedFS** | Distributed file storage | https://files.yourdomain.com |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Web)** | React, TanStack Query, shadcn/ui, Tailwind CSS |
| **Frontend (Mobile)** | React Native, Expo, NativeWind, Gluestack UI |
| **Backend** | FastAPI, Python 3.11, Motor (async MongoDB) |
| **Database** | MongoDB 7.0 |
| **Caching** | Redis 7.4 |
| **Real-time** | EMQX (MQTT), WebSocket |
| **Voice/Video** | LiveKit (WebRTC SFU), coTURN |
| **File Storage** | SeaweedFS |
| **Reverse Proxy** | Traefik (Docker) or Nginx (bare metal) |
| **SSL** | Let's Encrypt (automatic) |

---

## Getting Help

- **Documentation**: This README and `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/your-org/faithflow/issues)
- **Community**: Join our Discord server

---

## License

Proprietary - All rights reserved

---

## Credits

Built with these amazing open-source projects:

| Technology | Purpose |
|------------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | Backend API framework |
| [React](https://react.dev/) | Frontend web framework |
| [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) | Mobile app framework |
| [MongoDB](https://www.mongodb.com/) | Database |
| [LiveKit](https://livekit.io/) | Voice/Video WebRTC SFU |
| [EMQX](https://www.emqx.io/) | MQTT message broker |
| [coTURN](https://github.com/coturn/coturn) | TURN/STUN server |
| [SeaweedFS](https://seaweedfs.com/) | Distributed file storage |
| [Traefik](https://traefik.io/) | Reverse proxy & SSL |
| [Docker](https://www.docker.com/) | Containerization |

---

*FaithFlow - Empowering churches with technology*
