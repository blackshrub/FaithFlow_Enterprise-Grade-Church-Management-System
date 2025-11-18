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
Complete accounting system with chart of accounts, journals, budgeting, and financial reports.

### Features

**1. Chart of Accounts (COA)**
- Account categories (Assets, Liabilities, Equity, Income, Expenses)
- Multi-level hierarchy
- Account codes
- Active/inactive accounts

**2. General Journal**
- Double-entry bookkeeping
- Debit/credit entries
- Journal vouchers
- Transaction descriptions
- Date tracking

**3. Budgeting**
- Annual budget planning
- Budget vs actual tracking
- Variance analysis
- Department-level budgets

**4. Fixed Assets**
- Asset register
- Depreciation tracking
- Asset categories
- Acquisition dates and values

**5. Bank Reconciliation**
- Match bank statements
- Identify discrepancies
- Reconciliation reports

**6. Financial Reports**
- Balance Sheet
- Income Statement (Profit & Loss)
- Cash Flow Statement
- Trial Balance
- Budget vs Actual
- Custom date ranges
- PDF export

**Multi-Church:**
- Each church has separate COA
- Isolated transactions
- Church-specific reports

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
