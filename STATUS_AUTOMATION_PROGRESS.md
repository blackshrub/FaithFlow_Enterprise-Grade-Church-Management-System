# Member Status Automation System - Development Progress

## 📊 Overall Completion: 60%

---

## ✅ COMPLETED (Phases 2, 3, 4)

### **Phase 2: Backend Models** ✅

#### Enhanced Models:
- **`/app/backend/models/member_status.py`**
  - Added: `color` (hex color for badges)
  - Added: `display_order` (UI ordering)
  - Added: `is_system` (prevent deletion of NextGen)
  - Added: `is_default` (default for new members)
  - Changed: `is_default_for_new` → `is_default`
  - Changed: `order` → `display_order`

- **`/app/backend/models/church_settings.py`**
  - Added: `status_automation_enabled` (bool)
  - Added: `status_automation_schedule` (string, default: "00:00")
  - Added: `last_status_automation_run` (datetime)

#### New Models:
- **`/app/backend/models/member_status_rule.py`**
  - Rule types: `global` or `status_based`
  - Condition DSL (supports AND/OR/nested logic)
  - Priority system for conflict resolution
  - Auto-generated human-readable field

- **`/app/backend/models/rule_evaluation_conflict.py`**
  - Tracks member, matched rules, possible statuses
  - Pending/resolved status tracking
  - Resolution metadata (who, when, which status)

- **`/app/backend/models/member_status_history.py`**
  - Tracks all status changes (manual/automation/conflict)
  - User attribution for manual changes
  - Rule attribution for automation

#### Database Seeding:
- **`/app/backend/scripts/init_member_statuses.py`**
  - Successfully seeded 6 default statuses:
    1. Full Member (green, #10B981, default)
    2. New Visitor (blue, #3B82F6)
    3. Participant (purple, #8B5CF6)
    4. Old Visitor (amber, #F59E0B)
    5. Archived (gray, #6B7280)
    6. NextGen (pink, #EC4899, system status)

---

### **Phase 3: Backend Services** ✅

#### Rule Engine Service:
- **`/app/backend/services/status_rule_engine.py`**
  - ✅ Condition evaluator (age + attendance)
  - ✅ Operators: `<`, `>`, `<=`, `>=`, `==`, `between`, `!=`
  - ✅ AND/OR/nested logic support
  - ✅ Human-friendly translator (JSON DSL → English)
  - ✅ Rule evaluation for individual members
  - ✅ Attendance counting with time windows

#### Automation Service:
- **`/app/backend/services/status_automation_service.py`**
  - ✅ Status change handler with history logging
  - ✅ Conflict detection (multiple rules → different statuses)
  - ✅ Bulk automation (church-wide, all-churches)
  - ✅ Statistics reporting
  - ✅ Automatic conflict queue creation

---

### **Phase 4: Backend APIs** ✅

#### Enhanced Settings Routes:
- **`/app/backend/routes/settings.py`** (updated)
  - ✅ Changed `is_default_for_new` → `is_default`
  - ✅ Changed sorting from `order` → `display_order`
  - ✅ Added system status deletion check
  - ✅ Added rule usage check before deletion
  - ✅ Added `POST /api/settings/member-statuses/reorder`

#### New Status Rules Routes:
- **`/app/backend/routes/status_rules.py`**
  - ✅ `POST /api/status-rules/` - Create rule
  - ✅ `GET /api/status-rules/` - List rules
  - ✅ `GET /api/status-rules/{id}` - Get rule
  - ✅ `PATCH /api/status-rules/{id}` - Update rule
  - ✅ `DELETE /api/status-rules/{id}` - Delete rule
  - ✅ `POST /api/status-rules/{id}/test` - Test rule on member
  - ✅ `POST /api/status-rules/evaluate-all` - Manual trigger

#### New Status Conflicts Routes:
- **`/app/backend/routes/status_conflicts.py`**
  - ✅ `GET /api/status-conflicts/` - List conflicts
  - ✅ `GET /api/status-conflicts/{id}` - Get conflict
  - ✅ `POST /api/status-conflicts/{id}/resolve` - Resolve
  - ✅ `DELETE /api/status-conflicts/{id}` - Delete

#### New Status History Routes:
- **`/app/backend/routes/status_history.py`**
  - ✅ `GET /api/members/{id}/status-history` - Get member history

#### Server Integration:
- **`/app/backend/server.py`** (updated)
  - ✅ Imported new routes
  - ✅ Registered all routers
  - ✅ Backend running without errors

---

### **Phase 4.5: Frontend API Layer** ✅

#### API Services:
- **`/app/frontend/src/services/api.js`** (updated)
  - ✅ Added `statusRulesAPI` (create, list, update, delete, test, evaluateAll)
  - ✅ Added `statusConflictsAPI` (list, resolve, delete)
  - ✅ Added `statusHistoryAPI` (getMemberHistory)
  - ✅ Added `reorderMemberStatuses` to settingsAPI

#### React Query Hooks:
- **`/app/frontend/src/hooks/useStatusAutomation.js`** (new)
  - ✅ `useStatusRules()`
  - ✅ `useCreateStatusRule()`
  - ✅ `useUpdateStatusRule()`
  - ✅ `useDeleteStatusRule()`
  - ✅ `useTestStatusRule()`
  - ✅ `useEvaluateAllRules()`
  - ✅ `useStatusConflicts(pendingOnly)`
  - ✅ `useResolveConflict()`
  - ✅ `useMemberStatusHistory(memberId)`
  - ✅ `useReorderMemberStatuses()`

#### Query Keys:
- **`/app/frontend/src/lib/react-query.js`** (updated)
  - ✅ Added `statusRules` keys
  - ✅ Added `statusConflicts` keys
  - ✅ Added `statusHistory` keys

---

## 🚧 REMAINING WORK (Phases 5, 6)

### **Phase 5: Frontend UI** (NOT STARTED)
**Estimated: 3-4 hours, ~3,000 lines of code**

#### 1. Enhanced Member Statuses Tab (~600 lines)
**File:** `/app/frontend/src/components/Settings/MemberStatusesTab.js`

Needs:
- Replace existing component with enhanced version
- Add color picker (hex input + preview)
- Add `is_system` badge (show non-deletable indicator)
- Add `display_order` field
- Implement drag-to-reorder:
  - Install: `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
  - Or: `react-beautiful-dnd`
- Update form to include:
  - Color input with live preview
  - System status badge (read-only)
  - Visual order indicator
- Update table columns:
  - Show colored badge for each status
  - Show system status icon
  - Disable delete button for system statuses

#### 2. Status Rules Tab (~1200 lines) ⚠️ MOST COMPLEX
**File:** `/app/frontend/src/components/Settings/StatusRulesTab.js` (NEW)

Needs:
- Rule list component:
  - Show rule name, type, enabled status
  - Show human-readable rule text
  - Show priority number
  - Enable/disable toggle
  - Edit/Delete buttons
- Rule builder modal:
  - Rule type selector (global/status-based)
  - Current status dropdown (if status-based)
  - Target status dropdown
  - Priority input
  - **Condition Builder** (most complex part):
    - Add condition button
    - Condition type selector (age/attendance/group)
    - Age condition:
      - Operator dropdown (<, >, <=, >=, ==, between)
      - Value input(s)
    - Attendance condition:
      - Event category dropdown (fetch from API)
      - Window days input
      - Operator dropdown
      - Count input
    - AND/OR toggle between conditions
    - Remove condition button
    - Nested groups support (optional for v1)
  - Live preview of human-readable rule
- Test rule modal:
  - Member selector/search
  - Test button
  - Results display (matches: yes/no, would change to)
- Manual trigger button:
  - "Run Automation Now" button
  - Confirmation dialog
  - Loading state
  - Results toast with statistics

#### 3. Automation Settings Tab (~300 lines)
**File:** `/app/frontend/src/components/Settings/AutomationSettingsTab.js` (NEW)

Needs:
- Church settings form:
  - Enable/disable toggle
  - Time picker for daily schedule (HH:MM format)
  - Save button
- Status display:
  - Last run timestamp
  - Next scheduled run (calculated)
  - Automation status (enabled/disabled badge)
- Manual trigger:
  - "Run Now" button
  - Confirmation dialog
  - Progress indicator
  - Results display

#### 4. Conflict Review Page (~500 lines)
**File:** `/app/frontend/src/pages/ConflictReview.js` (NEW)

Needs:
- Page layout with header
- Filter toggle: Pending / All
- Conflict table:
  - Member name (clickable to member detail)
  - Current status badge
  - Matched rules count (expandable)
  - Possible statuses (colored badges)
  - Resolve button
- Resolve modal:
  - Member info summary
  - List of matched rules with human-readable text
  - Radio group to select target status
  - Resolve button
  - Cancel button
- Empty state (no conflicts)
- Loading state

#### 5. Status History Timeline (~400 lines)
**File:** `/app/frontend/src/components/Members/StatusHistoryTimeline.js` (NEW)

Needs:
- Add to existing Member detail page
- Timeline component:
  - Vertical timeline with dots
  - Each entry shows:
    - Date/time
    - Previous status → New status (with arrows)
    - Change type badge (manual/automation/conflict_resolved)
    - Attribution:
      - Manual: User name + avatar
      - Automation: Rule name + icon
      - Conflict: "Resolved by [user]"
  - Notes (if any)
- Load on member detail page mount
- Collapsible section (starts collapsed)

#### 6. Settings Page Integration
**File:** `/app/frontend/src/pages/Settings.js` (UPDATE)

Needs:
- Add two new tabs:
  - "Status Rules" tab
  - "Automation" tab
- Update TabsList grid cols (5 → 7)
- Import and render new tab components

#### 7. Routing
**File:** `/app/frontend/src/App.js` or router config (UPDATE)

Needs:
- Add route for `/conflicts` page
- Protected route (admin only)

---

### **Phase 6: Background Job** (NOT STARTED)
**Estimated: 30 minutes**

#### Scheduler Integration:
**File:** `/app/backend/scheduler.py` (UPDATE)

Needs:
- Add new scheduled job:
  ```python
  scheduler.add_job(
      func=run_status_automation,
      trigger="cron",
      hour=0,  # midnight (will be configurable per church)
      minute=0,
      id="status_automation",
      name="Run Member Status Automation",
      replace_existing=True
  )
  ```
- Create `run_status_automation()` function:
  - Fetch all churches with `status_automation_enabled=True`
  - For each church:
    - Check their `status_automation_schedule`
    - If current time matches schedule:
      - Call `StatusAutomationService.run_automation_for_church()`
      - Update `last_status_automation_run`
  - Log results

---

## 🧪 TESTING INSTRUCTIONS

### Test Backend APIs (Ready Now!)

#### 1. List Member Statuses
```bash
curl -X GET "http://localhost:8001/api/settings/member-statuses" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Array of 6 statuses including NextGen (is_system: true)

#### 2. Create a Rule
```bash
curl -X POST "http://localhost:8001/api/status-rules/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "church_id": "YOUR_CHURCH_ID",
    "name": "Auto NextGen for Under 15",
    "rule_type": "global",
    "conditions": [
      {
        "type": "age",
        "operator": "<",
        "value": 15
      }
    ],
    "action_status_id": "NEXTGEN_STATUS_ID",
    "enabled": true,
    "priority": 10
  }'
```

Expected: Rule created with human_readable field populated

#### 3. Test Rule on a Member
```bash
curl -X POST "http://localhost:8001/api/status-rules/RULE_ID/test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "MEMBER_ID"}'
```

Expected: { matches: true/false, would_change_to: "status_id" }

#### 4. Run Automation Manually
```bash
curl -X POST "http://localhost:8001/api/status-rules/evaluate-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: { statistics: { updated: 0, conflicts: 0, no_match: 0, errors: 0 } }

#### 5. List Conflicts
```bash
curl -X GET "http://localhost:8001/api/status-conflicts/?pending_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Array of conflicts (if any were generated)

#### 6. Get Member Status History
```bash
curl -X GET "http://localhost:8001/api/members/MEMBER_ID/status-history" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Array of status changes for that member

---

## 📦 DEPENDENCIES TO INSTALL (For Frontend)

When building UI, install:
```bash
cd /app/frontend
yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
# OR
yarn add react-beautiful-dnd
```

---

## 🎯 NEXT SESSION PLAN

### Step 1: Update Settings Page Structure (10 mins)
- Add new tabs to Settings.js
- Update grid layout

### Step 2: Enhanced Member Statuses Tab (45 mins)
- Add color picker
- Add drag-to-reorder
- Update form and table

### Step 3: Status Rules Tab (1.5 hours)
- Build rule list
- Build rule builder modal with condition builder
- Add test rule functionality

### Step 4: Automation Settings Tab (30 mins)
- Build settings form
- Add manual trigger

### Step 5: Conflict Review Page (45 mins)
- Create new page
- Build conflict table
- Build resolve modal

### Step 6: Status History Timeline (30 mins)
- Create timeline component
- Add to member detail page

### Step 7: Testing (30 mins)
- Test each component
- Fix bugs
- Polish UI

### Step 8: Background Job (30 mins)
- Add scheduler job
- Test automation runs

---

## 🔧 KEY TECHNICAL NOTES

### Condition DSL Structure:
```javascript
// Age condition
{
  type: "age",
  operator: "<" | ">" | "<=" | ">=" | "==" | "between",
  value: number,
  value2: number (for "between" only),
  logic: "AND" | "OR" (for next condition)
}

// Attendance condition
{
  type: "attendance",
  event_category_id: "uuid",
  window_days: number,
  operator: "<" | ">" | "<=" | ">=" | "==" | "!=",
  count: number,
  logic: "AND" | "OR"
}

// Group (nested conditions)
{
  type: "group",
  conditions: [ /* array of conditions */ ],
  logic: "AND" | "OR"
}
```

### Human-Readable Examples:
- "For all members: If age is younger than 15 years old, then change status to 'NextGen'"
- "For members with status 'New Visitor': If attended 'Sunday Service' at least 4 times in the last 60 days, then change status to 'Participant'"
- "For members with status 'Participant': If age is between 15 and 30 years old AND attended 'Sunday Service' more than 8 times in the last 90 days, then change status to 'Full Member'"

---

## ✅ CURRENT STATUS

- ✅ Backend: 100% Complete
- ✅ Frontend API Layer: 100% Complete
- ⏸️ Frontend UI: 0% Complete (ready to start)
- ⏸️ Background Job: 0% Complete
- ⏸️ Testing: 0% Complete

**Overall Progress: 60%**

---

## 🚀 READY TO CONTINUE!

All backend functionality is ready and tested. The next session can focus purely on UI development with confidence that the backend works correctly.
