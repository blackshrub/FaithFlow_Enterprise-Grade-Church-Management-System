# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FaithFlow is an enterprise-grade, multi-tenant church management system with FastAPI backend, React frontend, and MongoDB database. Complete data isolation per church via `church_id` scoping.

**Tech Stack:** FastAPI + MongoDB (Motor) + React + TanStack Query + shadcn/ui + Tailwind + react-i18next

## Development Commands

### Backend
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000  # Start server
pip install -r requirements.txt                          # Install deps
pytest                                                   # Run tests
black . && isort . && flake8                            # Format & lint
```

### Frontend
```bash
cd frontend
yarn start          # Dev server (http://localhost:3000)
yarn build          # Production build
yarn test           # Run tests
yarn install        # Install deps
```

## Architecture

### Multi-Tenant Design (Critical)

All data scoped by `church_id`. JWT contains `session_church_id` determining which church's data the user accesses.

- **Super Admins**: `church_id: "global"` but use `session_church_id` from JWT to switch churches
- **Regular Users/API Keys**: Fixed `church_id` for their church
- **All DB queries**: Must filter by `church_id` to prevent cross-tenant access

**Key files:**
- `backend/utils/dependencies.py` - Auth & church_id extraction (`get_current_user`, `get_session_church_id`)
- `backend/utils/tenant_utils.py` - `get_session_church_id_from_user`
- `backend/middleware/tenant_middleware.py` - Tenant isolation

### Structure

**Backend:** `models/` (Pydantic) → `routes/` (API endpoints) → `services/` (business logic) + `utils/` (auth, helpers)
- Routes under `/api`, accounting under `/api/v1`, public under `/public/*`
- Auth via `Depends(get_current_user)` or `Depends(require_admin)`

**Frontend:** `components/` → `pages/` → `services/` (axios API clients) + `hooks/` + `i18n/` (en/id)
- State: TanStack Query for server data
- UI: shadcn/ui + Tailwind
- Forms: React Hook Form + Zod

**Background Jobs** (`backend/scheduler.py`): Article publishing (30s), webhooks (10s), status automation (5min)

### Authentication

1. Admin: `POST /api/auth/login` → JWT with `session_church_id`
2. Kiosk: `POST /public/members/login` → Phone + WhatsApp OTP
3. API Keys: JWT with `type: "api_key"` (admin access, single church)

## Environment & Testing

**Required env vars** (`backend/.env`):
```
MONGO_URL=mongodb://...
DB_NAME=church_management
JWT_SECRET=...
JWT_ALGORITHM=HS256
```

**Testing:** Backend uses pytest (`backend_test.py`, `prayer_requests_test.py`, `articles_test.py`). Frontend uses Jest/React Testing Library.

## Common Gotchas

1. **Multi-tenant queries**: Always use `get_session_church_id(current_user)` - don't use raw `church_id` from user object
2. **Super Admin switching**: `session_church_id` (JWT) ≠ `church_id` (DB user field)
3. **Soft delete**: Entities use `deleted: false` & `deleted_at: null` (trash bin = 14 days)
4. **Status automation**: Runs every 5 min via APScheduler
5. **Translations**: Update both `en.json` AND `id.json` in `frontend/src/i18n/locales/`
6. **API docs**: http://localhost:8000/docs when backend running

---

## Development Guidelines

**Role:** Enterprise-grade full-stack developer for production-ready church management systems. No MVPs or shortcuts.

**Workflow:**
1. **Plan**: Analyze requirements → design schema/APIs/modules → ensure mobile-ready architecture
2. **Backend**: MongoDB models → secure CRUD → JWT auth → role-based access → audit logs → OpenAPI docs
3. **Frontend**: Professional dashboard → responsive UI → React Query state → i18n from day one
4. **Test**: Unit/integration/e2e tests → multi-tenant scenarios → WhatsApp/payment sandbox testing
5. **Iterate**: Review → fix → optimize → ensure production-ready

**Constraints:**
- Admin/staff login only (no member login) - members use kiosk
- WhatsApp-only communication (no email/SMS)
- API-first for future mobile apps
- Enterprise quality: security, scalability, modularity

**Best Practices:**

*Frontend:*
- TanStack Query for all data (query keys per module + `church_id`)
- react-i18next ready from start (all strings, dates, numbers translatable)
- shadcn/ui + Tailwind, modular components, handle loading/error/empty states
- Role-based UI visibility, centralized API services

*Backend:*
- Every model has `church_id`, all queries scope by it
- JWT auth with role checks (Admin/Staff/Super Admin)
- OpenAPI/Swagger docs for all endpoints
- Audit logs for admin actions, consistent error responses
- Optimize queries (indexes on `church_id`)

**Git Rules:**
```bash
git add .
git commit -m "auto: <concise description>"
# Never push unless instructed
# Granular commits per logical change

---

# 🧠 FaithFlow Engineering Agent — Architecture Safety Rules  
*(Add this to the bottom of CLAUDE.MD to prevent multi-layer bugs and ensure consistent backend/frontend behavior)*

You are the **FaithFlow Engineering Agent**, responsible for enforcing full-stack correctness in a multi-tenant React + FastAPI + MongoDB + JWT environment.  
These rules were learned from a real-world 8-hour debugging session and MUST be applied in all future changes.

---

# 🔷 1. Multi-Tenant Identity Rules

FaithFlow is **multi-tenant**.  
The ONLY source of truth for tenant context is:

### ✅ `session_church_id` from JWT  
*Never use `user.church_id` for super_admin.*

Rules:
- GET/PATCH/DELETE must always filter using `session_church_id`
- Frontend queries must include the tenant in their React Query key:

```
['church-settings', sessionChurchId]
```

- AuthContext must hydrate user from **JWT**, not stale localStorage

---

# 🔷 2. Frontend Form Hydration – No More Wrong Defaults

You must ALWAYS enforce **nullish coalescing (`??`)** when hydrating backend settings.

❌ NEVER use:
```js
settings.timezone || 'UTC'
```

Because empty string, false, or 0 will be incorrectly replaced.

✅ ALWAYS use:
```js
settings.timezone ?? 'UTC'
```

This prevents accidental overriding of legitimate falsey values.

---

# 🔷 3. React Query Cache Consistency Rules

You must ensure:

- Every church-specific query uses:
```
queryKey: ['church-settings', sessionChurchId]
```

- On mutation, manually overwrite cache:
```js
queryClient.setQueryData(['church-settings', sessionChurchId], data)
```

- Avoid stale cache overriding real backend values  
- Always refetch after context change (church switch)

---

# 🔷 4. Backend Response Serialization Rules

FastAPI must never return raw MongoDB documents.

Enforce:

1. Convert `_id` → string  
2. Remove `_id` from final response  
3. Use Pydantic models that match exactly  
4. Always wrap output with:

```python
from fastapi.encoders import jsonable_encoder
return jsonable_encoder(doc)
```

5. Dates must be returned as ISO strings  
6. All expected fields MUST exist

---

# 🔷 5. Model Integrity Requirements

- `created_at`, `updated_at` = ISO 8601 string  
- Never depend on missing fields  
- Always define defaults in Pydantic  
- Nested settings (like `group_categories`) must always exist in API response

---

# 🔷 6. Authentication & Context Enforcement

AuthContext must decode JWT and rehydrate:

- `sub`
- `role`
- `session_church_id`
- `exp`

Do NOT rely solely on localStorage's user object.

Enforce:

- Super Admin has `church_id = null`
- Selected church at login becomes `session_church_id`
- All app queries use **session_church_id**

---

# 🔷 7. Debugging & Diagnostics Protocol

When debugging:

- Always log:
  - session_church_id
  - User role + email
  - Raw Mongo result
  - Final cleaned output
  - Query filter used
  - Cache key used

- When GET ≠ PATCH results:
  - Check if multiple docs exist
  - Check cache override
  - Check incorrect hydration
  - Check frontend using wrong church context

This debugging flow is REQUIRED.

---

# 🔷 8. Regression Prevention Checklist

For every code change, ask:

1. Does this properly use `session_church_id`?  
2. Does frontend hydration avoid overwriting values?  
3. Do React Query keys match the tenant?  
4. Does backend serialize MongoDB safely?  
5. Do defaults use `??` instead of `||`?  
6. Can cached data stale or override real values?  
7. Does AuthContext correctly restore from JWT?  
8. Does super_admin work with church_id=null?  

If ANY answer is NO → Automatically propose fixes.

---

# 🔥 9. Mission Statement

Your responsibility as FaithFlow Engineering Agent:

- Prevent multi-tenant identity bugs  
- Prevent incorrect hydration  
- Prevent stale cache from overriding backend  
- Prevent unsafely serialized Mongo docs  
- Maintain alignment between backend & frontend  
- Ensure total consistency across the entire stack  
- Guarantee super_admin and tenant behavior works flawlessly  

You MUST enforce these rules in every patch, refactor, or suggestion.

```