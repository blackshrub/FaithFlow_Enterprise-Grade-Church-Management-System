# FaithFlow External Integration API

## Overview

This document describes the REST API endpoints available for external systems to integrate with FaithFlow.

**Base URL:** `https://faithflow-hub.preview.emergentagent.com/api`

**Authentication:** JWT Bearer token

---

## Authentication

### Option 1: API Key Authentication (Recommended for External Apps)

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "api_abc12345_churchname",
  "password": "ffa_your_api_key_here"
}
```

**Note:** The `email` field accepts both email addresses (for regular users) and API usernames (for API keys). API usernames are generated in FaithFlow Settings → API Keys.

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "api-key-uuid",
    "email": "api_abc12345_churchname",
    "full_name": "API: My Integration",
    "role": "admin",
    "church_id": "church-uuid",
    "type": "api_key"
  }
}
```

### Option 2: Regular User Authentication

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@church.com",
  "password": "your-password"
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

**Usage:**
```javascript
const token = response.access_token;

// Include in all subsequent requests:
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## Members API

### List All Members

**Endpoint:** `GET /api/members/`

**Query Parameters:**
- `skip` (int): Pagination offset (default: 0)
- `limit` (int): Number of records (default: 100, max: 1000)
- `search` (string): Search by name, email, or phone
- `is_active` (boolean): Filter active/inactive members
- `incomplete_data` (boolean): Filter members with missing data

**Example Requests:**
```bash
# Get first 100 active members
GET /api/members/?is_active=true&limit=100

# Get next 100 (pagination)
GET /api/members/?is_active=true&limit=100&skip=100

# Search by name
GET /api/members/?search=John&limit=50

# Get all members (multiple requests)
GET /api/members/?limit=1000&skip=0
GET /api/members/?limit=1000&skip=1000
# ... continue until empty
```

**Response:**
```json
[
  {
    "id": "member-uuid",
    "church_id": "church-uuid",
    "full_name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "phone_whatsapp": "628123456789",
    "email": null,
    "gender": "Male",
    "date_of_birth": "1990-01-15",
    "marital_status": "Married",
    "address": "123 Main St",
    "member_status": "Full Member",
    "photo_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "personal_document": "certificate.pdf",
    "personal_document_base64": "data:application/pdf;base64,...",
    "personal_id_code": "ABC123",
    "personal_qr_code": "data:image/png;base64,...",
    "personal_qr_data": "MEMBER|uuid|ABC123",
    "is_active": true,
    "created_at": "2025-11-19T08:00:00Z",
    "updated_at": "2025-11-19T10:30:00Z"
  }
]
```

**Note:** Returns array of members (not paginated object). Check if array is empty to know if you've reached the end.

---

### Get Single Member

**Endpoint:** `GET /api/members/{member_id}`

**Example:**
```bash
GET /api/members/abc-123-uuid
```

**Response:**
```json
{
  "id": "member-uuid",
  "full_name": "John Doe",
  "phone_whatsapp": "628123456789",
  "photo_base64": "data:image/jpeg;base64,...",
  // ... full member object
}
```

---

### Get Members Updated Since

**Endpoint:** `GET /api/members/`

**Polling Strategy for Incremental Sync:**

```javascript
// Initial full sync
let lastSync = '2025-11-19T00:00:00Z';
let allMembers = [];
let skip = 0;

while (true) {
  const response = await fetch(
    `https://faithflow.com/api/members/?limit=1000&skip=${skip}`,
    { headers: { 'Authorization': `Bearer ${token}` }}
  );
  
  const members = await response.json();
  
  if (members.length === 0) break;
  
  allMembers = allMembers.concat(members);
  skip += 1000;
}

// Store lastSync timestamp
lastSync = new Date().toISOString();

// Later: Poll for updates (every 5 minutes)
setInterval(async () => {
  const response = await fetch(
    `https://faithflow.com/api/members/?limit=1000`,
    { headers: { 'Authorization': `Bearer ${token}` }}
  );
  
  const members = await response.json();
  
  // Filter members updated since last sync
  const updated = members.filter(m => 
    new Date(m.updated_at) > new Date(lastSync)
  );
  
  // Process updated members
  for (const member of updated) {
    await syncMemberToLocalDB(member);
  }
  
  lastSync = new Date().toISOString();
}, 5 * 60 * 1000); // Every 5 minutes
```

**Note:** Currently no `updated_since` parameter, so you need to filter client-side or use webhooks for real-time updates.

---

### Member Statistics

**Endpoint:** `GET /api/members/stats/summary`

**Response:**
```json
{
  "total_members": 809,
  "total_inactive": 15,
  "male_count": 385,
  "female_count": 424,
  "married_count": 512,
  "single_count": 297,
  "incomplete_data_count": 45
}
```

**Use Case:** Check total count before paginating through all members

---

## Groups API (If Needed)

### List Groups

**Endpoint:** `GET /api/v1/groups/`

**Query Parameters:**
- `category`: Filter by category
- `search`: Search by name or leader
- `is_active`: Filter active groups

**Response:**
```json
{
  "data": [
    {
      "id": "group-uuid",
      "name": "Youth Group",
      "category": "youth_group",
      "leader_member_id": "member-uuid",
      "leader_name": "Jane Smith",
      "leader_contact": "628987654321",
      "cover_image": "data:image/jpeg;base64,...",
      "is_active": true,
      "created_at": "2025-11-19T08:00:00Z"
    }
  ]
}
```

---

## Prayer Requests API (If Needed)

### List Prayer Requests

**Endpoint:** `GET /api/v1/prayer-requests/`

**Query Parameters:**
- `limit`, `offset`: Pagination
- `search`: Search by title
- `category`: Filter by category
- `status`: Filter by status (new, prayed)

**Response:**
```json
{
  "data": [
    {
      "id": "prayer-uuid",
      "member_id": "member-uuid",
      "requester_name": "John Doe",
      "title": "Prayer Request Title",
      "description": "Description...",
      "category": "healing",
      "status": "new",
      "created_at": "2025-11-19T08:00:00Z"
    }
  ]
}
```

---

## Events API (If Needed)

### List Events

**Endpoint:** `GET /api/events/`

**Query Parameters:**
- `limit`, `offset`: Pagination
- `search`: Search events

**Response:**
```json
[
  {
    "id": "event-uuid",
    "name": "Sunday Service",
    "event_type": "single",
    "date": "2025-11-24",
    "time": "09:00",
    "location": "Main Sanctuary",
    "created_at": "2025-11-19T08:00:00Z"
  }
]
```

---

## Complete Integration Example

### Initial Full Sync (One-Time)

```python
import httpx
import asyncio

BASE_URL = "https://faithflow-hub.preview.emergentagent.com/api"
# Option 1: Use API Key (recommended for external apps)
API_USERNAME = "api_abc12345_churchname"  # From FaithFlow Settings → API Keys
API_KEY = "ffa_your_api_key_here"  # From FaithFlow Settings → API Keys

# Option 2: Use regular user credentials
# EMAIL = "admin@church.com"
# PASSWORD = "your-password"

async def full_member_sync():
    async with httpx.AsyncClient() as client:
        # 1. Login with API Key
        auth_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": API_USERNAME, "password": API_KEY}
        )
        token = auth_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get total count
        stats_response = await client.get(
            f"{BASE_URL}/members/stats/summary",
            headers=headers
        )
        total = stats_response.json()["total_members"]
        print(f"Total members to sync: {total}")
        
        # 3. Paginate through all members
        all_members = []
        skip = 0
        limit = 1000
        
        while skip < total:
            response = await client.get(
                f"{BASE_URL}/members/",
                params={"limit": limit, "skip": skip, "is_active": True},
                headers=headers
            )
            
            members = response.json()
            
            if not members:
                break
            
            all_members.extend(members)
            print(f"Fetched {len(all_members)}/{total} members")
            
            skip += limit
        
        # 4. Save to your database
        for member in all_members:
            await save_to_local_db(member)
        
        print(f"✅ Sync complete: {len(all_members)} members")
        
        return all_members

# Run
asyncio.run(full_member_sync())
```

---

### Ongoing Sync Options

#### **Option 1: Webhooks Only (Recommended)**

```python
# 1. Do initial full sync (above)
# 2. Configure webhook in FaithFlow Settings → Webhooks
# 3. Receive real-time updates via webhook
# 4. No polling needed!

import hmac
import hashlib
import json

@app.post("/api/webhooks/faithflow")
async def receive_member_webhook(request: Request):
    # Get raw body for signature verification
    body_bytes = await request.body()
    body_text = body_bytes.decode('utf-8')
    payload = json.loads(body_text)
    
    # STEP 1: Verify signature (CRITICAL for security!)
    signature_header = request.headers.get("X-Webhook-Signature")
    secret_key = "YOUR_WEBHOOK_SECRET"  # From FaithFlow webhook config
    
    expected_signature = hmac.new(
        secret_key.encode('utf-8'),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    if signature_header != expected_signature:
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    
    # STEP 2: Process event
    event_type = payload["event_type"]
    member_data = payload["data"]
    member_id = payload.get("member_id")  # Top-level member_id
    
    if event_type == "member.created":
        await create_local_member(member_data)
        logger.info(f"Member created: {member_data['full_name']}")
    
    elif event_type == "member.updated":
        # Use member_id to find and update
        await update_local_member(member_id, member_data)
        logger.info(f"Member updated: {member_data['full_name']}")
        
        # Optional: Check what changed
        if "changes" in payload:
            logger.info(f"Fields changed: {payload['changes'].keys()}")
    
    elif event_type == "member.deleted":
        await delete_local_member(member_id)
        logger.info(f"Member deleted: {member_id}")
    
    return {"success": true, "message": "Webhook processed"}

```

---

#### **Option 2: Polling + Webhooks (Hybrid)**

```python
# Use webhooks for real-time updates
# BUT also poll every hour as backup (in case webhook fails)

import schedule

def hourly_reconciliation():
    # Get all members from FaithFlow
    faithflow_members = fetch_all_members()
    
    # Compare with local database
    for fm in faithflow_members:
        local = get_local_member(fm["id"])
        
        if not local:
            # Missing in local - create
            create_local_member(fm)
        elif local["updated_at"] < fm["updated_at"]:
            # Outdated in local - update
            update_local_member(fm)
    
    print("✅ Reconciliation complete")

schedule.every().hour.do(hourly_reconciliation)
```

---

## API Endpoints Summary

### Authentication
```
POST   /api/auth/login          # Get JWT token
GET    /api/auth/me             # Verify token
```

### Members
```
GET    /api/members/                      # List members (paginated)
GET    /api/members/{id}                  # Get single member
GET    /api/members/stats/summary         # Get statistics
POST   /api/members/                      # Create member (if needed)
PATCH  /api/members/{id}                  # Update member (if needed)
DELETE /api/members/{id}                  # Delete member (if needed)
```

### Groups
```
GET    /api/v1/groups/                    # List groups
GET    /api/v1/groups/{id}                # Get single group
GET    /api/v1/groups/{id}/members        # Get group members
```

### Prayer Requests
```
GET    /api/v1/prayer-requests/           # List prayer requests
GET    /api/v1/prayer-requests/{id}       # Get single prayer request
```

### Events
```
GET    /api/events/                       # List events
GET    /api/events/{id}                   # Get single event
```

---

## Response Formats

### Success Response

**List Endpoints:**
```json
[
  {"id": "...", "name": "..."},
  {"id": "...", "name": "..."}
]
```

**Or (some v1 endpoints):**
```json
{
  "data": [
    {"id": "...", "name": "..."},
  ]
}
```

**Single Resource:**
```json
{
  "id": "...",
  "name": "...",
  // ... resource fields
}
```

### Error Response

```json
{
  "detail": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (no access)
- `404` - Not Found
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error

---

## Rate Limiting

**Current Limits:**
- No hard rate limits currently enforced
- Recommended: Max 60 requests per minute
- For bulk operations, use pagination (limit=1000)

**Best Practices:**
- Use webhooks for real-time updates (no polling needed)
- Poll only as backup/reconciliation (every 1-24 hours)
- Respect server resources

---

## Data Mapping Reference

### Member Object Fields

| FaithFlow Field | Type | Description | Example |
|----------------|------|-------------|----------|
| `id` | string (uuid) | Unique member ID | "abc-123-uuid" |
| `church_id` | string (uuid) | Church ID | "church-uuid" |
| `full_name` | string | Full name | "John Doe" |
| `first_name` | string | First name | "John" |
| `last_name` | string | Last name | "Doe" |
| `phone_whatsapp` | string | Normalized phone | "628123456789" |
| `email` | string/null | Email address | "john@example.com" |
| `gender` | string/null | "Male" or "Female" | "Male" |
| `date_of_birth` | string (ISO date) | Birth date | "1990-01-15" |
| `marital_status` | string/null | "Married", "Not Married", "Widow", "Widower" | "Married" |
| `address` | string/null | Address | "123 Main St" |
| `member_status` | string/null | Member status | "Full Member" |
| `photo_base64` | string/null | Photo as base64 data URL | "data:image/jpeg;base64,..." |
| `personal_document` | string/null | Document filename | "certificate.pdf" |
| `personal_document_base64` | string/null | Document as base64 | "data:application/pdf;base64,..." |
| `personal_id_code` | string | 6-digit unique code | "ABC123" |
| `personal_qr_code` | string/null | QR code image | "data:image/png;base64,..." |
| `personal_qr_data` | string/null | QR data string | "MEMBER\|uuid\|ABC123" |
| `is_active` | boolean | Active status | true |
| `created_at` | string (ISO) | Created timestamp | "2025-11-19T08:00:00Z" |
| `updated_at` | string (ISO) | Updated timestamp | "2025-11-19T10:30:00Z" |

---

## Example: Node.js Integration

```javascript
const axios = require('axios');

const FAITHFLOW_URL = 'https://faithflow-hub.preview.emergentagent.com/api';
// Option 1: Use API Key (recommended for external apps)
const API_USERNAME = 'api_abc12345_churchname';  // From FaithFlow Settings → API Keys
const API_KEY = 'ffa_your_api_key_here';  // From FaithFlow Settings → API Keys

// Option 2: Use regular user credentials
// const EMAIL = 'admin@church.com';
// const PASSWORD = 'your-password';

let token = null;

// Login and get token with API Key
async function login() {
  const response = await axios.post(`${FAITHFLOW_URL}/auth/login`, {
    email: API_USERNAME,  // Field name is "email" but accepts API username
    password: API_KEY
  });
  
  token = response.data.access_token;
  console.log('✅ Logged in to FaithFlow');
}

// Fetch all members
async function fetchAllMembers() {
  const headers = { 'Authorization': `Bearer ${token}` };
  let allMembers = [];
  let skip = 0;
  const limit = 1000;
  
  while (true) {
    const response = await axios.get(`${FAITHFLOW_URL}/members/`, {
      headers,
      params: { limit, skip, is_active: true }
    });
    
    const members = response.data;
    
    if (members.length === 0) break;
    
    allMembers = allMembers.concat(members);
    console.log(`Fetched ${allMembers.length} members...`);
    
    skip += limit;
  }
  
  return allMembers;
}

// Sync to local database
async function syncMembers() {
  await login();
  
  const members = await fetchAllMembers();
  
  for (const member of members) {
    // Upsert to local database
    await db.members.updateOne(
      { faithflow_id: member.id },
      { $set: {
        faithflow_id: member.id,
        name: member.full_name,
        phone: member.phone_whatsapp,
        status: member.member_status,
        photo: member.photo_base64,
        synced_at: new Date()
      }},
      { upsert: true }
    );
  }
  
  console.log(`✅ Synced ${members.length} members`);
}

// Run
syncMembers();
```

---

## Example: Python Integration

```python
import httpx
import asyncio
from datetime import datetime

BASE_URL = "https://faithflow-hub.preview.emergentagent.com/api"
# Use API Key for external integrations
API_USERNAME = "api_abc12345_churchname"
API_KEY = "ffa_your_api_key_here"

class FaithFlowClient:
    def __init__(self):
        self.token = None
        self.client = httpx.AsyncClient()
    
    async def login(self):
        response = await self.client.post(
            f"{BASE_URL}/auth/login",
            json={"email": API_USERNAME, "password": API_KEY}
        )
        self.token = response.json()["access_token"]
        return self.token
    
    async def get_all_members(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        all_members = []
        skip = 0
        limit = 1000
        
        while True:
            response = await self.client.get(
                f"{BASE_URL}/members/",
                params={"limit": limit, "skip": skip, "is_active": True},
                headers=headers
            )
            
            members = response.json()
            
            if not members:
                break
            
            all_members.extend(members)
            skip += limit
        
        return all_members
    
    async def get_member(self, member_id):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = await self.client.get(
            f"{BASE_URL}/members/{member_id}",
            headers=headers
        )
        return response.json()

# Usage
async def sync():
    client = FaithFlowClient()
    await client.login()
    
    members = await client.get_all_members()
    print(f"Fetched {len(members)} members")
    
    # Save to your database
    for member in members:
        await save_to_db(member)

asyncio.run(sync())
```

---

## Security Best Practices

**Token Management:**
1. Store token securely (environment variable, not code)
2. Refresh token if expired (401 response → login again)
3. Use HTTPS only
4. Don't log tokens

**Webhook Security:**
1. Always verify HMAC signature
2. Use HTTPS webhook endpoint
3. Validate payload structure
4. Log all webhook deliveries
5. Implement idempotency (use event_id)

**Data Handling:**
1. Store FaithFlow member ID as `external_id` or `faithflow_id`
2. Use upsert for sync (create if not exists, update if exists)
3. Handle photo/document base64 (large data)
4. Validate data before saving

---

## Support

**API Issues:**
- Check response status codes
- Read `detail` field in error responses
- Verify token is valid
- Check church_id scoping

**Webhook Issues:**
- Verify HMAC signature calculation
- Check webhook URL is accessible
- Return 200 OK promptly
- Log all webhook deliveries
- Check FaithFlow webhook logs

**Questions:**
- Contact FaithFlow support
- Reference this documentation
- Check API.md for detailed endpoint specs

---

**This API documentation is for external app developers to integrate with FaithFlow!** 📖
