# FaithFlow - Enterprise Church Management System

<div align="center">

![FaithFlow Logo](docs/images/logo.png)

**The Most Complete Open-Source Church Management Platform**

*AI-Powered Spiritual Care • Multi-Tenant Architecture • Mobile-First Design*

[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)]()
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb)]()

[Quick Start](#quick-start) • [Features](#features) • [Installation](#installation) • [Documentation](#documentation)

</div>

---

## What Makes FaithFlow Different?

FaithFlow isn't just another church management system. It's an **enterprise-grade platform** with features you won't find anywhere else:

| Feature | FaithFlow | Others |
|---------|:---------:|:------:|
| **AI Prayer Intelligence** - Automatic theme extraction, guided prayers, 14-day follow-ups | ✅ | ❌ |
| **Faith Assistant (AI Chat)** - Voice-enabled spiritual companion with TTS/STT | ✅ | ❌ |
| **Voice AI** - Google Cloud TTS (read aloud) + Groq Whisper STT (voice input) | ✅ | ❌ |
| **AI Image Generation** - Stability AI for devotion images and content visuals | ✅ | ❌ |
| **News-Aware Content** - Auto-generates contextual devotions from national news/disasters | ✅ | ❌ |
| **Mobile Giving/Donations** - Multi-gateway payment (iPaymu, Xendit, Midtrans, Stripe) | ✅ | Limited |
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

#### Faith Assistant (Pendamping Iman)
A Claude-powered spiritual companion with full voice capabilities:

| Feature | Description |
|---------|-------------|
| **Scripture-Grounded Responses** | Every answer backed by relevant Bible verses |
| **Voice Input (STT)** | Speak your questions using Groq Whisper (300-500ms latency) |
| **Voice Output (TTS)** | Listen to responses with Google Cloud WaveNet voices |
| **Conversation Memory** | Remembers context within sessions for natural dialogue |
| **Context Awareness** | Adapts based on where user is (Bible study, devotion, prayer) |
| **Bilingual Support** | Seamless English and Indonesian (auto-detection) |
| **Empathetic UX** | Thoughtful typing indicators, smooth animations |
| **Streaming Responses** | Text appears progressively (like ChatGPT) |
| **Copy & Share** | Copy messages with one tap |

**Voice Features:**
- **Adaptive Silence Detection** - Knows when you've finished speaking
- **Bible Verse Pronunciation** - Converts "John 3:16" to "John chapter three verse sixteen"
- **Markdown Stripping** - Clean audio without reading asterisks or hashes
- **Session Audio Cache** - Instant replay without re-fetching

#### News Context System
Automatic content generation based on current events:

| Feature | Description |
|---------|-------------|
| **RSS Monitoring** | Fetches from Kompas, Detik, CNN Indonesia, BMKG (twice daily) |
| **Event Detection** | Identifies significant events (disasters, national celebrations) |
| **Contextual Content** | Auto-generates relevant devotions and verses |
| **Disaster Alerts** | Special handling for earthquake, flood, volcano warnings |
| **Admin Dashboard** | Monitor and review AI-generated content before publishing |

#### AI Image Generation
Professional imagery for spiritual content using Stability AI:

| Feature | Description |
|---------|-------------|
| **Devotion Images** | Generate beautiful header images for daily devotions |
| **Bible Figure Portraits** | AI-generated historical portraits |
| **Content Thumbnails** | Automatic thumbnails for quizzes and studies |
| **Style Consistency** | Consistent visual style across all generated images |
| **Multiple Formats** | Square, landscape, portrait formats |

---

### Voice AI System

FaithFlow includes enterprise-grade voice capabilities:

#### Text-to-Speech (Google Cloud TTS)

| Feature | Description |
|---------|-------------|
| **WaveNet Voices** | Neural network-based, most natural sounding |
| **Bilingual** | Indonesian (id-ID-Wavenet-D) + English voices |
| **Adjustable Speed** | 0.25x to 4.0x speaking rate |
| **Pitch Control** | -20 to +20 semitones adjustment |
| **Smart Caching** | Session cache for instant replay |
| **Background Audio** | Continues playing while browsing |

**Used In:**
- Faith Assistant responses
- Daily devotion read-aloud
- Verse of the Day audio
- Bible figure biographies
- Quiz question narration

#### Speech-to-Text (Groq Whisper)

| Feature | Description |
|---------|-------------|
| **Ultra-Fast** | 300-500ms latency (10x faster than OpenAI) |
| **Adaptive Silence** | Automatic end-of-speech detection |
| **Noise Calibration** | Auto-calibrates to ambient noise |
| **Domain Hints** | Church vocabulary for better accuracy |
| **Bilingual** | Supports English and Indonesian |

**Technical Details:**
- Uses `whisper-large-v3-turbo` model
- M4A audio format (64kbps, mono, 22050Hz)
- Max recording: 60 seconds
- Automatic cleanup of temp files

---

### Mobile Giving & Donations

A complete digital giving system in the mobile app:

#### Giving Flow

| Step | Features |
|------|----------|
| **1. Choose Type** | Tithe, Weekly Offering, Mission, or Custom purpose |
| **2. Enter Amount** | Quick amounts (50K-2.5M) or custom input |
| **3. Select Payment** | Multiple payment methods based on church config |
| **4. Review & Submit** | Anonymous option, notes, confirmation |

#### Payment Gateway Integration

| Provider | Payment Methods | Status |
|----------|-----------------|--------|
| **iPaymu** | VA, QRIS, GoPay, OVO, Dana, Credit Card | ✅ Implemented |
| **Xendit** | VA, QRIS, E-wallets, Credit Card | 🔜 Planned |
| **Midtrans** | VA, QRIS, GoPay, ShopeePay | 🔜 Planned |
| **Stripe** | Credit Card, Apple Pay, Google Pay | 🔜 Planned |

#### Multi-Tenant Payment Config

Each church can configure their own payment gateway:

```json
{
  "payment_online_enabled": true,
  "payment_provider": "ipaymu",
  "payment_provider_config": {
    "va_number": "1179002264684497",
    "api_key": "YOUR-IPAYMU-API-KEY"
  },
  "payment_manual_bank_accounts": [
    {
      "bank_name": "BCA",
      "account_number": "1234567890",
      "account_holder": "Church Name"
    }
  ]
}
```

#### Giving Features

| Feature | Description |
|---------|-------------|
| **Transaction History** | View all past donations with status |
| **Status Tracking** | Pending, Success, Failed states |
| **Giving Summary** | Total given, transaction count |
| **Bank Transfer Fallback** | Manual transfer when online disabled |
| **Webhook Processing** | Automatic status updates from gateway |
| **WhatsApp Receipts** | Confirmation sent via WhatsApp (planned) |

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

| Home | Bible | Give | Explore | Events | Profile |
|:----:|:-----:|:----:|:-------:|:------:|:-------:|
| Dashboard | 6 translations | Digital donations | Daily devotions | RSVP & tickets | Settings |
| Quick actions | Highlights | Payment gateway | Faith Assistant | QR check-in | Preferences |
| Announcements | Notes | Transaction history | Quizzes | Calendar | Account |

</div>

**6 Main Tabs:**
1. **Home** - Personalized dashboard, quick actions, church announcements
2. **Bible** - 6 translations, highlights, notes, bookmarks, audio playback
3. **Give** - Digital donations with multiple payment methods (see Giving section)
4. **Explore** - Daily devotions, VOTD, Bible figures, quizzes, Faith Assistant
5. **Events** - RSVP, QR tickets, seat selection, check-in
6. **Profile** - Settings, preferences, account management

**Premium Motion Animations:**
- Native-feeling transitions using Reanimated v3
- Shared Axis animations for seamless navigation
- Staggered list animations with `withPremiumMotion` HOC
- Haptic feedback throughout the app
- 60fps smooth scrolling guaranteed

**Voice Features:**
- **Voice Input** - Speak to Faith Assistant using Groq Whisper STT
- **Voice Output** - Listen to devotions, verses, AI responses (Google TTS)
- **Voice Settings** - Adjust speed, pitch, voice selection

**Additional Features:**
- Biometric authentication (Face ID / Fingerprint)
- Offline Bible reading (all 186K verses stored locally)
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
| **Frontend (Mobile)** | React Native, Expo, NativeWind, Gluestack UI, Reanimated | iOS/Android app |
| **Backend** | FastAPI, Python 3.11, Motor (async MongoDB) | REST API |
| **ASGI Server** | Granian (Rust-based) | 2-3x faster than Uvicorn |
| **JSON Serialization** | msgspec | 10-20% faster than orjson |
| **Database** | MongoDB 7.0 | Document storage |
| **Cache** | Redis 7.4 | Session, rate limiting, queues |
| **Real-time** | EMQX (MQTT), WebSocket | Live updates |
| **Voice/Video** | LiveKit (WebRTC SFU), coTURN | HD calling |
| **AI Chat** | Anthropic Claude | Faith Assistant, content generation |
| **Text-to-Speech** | Google Cloud TTS (WaveNet) | Voice output in mobile app |
| **Speech-to-Text** | Groq Whisper API | Voice input (300-500ms latency) |
| **Image Generation** | Stability AI | Devotion images, thumbnails |
| **Payment Gateway** | iPaymu (+ Xendit, Midtrans, Stripe) | Mobile giving/donations |
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

### AI & Voice Features (Recommended)

| Variable | Description | Get It |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude AI for Faith Assistant, Prayer Intelligence, Content Generation | [console.anthropic.com](https://console.anthropic.com) |
| `STABILITY_API_KEY` | Stability AI for devotion images and thumbnails | [stability.ai](https://stability.ai) |
| `GOOGLE_TTS_API_KEY` | Google Cloud TTS for voice output (WaveNet) | [console.cloud.google.com](https://console.cloud.google.com) |
| `GROQ_API_KEY` | Groq Whisper for ultra-fast speech-to-text | [console.groq.com](https://console.groq.com) |
| `OPENAI_API_KEY` | OpenAI Whisper (fallback for STT) | [platform.openai.com](https://platform.openai.com) |

### File Storage

| Variable | Description | Example |
|----------|-------------|---------|
| `SEAWEEDFS_MASTER_URL` | SeaweedFS master | `http://seaweedfs-master:9333` |
| `SEAWEEDFS_FILER_URL` | SeaweedFS filer | `http://seaweedfs-filer:8888` |
| `SEAWEEDFS_PUBLIC_URL` | Public file access | `https://files.yourdomain.com` |

### Payment Gateway (Per-Church Configuration)

Payment configuration is stored per-church in `church_settings`. Each church can have different payment providers:

| Setting | Description | Example |
|---------|-------------|---------|
| `payment_online_enabled` | Enable digital payments | `true` |
| `payment_provider` | Active provider | `ipaymu`, `xendit`, `midtrans` |
| `payment_provider_config` | Provider credentials | `{"va_number": "...", "api_key": "..."}` |
| `payment_manual_bank_accounts` | Bank accounts for manual transfer | `[{"bank_name": "BCA", ...}]` |

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

## Recent Updates (v2.0 - December 2024)

### New Product Features

#### Broadcast Campaign System
Mass communication management for churches:

| Feature | Description |
|---------|-------------|
| **Campaign Management** | Create, schedule, and track broadcast campaigns |
| **Multi-Channel** | WhatsApp, Push Notifications, In-App messages |
| **Audience Targeting** | Filter by member status, groups, demographics |
| **Template Library** | Reusable notification templates with variables |
| **Analytics** | Delivery rates, open rates, engagement tracking |
| **Scheduling** | Schedule campaigns for optimal delivery times |

#### Mobile Notifications Center
Complete notification management in mobile app:

| Feature | Description |
|---------|-------------|
| **Notification Bell** | Real-time unread count badge in header |
| **Notification List** | Grouped by date with pull-to-refresh |
| **Rich Content** | Support for images, deep links, actions |
| **Mark as Read** | Individual and bulk mark-as-read |
| **Notification Settings** | Granular control per notification type |

#### Church News & Articles
Content publishing system in mobile app:

| Feature | Description |
|---------|-------------|
| **Article Feed** | Church news with featured images |
| **Categories** | Organized by topics (News, Events, Devotion) |
| **Rich Content** | HTML rendering with embedded media |
| **Share** | Native sharing to social media |
| **Bookmarks** | Save articles for later reading |

#### Enhanced Today Tab
Redesigned home screen with premium UX:

| Component | Description |
|-----------|-------------|
| **Start Your Day Carousel** | Rotating devotional cards |
| **Coming Up Carousel** | Upcoming events with quick RSVP |
| **Latest Sermon Card** | Featured sermon with play button |
| **Grow in Faith Section** | Curated spiritual content |
| **How Can We Help Grid** | Quick action shortcuts |
| **Church News Section** | Recent articles feed |
| **Instagram Section** | Social media integration |

#### Mobile Settings Screens
Comprehensive settings in mobile app:

| Screen | Features |
|--------|----------|
| **Appearance** | Theme (light/dark/system), accent colors |
| **Language** | English/Indonesian with instant switching |
| **Notifications** | Per-type toggle, quiet hours |
| **Privacy** | Data sharing, analytics opt-out |
| **Security** | Biometric authentication settings |
| **Voice Reading** | TTS speed, pitch, voice selection |

#### Member QR Code
Quick identification system:

| Feature | Description |
|---------|-------------|
| **QR Sheet** | Bottom sheet with member QR code |
| **Quick Access** | One-tap from profile or Today tab |
| **Event Check-in** | Scan for instant event check-in |
| **Offline Support** | QR generated locally, works offline |

---

### Technical Features

#### Security Hardening (49-Item Audit)
Comprehensive security improvements across the stack:

| Category | Items Fixed | Key Improvements |
|----------|-------------|------------------|
| **Authentication** | 18 | Fresh JWT after biometric, token expiry validation, route protection |
| **Data Isolation** | 15 | Church-scoped query keys, cache invalidation, tenant validation |
| **API Security** | 10 | Rate limiting, input validation, error sanitization |
| **Mobile Security** | 6 | Certificate pinning prep, secure storage, OTP validation |

**Key Security Features:**
- `useRequireAuth` hook for route protection on all protected screens
- Church ID validation on API client interceptor
- Biometric authentication with fresh JWT fetch
- Token expiry checking on app initialization
- WebSocket disconnection on logout
- Secure storage for sensitive data
- Phone number validation (format, length, prefix)
- OTP numeric validation

#### Multi-Tenant Cache Scoping
Proper data isolation in React Query cache:

```typescript
// Before (potential cross-tenant collision)
queryKey: ['community', 'messages', communityId]

// After (properly scoped)
queryKey: ['community', 'messages', churchId, communityId]
```

**Scoped Queries:**
- Community messages
- Giving history and transactions
- Prayer requests
- Event RSVPs
- Member data

#### Form UX Improvements
Enhanced form handling across the app:

| Feature | Implementation |
|---------|----------------|
| **Draft Saving** | Auto-save to AsyncStorage with 24hr expiry |
| **Inline Validation** | Real-time error feedback with FormControl |
| **Loading States** | Disabled buttons with spinners during submission |
| **Error Recovery** | Retry buttons on failure with clear messaging |
| **Confirmation Dialogs** | AlertDialog for destructive actions |

#### Network Status Detection
Global network monitoring:

| Feature | Description |
|---------|-------------|
| **NetworkStatusBanner** | Persistent banner when offline |
| **Auto-Retry** | Automatic retry when connection restored |
| **Offline Indicators** | Visual feedback throughout the app |
| **Graceful Degradation** | Offline-capable features continue working |

#### Connection Status in Chat
Real-time connection feedback:

| Status | Indicator |
|--------|-----------|
| **Connected** | Hidden (clean UI) |
| **Connecting** | Yellow banner with spinner |
| **Reconnecting** | Orange banner with retry count |
| **Disconnected** | Red banner with manual retry button |

#### Message Status Indicators
WhatsApp-style delivery feedback:

| Status | Icon | Description |
|--------|------|-------------|
| **Sending** | Clock | Message being sent |
| **Sent** | Single check | Server received |
| **Delivered** | Double check | Recipient received |
| **Read** | Blue double check | Recipient read |
| **Failed** | Red X | Retry available |

#### Payment Retry Mechanism
Improved giving flow error handling:

| Scenario | Handling |
|----------|----------|
| **Network Error** | Alert with retry button |
| **Gateway Error** | Clear error message + retry |
| **Timeout** | Auto-retry once, then manual |
| **Invalid Response** | Graceful fallback to manual transfer |

#### E2E Test Suite
Playwright-based end-to-end testing:

| Test File | Coverage |
|-----------|----------|
| `01-kiosk-registration.spec.cjs` | New member registration flow |
| `02-admin-login.spec.cjs` | Admin authentication |
| `03-member-management.spec.cjs` | CRUD operations |
| `04-event-rsvp.spec.cjs` | Event registration flow |
| `05-prayer-requests.spec.cjs` | Prayer submission and management |

**Test Helpers:**
- Reusable authentication utilities
- Database seeding/cleanup
- Screenshot on failure
- Parallel test execution

#### Database Indexes
Optimized MongoDB indexes for performance:

```python
# New indexes added
db_indexes.py:
- church_id + created_at (compound)
- church_id + member_id (compound)
- church_id + status + created_at (compound)
- Full-text search indexes for messages
```

#### Currency Formatting
Standardized currency display:

```typescript
// utils/currencyFormat.ts
formatCurrency(1500000, 'IDR') // "Rp 1.500.000"
formatCurrency(99.99, 'USD')   // "$99.99"
```

#### Navigation Utilities
Centralized navigation helpers:

```typescript
// utils/navigation.ts
navigateTo('/events/123')           // Push to stack
navigateToWithParams('/chat', {id}) // With params
goBack()                            // Pop stack
resetToHome()                       // Reset to tabs
```

---

## Credits

Built with these amazing technologies:

### Core Infrastructure

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

### AI & Voice Services

| Service | Purpose |
|---------|---------|
| [Anthropic Claude](https://anthropic.com/) | Faith Assistant, Prayer Intelligence, Content Generation |
| [Google Cloud TTS](https://cloud.google.com/text-to-speech) | WaveNet voice synthesis for read-aloud features |
| [Groq](https://groq.com/) | Ultra-fast Whisper STT (300-500ms latency) |
| [Stability AI](https://stability.ai/) | Image generation for devotions and content |

### Payment Gateways

| Provider | Market |
|----------|--------|
| [iPaymu](https://ipaymu.com/) | Indonesia (VA, QRIS, E-wallets) |
| [Xendit](https://xendit.co/) | Southeast Asia (planned) |
| [Midtrans](https://midtrans.com/) | Indonesia (planned) |
| [Stripe](https://stripe.com/) | International (planned) |

---

## License

Proprietary - All rights reserved

---

<div align="center">

**FaithFlow** - *Empowering Churches with Clarity, Care, and Connection*

Made with love for churches worldwide

</div>
