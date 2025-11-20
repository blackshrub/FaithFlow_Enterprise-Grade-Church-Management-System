# Changelog

All notable changes to FaithFlow will be documented in this file.

## [2.0.0] - November 2025

### 🎉 Major Features Added

#### Member Status Automation System
- **Custom Status Management**
  - Create unlimited member statuses with custom colors
  - Drag-to-reorder for display
  - System status protection (e.g., NextGen)
  - Default status configuration

- **Automation Rules Engine**
  - Two-phase rule evaluation (global + status-based)
  - Age-based conditions (<, >, <=, >=, ==, !=)
  - Attendance-based conditions (Sunday Service tracking)
  - Time windows (e.g., last 60 days)
  - Multiple conditions with AND logic
  - Priority-based rule ordering

- **Simulation & Preview**
  - Preview affected members before creating rules
  - Test existing rules to see impact
  - Shows member count, names, ages, current statuses
  - Prevent accidental mass status changes

- **Conflict Detection & Resolution**
  - Automatic detection when multiple rules match
  - Conflict review queue
  - Manual resolution by admin
  - Optional comments for decisions
  - "Keep current status" option

- **Background Automation**
  - Timezone-aware scheduling (hourly checks)
  - Configurable per church
  - Manual "Run Now" trigger
  - Statistics reporting (updated/conflicts/errors)

- **Complete Audit Trail**
  - Every status change logged
  - Tracks: who, when, why (manual/automation/conflict)
  - Viewable in member status history
  - Full attribution (user or rule)

#### Trash Bin System
- **Soft Delete**
  - Members moved to trash instead of permanent deletion
  - Hidden from `/api/members/` (external apps won't see)
  - Excluded from all member lists
  
- **14-Day Auto-Cleanup**
  - Daily background job at 2 AM
  - Permanently deletes members >14 days in trash
  - Countdown warning (red when <3 days)

- **Restore Capability**
  - Restore deleted members within 14 days
  - One-click restoration
  - Member returns to active status

- **Trash Bin UI**
  - Dedicated `/trash` page
  - Shows days in trash
  - Auto-delete countdown
  - Restore or permanent delete options

#### Enhanced Member Management
- **Comprehensive Filters**
  - Gender filter (Male/Female)
  - Marital status filter (Married/Not Married/Widow/Widower)
  - Member status filter (from configured statuses)
  - Demographic filter (Kid/Teen/Youth/Adult/Senior)
  - "Show Incomplete Data" toggle
  - Clear filters button
  
- **New Table Columns**
  - Demographic category column
  - Color-coded status badges
  
- **Member Model Enhancements**
  - `current_status_id` (UUID reference)
  - `participate_in_automation` (opt-out flag)
  - `is_deleted`, `deleted_at`, `deleted_by` (soft delete)

#### Webhook Improvements
- **Enhanced Payload**
  - Added `campus_id` field (alias for church_id)
  - Added `member_id` at root level for easy access
  - Full member object in `data` field
  - `changes` object for update events

- **Signature Format Update**
  - Removed "sha256=" prefix (just hex hash)
  - Compact JSON (no spaces)
  - Natural key order (not sorted)
  - Matches industry standards

- **Better Error Reporting**
  - Detailed debug info in test responses
  - Shows signature, algorithm, payload
  - HTTP status codes and response bodies
  - 15-second error toasts with full details

#### API Key Authentication
- **Non-Email Username Support**
  - API usernames like `api_abc123_church`
  - No email format validation required
  - Works for external application integration

- **Enhanced Security**
  - Fixed `get_current_user()` to support API keys
  - Proper token type detection
  - API keys have admin-level access
  - Last used timestamp tracking

### 🔧 Technical Improvements

#### Backend
- Removed deployment blockers (torch, tiptap)
- Added 4th background job (trash cleanup)
- Enhanced logging for webhook delivery
- Fixed API endpoint response models
- Improved error messages
- Added trailing slash consistency

#### Frontend
- Force HTTPS for all API calls
- Fixed mixed content errors
- Enhanced member filters UI
- Added trash bin page and button
- Improved webhook test error display
- Better loading and error states

#### Database
- Migrated 809 members to new status structure
- Added soft delete fields
- New collections: member_status_rules, rule_evaluation_conflicts, member_status_history
- Proper indexes for multi-tenant queries

### 🐛 Bug Fixes

- Fixed API key list endpoint (Pydantic validation error)
- Fixed trailing slash redirects (HTTPS → HTTP)
- Fixed member status recovery (776 members linked)
- Fixed old deleted members migration to trash
- Fixed webhook signature format mismatch
- Fixed missing icon imports
- Fixed JSON syntax errors in i18n files
- Fixed route ordering (trash before {member_id})

### 📚 Documentation

- Updated README.md with all features
- Updated API.md with new endpoints
- Created PYTORCH_DEPLOYMENT_GUIDE.md
- Created API_KEY_TESTING_GUIDE.md
- Added i18n translations (EN + ID)
- Updated EXTERNAL_API.md with campus_id

### 🚀 Deployment

- ✅ Removed heavy dependencies (torch)
- ✅ Strong JWT secret key
- ✅ CORS configured for production (*)
- ✅ All environment variables in .env
- ✅ No hardcoded URLs or secrets
- ✅ Resource optimized (<1Gi memory)
- ✅ Kubernetes deployment ready

---

## [1.0.0] - Initial Release

### Core Features
- Member management
- Events and attendance
- Groups management
- Prayer requests
- Articles and devotions
- Full accounting module
- Multi-tenant support
- Authentication and authorization

---

**For upgrade instructions and migration guides, see documentation.**
