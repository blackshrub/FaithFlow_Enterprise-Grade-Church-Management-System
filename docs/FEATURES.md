# FaithFlow - Complete Features Documentation

## Table of Contents

1. [Authentication & Multi-Church System](#authentication--multi-church-system)
2. [Event & RSVP Management](#event--rsvp-management)
3. [Kiosk Mode](#kiosk-mode)
4. [Devotion CMS](#devotion-cms)
5. [Bible Integration](#bible-integration)
6. [Member Management](#member-management)
7. [Import/Export System](#importexport-system)
8. [Accounting Module](#accounting-module)
9. [Prayer Requests](#prayer-requests)
10. [Settings & Configuration](#settings--configuration)

---

## Authentication & Multi-Church System

### Overview
FaithFlow uses a multi-tenant architecture where a single installation can manage multiple churches. Each church's data is completely isolated.

### User Roles

**1. Super Admin**
- Can view and manage all churches
- Create new churches
- Manage system-wide settings

**2. Admin**
- Full access to their church only
- Manage all modules for their church
- Cannot see other churches' data

**3. Staff**
- Limited access to their church
- Can manage members, events, check-ins
- Cannot modify settings

### Multi-Tenancy (`church_id`)

Every data record includes a `church_id` field:
- Members, events, devotions, accounting records
- Automatic filtering by church
- No cross-church data leakage
- Mobile apps: Each church has separate data

### Authentication Flow

1. User logs in with email + password
2. System validates credentials
3. Returns JWT token
4. Token includes: `user_id`, `church_id`, `role`
5. All API requests include token
6. Server validates and filters by church

---

## Event & RSVP Management

### Overview
Complete event management system with seat selection, RSVP, and attendance tracking.

### Event Types

**1. Single Event**
- One-time occurrence
- Specific date/time
- Optional seat selection
- Example: Sunday Service, Concert

**2. Series Event**
- Multiple sessions
- Each session has own date/time
- No seat selection (RSVP per session)
- Example: Bible Study Series (Week 1, 2, 3)

### Seat Layouts

**Visual Grid Editor:**
- Define rows (A, B, C...) and columns (1, 2, 3...)
- Click to toggle seat states:
  - Available (green)
  - Unavailable (red)
  - No Seat (gray/transparent)
- Stage reference (centered above seats)
- Reusable layouts for different rooms

**Use Cases:**
- Main auditorium (10 rows × 20 columns)
- Classroom (5 rows × 8 columns)
- Concert hall (custom layout)

### RSVP System

**Features:**
- Members can register for events
- Select specific seats (if enabled)
- Receive QR code + 4-digit confirmation code
- WhatsApp notification with QR image
- View all RSVPs per event/session
- Cancel RSVP

**QR Codes:**
- **Event RSVP QR:** `RSVP|event_id|member_id|session|code`
- **Personal QR:** `MEMBER|member_id|unique_code`
- Both work for check-in

**Capacity Management:**
- Seat layout capacity (auto-calculated)
- Manual capacity (for events without seat selection)
- Prevents overbooking

### WhatsApp Integration

**Features:**
- Auto-send confirmation on RSVP
- Includes QR code image
- Delivery status tracking
- Manual retry for failed messages
- Toggle on/off in Settings

**Message Format:**
```
🎉 RSVP Confirmation

Hello [Name],

Your registration has been confirmed!

📅 Event: [Event Name]
📆 Date: [Date Time]
📍 Location: [Location]
💺 Seat: [Seat Number]

🔑 Confirmation Code: [4-digit code]

Please save this QR code for check-in.
```

### Attendance Tracking

**Features:**
- View all checked-in members
- Check-in timestamps
- Session-specific for series events
- Attendance rate calculation
- Export attendance reports

**Progress Indicators:**
- Capacity: RSVP vs total capacity
- Attendance: Checked-in vs total RSVP
- Visual progress bars with color coding

---

## Kiosk Mode

### Overview
Professional check-in system optimized for landscape tablets at church entrances.

### Design

**Fullscreen Layout:**
- No sidebar/distractions
- Split-screen 50/50
- Left: Camera scanner
- Right: Manual search
- No scrolling (everything visible)

### Features

**1. QR Code Scanning**
- Always-on continuous scanning (500ms)
- Front/back camera switch
- Accepts:
  - Event RSVP QR
  - Personal Member QR
- Green pulsing border during scan
- Large success modal (3s auto-dismiss)

**2. Manual Search**
- Search field at top
- Real-time filtering
- Shows: Photo + Name + Phone
- Prevents duplicate name confusion
- Large tap-friendly cards

**3. Onsite RSVP**
- For RSVP-required events
- If member not registered:
  - Show modal: "Not registered for this event"
  - Options: Cancel or Onsite RSVP
  - If confirmed: Register + Check-in (atomic)

**4. Quick Visitor Add**
- For new visitors not in database
- Minimal form:
  - Full name *
  - Phone (optional)
  - Gender *
  - Date of birth
  - Photo capture (3s countdown)
- Auto-assigns default member status ("Visitor")
- Generates personal QR code
- Auto RSVP + check-in

**5. Colorful Themes**

10 beautiful gradient themes:
- 🌊 Ocean Blue
- 🌅 Sunset Orange
- 🌲 Forest Green
- 💜 Lavender Purple
- 🌸 Rose Pink
- 🌙 Midnight Blue
- 🍂 Autumn Gold
- 🌿 Mint Fresh
- 🪸 Coral Reef
- 🌌 Galaxy Purple

**Theme Features:**
- Unified background (full screen)
- Semi-transparent overlays
- Glass-morphism effect
- Saved to localStorage
- Easy switching per service/event

### Workflows

**Registered Member with QR:**
1. Scan QR code
2. Instant check-in
3. Success modal (name + photo)

**Unregistered Member (RSVP Event):**
1. Scan personal QR or search name
2. "Not registered" modal appears
3. Choose: Cancel or Onsite RSVP
4. If RSVP: Register → Check-in → Success

**New Visitor:**
1. Click "+ Add New Visitor"
2. Camera opens (3...2...1... countdown)
3. Photo captured
4. Fill: Name, phone, gender, DOB
5. Save → Creates member + RSVP + Check-in
6. Success modal

**Non-RSVP Event:**
- Anyone scans → Check-in → Success
- Fast and simple

---

## Devotion CMS

### Overview
Daily devotion management system with Bible integration and professional Indonesian text-to-speech.

### Features

**1. Create/Edit Devotions**
- Date selection
- Title
- Cover image (base64, 2MB max)
- Rich text editor (Tiptap)
  - Bold, italic, headings
  - Lists (ordered/unordered)
  - Links
  - Clean, modern interface
- Bible verses (multiple)
- Status: Draft, Published, Scheduled
- Schedule publishing (date/time)

**2. Bible Verse Picker**

**6 Bible Versions:**
- **TB** (Terjemahan Baru - Indonesian): 31,102 verses
- **CHS** (Chinese Union Simplified): 31,102 verses
- **NIV** (New International Version): 31,103 verses
- **NKJV** (New King James Version): 31,102 verses
- **NLT** (New Living Translation): 31,080 verses
- **ESV** (English Standard Version): 31,103 verses

**Total: 186,592 verses - ALL LOCAL!**

**Picker Features:**
- Select Bible version
- Book names match version language:
  - TB → Indonesian (Kejadian, Keluaran)
  - CHS → Chinese (创世记, 出埃及记)
  - English → Genesis, Exodus
- Chapter and verse selection
- Fetch button → Auto-loads verse text
- Preview before adding
- Add multiple verses per devotion

**3. Text-to-Speech (Wibowo Voice)**

**Technology:**
- Coqui TTS with Indonesian model
- Wibowo voice (male, professional, audiobook-quality)
- 329MB model (included in repo)

**Pronunciation Normalization:**
- Unicode script ɡ fix (for 'g' sounds)
- 'b' → 'p' at word end (jawab → jawap)
- 'b' → 'p' before consonants (sebabnya → sebapnya)
- 'd' → 't' at word end (murid → murit)
- 'd' → 't' before consonants (maksudnya → maksutnya)

**Features:**
- Generate audio before saving (preview)
- Generate after saving
- Audio player with controls
- WAV format (base64)
- 60-90 second generation time
- Falls back to gTTS if Coqui fails

**4. Version History**
- Auto-saves on every edit
- View all previous versions
- Restore any version
- Tracks editor and timestamp

**5. Bulk Operations**
- Select multiple devotions (checkboxes)
- Bulk publish
- Bulk unpublish (revert to draft)
- Bulk delete
- Select all function

**6. Schedule Publishing**
- Set future publish date/time
- Auto-publishes on scheduled date
- Timezone from church settings

**7. Duplicate Devotion**
- One-click copy
- Creates new draft
- Preserves all content
- Resets audio (generate new)

### Mobile API

**Endpoints:**
- `GET /api/devotions/today` - Today's devotion
- `GET /api/devotions/by-date?date=YYYY-MM-DD` - Specific date
- Complete data in single response:
  - Title, content, cover image
  - Bible verses with text
  - TTS audio URL
  - No additional API calls needed

---

## Bible Integration

### Database

**Collections:**
- `bible_versions` - 6 versions metadata
- `bible_books` - 66 books (multilingual names)
- `bible_verses` - 186,592 verses

**Versions:**

| Code | Name | Language | Verses |
|------|------|----------|--------|
| TB | Terjemahan Baru | Indonesian | 31,102 |
| CHS | Chinese Union Simplified | Chinese | 31,102 |
| NIV | New International Version | English | 31,103 |
| NKJV | New King James Version | English | 31,102 |
| NLT | New Living Translation | English | 31,080 |
| ESV | English Standard Version | 31,103 |

**Storage:**
- JSON files in `/backend/data/bible/`
- Imported to MongoDB on initialization
- Fast indexed lookup

**Book Names:**
- English: Genesis, Exodus, Leviticus...
- Indonesian: Kejadian, Keluaran, Imamat...
- Chinese: 创世记, 出埃及记, 利未记...

### API

**Endpoints:**
- `GET /api/bible/versions` - List all versions
- `GET /api/bible/books` - List 66 books
- `GET /api/bible/{version}/{book}/{chapter}` - Get chapter
- `GET /api/bible/{version}/{book}/{chapter}/{verse}` - Single verse
- `GET /api/bible/{version}/{book}/{chapter}/{start}/{end}` - Verse range

**Smart Lookup:**
- Handles any book name (English, Indonesian, Chinese)
- Falls back to book_number if name not found
- Example: `/api/bible/TB/Genesis/1/1` works (finds Kejadian)

---

## Member Management

### Overview
Complete member database with photos, documents, custom fields, and personal QR codes.

### Features

**1. Member CRUD**
- Full name, email, phone (WhatsApp)
- Gender, date of birth
- Address, city, state
- Occupation, marital status
- Baptism date, membership date
- Photo (base64)
- Personal documents
- Custom fields (church-specific)

**2. Personal QR Codes**

Every member gets:
- **6-digit unique code** (e.g., "123456")
- **QR code image** (base64)
- **QR data:** `MEMBER|member_id|code`

Generated automatically on:
- Member creation
- Bulk import
- Quick-add at kiosk

Use cases:
- Universal check-in (any event)
- Member identification
- Future: Attendance, access control

**3. Member Statuses**
- Customizable statuses (e.g., Visitor, Member, Elder)
- Display order
- Active/inactive toggle
- **Default for new visitors** (kiosk quick-add)

**4. Demographics**
- Age-based categories
- Auto-assignment based on DOB
- Examples: Kids (0-12), Teens (13-17), Youth (18-30)

**5. Search & Filters**
- Search by name, email, phone
- Filter by status, demographic
- Show incomplete data

---

## Import/Export System

### Overview
7-step wizard for bulk member import with photos and documents.

### Import Flow

**Step 1: Upload Data File**
- Supports: CSV, JSON
- Parses and previews data

**Step 2: Upload Photos (Optional)**
- ZIP/RAR archive
- Matches by filename
- Shows matched/unmatched

**Step 3: Upload Documents (Optional)**
- ZIP/RAR archive
- Matches by filename

**Step 4: Field Mapping**
- Map CSV columns to system fields
- Auto-mapping for common names
- Support for custom fields
- Default values

**Step 5: Value Mapping**
- Transform values (e.g., "M" → "Male")
- Common mappings available

**Step 6: Validation**
- Simulate import
- Show errors
- Resolve duplicate phone numbers
- Preview photo/document matching

**Step 7: Import**
- Final confirmation
- Import to database
- Show results (success/failed)

### Export

**Features:**
- Export to CSV or JSON
- Filter by status, demographic
- Include/exclude fields
- Download file

---

## Accounting Module

### Overview
**Enterprise-grade accounting system** with complete double-entry bookkeeping, multi-level Chart of Accounts, fiscal period control, budgeting, fixed asset management, bank reconciliation, and comprehensive financial reporting. Designed for Indonesian churches with simplified workflows for non-technical staff.

---

### ✅ **Core Features (100% Complete)**

#### **1. Multi-Level Chart of Accounts (COA)**

> Technical API reference: see `docs/API.md` → **Accounting (v1)** section.

**Unlimited Hierarchy:**
- Category → Subcategory → Account Group → Sub-Account → Account
- Visual tree structure
- Drag and drop (future)
- Code-based organization (e.g., 1000, 1100, 1110)

**Account Types:**
- **Assets** - Kas, Bank, Piutang, Gedung, Tanah, Kendaraan, Peralatan
- **Liabilities** - Utang Usaha, Pinjaman Bank
- **Equity** - Modal, Laba Ditahan, Laba Tahun Berjalan
- **Income** - Persembahan (Persepuluhan, Umum, Misi, Gedung), Donasi
- **Expenses** - Gaji, Utilitas (Listrik, Air, Internet), Pemeliharaan, Pelayanan, Administrasi, Misi, Penyusutan

**Protection:**
- Cannot edit `account_type`, `normal_balance`, or `parent_id` if account is used in journals
- Cannot delete accounts used in transactions
- Code uniqueness enforced per church

**Default Indonesian Church COA:**
- **53 pre-configured accounts** covering all church accounting needs
- Proper hierarchy (3 levels deep)
- Correct normal balances (Debit/Credit)
- One-click seeding for new churches
- Includes common income sources (tithes, offerings, donations)
- Includes common expense categories (salaries, utilities, ministry, missions)

**API Endpoints:**
```
GET    /api/v1/accounting/coa/              - List all accounts
GET    /api/v1/accounting/coa/tree          - Tree structure
GET    /api/v1/accounting/coa/{id}          - Single account
POST   /api/v1/accounting/coa/              - Create account
PUT    /api/v1/accounting/coa/{id}          - Update account
DELETE /api/v1/accounting/coa/{id}          - Delete account
POST   /api/v1/accounting/coa/seed-default  - Seed 53 accounts
```

---

#### **2. Double-Entry Journal System**

**Features:**
- Complete double-entry bookkeeping (Debit = Credit)
- Multi-line journals (minimum 2 lines)
- Responsibility center allocation
- Auto-generated journal numbers (JRN-YYYY-MM-XXXX)
- Draft/Approved workflow
- File attachments (receipts, invoices)
- Fiscal period validation (cannot edit locked periods)

**Validation:**
- Debit must equal Credit
- No duplicate account IDs in same journal
- Minimum 2 journal lines
- Cannot edit approved journals
- Cannot approve in closed/locked periods

**Journal Types:**
- **General** - Manual entries
- **Opening Balance** - Beginning balance journals
- **Quick Giving** - Auto-generated from weekly giving form
- **Quick Expense** - Auto-generated from expense form
- **Depreciation** - Auto-generated monthly depreciation
- **Bank Reconciliation** - Matched transactions
- **Year-End Closing** - Annual closing entries

**API Endpoints:**
```
GET    /api/v1/accounting/journals/             - List (paginated, max 200)
GET    /api/v1/accounting/journals/{id}         - Single journal
POST   /api/v1/accounting/journals/             - Create journal
PUT    /api/v1/accounting/journals/{id}         - Update (draft only)
POST   /api/v1/accounting/journals/{id}/approve - Approve journal
DELETE /api/v1/accounting/journals/{id}         - Delete (draft only)
```

---

#### **3. Fiscal Period Control System**

**Monthly Period Locking:**
- **Open** - Create, edit, approve journals freely
- **Closed** - Can create drafts, cannot approve
- **Locked** - Cannot create, edit, or approve (data immutable)

**Sequential Locking:**
- Periods must be locked in order (Jan → Feb → Mar...)
- Cannot lock Feb before locking Jan
- Enforces data integrity

**Admin Controls:**
- Close period (after all drafts approved)
- Lock period (after closing)
- Unlock period (emergency, Admin only)
- View status of all 12 months

**Validation:**
- Journal creation checks period status
- Journal approval blocked in closed periods
- All operations blocked in locked periods
- Beginning balance blocked if opening period locked

**API Endpoints:**
```
GET  /api/v1/accounting/fiscal-periods/list    - All periods
GET  /api/v1/accounting/fiscal-periods/current - Current month status
POST /api/v1/accounting/fiscal-periods/close   - Close period
POST /api/v1/accounting/fiscal-periods/lock    - Lock period
POST /api/v1/accounting/fiscal-periods/unlock  - Unlock (Admin)
```

---

#### **4. Quick Entry Forms**

**Designed for non-technical accounting staff** - simplified bookkeeping that auto-generates balanced journals.

**Weekly Giving Input (Persembahan Mingguan):**
- Fields: Date, Service name, Giving type, Amount, From account (Cash/Bank), To account (Income)
- Auto-generates balanced journal: Cash/Bank (Debit) → Income (Credit)
- File attachment support (offering slip photo)
- One-click save, immediately approved

**Outgoing Money Input (Pengeluaran):**
- Fields: Date, Description, Amount, From account, To account (Expense), Responsibility center
- Auto-generates balanced journal: Expense (Debit) → Cash/Bank (Credit)
- File attachment support (receipt, invoice)
- Ministry/project tracking via responsibility center

**API Endpoints:**
```
POST /api/v1/accounting/quick/weekly-giving   - Auto-generate giving journal
POST /api/v1/accounting/quick/outgoing-money  - Auto-generate expense journal
```

---

#### **5. Responsibility Centers**

**Purpose:** Track spending by ministry, project, department, or campus.

**Types:**
- **Department** - Admin, Finance, IT
- **Ministry** - Worship, Youth, Children, Missions
- **Project** - Building fund, Special events
- **Campus** - Multi-site churches

**Features:**
- Unlimited hierarchy (parent-child)
- Code uniqueness per church
- Active/inactive status
- Budget allocation per center
- Spending reports per center

**Use Case:**
- Track "Ministry of Youth" spending across multiple expense accounts
- Budget: Rp 120,000,000/year for Youth Ministry
- Actual spending: Rp 115,500,000
- Variance: Under budget by Rp 4,500,000

**API Endpoints:**
```
GET    /api/v1/accounting/responsibility-centers/     - List all
GET    /api/v1/accounting/responsibility-centers/{id} - Single center
POST   /api/v1/accounting/responsibility-centers/     - Create
PUT    /api/v1/accounting/responsibility-centers/{id} - Update
DELETE /api/v1/accounting/responsibility-centers/{id} - Delete
```

---

#### **6. Budget Management**

**Annual/Monthly Budgeting:**
- Create budget for fiscal year (e.g., 2025)
- Budget per account (Income/Expense accounts)
- Optional responsibility center allocation
- Annual amount with monthly distribution

**Auto-Distribution:**
- Click "Distribute Monthly" → Annual amount ÷ 12
- Manual edit allowed for seasonal variations
- Example: Higher utility budget in summer months

**Activation:**
- Budget must be validated before activation
- Validation: Sum of monthly amounts == Annual amount
- Error if mismatch: `BUDGET_MONTHLY_ANNUAL_MISMATCH`

**Variance Analysis:**
- Select month/year
- Compare budgeted vs actual spending
- Color-coded:
  - **Green** - Under budget
  - **Red** - Over budget
  - **Gray** - On track
- Drill-down to journal lines

**API Endpoints:**
```
GET  /api/v1/accounting/budgets/                        - List budgets
GET  /api/v1/accounting/budgets/{id}                    - Single budget
POST /api/v1/accounting/budgets/                        - Create
PUT  /api/v1/accounting/budgets/{id}                    - Update (draft only)
POST /api/v1/accounting/budgets/{id}/activate           - Activate (validates monthly==annual)
POST /api/v1/accounting/budgets/{id}/distribute-monthly - Auto-distribute
GET  /api/v1/accounting/budgets/{id}/variance           - Budget vs Actual report
```

---

#### **7. Fixed Asset Management**

**Asset Register:**
- Track church assets (buildings, land, vehicles, equipment)
- Asset code uniqueness per church
- Acquisition date, cost, useful life (months), salvage value
- Linked to 3 COA accounts:
  - Asset account (e.g., "Kendaraan")
  - Depreciation expense account (e.g., "Penyusutan")
  - Accumulated depreciation account (e.g., "Akumulasi Penyusutan")

**Depreciation:**
- **Method:** Straight-line only (depreciable amount ÷ useful life)
- **Formula:** `(Cost - Salvage Value) / Useful Life Months`
- **Monthly automation:** Run depreciation for all active assets
- **Auto-generates journals:** Depreciation Expense (Debit) → Accumulated Depreciation (Credit)
- **Tracks history:** Depreciation log per period (month/year)

**Depreciation Schedule:**
- View full schedule from acquisition to end of useful life
- See: Period, Depreciation amount, Accumulated, Book value, Journal number
- Calculate book value at any point in time

**API Endpoints:**
```
GET  /api/v1/accounting/assets/                          - List assets
GET  /api/v1/accounting/assets/{id}                      - Single asset
POST /api/v1/accounting/assets/                          - Create
PUT  /api/v1/accounting/assets/{id}                      - Update
DELETE /api/v1/accounting/assets/{id}                    - Deactivate
POST /api/v1/accounting/assets/run-monthly-depreciation  - Run depreciation (all assets)
GET  /api/v1/accounting/assets/{id}/depreciation-schedule - View schedule
```

---

#### **8. Bank Reconciliation**

**Bank Account Management:**
- Register multiple bank accounts (BCA, Mandiri, etc.)
- Link each to a COA account (e.g., "Bank BCA")
- Account number uniqueness per church

**Transaction Import:**
- **CSV Import:** Upload bank statement
- **Format:** date, description, type (debit/credit), amount, balance
- **Validation:** Date not in future, required fields
- **Error logging:** Tracks failed rows with error details
- **Bulk import:** Supports 1000+ transactions

**Reconciliation:**
- View unreconciled transactions
- Manual matching to journals
- Future: Auto-suggest matches (by amount, date, description similarity)
- Mark as reconciled
- Unmatch if needed

**Tracking:**
- Reconciled vs Unreconciled count
- Outstanding amount
- Reconciliation date and user
- Attached bank slips/statements

**API Endpoints:**
```
GET  /api/v1/accounting/bank-accounts/               - List accounts
POST /api/v1/accounting/bank-accounts/               - Create
GET  /api/v1/accounting/bank-transactions/           - List (paginated)
POST /api/v1/accounting/bank-transactions/import     - Import CSV
POST /api/v1/accounting/bank-transactions/{id}/match - Match to journal
```

---

#### **9. Beginning Balance (Migration Wizard)**

**Purpose:** For churches migrating from old systems - enter opening balances without importing years of transaction history.

**Features:**
- Step-by-step wizard (Assets → Liabilities → Equity)
- Enter balance for each account
- Balance type auto-suggested (Assets = Debit, Liabilities = Credit)
- Real-time balance validation (Debit == Credit)
- Error message if unbalanced: "Saldo awal tidak seimbang. Mohon periksa kembali."

**Process:**
1. Select effective date (e.g., Jan 1, 2025)
2. Step 1: Enter Asset balances
3. Step 2: Enter Liability balances
4. Step 3: Enter Equity balances
5. Review totals (must balance)
6. Save as draft OR Post
7. Post → Generates opening balance journal (auto-approved)

**Validation:**
- Total Debit must equal Total Credit
- Cannot post if unbalanced
- Fiscal period check (cannot post in locked period)

**API Endpoints:**
```
GET  /api/v1/accounting/beginning-balance/           - List entries
GET  /api/v1/accounting/beginning-balance/{id}       - Single entry
POST /api/v1/accounting/beginning-balance/           - Create (draft)
POST /api/v1/accounting/beginning-balance/{id}/post  - Post (generates journal)
DELETE /api/v1/accounting/beginning-balance/{id}     - Delete (draft only)
```

---

#### **10. Year-End Closing**

**Purpose:** Close fiscal year, calculate net income, update retained earnings, lock entire year.

**Prerequisites:**
- All 12 months must be closed or locked
- No draft journals in the year
- Retained earnings account must exist

**Process:**
1. Admin selects fiscal year (e.g., 2024)
2. System validates all 12 months closed
3. Preview totals:
   - Total Income (sum of all income accounts)
   - Total Expenses (sum of all expense accounts)
   - Net Income (Income - Expenses)
   - Retained Earnings account
4. Confirm year-end closing
5. System executes:
   - Generates closing journal (Date: Dec 31, {year})
   - Debit all Income accounts (close to zero)
   - Credit all Expense accounts (close to zero)
   - Credit/Debit Retained Earnings (net income)
   - Approves closing journal
   - Locks all 12 months of the year
   - Creates YearEndClosing record

**Closing Journal Example:**
```
Date: 2024-12-31
Description: Year-end closing for 2024

Lines:
  Persembahan Persepuluhan (4100)  Debit: 200,000,000  Credit: 0
  Persembahan Umum (4200)          Debit: 150,000,000  Credit: 0
  Gaji & Tunjangan (5100)          Debit: 0           Credit: 180,000,000
  Utilitas (5200)                  Debit: 0           Credit: 50,000,000
  ...all other accounts...
  Laba Ditahan (3200)              Debit: 0           Credit: 120,000,000 (net income)

Total Debit: 350,000,000  Total Credit: 350,000,000 ✅
```

**Result:**
- All Income/Expense accounts reset to zero
- Net income transferred to Retained Earnings
- Entire year locked (data immutable)
- Cannot run closing again for same year

**API Endpoints:**
```
POST /api/v1/accounting/year-end/close/{year}  - Execute closing
GET  /api/v1/accounting/year-end/status/{year} - Check status
```

---

#### **11. Financial Reporting**

**Standard Reports:**

**1. General Ledger**
- All transactions for selected account(s)
- Date range filtering
- Shows: Date, Journal number, Description, Debit, Credit, Running balance
- Grouped by account
- Export to PDF/Excel/CSV

**2. Trial Balance**
- All accounts with debit/credit totals as of specific date
- Grouped by account type (Assets, Liabilities, Equity, Income, Expense)
- Verification: Total Debit == Total Credit
- Balance indicator (green checkmark if balanced, red alert if not)

**3. Income Statement (P&L)**
- Date range: Start date to End date
- **Income Section:** All income accounts with amounts, Subtotal
- **Expense Section:** All expense accounts with amounts, Subtotal
- **Net Income:** Income - Expenses (green if positive, red if negative)
- Visual bar chart comparing Income vs Expense

**4. Balance Sheet**
- As of specific date
- **Assets:** All asset accounts, Total Assets
- **Liabilities:** All liability accounts, Total Liabilities
- **Equity:** All equity accounts + Retained Earnings, Total Equity
- Verification: Assets == Liabilities + Equity
- Two-column layout

**Future Reports (Phase 4):**
- Cash Flow Statement
- Budget vs Actual comprehensive report
- Responsibility Center spending report
- Custom report builder with save templates

**API Endpoints:**
```
GET /api/v1/accounting/reports/general-ledger     - General Ledger
GET /api/v1/accounting/reports/trial-balance      - Trial Balance
GET /api/v1/accounting/reports/income-statement   - P&L
GET /api/v1/accounting/reports/balance-sheet      - Balance Sheet
```

---

#### **12. Responsibility Center Tracking**

**Purpose:** Track spending by ministry, project, or department.

**Features:**
- Assign journal lines to centers
- Budget allocation per center
- Spending reports per center
- Unlimited hierarchy
- Active/inactive status

**Use Case:**
```
Ministry of Youth:
  - Annual Budget: Rp 120,000,000
  - Actual Spending (Jan-Dec):
    - Konsumsi (5420): Rp 30,000,000
    - Acara & Program (5430): Rp 60,000,000
    - Transportasi (5520): Rp 25,500,000
  - Total: Rp 115,500,000
  - Variance: -Rp 4,500,000 (under budget) ✅
```

---

#### **13. File Attachment System**

**Multi-Entity Support:**
- Attach files to:
  - Journals (receipts, invoices)
  - Quick entries (offering slips)
  - Fixed assets (purchase documents)
  - Budgets (budget proposals)
  - Bank transactions (bank slips)
  - Beginning balance (old balance sheet)

**Features:**
- Max 10MB per file
- Allowed types: Images (JPEG, PNG, GIF), PDF, Excel, CSV
- Church-specific storage: `/uploads/{church_id}/`
- Secure download (church_id validation)
- Multiple attachments per entity
- Preview images, PDF icon for documents

**API Endpoints:**
```
POST   /api/v1/files/upload                          - Upload file
GET    /api/v1/files/{id}                            - File metadata
GET    /api/v1/files/{id}/download                   - Download file
DELETE /api/v1/files/{id}                            - Delete file
GET    /api/v1/files/by-reference/{type}/{id}        - List files by entity
```

---

#### **14. Audit Trail**

**Purpose:** Complete accountability - track ALL accounting changes.

**What's Logged:**
- COA: Create, update, delete
- Journals: Create, update, delete, approve
- Budgets: Create, update, activate
- Fixed assets: Create, update, deactivate, depreciation
- Fiscal periods: Close, lock, unlock
- Year-end closing: Execute
- Beginning balance: Create, post
- Bank reconciliation: Match, unmatch

**Data Captured:**
- Action type (create/update/delete/approve)
- Module (coa, journal, budget, etc.)
- User ID (who did it)
- Timestamp (when)
- Description (what happened)
- **Before data** (for updates/deletes)
- **After data** (for creates/updates)

**Access:**
- Admin only
- Paginated list (max 200/page)
- Filter by: Date range, Module, Action type, User
- Export to CSV for external auditing

**API Endpoints:**
```
GET /api/v1/accounting/audit-logs/     - List logs (Admin, paginated)
GET /api/v1/accounting/audit-logs/{id} - Single log with full before/after
```

---

### 🔧 **Technical Architecture**

**Multi-Tenant Design:**
- Every accounting entity has `church_id`
- All queries auto-filtered by church
- Unique constraints scoped per church:
  - COA code unique per church
  - Asset code unique per church
  - Bank account number unique per church
  - Responsibility center code unique per church

**Database Collections (16):**
```
chart_of_accounts          - COA with hierarchy
responsibility_centers     - Ministry/project tracking
journals                   - Journal entries
fiscal_periods             - Monthly period status
budgets                    - Annual/monthly budgets
fixed_assets               - Asset register
asset_depreciation_logs    - Depreciation history
bank_accounts              - Bank account list
bank_transactions          - Transaction register
bank_import_logs           - CSV import history
beginning_balances         - Opening balance entries
year_end_closings          - Fiscal year closing records
file_uploads               - File attachments
audit_logs                 - Audit trail
report_templates           - Custom report configs
export_jobs                - Async export jobs
```

**Database Indexes (24+):**
- Unique compound: `(church_id, code)` for COA, assets, banks, RC
- Unique compound: `(church_id, month, year)` for fiscal periods
- Unique compound: `(church_id, fiscal_year)` for year-end closings
- Query optimization: `church_id`, `date`, `status`, `is_active`
- Pagination support: Sorted indexes on key fields

**API Versioning:**
- All accounting endpoints: `/api/v1/accounting/...`
- File uploads: `/api/v1/files/...`
- Future-proof for v2, v3
- Mobile app ready

**Error Handling:**
- **28 standardized error codes** (i18n-ready)
- Structured responses: `{error_code, message, details}`
- Frontend translates error_code to user's language
- Examples:
  - `JOURNAL_NOT_BALANCED` → "Jurnal tidak seimbang. Total Debit harus sama dengan Total Kredit."
  - `PERIOD_LOCKED` → "Periode akuntansi ini telah dikunci."
  - `COA_EDIT_NOT_ALLOWED` → "Tidak dapat mengubah tipe akun yang sudah digunakan."

**Pagination:**
- Mandatory for: Journals, Bank transactions, Audit logs
- Default: 50 items/page
- Max: 200 items/page
- Response includes: data, total, limit, offset, has_more, current_page, total_pages

**Validation:**
- Fiscal year: 1900-2100
- Journal balance: Debit == Credit
- Budget activation: Monthly == Annual
- Date ranges: Start <= End, not in future
- File size: Max 10MB
- Status transitions: Enforced rules (draft→approved only)

**MongoDB Transactions:**
- Used for atomic operations:
  - Posting beginning balance (create journal + update status)
  - Approving journals (update status + set approved_by/approved_at)
  - Running depreciation (create logs + journals for all assets)
  - Year-end closing (create journal + closing record + lock 12 months)
- Auto-rollback on error
- Data integrity guaranteed

---

### 📊 **Accounting Workflows**

**1. New Church Setup:**
```
1. Admin logs in
2. Navigate to Accounting → Chart of Accounts
3. Click "Seed Default COA"
4. System creates 53 Indonesian church accounts
5. (Optional) Create responsibility centers
6. Navigate to Beginning Balance
7. Enter opening balances for all accounts
8. Post → Opening journal generated
9. Ready to record transactions!
```

**2. Weekly Financial Recording:**
```
1. Navigate to Accounting → Quick Entry
2. Tab: Weekly Giving
3. Fill form:
   - Date: Today
   - Service: "Ibadah Minggu Pagi"
   - Type: "Persembahan Umum"
   - Amount: Rp 10,000,000
   - From: Kas (Cash)
   - To: Persembahan Umum (Income)
4. (Optional) Upload offering slip photo
5. Click Save
6. System auto-generates balanced journal (approved)
7. Journal number: JRN-2025-01-0015
8. Done in 30 seconds!
```

**3. Monthly Close Process:**
```
1. End of January 2025
2. Admin navigates to Accounting → Fiscal Periods
3. Verifies all draft journals approved
4. Clicks "Close" for January 2025
5. System validates: No draft journals
6. Period status: Open → Closed
7. (Next day) Admin clicks "Lock" for January
8. Period status: Closed → Locked
9. January data now immutable
10. Repeat for February, March...
```

**4. Year-End Closing:**
```
1. End of 2024, all 12 months locked
2. Admin navigates to Tools → Year-End Closing
3. Select year: 2024
4. System shows:
   - Total Income: Rp 500,000,000
   - Total Expenses: Rp 380,000,000
   - Net Income: Rp 120,000,000
5. Confirm: "Close Year 2024"
6. System generates closing journal
7. All income/expense accounts zeroed
8. Laba Ditahan credited with net income
9. Entire year locked
10. Ready for 2025!
```

---

### 🎯 **Why This Accounting System?**

**For Indonesian Churches:**
- Pre-configured COA matches Indonesian accounting standards
- Bahasa Indonesia terminology (Kas, Utang, Laba Ditahan)
- Simplified workflows for non-accountants
- Tooltips explain accounting concepts in simple language

**For Multi-Church Organizations:**
- Each church has separate COA
- Isolated financial data
- Separate budgets and reports
- Central admin oversight

**For Compliance:**
- Complete audit trail
- Fiscal period locking (tamper-proof)
- Before/after data on all changes
- User attribution
- Export capabilities for external auditors

**For Efficiency:**
- Quick entry forms (30 seconds to record)
- Auto-generated balanced journals
- Monthly depreciation automation
- Year-end closing automation
- CSV import for bank statements

**For Accuracy:**
- Double-entry enforcement
- Balance validation
- Duplicate detection
- Decimal precision (no float rounding)
- MongoDB transactions (atomic operations)

---

### 📱 **Mobile API Ready**

All accounting endpoints support mobile apps:
- RESTful JSON API
- JWT authentication
- church_id scoping
- Paginated responses
- Structured errors

**Future Mobile Features:**
- Expense entry on-the-go (photo receipts)
- Offering tracking
- Budget monitoring
- Real-time dashboards
- Push notifications for approvals

---

**Accounting Module Status:** ✅ **Backend 100% Complete** (Phase 1)  
**Next:** Frontend UI Development (Phase 2)

---

## CMS Article Management Module

### Overview
Complete WordPress-style content management system with rich text editing, scheduling, categories, tags, comments, and mobile API.

> Technical API reference: see `docs/API.md` → **Articles (v1)** section.

### Features

**Article Management:**
- Rich text editor (TipTap) with formatting toolbar
- Featured image upload (drag-drop, 5MB max, jpg/png/webp)
- Auto-generated slugs from titles (URL-safe)
- Reading time calculation (200 words/min)
- Views counter (atomic increment)
- Article duplication
- Draft/Published/Archived status

**Scheduling System:**
- Schedule articles for future publishing
- APScheduler background worker (auto-publish every 30 seconds)
- Status tracking (None/Scheduled/Running/Completed/Failed)
- Unschedule functionality

**Categories & Tags:**
- Full CRUD operations
- Slug auto-generation
- Delete protection (if used in articles)
- Article count per category/tag
- Multi-select with badges

**Comments Moderation:**
- Create/Edit/Delete comments
- Status management (Pending/Approved/Spam/Trash)
- Bulk actions (approve, spam, trash)
- Per-article comment listing

**Draft Preview System:**
- Generate preview tokens
- Share preview links
- Token-based access (no authentication)
- Copy to clipboard

**Public API (Mobile App):**
- Published articles list
- Featured articles (for carousels)
- Get article by slug
- Categories and tags
- Content sanitization (security)
- Views increment on read

**Admin Features:**
- Articles list (table, filters, pagination)
- Search (title, content)
- Bulk actions (delete)
- Quick edit modal
- Auto-save (every 30 seconds)
- Word count display

**Multi-Church:**
- All data isolated by church_id
- Separate article libraries per church
- Slug uniqueness per church

---

## Prayer Requests Module

### Overview
Pastoral care management system for tracking and managing congregation prayer requests with follow-up coordination.

### Features

**Prayer Request Management:**
- Member-linked requests (searchable dropdown)
- Profile photo display in search
- Auto-fill requester info from member data
- Title and detailed description
- 8 prayer categories (Healing, Family, Work, Financial, Spiritual, Guidance, Thanksgiving, Other)
- Status tracking (New/Prayed with timestamp)

**Pastoral Follow-up:**
- "Needs Follow-up" checkbox (create & edit)
- Follow-up notes field (counseling details)
- Visual indicator in list view (amber badge)
- Quick identification of follow-up needs

**Staff Features:**
- Assignment to staff members
- Internal notes (staff-only)
- Source tracking (Admin Input/Mobile App/Imported)
- Filter by status, category, assigned staff
- Search by requester, title, description

**List View:**
- Table with all prayer requests
- Columns: Title, Requester (with photo), Category, Status, Follow-up indicator, Created Date
- Filters: Status, Category, Assigned To, Date Range
- Quick actions: View, Mark as Prayed, Delete
- Empty state guidance

**Create/Edit Form:**
- Member search with autocomplete
- Profile photo preview
- Phone number display
- Category dropdown (i18n)
- Status selector
- Follow-up tracking
- Internal notes

**Multi-Church:**
- All requests isolated by church_id
- Member pool scoped per church
- Separate prayer management per church

---

**CMS Articles Status:** ✅ **Complete** (Backend + Frontend)  
**Prayer Requests Status:** ✅ **Complete** (Backend + Frontend)

---

## Prayer Requests

### Overview
Manage prayer requests from members and track prayer responses.

### Features

**1. Request Management**
- Title and description
- Requester information
- Privacy settings (public/private)
- Status: Open, Answered, Closed
- Date tracking

**2. Categories**
- Health
- Family
- Ministry
- Personal
- Custom categories

**3. Responses**
- Mark as answered
- Add testimony
- Track answer date

**4. Prayer Lists**
- View all active requests
- Filter by category, status
- Export prayer list
- Share with prayer team

---

## Settings & Configuration

### Church Settings

**Display Preferences:**
- Date format (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD)
- Time format (12h/24h)
- Currency
- Timezone
- Default language (en/id)

**WhatsApp Notifications:**
- Enable/disable notifications
- RSVP confirmation toggle
- Gateway configuration (settings in `.env`)

### Member Statuses

**Management:**
- Create custom statuses
- Set display order
- Mark as default for new visitors
- Active/inactive toggle

**Default Status:**
- Used when quick-adding visitors at kiosk
- Only one can be default
- Example: "Visitor" marked as default

### Demographics

**Configuration:**
- Category name
- Age range (min-max)
- Display order
- Auto-assignment based on member's age

**Examples:**
- Kids: 0-12 years
- Teens: 13-17 years
- Youth: 18-30 years
- Adults: 31-59 years
- Seniors: 60+ years

---

## Key Concepts

### Multi-Tenancy

Every record has `church_id`:
```json
{
  "id": "uuid",
  "church_id": "church-uuid",
  "...other fields"
}
```

Queries automatically filter:
```python
query = {"church_id": current_user.church_id}
results = await db.collection.find(query)
```

### Personal vs Event QR

**Personal QR (Universal):**
- Format: `MEMBER|member_id|6-digit-code`
- Sticks to member profile
- Works for any event
- Use: Check-in, identification

**Event RSVP QR (Specific):**
- Format: `RSVP|event_id|member_id|session|4-digit-code`
- Generated on RSVP
- Sent via WhatsApp
- Use: Fast check-in for that event

**Kiosk handles both** - no difference in scanning!

### i18n System

**Translation Keys:**
- 500+ keys (English + Indonesian)
- Zero hardcoded strings
- Interpolation: `t('message', { name: 'John' })`
- Pluralization: `t('count', { count: 5 })`
- Date/number formatting per locale

**Structure:**
```json
{
  "events": {
    "title": "Events",
    "createEvent": "Create Event",
    "rsvpCount": "{{count}} RSVPs"
  }
}
```

### Devotion Workflow

**Admin Creates:**
1. Navigate to Content → Devotions
2. Click "Create Devotion"
3. Fill form:
   - Date
   - Title (e.g., "Kasih Karunia Tuhan")
   - Upload cover image
   - Write content in rich text editor
   - Add Bible verses:
     - Select TB (Indonesian)
     - Select Mazmur (Psalms)
     - Chapter 23, verses 1-6
     - Click Fetch → Text appears
     - Add to devotion
4. Click "Generate Audio"
5. Wait 60-90s → Wibowo voice audio ready
6. Preview audio
7. Save as Draft or Publish

**Mobile App Fetches:**
- Call `/api/devotions/today`
- Get complete devotion:
  - Title, content, image
  - Bible verses with text
  - Audio URL
- Display to members
- Play audio

---

## Best Practices

### For Administrators

**Events:**
- Create seat layouts before events
- Enable RSVP for limited capacity
- Test kiosk before service
- Choose welcoming theme for kiosk

**Devotions:**
- Write in Indonesian for best TTS quality
- Keep sentences natural
- Preview audio before publishing
- Schedule for automatic publishing

**Members:**
- Import in bulk for efficiency
- Assign photos for better kiosk UX
- Set default status for visitors
- Export regularly for backup

### For Developers

**API Development:**
- Always filter by `church_id`
- Use proper HTTP status codes
- Return consistent error format
- Document all endpoints

**Frontend:**
- Use translation keys (no hardcoded text)
- Use React Query for API calls
- Handle loading/error states
- Responsive design

**Database:**
- Index on `church_id`
- Index on frequently queried fields
- Regular backups
- Monitor query performance

---

## Support & Resources

- **API Documentation:** `/docs/API.md`
- **Deployment Guide:** `/docs/DEPLOYMENT_DEBIAN.md`
- **Troubleshooting:** `/docs/TROUBLESHOOTING.md`
- **GitHub Issues:** For bug reports and feature requests

---

**Built with love for churches worldwide ❤️**
