# Mobile App Performance Optimizations

## Nitro Modules / JSI Usage

The app leverages Nitro Modules through the following libraries:

### 1. react-native-mmkv (v4)
**Location:** `lib/storage.ts`

MMKV v4 uses Nitro Modules/JSI internally for synchronous, high-performance storage:
- **30x faster** than AsyncStorage
- Synchronous API (no async/await overhead)
- Optional encryption support
- Multi-process safe

```typescript
// Usage example
import { storage } from '@/lib/storage';
storage.set('key', 'value');  // Synchronous!
const value = storage.getString('key');
```

### 2. react-native-reanimated
Uses JSI for 60fps animations running on the UI thread.

### 3. react-native-gesture-handler
Uses JSI for gesture recognition running on the UI thread.

## Expo SDK 54 Features

### TurboModules (Enabled)
```json
// app.json
{
  "expo": {
    "experiments": {
      "turboModules": true
    }
  }
}
```

TurboModules provides:
- Lazy loading of native modules
- Type-safe native module bindings
- Reduced app startup time

### New Architecture (Fabric)
Currently **not enabled** as it requires:
- EAS Build (not Expo Go compatible)
- All native dependencies to support new architecture

To enable in production:
```json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

## Additional Performance Features

### 1. Zustand with MMKV Persistence
All Zustand stores use MMKV for instant persistence:
```typescript
persist(storeCreator, {
  name: 'store-name',
  storage: zustandStorage,  // Uses MMKV
});
```

### 2. React Query with MMKV Cache
React Query data is persisted to MMKV for offline support and faster app restarts.

### 3. Optimized List Rendering
- `FlatList` with `removeClippedSubviews`
- `getItemLayout` for known-height items
- `keyExtractor` for stable keys

## Future Nitro Modules Opportunities

If custom native performance is needed, consider:

1. **Image Processing** - Create Nitro Module for heavy image operations
2. **Crypto Operations** - Custom JSI bindings for crypto
3. **Database Operations** - Direct SQLite JSI bindings

For most use cases, the current Expo + MMKV + Reanimated stack provides excellent performance without custom Nitro Modules.
