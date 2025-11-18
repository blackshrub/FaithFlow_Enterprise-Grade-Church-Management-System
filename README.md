# FaithFlow - Complete Church Management System

**Empowering Churches with Clarity, Care, and Connection**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Overview

FaithFlow is a comprehensive, production-ready church management system designed for multi-church organizations. It provides a complete admin dashboard for church operations and a backend API for mobile applications.

### Key Features

- ✅ **Multi-Tenant Architecture** - Manage multiple churches from one system
- ✅ **Event & RSVP Management** - Events, seat selection, QR codes, WhatsApp notifications
- ✅ **Kiosk Mode** - Professional check-in system with QR scanning (10 colorful themes)
- ✅ **Devotion CMS** - Daily devotions with 6 Bible versions (186,000+ verses)
- ✅ **Indonesian TTS** - Professional male voice (Wibowo) with Coqui TTS
- ✅ **Member Management** - Complete CRUD, import/export, personal QR codes
- ✅ **Accounting System** - COA, journals, budgeting, bank reconciliation, reports
- ✅ **Prayer Requests** - Manage and track prayer requests
- ✅ **Full i18n Support** - English & Indonesian (500+ translation keys)
- ✅ **Mobile API Ready** - RESTful APIs for mobile apps

### Tech Stack

**Backend:**
- FastAPI (Python 3.11)
- MongoDB (Database)
- Coqui TTS (Indonesian voice - Wibowo)
- gTTS (Fallback TTS)
- QR Code generation
- WhatsApp Gateway integration

**Frontend:**
- React 18
- TanStack React Query (Server state)
- Tailwind CSS + shadcn/ui
- Tiptap (Rich text editor)
- react-i18next (Internationalization)
- @zxing/library (QR scanning)

**Database:**
- MongoDB 7.0+
- 186,592 Bible verses (6 versions: TB, CHS, NIV, NKJV, NLT, ESV)
- Multi-church data isolation

## Quick Links

- 📚 [Complete Features Documentation](./docs/FEATURES.md)
- 🔌 [API Documentation](./docs/API.md)
- 🏗️ [Codebase Structure](./docs/STRUCTURE.md)
- 🚀 [Debian Deployment Guide](./docs/DEPLOYMENT_DEBIAN.md)
- 🌐 [Internationalization Guide](./docs/I18N.md)

## Project Structure

```
faithflow/
├── backend/
│   ├── models/              # Pydantic models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic (TTS, WhatsApp, QR)
│   ├── utils/               # Helper functions
│   ├── data/
│   │   └── bible/          # Bible JSON files (186k verses)
│   ├── models/
│   │   └── tts_indonesian/ # Coqui TTS model (329MB + config)
│   ├── server.py           # Main FastAPI application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # React Query hooks
│   │   ├── services/       # API services
│   │   ├── i18n/           # Translation files
│   │   └── App.js          # Main React app
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
├── docs/                   # Documentation
└── README.md               # This file
```

## Quick Start (Development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 7.0+
- Git LFS (for large model files)

---

## Production Deployment

**Two Options:**

### Option 1: One-Click Automated Installer (Recommended)

**For fresh Debian 12 server:**

```bash
# Copy installer to server
scp install.sh root@yourserver:/root/

# SSH and run
ssh root@yourserver
sudo bash install.sh

# Follow interactive prompts
# Installation takes 15-20 minutes
# Everything automated!
```

**The installer handles:**
- ✅ All system dependencies
- ✅ MongoDB installation (or uses your managed DB)
- ✅ Backend setup (venv, packages, .env)
- ✅ Frontend build
- ✅ Nginx configuration
- ✅ SSL certificate (Let's Encrypt)
- ✅ Systemd services
- ✅ Bible data import (186k verses)
- ✅ Admin user creation
- ✅ Database indexes
- ✅ Backup scheduling
- ✅ Firewall setup
- ✅ Health verification

**After installation:**
- Open `https://yourdomain.com`
- Login with your admin credentials
- System ready to use!

### Option 2: Manual Step-by-Step Deployment

**For production deployment on Debian server, follow the complete guide:**

👉 **[Manual Deployment Guide](./docs/DEPLOYMENT_DEBIAN.md)**

Includes detailed steps for:
- Server setup
- Database configuration
- Nginx reverse proxy
- SSL/HTTPS setup
- Systemd services
- Bible data initialization
- TTS model setup

## Documentation

### For Developers

- [API Documentation](./docs/API.md) - Complete REST API reference
- [Codebase Structure](./docs/STRUCTURE.md) - Directory layout and architecture
- [Database Schema](./docs/DATABASE.md) - MongoDB collections and models

### For Administrators

- [Features Guide](./docs/FEATURES.md) - Complete feature documentation
- [User Manual](./docs/USER_MANUAL.md) - How to use each module
- [Configuration Guide](./docs/CONFIGURATION.md) - System settings

### For DevOps

- [Deployment Guide](./docs/DEPLOYMENT_DEBIAN.md) - Production deployment
- [Backup & Restore](./docs/BACKUP.md) - Data backup procedures
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues

## Key Features

### 1. Event Management
- Create single or series events
- Seat layout editor (visual grid)
- Cinema-style seat selection
- RSVP with QR codes (4-digit confirmation)
- WhatsApp confirmations (delivery tracking)
- Attendance tracking

### 2. Kiosk Mode
- Fullscreen tablet-optimized UI
- Split-screen (camera + manual search)
- 10 colorful themes
- Dual QR support (personal + event)
- Onsite RSVP flow
- Quick visitor registration
- 3-second countdown photo capture

### 3. Devotion CMS
- Daily devotion posts
- Rich text editor (Tiptap)
- 6 Bible versions (186,592 verses)
- Verse picker with auto-fetch
- Indonesian TTS (Wibowo voice)
- Version history tracking
- Schedule publishing
- Bulk operations

### 4. Accounting System
- Chart of Accounts (COA)
- General Journal
- Budget management
- Fixed assets tracking
- Bank reconciliation
- Financial reports
- Multi-church isolation

### 5. Member Management
- Complete member CRUD
- Bulk import (CSV/JSON)
- Photo & document management
- Personal QR codes (universal ID)
- Demographics & categories
- Custom fields support

### 6. Bible Integration
- **6 Versions:**
  - TB (Terjemahan Baru - Indonesian)
  - CHS (Chinese Union Simplified)
  - NIV, NKJV, NLT, ESV (English)
- 186,592 verses stored locally
- Fast verse lookup API
- Language-appropriate book names

### 7. Text-to-Speech
- Coqui TTS with Wibowo voice (male, Indonesian)
- Automatic pronunciation normalization
- Preview before saving
- gTTS fallback

## Multi-Church Support

Every data record is scoped by `church_id`:
- Members, events, devotions, prayers, accounting
- Automatic church isolation
- Super Admin can view all churches
- Regular admins see only their church

## Internationalization (i18n)

- **Languages:** English & Indonesian
- **500+ translation keys**
- **Zero hardcoded strings**
- Supports interpolation, pluralization
- Date/time formatting per locale

## Security

- JWT-based authentication
- Role-based access (Admin, Staff, Super Admin)
- Church-level data isolation
- HTTPS required in production
- Environment-based secrets

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (for kiosk mode)

## License

MIT License - See LICENSE file

## Support

For issues, questions, or contributions, please refer to the documentation or open an issue on GitHub.

## Credits

- **TTS Model:** Wikidepia Indonesian-TTS (Wibowo voice)
- **Bible Data:** Bible SuperSearch (TB, CHS) + Community sources (NIV, NKJV, NLT, ESV)
- **UI Components:** shadcn/ui
- **Icons:** Lucide React

---

**Built with ❤️ for churches worldwide**
