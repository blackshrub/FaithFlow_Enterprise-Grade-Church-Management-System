# FaithFlow - Enterprise Church Management System

<div align="center">

![FaithFlow Logo](docs/images/logo.png)

**The Most Complete Open-Source Church Management Platform**

*AI-Powered Spiritual Care • Multi-Tenant Architecture • Mobile-First Design*

[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)]()
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb)]()

[Quick Start](#quick-start) • [Features](#features) • [Installation](#installation) • [Documentation](#documentation)

</div>

---

## What Makes FaithFlow Different?

FaithFlow isn't just another church management system. It's an **enterprise-grade platform** with features you won't find anywhere else:

| Feature | FaithFlow | Others |
|---------|:---------:|:------:|
| **AI Prayer Intelligence** - Automatic theme extraction, guided prayers, 14-day follow-ups | ✅ | ❌ |
| **AI Contextual Companion** - Scripture-based spiritual guidance with conversation memory | ✅ | ❌ |
| **News-Aware Content** - Auto-generates contextual devotions from national news/disasters | ✅ | ❌ |
| **WhatsApp-Style Communities** - Full messaging with threads, polls, voice notes | ✅ | ❌ |
| **Voice/Video Calling** - HD WebRTC calls built-in (like WhatsApp) | ✅ | ❌ |
| **Complete Bible Integration** - 6 translations, 186K+ verses, all local | ✅ | Limited |
| **Multi-Tenant Architecture** - One server, unlimited churches, complete isolation | ✅ | Rare |
| **Premium Mobile App** - React Native with native-feeling animations | ✅ | Basic |
| **Self-Service Kiosk** - Touch-screen check-in with OTP verification | ✅ | Basic |
| **Professional Accounting** - Double-entry, budgets, fiscal periods, audit trails | ✅ | Basic |

---

## Quick Start

**Get FaithFlow running in 5 minutes:**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/faithflow.git && cd faithflow

# 2. Run the installer (it asks for your domain)
sudo ./docker-install.sh

# 3. Open https://yourdomain.com - Done!
```

**Default Login:** `admin@gkbjtamankencana.org` / `admin123` (change immediately!)

---

## Features

### AI-Powered Spiritual Care

#### Prayer Intelligence System
The world's first AI-powered prayer management system:

| Capability | Description |
|------------|-------------|
| **Theme Extraction** | AI automatically detects themes like "healing", "guidance", "family" from prayer requests |
| **Urgency Detection** | Identifies high-urgency prayers (crisis, health emergencies) for priority attention |
| **Guided Prayers** | Generates personalized prayer suggestions based on request content |
| **Scripture Matching** | Recommends relevant Bible verses for each prayer theme |
| **14-Day Follow-ups** | Automated follow-up system to check on prayer requesters |
| **Analytics Dashboard** | Visual insights into prayer patterns, themes, and response rates |

#### Contextual Companion (AI Chat)
A faith-based AI assistant that understands spiritual context:

| Feature | Description |
|---------|-------------|
| **Scripture-Grounded** | Every response backed by relevant Bible verses |
| **Conversation Memory** | Remembers context within sessions for natural dialogue |
| **Context Awareness** | Adapts responses based on where user is (Bible study, devotion, prayer) |
| **Bilingual Support** | Seamless English and Indonesian responses |
| **Personalized Starters** | Context-aware conversation suggestions |

#### News Context System
Automatic content generation based on current events:

| Feature | Description |
|---------|-------------|
| **RSS Monitoring** | Fetches from Kompas, Detik, CNN Indonesia, BMKG (twice daily) |
| **Event Detection** | Identifies significant events (disasters, national celebrations) |
| **Contextual Content** | Auto-generates relevant devotions and verses |
| **Disaster Alerts** | Special handling for earthquake, flood, volcano warnings |
| **Admin Dashboard** | Monitor and review AI-generated content before publishing |

---

### Content Center (Explore Module)

A complete spiritual content management system:

| Content Type | Features |
|--------------|----------|
| **Daily Devotions** | Rich text editor, Bible verse picker, scheduling, multi-language |
| **Verse of the Day** | Curated verses with reflections, prayer points, practical applications |
| **Bible Figures** | Comprehensive profiles with timelines, lessons, related scriptures |
| **Daily Quizzes** | Multiple choice with explanations, scoring, leaderboards |
| **Bible Study Plans** | Multi-day structured studies with progress tracking |
| **Topical Categories** | Faith, Peace, Love, Strength, Wisdom, Hope - with verse collections |

**AI Content Generation:**
- Generate devotions from Bible passages using Claude AI
- Create quizzes automatically from any Bible chapter
- Draft Bible figure profiles with historical research
- Bilingual content (English + Indonesian) in one click

---

### Mobile App (React Native + Expo)

<div align="center">

| Home | Bible | Explore | Events |
|:----:|:-----:|:-------:|:------:|
| Personalized dashboard | 6 translations | Daily content | RSVP & tickets |
| Quick actions | Highlights & notes | AI companion | QR check-in |
| Announcements | Audio playback | Quizzes | Calendar sync |

</div>

**Premium Motion Animations:**
- Native-feeling transitions using Reanimated
- Shared Axis animations for navigation
- Staggered list animations
- Haptic feedback throughout
- 60fps smooth scrolling

**Additional Features:**
- Biometric authentication (Face ID / Fingerprint)
- Offline Bible reading
- Dark mode support
- Push notifications
- Multi-language (EN/ID)

---

### Event Management

| Feature | Description |
|---------|-------------|
| **Visual Seat Editor** | Drag-and-drop seat layout designer |
| **RSVP System** | Member registration with seat selection |
| **QR Tickets** | Unique QR codes sent via WhatsApp |
| **Check-in Kiosk** | Touch-screen scanning and manual search |
| **Series Events** | Multi-session events (e.g., 4-week Bible study) |
| **Capacity Management** | Automatic overbooking prevention |
| **Event Ratings** | Post-event feedback collection with analytics |
| **Attendance Reports** | Detailed check-in statistics and trends |

---

### Self-Service Kiosk System

Professional check-in optimized for lobby tablets:

| Mode | Capabilities |
|------|--------------|
| **Event Check-in** | QR scanning, manual search, on-site RSVP |
| **New Visitor** | Photo capture, instant registration, QR generation |
| **Prayer Request** | Submit prayers with category selection, follow-up preference |
| **Profile Update** | Members update their own info with OTP verification |
| **Counseling Booking** | Schedule appointments with available counselors |
| **Group Joining** | Browse and join church groups/ministries |

**Security Features:**
- Phone + OTP verification for sensitive actions
- OTP countdown timer with expiration handling
- Confirmation dialogs for profile changes
- Session data persistence (form recovery)
- 10 beautiful gradient themes

---

### WhatsApp-Style Communities

Full-featured messaging system:

| Feature | Description |
|---------|-------------|
| **Communities** | Group multiple related chats together |
| **Announcement Threads** | Admin-only broadcasts |
| **Discussion Threads** | Two-way group conversations |
| **Media Sharing** | Photos, videos, documents, voice notes |
| **Polls** | Create and vote on polls |
| **Read Receipts** | See who read messages |
| **Typing Indicators** | Real-time typing status |
| **Message Search** | Full-text search across history |
| **Location Sharing** | Share location with groups |

---

### Voice & Video Calling

HD calling built into the app (no third-party apps needed):

| Feature | Technology |
|---------|------------|
| **HD Voice** | Crystal-clear audio calls |
| **Video Calls** | 720p video with low latency |
| **Group Calls** | Conference calling support |
| **Screen Sharing** | Share screen during calls |
| **NAT Traversal** | Works behind firewalls (TURN/STUN) |
| **End-to-End** | Secure WebRTC connections |

Powered by **LiveKit** (enterprise-grade WebRTC SFU) and **coTURN**.

---

### Complete Bible Integration

| Version | Language | Verses |
|---------|----------|--------|
| TB | Indonesian (Terjemahan Baru) | 31,102 |
| CHS | Chinese (Union Simplified) | 31,102 |
| NIV | English | 31,103 |
| NKJV | English | 31,102 |
| NLT | English | 31,080 |
| ESV | English | 31,103 |

**Total: 186,592 verses - ALL STORED LOCALLY**

**Bible Features:**
- Highlights with colors
- Personal notes per verse
- Bookmarks
- Audio playback (TTS)
- Cross-references
- Search across all versions
- Book introductions

---

### Professional Accounting

Enterprise-grade church finance management:

| Module | Features |
|--------|----------|
| **Chart of Accounts** | Hierarchical accounts, account types, normal balances |
| **Journal Entries** | Double-entry with debit/credit validation |
| **Quick Entry** | Simplified forms for offerings and expenses |
| **Budgets** | Annual budgets with monthly distribution |
| **Fiscal Periods** | Month/year close, period locking |
| **Responsibility Centers** | Track spending by ministry/project |
| **Fixed Assets** | Asset tracking with depreciation |
| **Reports** | Balance sheet, income statement, trial balance |
| **Audit Trail** | Complete history of all changes |

---

### Member Management

| Feature | Description |
|---------|-------------|
| **Complete Profiles** | Photos, contact, family, custom fields |
| **Family Relationships** | Link family members together |
| **Membership Status** | Visitor → Member → Active workflows |
| **Bulk Import** | CSV import with validation and preview |
| **Photo Management** | SeaweedFS storage with thumbnails |
| **Trash & Recovery** | 14-day soft delete with restore |
| **Custom Fields** | Define church-specific data fields |
| **Export** | CSV/Excel export with field selection |

---

### Group Management

| Feature | Description |
|---------|-------------|
| **Ministry Groups** | Worship team, ushers, tech team |
| **Small Groups** | Cell groups, Bible studies |
| **Categories** | Organize groups by type |
| **Join Requests** | Approval workflow for joining |
| **Member Roles** | Leader, assistant, member |
| **Group Chat** | Integrated messaging per group |
| **Attendance** | Track group meeting attendance |

---

## System Architecture

```
                                    INTERNET
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          TRAEFIK (Reverse Proxy)                               │
│          SSL termination, HTTP/3 (QUIC), Brotli compression                   │
│                              Ports: 80, 443/udp                                │
└────┬──────────────┬───────────────┬───────────────┬───────────────┬───────────┘
     │              │               │               │               │
     ▼              ▼               ▼               ▼               ▼
┌──────────┐  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ FRONTEND │  │ BACKEND  │   │ LIVEKIT  │   │ SEAWEED  │   │   EMQX   │
│  (React) │  │(FastAPI) │   │ (WebRTC) │   │ (Files)  │   │  (MQTT)  │
│    :80   │  │  :8000   │   │  :7880   │   │  :8888   │   │  :1883   │
└──────────┘  └────┬─────┘   └────┬─────┘   └──────────┘   └──────────┘
                   │              │
                   ▼              ▼
          ┌───────────────────────────┐
          │  MONGODB    │   REDIS     │
          │  Database   │   Cache     │
          │   :27017    │   :6379     │
          └───────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend (Web)** | React 18, TanStack Query, shadcn/ui, Tailwind | Admin dashboard |
| **Frontend (Mobile)** | React Native, Expo, NativeWind, Gluestack UI | iOS/Android app |
| **Backend** | FastAPI, Python 3.11, Motor (async MongoDB) | REST API |
| **ASGI Server** | Granian (Rust-based) | 2-3x faster than Uvicorn |
| **JSON Serialization** | msgspec | 10-20% faster than orjson |
| **Database** | MongoDB 7.0 | Document storage |
| **Cache** | Redis 7.4 | Session, rate limiting, queues |
| **Real-time** | EMQX (MQTT), WebSocket | Live updates |
| **Voice/Video** | LiveKit (WebRTC SFU), coTURN | HD calling |
| **AI** | Anthropic Claude | Prayer intelligence, content |
| **File Storage** | SeaweedFS | Distributed media storage |
| **Proxy** | Traefik | SSL, HTTP/3, Brotli, routing |

### Performance Optimizations

| Optimization | Benefit |
|--------------|---------|
| **HTTP/3 (QUIC)** | 0-RTT connections, faster mobile |
| **Brotli Compression** | 20-30% smaller than gzip |
| **Granian ASGI** | Rust-based, 2-3x faster than Uvicorn |
| **msgspec** | 10-20% faster JSON encoding |
| **Redis Pipelines** | Batch operations for lower latency |
| **Query Projections** | Only fetch needed MongoDB fields |
| **Optimized Docker** | Backend image ~586MB (35% smaller) |
| **BuildKit Cache** | ~5x faster Docker rebuilds |

---

## Installation

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Storage** | 40 GB SSD | 100+ GB SSD |
| **OS** | Ubuntu 22.04 / Debian 12 | Ubuntu 22.04 LTS |

### Required Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | TCP | HTTP (redirect to HTTPS) |
| 443 | TCP/UDP | HTTPS + HTTP/3 (QUIC) |
| 3478 | TCP/UDP | STUN/TURN (voice/video) |
| 5349 | TCP/UDP | STUN/TURN TLS |
| 7881 | TCP | LiveKit WebRTC |
| 50000-50100 | UDP | WebRTC media |

### DNS Configuration

Point these subdomains to your server:

| Subdomain | Purpose | Required |
|-----------|---------|----------|
| `yourdomain.com` | Web application | Yes |
| `api.yourdomain.com` | Backend API | Yes |
| `livekit.yourdomain.com` | Voice/Video | Yes |
| `files.yourdomain.com` | File storage | Yes |
| `traefik.yourdomain.com` | Admin dashboard | Optional |

---

### Docker Installation (Recommended)

```bash
# 1. Update system and install dependencies
apt update && apt upgrade -y && apt install -y curl git

# 2. Clone FaithFlow
git clone https://github.com/your-org/faithflow.git
cd faithflow

# 3. Run the installer
chmod +x docker-install.sh
sudo ./docker-install.sh
```

The installer will:
1. Check system requirements
2. Install Docker if needed
3. Generate secure passwords
4. Configure environment variables
5. Start all services
6. Obtain SSL certificates
7. Initialize the database

**Verify installation:**
```bash
docker compose -f docker-compose.prod.yml ps
```

All services should show "Up (healthy)".

---

### Manual Installation (Bare Metal)

For advanced users who need more control:

```bash
chmod +x install.sh
sudo ./install.sh
```

This installs:
- Python 3.11 + FastAPI backend
- Node.js 20 + React frontend
- MongoDB 7.0 database
- Redis 7.4 cache
- Nginx reverse proxy
- LiveKit voice/video
- EMQX MQTT broker
- coTURN NAT traversal
- SeaweedFS file storage
- Let's Encrypt SSL

See [docs/DEPLOYMENT_DEBIAN.md](docs/DEPLOYMENT_DEBIAN.md) for detailed instructions.

---

## Updating FaithFlow

### Docker Update

```bash
cd ~/faithflow
git pull
sudo ./docker-update.sh
```

The update script:
- Backs up your database automatically
- Pulls latest code
- Rebuilds changed services
- Zero-downtime restart
- Automatic rollback on failure

### Bare Metal Update

```bash
cd /opt/faithflow
git pull
sudo ./update.sh
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `faithflow.church` |
| `ACME_EMAIL` | SSL certificate email | `admin@church.org` |
| `JWT_SECRET` | 64+ character random string | (auto-generated) |
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |

### AI Features (Optional but Recommended)

| Variable | Description | Get It |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude AI for prayer intelligence | [console.anthropic.com](https://console.anthropic.com) |
| `STABILITY_API_KEY` | AI image generation | [stability.ai](https://stability.ai) |

### File Storage

| Variable | Description | Example |
|----------|-------------|---------|
| `SEAWEEDFS_MASTER_URL` | SeaweedFS master | `http://seaweedfs-master:9333` |
| `SEAWEEDFS_FILER_URL` | SeaweedFS filer | `http://seaweedfs-filer:8888` |
| `SEAWEEDFS_PUBLIC_URL` | Public file access | `https://files.yourdomain.com` |

---

## Mobile App Development

```bash
cd mobile

# Install dependencies
yarn install

# Configure API endpoint
cp constants/secrets.ts.example constants/secrets.ts
# Edit with your API URL

# Start development
npx expo start
```

### Building for Production

```bash
# iOS (requires Mac + Xcode)
eas build --platform ios

# Android
eas build --platform android
```

---

## API Documentation

- **Interactive Docs**: `https://api.yourdomain.com/docs`
- **OpenAPI Spec**: `https://api.yourdomain.com/openapi.json`
- **Detailed API Guide**: [docs/API.md](docs/API.md)

---

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml restart
```

**SSL certificate not working:**
```bash
# Check DNS is correct
dig +short api.yourdomain.com

# View Traefik logs
docker compose -f docker-compose.prod.yml logs traefik
```

**Voice/Video calls failing:**
```bash
# Check LiveKit
docker compose -f docker-compose.prod.yml logs livekit

# Check TURN server
docker compose -f docker-compose.prod.yml logs coturn

# Verify ports are open
ufw status
```

### Database Backup

```bash
# Backup
docker compose -f docker-compose.prod.yml exec mongodb mongodump --out /backup
docker cp faithflow-mongodb:/backup ./backup-$(date +%Y%m%d)

# Restore
docker cp ./backup-YYYYMMDD faithflow-mongodb:/backup
docker compose -f docker-compose.prod.yml exec mongodb mongorestore /backup
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more solutions.

---

## Documentation

| Document | Description |
|----------|-------------|
| [FEATURES.md](docs/FEATURES.md) | Complete feature documentation |
| [API.md](docs/API.md) | API endpoint reference |
| [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md) | Docker installation guide |
| [DEPLOYMENT_DEBIAN.md](docs/DEPLOYMENT_DEBIAN.md) | Manual installation guide |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [STRUCTURE.md](docs/STRUCTURE.md) | Codebase structure |
| [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Quick command reference |

---

## FAQ

**Q: How much does FaithFlow cost?**
A: FaithFlow is open-source. You only pay for server hosting (~$10-20/month) and optional AI features.

**Q: Can I use FaithFlow for multiple churches?**
A: Yes! FaithFlow is multi-tenant. One installation serves unlimited churches with complete data isolation.

**Q: What languages are supported?**
A: English and Indonesian out of the box. More languages can be easily added via i18n.

**Q: Does the mobile app work offline?**
A: Bible reading and some features work offline. Messaging and live features require internet.

**Q: How does the AI Prayer Intelligence work?**
A: When members submit prayers, AI analyzes the text to extract themes, detect urgency, suggest relevant scriptures, and schedule 14-day follow-ups automatically.

**Q: Is my church's data secure?**
A: Yes. Each church has complete data isolation. All API requests are scoped by church_id. No cross-tenant data access is possible.

---

## Credits

Built with these amazing open-source projects:

| Technology | Purpose |
|------------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) | Backend API framework |
| [Granian](https://github.com/emmett-framework/granian) | Rust-based ASGI server |
| [msgspec](https://github.com/jcrist/msgspec) | High-performance JSON |
| [React](https://react.dev/) | Web frontend |
| [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) | Mobile app |
| [MongoDB](https://www.mongodb.com/) | Database |
| [Redis](https://redis.io/) | Caching |
| [LiveKit](https://livekit.io/) | Voice/Video WebRTC |
| [EMQX](https://www.emqx.io/) | MQTT messaging |
| [coTURN](https://github.com/coturn/coturn) | TURN/STUN server |
| [SeaweedFS](https://seaweedfs.com/) | File storage |
| [Traefik](https://traefik.io/) | Reverse proxy |
| [Anthropic Claude](https://anthropic.com/) | AI features |

---

## License

Proprietary - All rights reserved

---

<div align="center">

**FaithFlow** - *Empowering Churches with Clarity, Care, and Connection*

Made with love for churches worldwide

</div>
