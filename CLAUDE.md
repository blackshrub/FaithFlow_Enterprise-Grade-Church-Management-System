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

---

# 🔷 10. gorhom/bottom-sheet Rules for Mobile App

**Context**: These rules were learned from debugging a category filter modal that wouldn't appear despite visible state being true and present() being called. The modal worked once then stopped working on subsequent clicks.

## Component Choice (CRITICAL)

gorhom/bottom-sheet provides **two different components** for **two different control patterns**:

### ✅ Use `BottomSheet` for Zustand-controlled modals
- Supports **declarative control** via reactive `index` prop
- Index changes automatically when state changes
- Perfect for global modals controlled by Zustand stores
- **This is what you want 99% of the time**

```tsx
import BottomSheet from '@gorhom/bottom-sheet';

<BottomSheet
  index={visible ? 0 : -1}  // Reactive declarative control
  snapPoints={['60%']}
  onClose={handleClose}
>
  {/* content */}
</BottomSheet>
```

### ❌ DON'T use `BottomSheetModal` for Zustand stores
- Only supports **imperative control** via `present()`/`dismiss()` methods
- Does NOT react to `index` prop changes
- Causes "works once then breaks" bug when mixed with declarative state
- Only use if you need imperative control (rare cases)

## Architecture Requirements

### 1. Single BottomSheetModalProvider at Root

**MUST have exactly ONE provider at root level** (`app/_layout.tsx`):

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider>
        <GluestackUIProvider>
          <BottomSheetModalProvider>
            <Stack />

            {/* Global modals MUST be siblings of Stack, not inside tabs */}
            <NoteEditorModal />
            <CategoryFilterModal />
            <Toast />
          </BottomSheetModalProvider>
        </GluestackUIProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

**Critical Rules:**
- Only ONE `BottomSheetModalProvider` per app
- Must wrap all screens that use bottom sheets
- `GestureHandlerRootView` is REQUIRED for gestures to work
- Global modals must be at root level, NOT inside tab layouts

### 2. Modal Placement

❌ **WRONG** - Inside tabs layout:
```tsx
// app/(tabs)/_layout.tsx
<View>
  <Slot />
  <CategoryFilterModal />  // ❌ Wrong! Portal can be blocked
</View>
```

✅ **CORRECT** - At root level:
```tsx
// app/_layout.tsx
<BottomSheetModalProvider>
  <Stack />
  <CategoryFilterModal />  // ✅ Correct! Always visible
</BottomSheetModalProvider>
```

## Zustand Store Pattern

Create a store to control modal visibility globally:

```tsx
// stores/categoryFilter.ts
import { create } from 'zustand';

interface CategoryFilterStore {
  visible: boolean;
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: ((categoryId: string | null) => void) | null;

  open: (
    categories: any[],
    selectedCategory: string | null,
    onSelect: (categoryId: string | null) => void
  ) => void;
  close: () => void;
  selectCategory: (categoryId: string | null) => void;
}

export const useCategoryFilterStore = create<CategoryFilterStore>((set, get) => ({
  visible: false,
  categories: [],
  selectedCategory: null,
  onSelectCategory: null,

  open: (categories, selectedCategory, onSelect) => {
    set({
      visible: true,
      categories,
      selectedCategory,
      onSelectCategory: onSelect,
    });
  },

  close: () => {
    set({
      visible: false,
      categories: [],
      selectedCategory: null,
      onSelectCategory: null,
    });
  },

  selectCategory: (categoryId) => {
    const { onSelectCategory, close } = get();
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
    close();
  },
}));
```

## Modal Component Pattern

```tsx
// components/modals/CategoryFilterModal.tsx
import React, { useRef, useCallback, useMemo } from 'react';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCategoryFilterStore } from '@/stores/categoryFilter';

export function CategoryFilterModal() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const { visible, close } = useCategoryFilterStore();

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}  // Declarative control - reacts to state
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={close}
      backdropComponent={renderBackdrop}
    >
      {/* Your content here */}
    </BottomSheet>
  );
}
```

## Screen Usage Pattern

```tsx
// app/(tabs)/events.tsx
import { useCategoryFilterStore } from '@/stores/categoryFilter';

export default function EventsScreen() {
  const categoryFilterStore = useCategoryFilterStore();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleOpenFilter = () => {
    categoryFilterStore.open(
      categories,
      selectedCategory,
      (categoryId) => {
        setSelectedCategory(categoryId);
        // Any other logic...
      }
    );
  };

  return (
    <Pressable onPress={handleOpenFilter}>
      <Text>Open Filter</Text>
    </Pressable>
  );
}
```

## Common Pitfalls to Avoid

### ❌ Pitfall 1: Mixing Declarative + Imperative Control
```tsx
// DON'T DO THIS
const { visible } = useStore();
useEffect(() => {
  if (visible) {
    bottomSheetRef.current?.present();  // ❌ Don't use present() with BottomSheet
  }
}, [visible]);

<BottomSheet index={visible ? 0 : -1} />  // Mixing patterns causes bugs
```

### ❌ Pitfall 2: Using BottomSheetModal with Declarative State
```tsx
// DON'T DO THIS
import { BottomSheetModal } from '@gorhom/bottom-sheet';  // ❌ Wrong component

<BottomSheetModal
  index={visible ? 0 : -1}  // ❌ index prop doesn't work with Modal variant
/>
```

### ❌ Pitfall 3: Multiple Providers
```tsx
// DON'T DO THIS
// app/_layout.tsx
<BottomSheetModalProvider>  // ❌ First provider
  <Stack />
</BottomSheetModalProvider>

// app/(tabs)/_layout.tsx
<BottomSheetModalProvider>  // ❌ Second provider - causes conflicts
  <Slot />
</BottomSheetModalProvider>
```

### ❌ Pitfall 4: Missing GestureHandlerRootView
```tsx
// DON'T DO THIS
export default function RootLayout() {
  return (
    <BottomSheetModalProvider>  // ❌ Missing GestureHandlerRootView
      <Stack />
    </BottomSheetModalProvider>
  );
}
```

## Debugging Checklist

When bottom sheet doesn't appear:

1. **Check component**: Using `BottomSheet` (not `BottomSheetModal`)?
2. **Check provider**: Single `BottomSheetModalProvider` at root level?
3. **Check GestureHandlerRootView**: Wrapping everything?
4. **Check placement**: Modal at root level (not inside tabs)?
5. **Check index**: Using `index={visible ? 0 : -1}` pattern?
6. **Check onChange callback**: Add logging to verify index changes
7. **Check for mixing**: No `present()`/`dismiss()` calls with declarative index?

## Key Takeaways

1. **BottomSheet** (declarative) ≠ **BottomSheetModal** (imperative)
2. Use **BottomSheet** with Zustand for global modals
3. Only **ONE** provider at root level
4. **GestureHandlerRootView** is required
5. Modals must be **siblings of Stack**, not inside tabs
6. **Never mix** declarative and imperative control
7. Use `index={visible ? 0 : -1}` for declarative control

---

# 🔷 11. Mobile App Styling Hierarchy (CRITICAL)

**Context**: These rules establish clear boundaries for styling approaches in the React Native mobile app. Following this hierarchy prevents styling conflicts and ensures consistent UI patterns.

## ✅ Use NativeWind as the Primary (almost-exclusive) Styling System

NativeWind (Tailwind CSS for React Native) is the **default styling approach** for all components.

### When to use NativeWind:
- **All layout and spacing**: `flex-1`, `p-4`, `mb-2`, `gap-3`
- **Colors and backgrounds**: `bg-white`, `dark:bg-gray-900`, `text-gray-600`
- **Borders and shadows**: `rounded-xl`, `border`, `shadow-lg`
- **Typography**: `text-lg`, `font-semibold`, `text-center`
- **Responsive design**: Use NativeWind's responsive prefixes

### ✅ Gluestack-UI Components (Limited Use)

Use Gluestack-UI **ONLY** for these specific interactive components:
- **Buttons**: `<Button>`, `<ButtonText>`, `<ButtonSpinner>`
- **Modals/Sheets**: `<Modal>`, action sheets, dialogs
- **Form elements**: `<Input>`, `<TextArea>`, `<Checkbox>`
- **Toast/Alert**: Toast notifications and alerts
- **Select/Dropdown**: `<Select>`, pickers

```tsx
// ✅ CORRECT - Gluestack for buttons
import { Button, ButtonText } from '@/components/ui/button';
<Button className="mt-4" size="lg">
  <ButtonText>Submit</ButtonText>
</Button>

// ❌ WRONG - Custom button with Pressable when Gluestack exists
<Pressable className="bg-blue-500 rounded-lg py-3">
  <Text>Submit</Text>
</Pressable>
```

### 🔥 CRITICAL: Gluestack Button Standardized Heights

Gluestack Button has **standardized heights** via the `size` prop. ALWAYS use these instead of custom min-h values:

| Size | Height | Use Case |
|------|--------|----------|
| `xs` | h-8 (32px) | Compact buttons, tags |
| `sm` | h-9 (36px) | Secondary actions |
| `md` | h-10 (40px) | Default buttons |
| `lg` | h-14 (56px) | **Primary CTAs, Login buttons** |
| `xl` | h-16 (64px) | Hero sections |

```tsx
// ✅ CORRECT - Use size="lg" for primary CTA buttons
<Button size="lg" onPress={handleSubmit} className="w-full">
  <ButtonText>Continue</ButtonText>
</Button>

// ❌ WRONG - Custom Pressable with min-h-[52px]
<Pressable className="min-h-[52px] rounded-2xl bg-blue-500">
  <Text>Continue</Text>
</Pressable>
```

### Gradient Buttons with Gluestack

For buttons that need gradient backgrounds, use Gluestack Button as base with LinearGradient overlay:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

// ✅ CORRECT - Gluestack Button with gradient overlay
<View className="rounded-2xl overflow-hidden">
  <Button
    size="lg"
    onPress={handlePress}
    isDisabled={isLoading}
    className="w-full bg-transparent relative overflow-hidden"
  >
    {/* Gradient background - absolute positioned */}
    <LinearGradient
      colors={['#4338CA', '#6366F1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    {/* Content with z-index */}
    <View className="flex-row items-center gap-2 z-[1]">
      <Icon />
      <ButtonText className="text-white">Continue</ButtonText>
    </View>
  </Button>
</View>

// ❌ WRONG - Custom Pressable with LinearGradient (no standardized height)
<Pressable className="rounded-2xl overflow-hidden">
  <LinearGradient colors={['#4338CA', '#6366F1']} className="py-4 px-6">
    <Text>Continue</Text>
  </LinearGradient>
</Pressable>
```

### ✅ React Native Core Components (Specific Use Cases)

Use React Native components directly for:
- **Animated headers**: ScrollView with Animated API
- **Premium motion transitions**: Reanimated + withPremiumMotion HOC
- **Shared Axis transitions**: Custom navigation animations
- **Lists**: FlatList, SectionList (not virtualized lists from UI libraries)
- **Cards/Containers**: Simple View with NativeWind classes
- **Collapsible screens**: Custom implementations

### Icon Colors

Since lucide-react-native requires actual color values (not className), use inline hex colors:

```tsx
// ✅ CORRECT - Inline hex for icon colors
const PRIMARY_COLOR = '#3B82F6';
<ChevronLeft size={24} color="#111827" />
<Shield size={20} color={PRIMARY_COLOR} />

// ❌ WRONG - Trying to use className on lucide icons
<ChevronLeft size={24} className="text-gray-900" />
```

### Style Props vs className

- **Prefer `className`** for all NativeWind styling
- **Use `style` prop only when necessary**:
  - Dynamic values: `style={{ backgroundColor: dynamicColor }}`
  - Icon colors (lucide-react-native requirement)
  - Animated styles from Reanimated

```tsx
// ✅ CORRECT - NativeWind className + style for dynamic values
<View
  className="flex-1 rounded-xl p-4"
  style={{ backgroundColor: PRIMARY_COLOR + '20' }}
>

// ❌ WRONG - Using style for static values
<View style={{ flex: 1, borderRadius: 12, padding: 16, backgroundColor: '#FFF' }}>
```

## Summary Table

| Use Case | Approach |
|----------|----------|
| Layout, spacing, colors | NativeWind className |
| Buttons | Gluestack `<Button>` |
| Modals/Sheets | Gluestack or gorhom/bottom-sheet |
| Form inputs | Gluestack `<Input>` |
| Toast/Alert | Gluestack Toast |
| Select/Dropdown | Gluestack `<Select>` |
| Cards, containers | React Native `<View>` + NativeWind |
| Lists | React Native `<FlatList>` |
| Animations | Reanimated + NativeWind |
| Icon colors | Inline hex values |

---

```