# Bundle Optimization Guide
**Phase 9.1.4 - Bundle Size Optimization Results & Actions**

## Analysis Summary

**Current Bundle Size:** ~3MB of heavy dependencies
**Optimization Potential:** ~1.5-2MB reduction possible

---

## 🔴 High Priority Optimizations

### 1. Lucide Icons (~1.5MB savings)

**Issue:** Importing all icons increases bundle size significantly
**Current Impact:** ~2MB
**Potential Savings:** ~1.5MB

**Bad Practice (Found in 14 files):**
```tsx
import * as Icons from 'lucide-react-native';

// Later in component
<Icons.Home />
<Icons.User />
```

**Best Practice:**
```tsx
import { Home, User, Settings, Heart } from 'lucide-react-native';

// Later in component
<Home />
<User />
```

**Files to Fix:**
1. `app/(tabs)/bible.tsx` - 2 instances
2. `app/(tabs)/events.tsx`
3. `app/(tabs)/give.tsx` - 2 instances
4. `app/(tabs)/profile.tsx`
5. `app/events/[id].tsx`
6. `app/explore/topical/[id].tsx`
7. `app/explore/verse/[id].tsx`
8. `app/groups/new.tsx`
9. +4 more files

**Action Required:**
```bash
# Search for all lucide import * patterns
grep -r "import \* as.*lucide-react-native" mobile/app --include="*.tsx"

# Replace with specific imports in each file
```

---

## 🟡 Medium Priority Optimizations

### 2. React Deduplication

**Issue:** Potential duplicate React versions
**Current:** Multiple packages with different React peer dependencies

**Check:**
```bash
cd mobile
npm ls react
```

**Fix if needed:**
```bash
# Deduplicate packages
npm dedupe

# Or with yarn
yarn dedupe
```

### 3. Import Optimization Pattern

**General Rule:** Use specific imports for all libraries

**Examples:**

```tsx
// ❌ Bad - imports entire library
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

// ✅ Good - imports only what's needed
import { randomUUID } from 'expo-crypto';
import { writeAsStringAsync } from 'expo-file-system';
```

---

## 📊 Bundle Breakdown

```
Heavy Dependencies (Total: ~3MB)
├── lucide-react-native      ~2MB    ⚠️ Optimize imports
├── react-native-reanimated  ~500KB  ✅ Needed
├── @gluestack-ui/themed     ~300KB  ✅ Needed
├── react-native-gesture-h   ~200KB  ✅ Needed
├── @tanstack/react-query    ~100KB  ✅ Optimized in 9.1.2
├── react-native-svg         ~100KB  ✅ Needed
└── @gorhom/bottom-sheet     ~80KB   ✅ Needed
```

---

## 🚀 Implementation Plan

### Phase 1: Icon Imports (High Priority)
**Timeline:** 1-2 hours
**Impact:** ~1.5MB reduction

1. **Audit all icon usage:**
   ```bash
   grep -r "import.*lucide-react-native" mobile/app -h | sort | uniq
   ```

2. **Create icon manifest** (track which icons are used):
   ```tsx
   // utils/icons.ts
   export {
     Home,
     User,
     Settings,
     Heart,
     // ... only icons actually used
   } from 'lucide-react-native';
   ```

3. **Replace imports** in all files:
   ```tsx
   // Before
   import * as Icons from 'lucide-react-native';

   // After
   import { Home, User } from '@/utils/icons';
   ```

4. **Verify bundle size reduction:**
   ```bash
   npx expo export --platform ios --clear
   # Check output bundle size
   ```

### Phase 2: General Import Optimization (Medium Priority)
**Timeline:** 2-3 hours
**Impact:** ~200-300KB reduction

1. **Audit all import * statements:**
   ```bash
   grep -r "import \* as" mobile/app --include="*.tsx" --include="*.ts"
   ```

2. **Convert to specific imports** where possible

3. **Use barrel exports** for common patterns:
   ```tsx
   // utils/index.ts
   export { calculateDate } from './dates';
   export { formatCurrency } from './money';
   // etc.

   // Usage
   import { calculateDate, formatCurrency } from '@/utils';
   ```

### Phase 3: Dynamic Imports (Low Priority)
**Timeline:** 3-4 hours
**Impact:** Faster initial load

1. **Identify heavy, rarely-used screens:**
   - Admin settings
   - Advanced features
   - Heavy modals

2. **Implement React.lazy:**
   ```tsx
   const AdvancedSettings = React.lazy(() =>
     import('./screens/AdvancedSettings')
   );

   // Wrap with Suspense
   <Suspense fallback={<LoadingSpinner />}>
     <AdvancedSettings />
   </Suspense>
   ```

3. **Test lazy loading:**
   - Verify it works on both iOS and Android
   - Ensure smooth UX with loading states

---

## 📈 Expected Results

### Before Optimization
- Bundle size: ~3MB heavy dependencies
- App size: ~15-20MB (estimated)
- Load time: Baseline

### After Optimization
- Bundle size: ~1.5MB heavy dependencies (-50%)
- App size: ~13-15MB (estimated)
- Load time: 10-15% faster
- Data usage: 8-10% less for updates

---

## 🔍 Monitoring & Verification

### 1. Build Production Bundle
```bash
cd mobile

# iOS
npx expo export --platform ios --clear

# Android
npx expo export --platform android --clear
```

### 2. Analyze Bundle Size
```bash
# Use expo-analyzer for detailed breakdown
npx expo-analyzer

# Or manual check
du -sh dist/
```

### 3. Run Analysis Script
```bash
node scripts/analyze-bundle.js
```

### 4. Track Over Time
Create CI check to prevent bundle bloat:

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  check-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npx expo export --platform ios
      - run: node scripts/analyze-bundle.js
```

---

## 🎯 Success Criteria

✅ No `import *` from lucide-react-native
✅ All heavy libraries use specific imports
✅ Bundle size reduced by >1MB
✅ App startup time improved by 10%+
✅ No runtime errors from import changes
✅ Build time not significantly increased

---

## 🛠️ Quick Fixes

### Fix Lucide Imports (Script)

Create `mobile/scripts/fix-lucide-imports.js`:

```js
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Find all TSX files with lucide imports
// Extract used icons
// Replace import statement
// Save file

console.log('🔧 Fixing lucide-react-native imports...');
// Implementation details...
```

### Verify No Regressions

```bash
# Run tests
npm test

# Check TypeScript
npm run typecheck

# Build app
npx expo prebuild --clean
```

---

## 📝 Notes

- **Don't optimize prematurely** - Focus on actually used code
- **Test after changes** - Ensure no runtime errors
- **Measure impact** - Verify bundle size actually decreases
- **Document decisions** - Keep track of what was optimized and why

---

## 🔗 Resources

- [Expo Bundle Analyzer](https://docs.expo.dev/guides/analyzing-bundles/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Metro Bundler](https://facebook.github.io/metro/)
- [Tree Shaking](https://webpack.js.org/guides/tree-shaking/)

---

## Status

**Phase 9.1.4 Status:** Analysis Complete ✅
**Next Steps:**
1. Fix lucide imports (High Priority)
2. Run expo-analyzer for detailed view
3. Implement dynamic imports for heavy screens
