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
```