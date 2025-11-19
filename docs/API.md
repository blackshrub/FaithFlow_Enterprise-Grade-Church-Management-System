# FaithFlow API Documentation

**Base URL:** `https://yourdomain.com/api`

**Authentication:** JWT Bearer token in Authorization header

---

## Table of Contents

1. [Authentication](#authentication)
2. [Churches](#churches)
3. [Members](#members)
4. [Events & RSVP](#events--rsvp)
5. [Devotions](#devotions)
6. [Bible](#bible)
7. [Settings](#settings)
8. **[Accounting (v1)](#accounting-v1)** ⭐ NEW
9. **[Articles (v1)](#articles-v1)** ⭐ NEW
10. **[Prayer Requests (v1)](#prayer-requests-v1)** ⭐ NEW
11. [Common Patterns](#common-patterns)

---

## Authentication

### POST /api/auth/login

Login and receive JWT token.

**Request:**
```json
{
  "email": "admin@church.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user-uuid",
    "email": "admin@church.com",
    "full_name": "Admin User",
    "role": "admin",
    "church_id": "church-uuid"
  }
}
```

**Status Codes:**
- 200: Success
- 401: Invalid credentials
- 400: Missing fields

### GET /api/auth/me

Get current user info.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "user-uuid",
  "email": "admin@church.com",
  "full_name": "Admin User",
  "role": "admin",
  "church_id": "church-uuid"
}
```

---

## Members

### GET /api/members/

List all members for current church.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `search` (optional): Search by name/phone
- `status` (optional): Filter by member status
- `demographic` (optional): Filter by demographic

**Response:**
```json
[
  {
    "id": "member-uuid",
    "church_id": "church-uuid",
    "full_name": "John Doe",
    "email": "john@email.com",
    "phone_whatsapp": "628123456789",
    "gender": "Male",
    "date_of_birth": "1990-01-15",
    "photo_base64": "data:image/jpeg;base64,...",
    "personal_qr_code": "data:image/png;base64,...",
    "personal_id_code": "123456",
    "member_status": "Member",
    "is_active": true
  }
]
```

### POST /api/members/quick-add

Quick add member (kiosk use).

**Request:**
```json
{
  "church_id": "church-uuid",
  "full_name": "Jane Visitor",
  "phone_whatsapp": "628123456789",
  "gender": "Female",
  "date_of_birth": "1995-05-20",
  "photo_base64": "data:image/jpeg;base64,..."
}
```

**Response:**
- Returns complete member object
- Includes auto-generated personal QR code
- Assigns default member status

---

## Events & RSVP

### GET /api/events/

List events.

**Query Parameters:**
- `event_type`: "single" or "series"
- `is_active`: true/false

**Response:**
```json
[
  {
    "id": "event-uuid",
    "church_id": "church-uuid",
    "name": "Sunday Service",
    "event_type": "single",
    "event_date": "2024-01-15T10:00:00Z",
    "location": "Main Auditorium",
    "requires_rsvp": true,
    "enable_seat_selection": true,
    "seat_layout_id": "layout-uuid",
    "seat_capacity": 100,
    "rsvp_list": [...],
    "attendance_list": [...]
  }
]
```

### POST /api/events/{event_id}/rsvp

Register RSVP.

**Query Parameters:**
- `member_id`: Member UUID
- `session_id`: Session name (for series events)
- `seat`: Seat number (if seat selection enabled)

**Response:**
```json
{
  "success": true,
  "message": "RSVP registered successfully",
  "rsvp": {
    "member_id": "member-uuid",
    "member_name": "John Doe",
    "confirmation_code": "7392",
    "qr_code": "data:image/png;base64,...",
    "seat": "A5",
    "whatsapp_status": "sent"
  }
}
```

### POST /api/events/{event_id}/check-in

Check in member.

**Query Parameters:**
- `member_id`: Member UUID (optional if using qr_code)
- `qr_code`: QR data string (optional)
- `session_id`: Session name (for series)

**QR Code Formats Accepted:**
- `RSVP|event_id|member_id|session|code`
- `MEMBER|member_id|unique_code`

**Response (Success):**
```json
{
  "success": true,
  "message": "Check-in successful",
  "member_name": "John Doe",
  "member_photo": "data:image/jpeg;base64,...",
  "attendance": {...}
}
```

**Response (Needs Onsite RSVP):**
```json
{
  "success": false,
  "requires_onsite_rsvp": true,
  "member_id": "member-uuid",
  "member_name": "John Doe",
  "message": "Member has not registered for this event"
}
```

---

## Devotions

### GET /api/devotions/

List devotions.

**Query Parameters:**
- `status_filter`: "draft", "published", "scheduled"
- `date_from`: YYYY-MM-DD
- `date_to`: YYYY-MM-DD

**Response:**
```json
[
  {
    "id": "devotion-uuid",
    "church_id": "church-uuid",
    "date": "2024-01-15T00:00:00Z",
    "title": "Kasih Karunia Tuhan",
    "cover_image_url": "data:image/jpeg;base64,...",
    "content": "<p>Devotion content...</p>",
    "verses": [
      {
        "book": "Mazmur",
        "chapter": 23,
        "start_verse": 1,
        "end_verse": 6,
        "bible_version": "TB",
        "verse_text": "TUHAN adalah gembalaku..."
      }
    ],
    "tts_audio_url": "data:audio/wav;base64,...",
    "status": "published"
  }
]
```

### GET /api/devotions/today

Get today's published devotion (for mobile app).

**Response:** Single devotion object or 404

### GET /api/devotions/by-date

Get devotion by specific date.

**Query Parameters:**
- `date`: YYYY-MM-DD

**Response:** Single devotion object or 404

### POST /api/devotions/

Create devotion.

**Request:**
```json
{
  "church_id": "church-uuid",
  "date": "2024-01-15T00:00:00Z",
  "title": "Devotion Title",
  "content": "<p>Content...</p>",
  "verses": [...],
  "status": "draft"
}
```

### POST /api/devotions/generate-audio-preview

Generate TTS audio from text (before saving).

**Query Parameters:**
- `text`: Content to convert to speech

**Response:**
```json
{
  "success": true,
  "audio_url": "data:audio/wav;base64,..."
}
```

**Note:** Takes 60-90 seconds, uses Wibowo voice

### POST /api/devotions/{id}/generate-audio

Generate TTS audio for saved devotion.

**Response:**
```json
{
  "success": true,
  "audio_url": "data:audio/wav;base64,..."
}
```

### POST /api/devotions/bulk-action

Bulk operations.

**Query Parameters:**
- `action`: "publish", "unpublish", "delete"
- `devotion_ids`: Array of UUIDs

**Response:**
```json
{
  "success": true,
  "updated": 5
}
```

---

## Bible

### GET /api/bible/versions

List available Bible versions.

**Response:**
```json
[
  {
    "code": "TB",
    "name": "Terjemahan Baru",
    "language": "id",
    "description": "Indonesian translation"
  },
  {
    "code": "NIV",
    "name": "New International Version",
    "language": "en",
    "description": "English NIV"
  }
]
```

### GET /api/bible/books

List Bible books.

**Response:**
```json
[
  {
    "book_number": 1,
    "name": "Genesis",
    "name_local": "Kejadian",
    "name_zh": "创世记",
    "testament": "OT",
    "chapter_count": 50
  }
]
```

### GET /api/bible/{version}/{book}/{chapter}/{verse}

Get single verse.

**Example:** `/api/bible/TB/Kejadian/1/1`

**Also accepts:** `/api/bible/TB/Genesis/1/1` (smart lookup by book_number)

**Response:**
```json
{
  "version_code": "TB",
  "book": "Kejadian",
  "book_number": 1,
  "chapter": 1,
  "verse": 1,
  "text": "Pada mulanya Allah menciptakan langit dan bumi."
}
```

**With verse range:**
`/api/bible/TB/Mazmur/23/1?end_verse=6`

**Response:**
```json
{
  "version": "TB",
  "book": "Mazmur",
  "chapter": 23,
  "start_verse": 1,
  "end_verse": 6,
  "text": "TUHAN adalah gembalaku, takkan kekurangan aku...",
  "verses": [array of individual verses]
}
```

---

## Accounting (v1)

**Base URL:** `/api/v1/accounting/`

**Overview:** Enterprise-grade, double-entry accounting for Indonesian churches including multi-level Chart of Accounts, journals, fiscal periods, budgets, fixed assets, bank reconciliation, and year-end closing.

**Authentication:** Required for all accounting endpoints (Admin/Staff, with some Admin-only actions such as period locking and year-end closing).

**Multi-Tenant:** All requests are scoped by `church_id` from the JWT; all unique constraints (e.g., COA codes, asset codes) are per-church.

**Pagination:** Mandatory for heavy lists such as journals, bank transactions, and audit logs (limit, offset params).

---

### Chart of Accounts

#### GET /api/v1/accounting/coa/

List all accounts.

**Query Parameters:**
- `account_type` (optional): Filter by type (Asset, Liability, Equity, Income, Expense)
- `search` (optional): Search by code or name
- `is_active` (optional): Filter by active status

**Response:**
```json
[
  {
    "id": "coa-uuid",
    "church_id": "church-uuid",
    "code": "1100",
    "name": "Kas",
    "description": "Cash on hand",
    "account_type": "Asset",
    "normal_balance": "Debit",
    "parent_id": "coa-parent-uuid",
    "level": 1,
    "is_active": true,
    "tags": ["cash", "current-asset"],
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/v1/accounting/coa/tree

Get COA as tree structure.

**Response:** Nested tree with `children` array

#### POST /api/v1/accounting/coa/

Create new account.

**Request:**
```json
{
  "code": "1150",
  "name": "Petty Cash",
  "description": "Small cash fund",
  "account_type": "Asset",
  "normal_balance": "Debit",
  "parent_id": "1100",
  "is_active": true
}
```

**Validation:**
- Code must be unique per church
- Account type required
- Normal balance required

**Error Codes:**
- `ACCOUNT_CODE_EXISTS` - Duplicate code

#### POST /api/v1/accounting/coa/seed-default

Seed default Indonesian church COA (53 accounts).

**Response:**
```json
{
  "message": "Successfully created 53 default accounts"
}
```

**Note:** Only works if COA is empty for this church

---

### Journals

#### GET /api/v1/accounting/journals/

List journals **(PAGINATION REQUIRED)**.

**Query Parameters (Required):**
- `limit`: Items per page (1-200, default 50)
- `offset`: Skip count (default 0)

**Query Parameters (Optional):**
- `start_date`: Filter start date (YYYY-MM-DD)
- `end_date`: Filter end date
- `status`: Filter by status (draft, approved)
- `journal_type`: Filter by type

**Response:**
```json
{
  "data": [
    {
      "id": "journal-uuid",
      "church_id": "church-uuid",
      "journal_number": "JRN-2024-01-0001",
      "date": "2024-01-15",
      "description": "Payment for electricity",
      "status": "approved",
      "journal_type": "general",
      "lines": [
        {
          "account_id": "acc1",
          "description": "Electricity expense",
          "debit": 1000000,
          "credit": 0,
          "responsibility_center_id": null
        },
        {
          "account_id": "acc2",
          "description": "Cash payment",
          "debit": 0,
          "credit": 1000000
        }
      ],
      "total_debit": 1000000,
      "total_credit": 1000000,
      "is_balanced": true,
      "attachments": [],
      "created_by": "user-uuid",
      "approved_by": "user-uuid",
      "approved_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true,
    "current_page": 1,
    "total_pages": 3
  }
}
```

**Error Codes:**
- `PAGINATION_REQUIRED` - Missing limit or offset

#### POST /api/v1/accounting/journals/

Create journal.

**Request:**
```json
{
  "date": "2024-01-15",
  "reference_number": "INV-001",
  "description": "Payment for electricity bill",
  "status": "draft",
  "journal_type": "general",
  "lines": [
    {
      "account_id": "5210",
      "description": "Electricity expense",
      "debit": 1000000,
      "credit": 0,
      "responsibility_center_id": "ministry-admin"
    },
    {
      "account_id": "1100",
      "description": "Cash payment",
      "debit": 0,
      "credit": 1000000
    }
  ]
}
```

**Validation:**
- Debit must equal Credit
- Minimum 2 lines
- No duplicate account IDs
- Fiscal period check (cannot create in locked period)

**Error Codes:**
- `JOURNAL_NOT_BALANCED` - Debit != Credit
- `DUPLICATE_JOURNAL_LINES` - Same account appears twice
- `PERIOD_LOCKED` - Period is locked

#### POST /api/v1/accounting/journals/{id}/approve

Approve draft journal.

**Response:** Updated journal with `status: "approved"`

**Error Codes:**
- `CANNOT_EDIT_APPROVED_JOURNAL` - Already approved
- `PERIOD_CLOSED` - Period is closed
- `PERIOD_LOCKED` - Period is locked

---

### Fiscal Periods

#### GET /api/v1/accounting/fiscal-periods/list

List all fiscal periods.

**Query Parameters:**
- `year` (optional): Filter by year
- `status` (optional): Filter by status (open, closed, locked)

**Response:**
```json
[
  {
    "id": "period-uuid",
    "church_id": "church-uuid",
    "month": 1,
    "year": 2024,
    "status": "locked",
    "closed_by": "user-uuid",
    "closed_at": "2024-02-05T10:00:00Z",
    "locked_by": "user-uuid",
    "locked_at": "2024-02-10T15:00:00Z"
  }
]
```

#### POST /api/v1/accounting/fiscal-periods/close

Close a period.

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year

**Validation:**
- Period must be "open"
- No draft journals in the period

**Response:** Updated period with `status: "closed"`

#### POST /api/v1/accounting/fiscal-periods/lock

Lock a period.

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year

**Validation:**
- Period must be "closed"
- Previous month must be "locked" (sequential locking)

**Response:** Updated period with `status: "locked"`

---

### Quick Entries

#### POST /api/v1/accounting/quick/weekly-giving

Auto-generate giving journal.

**Request:**
```json
{
  "date": "2024-01-15",
  "service_name": "Ibadah Minggu Pagi",
  "giving_type": "Persembahan Umum",
  "amount": 10000000,
  "from_account_id": "1100",
  "to_account_id": "4200",
  "file_ids": ["file-uuid"]
}
```

**Response:** Auto-generated approved journal

#### POST /api/v1/accounting/quick/outgoing-money

Auto-generate expense journal.

**Request:**
```json
{
  "date": "2024-01-15",
  "description": "Electricity bill January",
  "amount": 1000000,
  "from_account_id": "1100",
  "to_account_id": "5210",
  "responsibility_center_id": "admin-dept",
  "file_ids": []
}
```

---

### Budgets

#### GET /api/v1/accounting/budgets/{budget_id}/variance

Calculate budget vs actual variance.

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year

**Response:**
```json
{
  "budget_id": "budget-uuid",
  "month": 1,
  "year": 2024,
  "variance_data": [
    {
      "account_id": "5100",
      "budgeted_amount": 10000000,
      "actual_amount": 9500000,
      "variance": -500000,
      "variance_percentage": -5,
      "status": "under"
    }
  ]
}
```

---

### Fixed Assets

#### POST /api/v1/accounting/assets/run-monthly-depreciation

Run depreciation for all active assets.

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year

**Process:**
- Calculates depreciation for each asset
- Creates depreciation journal for each
- Creates depreciation log entry
- Skips if already run for this period

**Response:**
```json
{
  "message": "Depreciation completed for 5 assets",
  "created_journals": [
    {
      "asset_id": "asset-uuid",
      "asset_code": "VEH-001",
      "journal_number": "JRN-2024-01-0025",
      "depreciation_amount": 7500000
    }
  ]
}
```

---

### Beginning Balance

#### POST /api/v1/accounting/beginning-balance/{id}/post

Post beginning balance (generates opening journal).

**Process:**
1. Validates balance (debit == credit)
2. Checks fiscal period (not locked)
3. Generates opening balance journal
4. Auto-approves journal
5. Updates status to "posted"

**Response:** Generated journal object

**Error Codes:**
- `BEGINNING_BALANCE_NOT_BALANCED` - Debit != Credit
- `PERIOD_LOCKED` - Cannot post in locked period

---

### Year-End Closing

#### POST /api/v1/accounting/year-end/close/{year}

Execute year-end closing.

**Query Parameters:**
- `retained_earnings_account_id`: Account ID for retained earnings

**Prerequisites:**
- All 12 months must be closed or locked
- Retained earnings account must exist

**Process:**
1. Validates all months closed
2. Calculates total income and expenses
3. Calculates net income
4. Generates closing journal:
   - Debits all income accounts (close to zero)
   - Credits all expense accounts (close to zero)
   - Credits/Debits retained earnings (net income)
5. Creates YearEndClosing record
6. Locks all 12 months

**Response:**
```json
{
  "id": "closing-uuid",
  "church_id": "church-uuid",
  "fiscal_year": 2024,
  "closing_journal_id": "journal-uuid",
  "net_income": 120000000,
  "total_income": 500000000,
  "total_expenses": 380000000,
  "status": "success",
  "completed_at": "2025-01-01T00:15:30Z"
}
```

**Error Codes:**
- `YEAR_ALREADY_CLOSED` - Year already closed
- `CLOSING_FAILED` - Process failed (rolled back)

---

### Reports

#### GET /api/v1/accounting/reports/trial-balance

Generate Trial Balance.

**Query Parameters:**
- `as_of_date`: Date (YYYY-MM-DD)

**Response:**
```json
{
  "as_of_date": "2024-12-31",
  "trial_balance": [
    {
      "account_code": "1100",
      "account_name": "Kas",
      "debit": 50000000,
      "credit": 0
    },
    {
      "account_code": "4100",
      "account_name": "Persembahan Persepuluhan",
      "debit": 0,
      "credit": 200000000
    }
  ],
  "total_debit": 500000000,
  "total_credit": 500000000,
  "is_balanced": true
}
```

#### GET /api/v1/accounting/reports/income-statement

Generate Income Statement (P&L).

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "income": [
    {
      "account_code": "4100",
      "account_name": "Persembahan Persepuluhan",
      "amount": 200000000
    }
  ],
  "expenses": [
    {
      "account_code": "5100",
      "account_name": "Gaji & Tunjangan",
      "amount": 180000000
    }
  ],
  "total_income": 500000000,
  "total_expenses": 380000000,
  "net_income": 120000000
}
```

---

### Audit Logs

#### GET /api/v1/accounting/audit-logs/

List audit logs **(Admin only, PAGINATION REQUIRED)**.

**Query Parameters:**
- `limit`: Required (1-200)
- `offset`: Required
- `start_date`: Optional filter
- `module`: Optional filter (coa, journal, budget, etc.)
- `action_type`: Optional filter (create, update, delete, approve)
- `user_id`: Optional filter

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid",
      "church_id": "church-uuid",
      "user_id": "user-uuid",
      "action_type": "update",
      "module": "coa",
      "description": "Updated account name from 'Kas' to 'Kas Kecil'",
      "before_data": {"name": "Kas"},
      "after_data": {"name": "Kas Kecil"},
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### File Uploads

#### POST /api/v1/files/upload

Upload file (multi-entity attachment).

**Request:** `multipart/form-data`
- `file`: File to upload (max 10MB)
- `reference_type`: Entity type (journal, asset, budget, bank_transaction, etc.)
- `reference_id`: Entity ID (optional)

**Allowed Types:**
- Images: JPEG, PNG, GIF
- Documents: PDF
- Spreadsheets: Excel, CSV

**Response:**
```json
{
  "id": "file-uuid",
  "church_id": "church-uuid",
  "original_filename": "receipt.pdf",
  "mime_type": "application/pdf",
  "file_size": 524288,
  "reference_type": "journal",
  "reference_id": "journal-uuid",
  "uploaded_at": "2024-01-15T10:30:00Z"
}
```

**Error Codes:**
- `FILE_SIZE_EXCEEDED` - File > 10MB
- `INVALID_FILE_TYPE` - Type not allowed

#### GET /api/v1/files/{file_id}/download

Download file.

**Response:** File stream with original filename

**Validation:** church_id must match file's church

---

### Error Code Reference (Accounting)

All accounting errors return structured format:

```json
{
  "error_code": "JOURNAL_NOT_BALANCED",
  "message": "Journal is not balanced: Debit 1000000 != Credit 500000",
  "details": {...}
}
```

**Complete Error Code List:**

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| `JOURNAL_NOT_BALANCED` | Debit != Credit | 400 |
| `ACCOUNT_CODE_EXISTS` | Duplicate COA code | 400 |
| `CANNOT_DELETE_USED_ACCOUNT` | Account used in journals | 403 |
| `CANNOT_EDIT_APPROVED_JOURNAL` | Journal already approved | 403 |
| `COA_EDIT_NOT_ALLOWED` | Cannot edit type/balance for used account | 403 |
| `PERIOD_LOCKED` | Period is locked | 400 |
| `PERIOD_CLOSED` | Period is closed | 400 |
| `YEAR_ALREADY_CLOSED` | Year already closed | 400 |
| `BUDGET_MONTHLY_ANNUAL_MISMATCH` | Monthly != Annual | 400 |
| `PAGINATION_REQUIRED` | Missing limit/offset | 400 |
| `INVALID_FILE_TYPE` | File type not allowed | 400 |
| `FILE_SIZE_EXCEEDED` | File > 10MB | 400 |
| `CHURCH_ACCESS_DENIED` | No access to this church | 403 |
| `TRANSACTION_FAILED` | MongoDB transaction failed | 500 |

**Frontend:** Translates `error_code` to user's language (Bahasa Indonesia or English)

---

## Articles (v1)

**Base URL:** `/api/v1/articles/`

**Overview:** Internal CMS for long-form content (articles, news, blog posts) with rich text editing, categories/tags, featured images, scheduling, comments, and public/mobile APIs.

**Authentication:** Required for all admin CMS endpoints (Admin/Staff); public/mobile endpoints do not require auth.

**Multi-Tenant:** All admin article records are scoped by `church_id` from the JWT; public endpoints require an explicit `church_id` query parameter.

---

### Data Model Summary

Key fields (see `backend/models/article.py` for full schema):
- `title` (string) – Article title
- `slug` (string) – URL-safe slug, auto-generated if omitted, unique per church
- `content` (string) – HTML content (sanitized before public exposure)
- `excerpt` (string, optional) – Short summary
- `featured_image` (string, optional) – Path to uploaded featured image
- `category_ids` (string[]) – IDs of categories
- `tag_ids` (string[]) – IDs of tags
- `status` ("draft" | "published" | "archived") – CMS status
- `publish_date` (datetime, optional) – Actual publish timestamp
- `scheduled_publish_date` (datetime, optional) – Future publish datetime
- `schedule_status` ("none" | "scheduled" | "running" | "completed" | "failed") – Scheduler status
- `reading_time` (int) – Estimated minutes to read (approx. 200 words/min)
- `views_count` (int) – View counter (incremented via API)
- `allow_comments` (bool) – Whether comments are allowed
- `preview_token` (string, optional) – Draft preview token

---

### Articles Management (Admin)

#### POST /api/v1/articles/

Create new article.

**Request:**
```json
{
  "title": "Understanding Grace",
  "content": "<p>Article content with HTML formatting...</p>",
  "excerpt": "Short description",
  "category_ids": ["cat-uuid-1", "cat-uuid-2"],
  "tag_ids": ["tag-uuid-1"],
  "status": "draft",
  "allow_comments": true
}
```

**Response:** 201 Created
- Returns created article with auto-generated slug, reading_time, views_count

**Features:**
- Auto-generates slug from title if not provided
- Calculates reading time (200 words/min)
- Ensures slug uniqueness per church

#### GET /api/v1/articles/

List articles with filters and pagination.

**Query Parameters:**
- `search` - Search title/content
- `status` - Filter by status (draft/published/archived)
- `category` - Filter by category ID
- `tag` - Filter by tag ID
- `schedule_status` - Filter by schedule status
- `limit` - Items per page (default 50, max 200)
- `offset` - Pagination offset

**Response:**
```json
{
  "data": [...articles],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

#### POST /api/v1/articles/{id}/upload-featured-image

Upload featured image.

**Request:** multipart/form-data
- `file` - Image file (max 5MB, jpg/png/webp)

**Response:** 201 Created
```json
{
  "image_url": "/uploads/{church_id}/articles/{article_id}/featured.jpg"
}
```

**Validation:**
- Max 5MB file size
- Only jpg, png, webp allowed

#### POST /api/v1/articles/{id}/schedule

Schedule article for future publishing.

**Query Parameters:**
- `scheduled_publish_date` - ISO datetime string

**Validation:**
- Only draft articles can be scheduled
- Date must be in the future

**Response:**
```json
{
  "id": "article-uuid",
  "schedule_status": "scheduled",
  "scheduled_publish_date": "2025-12-25T10:00:00Z"
}
```

#### POST /api/v1/articles/{id}/duplicate

Duplicate existing article.

**Response:** 201 Created
- Returns new article with suffix "-copy" in slug
- Status always "draft"
- Views count reset to 0
- No schedule

---

### Public API (Mobile App)

#### GET /api/public/articles/

List published articles (no authentication).

**Query Parameters:**
- `church_id` - Required
- `limit` - Items per page (max 100)
- `offset` - Pagination
- `category` - Filter by category
- `tag` - Filter by tag

**Response:**
```json
{
  "data": [
    {
      "id": "article-uuid",
      "title": "Article Title",
      "slug": "article-title",
      "content": "Sanitized HTML content",
      "excerpt": "Short excerpt",
      "featured_image": "/uploads/...",
      "category_ids": [...],
      "tag_ids": [...],
      "publish_date": "2025-01-01T10:00:00Z",
      "reading_time": 5,
      "views_count": 120,
      "allow_comments": true
    }
  ],
  "pagination": {...}
}
```

**Filtering:**
- Only returns `status="published"`
- Only returns `publish_date <= now()`
- Excludes scheduled articles (future publish date)
- Content is sanitized (scripts stripped)

#### GET /api/public/articles/featured

Get featured articles (with images).

**Query Parameters:**
- `church_id` - Required
- `limit` - Max 50

**Response:** Array of articles with `featured_image` not null

#### POST /api/v1/articles/{id}/increment-view

Increment article views (public, no auth).

**Response:**
```json
{
  "success": true
}
```

---

## Prayer Requests (v1)

**Base URL:** `/api/v1/prayer-requests/`

**Authentication:** Required (admin/staff only)

**Multi-Tenant:** All requests filtered by `church_id`

---

### Prayer Request Management

#### POST /api/v1/prayer-requests/

Create prayer request.

**Request:**
```json
{
  "member_id": "member-uuid",
  "requester_name": "John Doe",
  "requester_contact": "+628123456789",
  "title": "Prayer for healing",
  "description": "Please pray for my mother's recovery",
  "category": "healing",
  "status": "new",
  "needs_follow_up": true,
  "follow_up_notes": "Need pastoral counseling",
  "internal_notes": "Follow up next week"
}
```

**Response:** 201 Created

**Categories:**
- `healing` - Healing/Health
- `family` - Family matters
- `work` - Work/Career
- `financial` - Financial needs
- `spiritual` - Spiritual growth
- `guidance` - Guidance/Direction
- `thanksgiving` - Thanksgiving/Praise
- `other` - Other requests

#### GET /api/v1/prayer-requests/

List prayer requests with filters.

**Query Parameters:**
- `search` - Search requester name, title, description
- `status` - Filter by status (new/prayed)
- `category` - Filter by category
- `assigned_to` - Filter by assigned staff
- `start_date` - Date range start (ISO string)
- `end_date` - Date range end
- `limit` - Pagination limit (default 50, max 200)
- `offset` - Pagination offset

**Response:**
```json
{
  "data": [
    {
      "id": "prayer-uuid",
      "church_id": "church-uuid",
      "member_id": "member-uuid",
      "requester_name": "John Doe",
      "requester_contact": "+628123456789",
      "title": "Prayer for healing",
      "description": "...",
      "category": "healing",
      "status": "new",
      "needs_follow_up": true,
      "follow_up_notes": "...",
      "internal_notes": "...",
      "assigned_to_user_id": null,
      "prayed_at": null,
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### PUT /api/v1/prayer-requests/{id}

Update prayer request.

**Request:**
```json
{
  "category": "spiritual",
  "status": "prayed",
  "needs_follow_up": true,
  "internal_notes": "Updated notes"
}
```

**Auto-set Fields:**
- If `status` changed to "prayed" → sets `prayed_at` to current timestamp
- If `status` changed back to "new" → clears `prayed_at`

**Response:** 200 OK (updated prayer request)

#### DELETE /api/v1/prayer-requests/{id}

Delete prayer request.

**Response:** 204 No Content

**Audit:** All create/update/delete actions logged

---

## Common Patterns

### Multi-Tenancy

All endpoints automatically filter by `church_id` from JWT token:

```python
# Extracted from token:
church_id = current_user.get('church_id')

# Applied to all queries:
query = {"church_id": church_id, ...}
```

**Super Admin:** Can set `church_id` query param to view any church

### Pagination

Most list endpoints support:
- `skip`: Number of records to skip
- `limit`: Number of records to return

Example: `/api/members/?skip=0&limit=50`

### Error Responses

**Format:**
```json
{
  "detail": "Error message here"
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 204: No Content (deleted)
- 400: Bad Request (validation error)
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (no access to this church)
- 404: Not Found
- 500: Server Error

### Date Formats

**Request:** ISO 8601 string
```json
"date": "2024-01-15T10:00:00Z"
```

**Response:** Same format

### File Uploads

**Images/Audio:** Base64 encoded in JSON
```json
{
  "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "tts_audio_url": "data:audio/wav;base64,UklGRiQAAABX..."
}
```

---

## Rate Limits

**Current:** No rate limits

**Recommended for production:**
- Add rate limiting middleware
- Suggested: 100 requests/minute per IP
- TTS endpoints: 5 requests/hour (resource intensive)

---

## Webhooks (Future)

Not implemented yet. Planned for:
- RSVP confirmations
- Event reminders
- Payment notifications

---

**For complete endpoint reference, visit:**
`https://yourdomain.com/api/docs` (FastAPI auto-generated Swagger UI)
