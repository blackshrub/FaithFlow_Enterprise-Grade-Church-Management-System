# FaithFlow - Codebase Structure

## Directory Layout

```
faithflow/
├── backend/                 # Python FastAPI backend
│   ├── models/              # Pydantic data models
│   │   ├── user.py
│   │   ├── church.py
│   │   ├── member.py
│   │   ├── event.py
│   │   ├── devotion.py
│   │   ├── bible.py
│   │   ├── accounting_coa.py           # ⭐ Accounting - Chart of Accounts
│   │   ├── responsibility_center.py    # ⭐ Accounting - Ministry tracking
│   │   ├── journal.py                  # ⭐ Accounting - Journals
│   │   ├── fiscal_period.py            # ⭐ Accounting - Period locking
│   │   ├── budget.py, fixed_asset.py   # ⭐ Accounting - Budgets & Assets
│   │   ├── bank_*.py, beginning_balance.py # ⭐ Accounting - Bank & Opening
│   │   ├── year_end_closing.py         # ⭐ Accounting - Year-end
│   │   ├── audit_log.py, file_upload.py # ⭐ Accounting - Audit & Files
│   │   ├── article.py                  # ⭐ CMS - Article model
│   │   ├── article_category.py, article_tag.py # ⭐ CMS - Categories & Tags
│   │   ├── article_comment.py          # ⭐ CMS - Comments
│   │   ├── prayer_request.py           # ⭐ Prayer Requests
│   │   └── ...
│   ├── routes/              # API endpoints
│   │   ├── auth.py, members.py, events.py, devotions.py, bible.py
│   │   ├── accounting_*.py (15 files)  # ⭐ Accounting endpoints
│   │   ├── articles.py                 # ⭐ CMS - Articles CRUD
│   │   ├── article_categories.py, article_tags.py # ⭐ CMS - Categories/Tags
│   │   ├── article_comments.py         # ⭐ CMS - Comments
│   │   ├── articles_public.py          # ⭐ CMS - Public API
│   │   ├── prayer_requests.py          # ⭐ Prayer Requests
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── tts_service.py, qr_service.py, auth_service.py
│   │   ├── accounting_service.py       # ⭐ Accounting utilities
│   │   ├── fiscal_period_service.py    # ⭐ Fiscal period management
│   │   ├── year_end_closing_service.py # ⭐ Year-end logic
│   │   ├── article_service.py          # ⭐ CMS utilities
│   │   ├── article_scheduler.py        # ⭐ CMS auto-publish worker
│   │   └── ...
│   ├── scheduler.py         # ⭐ APScheduler configuration
│   ├── utils/               # Helper functions
│   │   ├── dependencies.py  # FastAPI dependencies
│   │   ├── security.py      # Password hashing
│   │   ├── helpers.py       # Common utilities
│   │   ├── error_codes.py   # ⭐ NEW - Error constants
│   │   ├── error_response.py # ⭐ NEW - Error handling
│   │   ├── db_transaction.py # ⭐ NEW - MongoDB transactions
│   │   ├── tenant_utils.py  # ⭐ NEW - Multi-tenant utilities
│   │   └── ...
│   ├── middleware/          # ⭐ NEW - Middleware
│   │   └── tenant_middleware.py  # Multi-tenant enforcement
│   ├── data/                # Static data
│   │   └── bible/           # Bible JSON files
│   │       ├── indo_tb.json       # Indonesian (6.5MB)
│   │       ├── chinese_union_simp.json  # Chinese (9.5MB)
│   │       ├── niv.json           # NIV English (4.5MB)
│   │       ├── nkjv.json          # NKJV (4.6MB)
│   │       ├── nlt.json           # NLT (4.7MB)
│   │       └── esv.json           # ESV (4.6MB)
│   ├── models/              # ML models
│   │   └── tts_indonesian/  # Coqui TTS (Wibowo)
│   │       ├── checkpoint.pth     # Model weights (330MB)
│   │       ├── config.json        # Model config
│   │       └── speakers.pth       # Speaker embeddings
│   ├── scripts/             # Utility scripts
│   │   ├── init_db.py       # Database initialization
│   │   ├── import_tb_chs.py # Import TB & Chinese
│   │   ├── import_english_bibles.py  # Import English
│   │   ├── create_accounting_indexes.py # ⭐ Accounting indexes
│   │   ├── create_article_indexes.py    # ⭐ Articles indexes
│   │   ├── create_prayer_indexes.py     # ⭐ Prayer indexes
│   │   ├── seed_coa.py                  # ⭐ Indonesian COA seeder
│   │   └── ...
│   ├── server.py            # Main FastAPI app
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables (not in git)
├── frontend/                # React frontend
│   ├── public/              # Static assets
│   │   └── index.html       # HTML template
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Events/      # Event components
│   │   │   ├── Devotions/   # Devotion components
│   │   │   ├── Kiosk/       # Kiosk components
│   │   │   ├── Settings/    # Settings components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── pages/           # Page components
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Events.js
│   │   │   ├── Devotions.js
│   │   │   ├── KioskMode.js
│   │   │   └── ...
│   │   ├── hooks/           # React Query hooks
│   │   │   ├── useEvents.js
│   │   │   ├── useDevotions.js
│   │   │   └── ...
│   │   ├── services/        # API service layer
│   │   │   └── api.js       # Axios configuration
│   │   ├── i18n/            # Internationalization
│   │   │   ├── index.js     # i18n setup
│   │   │   └── locales/
│   │   │       ├── en.json   # English (500+ keys)
│   │   │       └── id.json   # Indonesian (500+ keys)
│   │   ├── context/         # React context
│   │   │   └── AuthContext.js
│   │   └── App.js           # Main React app
│   ├── package.json         # Node dependencies
│   ├── tailwind.config.js   # Tailwind theme
│   └── .env                 # Frontend env (not in git)
├── docs/                    # Documentation
│   ├── FEATURES.md          # Feature documentation
│   ├── API.md               # API reference
│   ├── DEPLOYMENT_DEBIAN.md # Deployment guide
│   ├── STRUCTURE.md         # This file
│   └── ...
├── .gitignore               # Git ignore rules
├── .gitattributes           # Git LFS config
└── README.md                # Project overview
```

---

## Key Files Explained

### Backend

**`server.py`**
- Main FastAPI application
- Registers all routers
- CORS middleware
- MongoDB connection

**`requirements.txt`**
- All Python dependencies
- Pinned versions for stability
- Includes: FastAPI, Motor, TTS, QR libraries

**`models/`**
- Pydantic models for validation
- Define data structure
- Request/response schemas

**`routes/`**
- API endpoint definitions
- One file per module
- Uses FastAPI router pattern

**`services/`**
- Business logic separated from routes
- Reusable service functions
- TTS, QR, WhatsApp integrations

**`data/bible/`**
- **Critical:** 6 Bible JSON files (35MB total)
- **Must be in Git LFS**
- Required for devotion verse picker
- Imported to MongoDB on first run

**`models/tts_indonesian/`**
- **Critical:** Coqui TTS model files (330MB)
- **Must be in Git LFS**
- checkpoint.pth: Model weights
- config.json: Model configuration
- speakers.pth: Speaker embeddings
- Required for Wibowo voice TTS

### Frontend

**`src/App.js`**
- Main React application
- Route definitions
- Global providers (Auth, Query, i18n)

**`src/services/api.js`**
- Axios instance configuration
- All API service functions
- Dynamic origin detection

**`src/i18n/`**
- react-i18next configuration
- Translation files (en.json, id.json)
- 500+ translation keys

**`tailwind.config.js`**
- FaithFlow theme colors
- Custom design tokens
- Animation keyframes

**`package.json`**
- Node dependencies
- Build scripts
- React 18, TanStack Query, Tailwind, Tiptap

### Configuration Files

**Backend `.env`:**
```bash
MONGO_URL=mongodb://user:pass@localhost:27017
DB_NAME=church_management
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=https://yourdomain.com
WHATSAPP_API_URL=http://gateway:3001
```

**Frontend `.env`:**
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
```

---

## Data Flow

### Request Flow

```
Browser
  ↓ HTTPS
Nginx (Port 80/443)
  ↓ Proxy /api/*
FastAPI Backend (Port 8001)
  ↓ MongoDB Driver
MongoDB (Port 27017)
```

### Authentication Flow

```
1. User submits credentials
2. Backend validates against MongoDB
3. Generate JWT token
4. Return token to frontend
5. Frontend stores in localStorage
6. All requests include token in header
7. Backend validates and extracts church_id
```

### Devotion Creation Flow

```
1. Admin writes devotion in Tiptap editor
2. Selects Bible verses
   ↓ Frontend calls /api/bible/{version}/{book}/{chapter}/{verse}
   ↓ Backend queries MongoDB bible_verses
   ↓ Returns verse text
3. Clicks "Generate Audio"
   ↓ Frontend calls /api/devotions/generate-audio-preview
   ↓ Backend:
      - Preprocesses text (g→k, d→t fixes)
      - Converts to phonemes (g2p-id)
      - Loads Coqui TTS model
      - Generates audio with Wibowo
      - Returns base64 WAV
4. Audio player appears immediately
5. Admin saves devotion
   ↓ POST /api/devotions/
   ↓ Stored in MongoDB with audio URL
```

---

## Important Files for Deployment

### Must Be in Repository

**Bible Data (35MB):**
- `/backend/data/bible/indo_tb.json`
- `/backend/data/bible/chinese_union_simp.json`
- `/backend/data/bible/niv.json`
- `/backend/data/bible/nkjv.json`
- `/backend/data/bible/nlt.json`
- `/backend/data/bible/esv.json`

**TTS Models (330MB):**
- `/backend/models/tts_indonesian/checkpoint.pth`
- `/backend/models/tts_indonesian/config.json`
- `/backend/models/tts_indonesian/speakers.pth`

**Configuration Examples:**
- `/backend/.env.example`
- `/frontend/.env.example`

### Generated at Runtime

**Build Artifacts:**
- `/frontend/build/` (React production build)

**Logs:**
- `/var/log/faithflow/` (systemd logs)

**Uploads:**
- Member photos (base64 in MongoDB)
- Documents (base64 in MongoDB)
- **Accounting attachments (file system):** `/app/uploads/{church_id}/` ⭐ NEW
  - Receipts, invoices, bank slips
  - Max 10MB per file
  - Images (JPEG, PNG), PDFs, Excel, CSV

---

## Git LFS Setup

### Why LFS?

- Bible JSON files: 35MB total
- TTS models: 330MB
- Too large for regular Git

### LFS Configuration

**`.gitattributes`:**
```
*.pth filter=lfs diff=lfs merge=lfs -text
*.pt filter=lfs diff=lfs merge=lfs -text
backend/data/bible/*.json filter=lfs diff=lfs merge=lfs -text
```

### Using LFS

**Initial commit:**
```bash
git lfs install
git lfs track "*.pth"
git lfs track "backend/data/bible/*.json"
git add .gitattributes
git add .
git commit -m "Initial commit with LFS"
git push
```

**Cloning:**
```bash
git lfs install
git clone https://github.com/your-org/faithflow.git
git lfs pull  # Ensure all large files downloaded
```

---

## Database Collections

### Core Collections

- `users` - Admin/staff accounts
- `churches` - Church organizations
- `members` - Church members
- `member_statuses` - Custom statuses
- `demographic_presets` - Age categories
- `church_settings` - Church configuration

### Feature Collections

- `events` - Events and series
- `seat_layouts` - Seat configurations
- `devotions` - Daily devotions
- `bible_versions` - Bible metadata
- `bible_books` - 66 books info
- `bible_verses` - 186k+ verses
- `prayer_requests` - Prayer management ⭐ NEW

### Accounting Collections ⭐ (16 collections)

- `chart_of_accounts` - Multi-level COA with hierarchy
- `responsibility_centers` - Ministry/project tracking
- `journals` - Double-entry journal entries
- `fiscal_periods` - Monthly period locking
- `budgets` - Annual/monthly budgets
- `fixed_assets` - Asset register
- `asset_depreciation_logs` - Depreciation history
- `bank_accounts` - Bank account list
- `bank_transactions` - Transaction register
- `bank_import_logs` - CSV import tracking
- `beginning_balances` - Opening balances
- `year_end_closings` - Year-end closing records
- `file_uploads` - File attachments (receipts, invoices)
- `audit_logs` - Complete audit trail
- `report_templates` - Custom report configurations
- `export_jobs` - Async export job tracking
- `journal_counters` - Atomic journal numbering

### CMS Collections ⭐ NEW (4 collections)

- `articles` - Article content (title, content, slug, scheduling)
- `article_categories` - Article categories
- `article_tags` - Article tags
- `article_comments` - Comment moderation

### Prayer Requests Collections ⭐ NEW (1 collection)

- `prayer_requests` - Prayer requests with follow-up tracking

### Import/Export

- `import_logs` - Import history
- `import_templates` - Saved mappings

---

## Technology Decisions

### Why FastAPI?
- Fast (ASGI)
- Auto-generated API docs (Swagger)
- Type hints and validation
- Async support
- Modern Python

### Why MongoDB?
- Flexible schema (custom fields)
- Fast for read-heavy workloads
- Good for multi-tenant
- JSON-native (matches Bible data)
- Easy horizontal scaling

### Why React Query?
- Server state management
- Automatic caching
- Optimistic updates
- Refetch on focus
- Better than Redux for this use case

### Why Coqui TTS?
- Open source
- Local/offline
- High quality
- Customizable (Wibowo voice)
- No API costs

### Why Local Bible?
- No external API dependency
- Fast lookups
- Works offline
- No rate limits
- Complete control

---

## Scalability Notes

### Current Limits

- **Churches:** Unlimited (multi-tenant design)
- **Members per church:** 10,000+ (tested)
- **Events:** Unlimited
- **Devotions:** Unlimited
- **Bible queries:** Fast (indexed)
- **TTS:** CPU-bound (60-90s per generation)

### Optimization Options

**If TTS is slow:**
- Use queue system (Celery)
- Generate in background
- Cache generated audio

**If database is slow:**
- Add more indexes
- Use MongoDB Atlas (managed)
- Enable sharding (for huge datasets)

**If API is slow:**
- Increase uvicorn workers
- Use Redis for caching
- CDN for static assets

---

## Security Architecture

### Authentication

- JWT tokens (HTTPOnly recommended for cookies)
- Bcrypt password hashing
- Token expiration (configurable)
- Refresh token support (if needed)

### Authorization

- Role-based (Super Admin, Admin, Staff)
- Church-level isolation
- Endpoint-level checks

### Data Protection

- `church_id` filtering on ALL queries
- No cross-church data access
- Encrypted MongoDB connection (TLS)
- HTTPS required in production

---

## Maintenance Tasks

### Daily
- Monitor service status
- Check error logs

### Weekly
- Review disk space
- Check backup success

### Monthly
- Update dependencies (security patches)
- Review user activity
- Database optimization

### Quarterly
- Full system backup
- Disaster recovery test
- Performance review

---

**For detailed API documentation, see:** `/docs/API.md`

**For troubleshooting, see:** `/docs/TROUBLESHOOTING.md`
