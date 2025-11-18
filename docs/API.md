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
9. [Common Patterns](#common-patterns)

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
