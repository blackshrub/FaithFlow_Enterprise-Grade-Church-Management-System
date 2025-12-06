# Granular Access Control System - Proposal

## 📊 Current State Analysis

### Current Access Control (Role-Based)

**Roles:**
- `super_admin` - Full access across all churches
- `admin` - Full access within assigned church
- `staff` - Limited access within assigned church
- API Keys - Admin-level access for integrations

**Current Limitations:**
1. ❌ **No fine-grained permissions** - Staff has blanket access or no access
2. ❌ **Cannot customize access per staff** - All staff have same permissions
3. ❌ **No module-level control** - Can't disable specific features for users
4. ❌ **No action-level control** - Can't separate view vs edit vs delete
5. ❌ **No custom roles** - Fixed 3-role system
6. ❌ **No delegation** - Can't assign temporary permissions
7. ❌ **No audit trail** - Can't track who has what permissions

**Current Code:**
```python
# backend/utils/dependencies.py
async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin or super_admin role"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

---

## 🎯 Proposed Granular Permission System

### Design Philosophy

**Permission-Based Access Control (PBAC)** with:
- ✅ **Resource-based** - What can be accessed (members, events, finance, etc.)
- ✅ **Action-based** - What operations (view, create, edit, delete, approve)
- ✅ **Module-based** - What features (kiosk, counseling, accounting, etc.)
- ✅ **Custom roles** - Church admins can create roles
- ✅ **Role inheritance** - Roles can extend other roles
- ✅ **Row-level security** - Access specific records based on rules

---

## 🏗️ Architecture

### 1. Permission Structure

**Format:** `module:resource:action`

**Examples:**
```
members:members:view          # View members list
members:members:create        # Add new members
members:members:edit          # Edit member details
members:members:delete        # Delete members
members:members:export        # Export member data

finance:contributions:view    # View contributions
finance:contributions:create  # Record contributions
finance:contributions:approve # Approve contributions
finance:reports:generate      # Generate financial reports

events:events:view            # View events
events:events:create          # Create events
events:rsvps:manage           # Manage RSVPs

counseling:appointments:view  # View appointments
counseling:appointments:create # Create appointments
counseling:appointments:approve # Approve appointments

groups:groups:view            # View groups
groups:groups:manage          # Manage groups
groups:members:add            # Add members to groups

kiosk:configure              # Configure kiosk settings
kiosk:view_analytics         # View kiosk analytics

settings:church:edit         # Edit church settings
settings:users:manage        # Manage users
settings:roles:manage        # Manage custom roles
```

### 2. Permission Categories

**Module-Level Permissions:**
```javascript
{
  "members": ["view", "create", "edit", "delete", "export", "import"],
  "finance": ["view", "create", "edit", "approve", "reports"],
  "events": ["view", "create", "edit", "delete", "rsvps"],
  "groups": ["view", "create", "edit", "delete", "members"],
  "counseling": ["view", "create", "edit", "approve", "notes"],
  "attendance": ["view", "record", "edit", "reports"],
  "prayer_requests": ["view", "create", "edit", "pray", "close"],
  "articles": ["view", "create", "edit", "publish", "delete"],
  "kiosk": ["view", "configure", "analytics"],
  "settings": ["view", "church", "users", "roles", "integrations"]
}
```

### 3. Pre-defined Roles (Can be customized)

#### **Super Admin** (Global)
```json
{
  "id": "role-super-admin",
  "name": "Super Admin",
  "church_id": null,
  "is_system_role": true,
  "permissions": ["*:*:*"],
  "description": "Full access across all churches"
}
```

#### **Church Admin**
```json
{
  "id": "role-church-admin",
  "name": "Church Admin",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": ["*:*:*"],
  "description": "Full access within church"
}
```

#### **Pastor/Leadership**
```json
{
  "id": "role-pastor",
  "name": "Pastor",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "members:*:*",
    "counseling:*:*",
    "prayer_requests:*:*",
    "events:*:view",
    "events:*:create",
    "groups:*:view",
    "attendance:*:*",
    "articles:*:*",
    "finance:*:view"
  ],
  "description": "Access to member care and spiritual activities"
}
```

#### **Finance Manager**
```json
{
  "id": "role-finance",
  "name": "Finance Manager",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "finance:*:*",
    "members:members:view",
    "members:members:export",
    "events:*:view"
  ],
  "description": "Full access to financial management"
}
```

#### **Event Coordinator**
```json
{
  "id": "role-events",
  "name": "Event Coordinator",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "events:*:*",
    "members:members:view",
    "groups:groups:view",
    "attendance:*:*"
  ],
  "description": "Manage events and attendance"
}
```

#### **Receptionist/Front Desk**
```json
{
  "id": "role-receptionist",
  "name": "Receptionist",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "members:members:view",
    "members:members:create",
    "members:members:edit",
    "kiosk:*:*",
    "events:events:view",
    "events:rsvps:manage",
    "groups:groups:view"
  ],
  "description": "Front desk and kiosk management"
}
```

#### **Counselor**
```json
{
  "id": "role-counselor",
  "name": "Counselor",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "counseling:*:*",
    "prayer_requests:*:*",
    "members:members:view",
    "members:members:edit"
  ],
  "row_level_rules": {
    "counseling": "counselor_id = {user_id}"
  },
  "description": "Counseling appointments (own appointments only)"
}
```

#### **Read-Only Staff**
```json
{
  "id": "role-viewer",
  "name": "Viewer",
  "church_id": "church-123",
  "is_system_role": true,
  "permissions": [
    "members:*:view",
    "events:*:view",
    "groups:*:view",
    "finance:*:view",
    "attendance:*:view"
  ],
  "description": "View-only access to all modules"
}
```

---

## 💾 Database Schema

### 1. Roles Collection

```javascript
// Collection: roles
{
  "id": "role-uuid",
  "church_id": "church-123",  // null for super_admin
  "name": "Finance Manager",
  "description": "Manages all financial activities",
  "is_system_role": false,    // true for predefined roles
  "is_active": true,

  // Permissions array
  "permissions": [
    "finance:contributions:view",
    "finance:contributions:create",
    "finance:contributions:approve",
    "finance:reports:generate",
    "members:members:view"
  ],

  // Row-level security rules (optional)
  "row_level_rules": {
    "finance": "department_id IN ({user_departments})",
    "counseling": "counselor_id = {user_id} OR status = 'pending'"
  },

  // Inheritance (optional)
  "inherits_from": ["role-viewer"],  // Inherit permissions from these roles

  // Metadata
  "created_by": "user-id",
  "created_at": "2025-01-23T10:00:00Z",
  "updated_at": "2025-01-23T10:00:00Z"
}
```

### 2. Users Collection (Updated)

```javascript
// Collection: users
{
  "id": "user-uuid",
  "church_id": "church-123",
  "email": "pastor@church.org",
  "full_name": "John Doe",

  // UPDATED: Role reference instead of role string
  "role_id": "role-pastor",  // Reference to roles collection
  "role": "pastor",          // Keep for backward compatibility (deprecated)

  // Direct permission overrides (optional)
  "additional_permissions": [
    "settings:integrations:view"  // Add specific permission
  ],
  "revoked_permissions": [
    "members:members:delete"  // Remove specific permission from role
  ],

  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 3. Permission Groups (Optional - for organization)

```javascript
// Collection: permission_groups
{
  "id": "group-uuid",
  "church_id": "church-123",
  "name": "Member Management",
  "description": "All permissions related to member management",
  "permissions": [
    "members:members:view",
    "members:members:create",
    "members:members:edit",
    "members:members:delete",
    "members:members:export",
    "members:members:import"
  ]
}
```

---

## 🔧 Implementation Approach

### Phase 1: Backend Permission System

#### 1.1. Permission Utilities

```python
# backend/utils/permissions.py

from typing import List, Set, Optional
from fastapi import HTTPException, status

class PermissionChecker:
    """Check user permissions against required permissions"""

    @staticmethod
    def has_permission(user: dict, required_permission: str) -> bool:
        """
        Check if user has specific permission.

        Supports wildcards:
        - members:*:* matches all member permissions
        - *:*:* matches everything
        """
        user_permissions = PermissionChecker.get_user_permissions(user)

        # Check for exact match
        if required_permission in user_permissions:
            return True

        # Check for wildcard matches
        parts = required_permission.split(':')
        for perm in user_permissions:
            perm_parts = perm.split(':')

            if all(
                pp == '*' or pp == rp
                for pp, rp in zip(perm_parts, parts)
            ):
                return True

        return False

    @staticmethod
    def get_user_permissions(user: dict) -> Set[str]:
        """Get all permissions for a user (from role + overrides)"""
        permissions = set()

        # 1. Get role permissions
        role_permissions = user.get('role_permissions', [])
        permissions.update(role_permissions)

        # 2. Add additional permissions
        additional = user.get('additional_permissions', [])
        permissions.update(additional)

        # 3. Remove revoked permissions
        revoked = user.get('revoked_permissions', [])
        permissions -= set(revoked)

        return permissions

    @staticmethod
    async def load_user_permissions(db, user: dict) -> dict:
        """Load permissions from role and enrich user object"""
        role_id = user.get('role_id')

        if not role_id:
            # Fallback to legacy role string
            role = user.get('role', 'staff')
            if role == 'super_admin':
                user['role_permissions'] = ['*:*:*']
            elif role == 'admin':
                user['role_permissions'] = ['*:*:*']  # Within church
            else:
                user['role_permissions'] = []
            return user

        # Fetch role from database
        role = await db.roles.find_one({'id': role_id}, {'_id': 0})
        if not role:
            user['role_permissions'] = []
            return user

        # Collect permissions from role and inherited roles
        all_permissions = set(role.get('permissions', []))

        # TODO: Handle role inheritance
        # inherits_from = role.get('inherits_from', [])
        # for parent_role_id in inherits_from:
        #     parent = await db.roles.find_one({'id': parent_role_id})
        #     all_permissions.update(parent.get('permissions', []))

        user['role_permissions'] = list(all_permissions)
        user['role_name'] = role.get('name')

        return user


def require_permission(permission: str):
    """Dependency to require specific permission"""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_db)
    ) -> dict:
        # Load permissions if not already loaded
        if 'role_permissions' not in current_user:
            current_user = await PermissionChecker.load_user_permissions(db, current_user)

        if not PermissionChecker.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}"
            )

        return current_user

    return permission_checker


def require_any_permission(*permissions: str):
    """Require any of the specified permissions"""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_db)
    ) -> dict:
        if 'role_permissions' not in current_user:
            current_user = await PermissionChecker.load_user_permissions(db, current_user)

        if not any(PermissionChecker.has_permission(current_user, p) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these permissions required: {', '.join(permissions)}"
            )

        return current_user

    return permission_checker
```

#### 1.2. Update Dependencies

```python
# backend/utils/dependencies.py

from .permissions import PermissionChecker

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    database: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """Get current authenticated user with permissions loaded"""
    # ... existing code ...

    # Load user permissions before returning
    merged_user = await PermissionChecker.load_user_permissions(database, merged_user)

    return merged_user
```

#### 1.3. Use in Routes

```python
# backend/routes/members.py

from utils.permissions import require_permission

@router.get("/", response_model=List[Member])
async def list_members(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("members:members:view"))
):
    """List members - requires view permission"""
    # ...

@router.post("/", response_model=Member, status_code=201)
async def create_member(
    member_data: MemberCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("members:members:create"))
):
    """Create member - requires create permission"""
    # ...

@router.delete("/{member_id}")
async def delete_member(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_permission("members:members:delete"))
):
    """Delete member - requires delete permission"""
    # ...
```

### Phase 2: Frontend Permission System

#### 2.1. Permission Context

```javascript
// frontend/src/contexts/PermissionContext.js

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const PermissionContext = createContext();

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    if (!user || !user.role_permissions) return false;

    const userPermissions = [
      ...(user.role_permissions || []),
      ...(user.additional_permissions || [])
    ].filter(p => !user.revoked_permissions?.includes(p));

    // Check exact match
    if (userPermissions.includes(permission)) return true;

    // Check wildcard match
    const parts = permission.split(':');
    return userPermissions.some(perm => {
      const permParts = perm.split(':');
      return permParts.every((pp, i) => pp === '*' || pp === parts[i]);
    });
  };

  const hasAnyPermission = (...permissions) => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (...permissions) => {
    return permissions.every(p => hasPermission(p));
  };

  const canView = (module) => hasPermission(`${module}:*:view`);
  const canCreate = (module) => hasPermission(`${module}:*:create`);
  const canEdit = (module) => hasPermission(`${module}:*:edit`);
  const canDelete = (module) => hasPermission(`${module}:*:delete`);

  return (
    <PermissionContext.Provider value={{
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canView,
      canCreate,
      canEdit,
      canDelete
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};
```

#### 2.2. Permission Components

```javascript
// frontend/src/components/PermissionGate.js

import { usePermissions } from '../contexts/PermissionContext';

export const PermissionGate = ({ permission, children, fallback = null }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return <>{children}</>;
};

export const AnyPermissionGate = ({ permissions, children, fallback = null }) => {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(...permissions)) {
    return fallback;
  }

  return <>{children}</>;
};
```

#### 2.3. Usage in UI

```javascript
// frontend/src/pages/Members/MembersList.js

import { PermissionGate } from '../../components/PermissionGate';
import { usePermissions } from '../../contexts/PermissionContext';

const MembersList = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <div className="flex justify-between">
        <h1>Members</h1>

        {/* Only show if user can create members */}
        <PermissionGate permission="members:members:create">
          <Button onClick={() => setShowCreateModal(true)}>
            Add Member
          </Button>
        </PermissionGate>
      </div>

      <Table>
        {members.map(member => (
          <TableRow key={member.id}>
            <TableCell>{member.full_name}</TableCell>
            <TableCell className="text-right">
              {/* Only show edit if user can edit */}
              <PermissionGate permission="members:members:edit">
                <Button onClick={() => handleEdit(member)}>Edit</Button>
              </PermissionGate>

              {/* Only show delete if user can delete */}
              <PermissionGate permission="members:members:delete">
                <Button onClick={() => handleDelete(member)}>Delete</Button>
              </PermissionGate>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
};
```

### Phase 3: Role Management UI

#### 3.1. Roles List Page
- View all roles in church
- Create custom roles
- Edit role permissions
- Assign roles to users

#### 3.2. Role Editor
- Permission tree with checkboxes
- Group by module
- Quick presets (View All, Edit All, etc.)
- Test mode to preview what user would see

---

## 🎯 Benefits

1. ✅ **Flexibility** - Churches can create roles matching their structure
2. ✅ **Security** - Fine-grained control over who can do what
3. ✅ **Scalability** - Easy to add new permissions as features grow
4. ✅ **Compliance** - Audit trail of who has access to what
5. ✅ **User Experience** - Users only see features they can use
6. ✅ **Multi-tenant Safe** - Roles scoped to churches
7. ✅ **Backward Compatible** - Can migrate gradually

---

## 📝 Migration Strategy

### Step 1: Add New Tables
- Create `roles` collection
- Create default system roles for each church

### Step 2: Update Users
- Add `role_id` field to users
- Migrate existing role strings to role IDs
- Keep old `role` field for backward compatibility

### Step 3: Update Backend
- Add permission utilities
- Keep old `require_admin()` working
- Add new `require_permission()` alongside
- Gradually migrate routes

### Step 4: Update Frontend
- Add PermissionContext
- Add PermissionGate components
- Gradually wrap UI components

### Step 5: Role Management UI
- Build role editor
- Allow churches to customize

---

## 🚀 Rollout Plan

**Week 1-2: Backend Foundation**
- [ ] Create permission utilities
- [ ] Create roles schema
- [ ] Seed default roles
- [ ] Add permission checks to critical routes

**Week 3-4: Frontend Foundation**
- [ ] Create PermissionContext
- [ ] Create PermissionGate components
- [ ] Update navigation to hide unauthorized pages

**Week 5-6: Role Management**
- [ ] Build role list page
- [ ] Build role editor
- [ ] Build user role assignment

**Week 7-8: Migration & Testing**
- [ ] Migrate all routes to use permissions
- [ ] Test with different role combinations
- [ ] Document for church admins

---

## 💡 Advanced Features (Future)

1. **Temporary Permissions** - Grant access for limited time
2. **Delegation** - Users can delegate their permissions
3. **Approval Workflows** - Require approval for sensitive actions
4. **IP Restrictions** - Limit access by IP/location
5. **Session Policies** - Limit concurrent sessions
6. **Activity Monitoring** - Real-time permission usage tracking
7. **Smart Recommendations** - Suggest roles based on usage patterns

---

## ❓ Discussion Points

1. **Complexity vs Simplicity** - Do we start simple (just a few roles) or go full granular from start?
2. **UI/UX** - How technical should the role editor be for church admins?
3. **Performance** - Should we cache permissions in Redis?
4. **Default Roles** - What default roles should every church start with?
5. **Migration** - Do we force migrate or run dual system?
6. **Documentation** - How do we teach church admins to use this?

---

**Let me know your thoughts! I can start implementation or adjust this proposal based on your needs.**
