# FaithFlow - Enterprise Church Management System

![FaithFlow](https://img.shields.io/badge/Status-Production%20Ready-green)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20MongoDB-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-cyan)

**FaithFlow** is a comprehensive, enterprise-grade church management platform designed for multi-site churches. Built with modern technologies and production-ready architecture.

---

## 🎯 Features

### 👥 **Member Management**
- Complete member profiles with photos & documents
- Bulk CSV import with duplicate detection
- Advanced filtering (gender, marital status, demographics, member status)
- Incomplete data tracking
- **Soft delete with 14-day trash bin**
- QR code generation for each member
- Personal ID codes
- Multi-language support (EN/ID)

### 🤖 **Member Status Automation** (NEW!)
- Define custom member statuses with colors
- Create automation rules based on:
  - Age conditions
  - Attendance patterns (Sunday Service)
  - Time windows (e.g., last 60 days)
- Two-phase rule evaluation (global + status-based)
- **Simulation/preview before applying rules**
- Automatic conflict detection
- Conflict review queue with manual resolution
- Complete audit trail
- Timezone-aware scheduling
- Background automation (hourly checks)

### 📅 **Events & Attendance**
- Single and series events
- RSVP management with seat selection
- QR code check-in (kiosk mode)
- Event categories (Sunday Service is system default)
- Attendance tracking and reporting

### 👥 **Groups Management**
- Small groups, ministry teams, activities
- Join/leave request workflows
- Group leaders and members
- Cover images and descriptions
- Public group directory

### 🙏 **Prayer Requests**
- Submit and manage prayer requests
- Categories and status tracking
- Public submission form
- Admin moderation

### 📰 **Articles & Devotions**
- Rich text editor (TipTap)
- Scheduled publishing
- Categories and tags
- Comments moderation
- Daily devotions
- Bible integration

### 📊 **Accounting Module**
- Full double-entry accounting
- Chart of Accounts
- General Ledger
- Journals and transactions
- Budget management
- Fixed assets and depreciation
- Bank reconciliation
- Fiscal periods and year-end closing
- Comprehensive reports

### 🔔 **Integrations**

#### Webhooks (Outbound)
- Real-time member data sync to external apps
- HMAC-SHA256 signature verification
- Configurable events (member.created/updated/deleted)
- Retry queue with exponential backoff
- Delivery logs and monitoring
- **Includes campus_id for compatibility**

#### API Keys (Inbound)
- Generate secure API credentials for external apps
- Username + API key authentication
- JWT token-based access
- Full REST API access
- Multi-tenant scoped automatically

#### Public API
- Read member status without authentication
- Mobile app integration ready

---

## 🛠️ Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB (Motor async driver)
- **Authentication:** JWT tokens
- **Scheduler:** APScheduler (4 background jobs)
- **Webhooks:** httpx async client with retry queue
- **Validation:** Pydantic v2

### Frontend
- **Framework:** React 18 + Create React App
- **UI Components:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack React Query
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Forms:** React Hook Form
- **i18n:** react-i18next (EN/ID)

### Infrastructure
- **Multi-tenant:** church_id scoping on all data
- **Soft delete:** 14-day trash bin for members
- **Background jobs:** 4 scheduled tasks
- **CORS:** Configurable origins
- **Security:** Strong JWT secrets, API key hashing

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 5.0+
- Yarn package manager

### Installation

```bash
# Clone repository
git clone <repository-url>
cd faithflow

# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure environment variables
python scripts/init_event_categories.py  # Initialize default data

# Frontend setup
cd ../frontend
yarn install
cp .env.example .env  # Configure environment variables

# Start services (use supervisor in production)
cd backend && uvicorn server:app --reload  # Backend on :8001
cd frontend && yarn start  # Frontend on :3000
```

### Environment Variables

**Backend (.env):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=church_management
CORS_ORIGINS=*
JWT_SECRET_KEY=<generate-strong-random-key>
```

**Frontend (.env):**
```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

---

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Complete REST API reference
- **[External API Guide](docs/EXTERNAL_API.md)** - Integration guide for external apps
- **[Import/Export API](docs/IMPORT_EXPORT_API.md)** - Bulk data operations
- **[Features Guide](docs/FEATURES.md)** - Detailed feature documentation
- **[Deployment Guide](docs/DEPLOYMENT_DEBIAN.md)** - Production deployment
- **[PyTorch/TTS Guide](PYTORCH_DEPLOYMENT_GUIDE.md)** - Optional TTS configuration
- **[API Key Testing](API_KEY_TESTING_GUIDE.md)** - External authentication testing

---

## 🔐 Security Features

- JWT authentication with strong secrets
- API key authentication for external apps
- HMAC-SHA256 webhook signatures
- Multi-tenant data isolation (church_id)
- Role-based access control (super_admin, admin, staff)
- Password hashing (bcrypt)
- CORS protection
- Soft delete with trash bin
- Audit trails for status changes

---

## 🔄 Background Jobs

**4 Scheduled Tasks:**
1. **Article Publishing** - Every 30 seconds
2. **Webhook Queue Processing** - Every 10 seconds
3. **Member Status Automation** - Hourly (checks church schedules)
4. **Trash Bin Cleanup** - Daily at 2 AM (deletes >14 days old)

---

## 🌐 Multi-Language Support

- English (en)
- Indonesian (id)
- Complete i18n for all UI text
- Member preferred language tracking

---

## 📦 Key Collections (MongoDB)

### Core
- `churches` - Multi-tenant organizations
- `users` - Admin/staff accounts
- `members` - Church members (807 active, 2 in trash)
- `church_settings` - Per-church configuration

### Events
- `events` - Single and series events
- `event_categories` - Event types (Sunday Service is system default)

### Status Automation
- `member_statuses` - Custom statuses with colors
- `member_status_rules` - Automation rules with conditions
- `rule_evaluation_conflicts` - Conflict review queue
- `member_status_history` - Complete audit trail

### Groups
- `groups` - Small groups and ministries
- `group_memberships` - Member assignments
- `group_join_requests` - Join request workflow

### Content
- `articles` - Articles and sermons
- `devotions` - Daily devotions
- `prayer_requests` - Prayer request tracking

### Integrations
- `webhook_configs` - Webhook configurations
- `webhook_queue` - Retry queue
- `webhook_delivery_logs` - Delivery history
- `api_keys` - External app credentials

### Accounting
- `coa` - Chart of accounts
- `journals` - Journal entries
- `fiscal_periods` - Financial periods
- `budgets` - Budget tracking
- And 10+ more accounting collections

---

## 💻 API Endpoints

### Authentication
```
POST   /api/auth/login          # JWT token (supports email or API username)
GET    /api/auth/me             # Current user info
```

### Members
```
GET    /api/members/            # List (with filters: gender, marital, status, demographics)
POST   /api/members/            # Create
PATCH  /api/members/{id}        # Update (triggers webhook)
DELETE /api/members/{id}        # Soft delete (to trash)
GET    /api/members/trash       # List deleted members
POST   /api/members/{id}/restore  # Restore from trash
```

### Member Status Automation
```
GET    /api/v1/member-status/statuses      # List statuses
POST   /api/v1/member-status/statuses      # Create status
GET    /api/v1/member-status/rules         # List rules
POST   /api/v1/member-status/rules         # Create rule
POST   /api/v1/member-status/simulate      # Preview affected members
POST   /api/v1/member-status/run-once      # Manual trigger
GET    /api/v1/member-status/conflicts     # List conflicts
POST   /api/v1/member-status/conflicts/{id}/resolve  # Resolve conflict
GET    /api/v1/member-status/members/{id}/history    # Status change history
```

### External Integration
```
POST   /api/webhooks/           # Create webhook
GET    /api/api-keys/           # List API keys
GET    /api/public/members/{id}/status  # Public member status (no auth)
```

**See [API.md](docs/API.md) and [EXTERNAL_API.md](docs/EXTERNAL_API.md) for complete reference.**

---

## 📊 Stats

- **807** Active members
- **2** Members in trash
- **1** Church (multi-tenant ready)
- **8** API keys generated
- **15+** Collections
- **100+** API endpoints
- **2** Languages supported
- **4** Background jobs running

---

## 👥 Contributing

This is an enterprise church management system. For feature requests or bug reports, please contact the development team.

---

## 📝 License

Proprietary - All rights reserved

---

## 🚀 Deployment

**Production Ready!**
- ✅ Optimized for Kubernetes deployment
- ✅ Resource efficient (<1Gi memory)
- ✅ All dependencies lightweight
- ✅ Environment variable configured
- ✅ CORS and security hardened
- ✅ Background jobs stable

**See [DEPLOYMENT_DEBIAN.md](docs/DEPLOYMENT_DEBIAN.md) for deployment guide.**

---

## 🎉 Recent Updates

### November 2025
- ✅ **Member Status Automation System** - Complete automation with rules and conflict detection
- ✅ **Trash Bin System** - Soft delete with 14-day auto-cleanup
- ✅ **Enhanced Member Filters** - Gender, marital, status, demographics
- ✅ **Webhook Improvements** - campus_id support, signature format updates
- ✅ **API Key Authentication** - Non-email username support
- ✅ **Deployment Ready** - All blockers resolved

---

**Built with ❤️ for church communities worldwide**
