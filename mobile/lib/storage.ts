/**
 * MMKV Storage Configuration
 *
 * Centralized storage setup using react-native-mmkv v4 (JSI/NitroModules).
 * Falls back to in-memory storage for Expo Go (development).
 *
 * Provides:
 * - Main MMKV storage instance
 * - Zustand persist storage adapter
 * - React Query persistence setup
 *
 * Benefits over AsyncStorage:
 * - 30x faster read/write operations
 * - Synchronous API (no async/await needed)
 * - Optional encryption support
 * - Multi-process safe
 *
 * Note: In Expo Go, uses in-memory storage (data lost on reload).
 * For production, use EAS build which supports MMKV.
 */

import { StateStorage } from 'zustand/middleware';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Constants from 'expo-constants';

// =============================================================================
// STORAGE INTERFACE
// =============================================================================

interface StorageInterface {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  remove(key: string): void;
  contains(key: string): boolean;
  clearAll(): void;
  getAllKeys(): string[];
}

// =============================================================================
// IN-MEMORY FALLBACK (for Expo Go)
// =============================================================================

class InMemoryStorage implements StorageInterface {
  private store = new Map<string, string | number | boolean>();

  getString(key: string): string | undefined {
    const value = this.store.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  set(key: string, value: string | number | boolean): void {
    this.store.set(key, value);
  }

  getNumber(key: string): number | undefined {
    const value = this.store.get(key);
    return typeof value === 'number' ? value : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.store.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }

  clearAll(): void {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// =============================================================================
// STORAGE FACTORY
// =============================================================================

/**
 * Check if running in Expo Go (development client)
 * Expo Go doesn't support native modules like MMKV
 */
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Create storage instance - MMKV v4 for production builds, in-memory for Expo Go
 */
function createStorage(id: string, encryptionKey?: string): StorageInterface {
  if (isExpoGo) {
    console.log(`[Storage] Using in-memory storage for ${id} (Expo Go mode)`);
    return new InMemoryStorage();
  }

  try {
    // MMKV v4 uses createMMKV (JSI-based via NitroModules)
    const { createMMKV } = require('react-native-mmkv');
    return createMMKV({ id, encryptionKey });
  } catch (error) {
    console.warn(`[Storage] MMKV not available, using in-memory fallback for ${id}`);
    return new InMemoryStorage();
  }
}

// =============================================================================
// MMKV INSTANCES
// =============================================================================

/**
 * Main storage instance for general app data
 * Used by Zustand stores and React Query cache
 */
export const storage: StorageInterface = createStorage('faithflow-storage');

/**
 * Separate instance for sensitive data (encrypted)
 * Note: For truly sensitive data like JWT, continue using SecureStore
 */
export const secureStorage: StorageInterface = createStorage(
  'faithflow-secure',
  'faithflow-encryption-key-v1'
);

// =============================================================================
// ZUSTAND STORAGE ADAPTER
// =============================================================================

/**
 * Zustand storage adapter for MMKV
 * Drop-in replacement for AsyncStorage in Zustand persist middleware
 *
 * Usage:
 * ```ts
 * import { mmkvStorage } from '@/lib/storage';
 *
 * const useStore = create(
 *   persist(
 *     (set, get) => ({ ... }),
 *     {
 *       name: 'store-name',
 *       storage: createJSONStorage(() => mmkvStorage),
 *     }
 *   )
 * );
 * ```
 */
export const mmkvStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.remove(name);
  },
};

// =============================================================================
// REACT QUERY PERSISTENCE
// =============================================================================

/**
 * Storage interface for React Query's sync storage persister
 * Compatible with @tanstack/query-sync-storage-persister
 */
export const queryStorage = {
  getItem: (key: string): string | null => {
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    storage.set(key, value);
  },
  removeItem: (key: string): void => {
    storage.remove(key);
  },
};

/**
 * React Query Persister using MMKV
 *
 * Enables offline-first data persistence for React Query.
 * Cache is automatically restored on app launch.
 *
 * Filtering Strategy:
 * - Persist: explore content, events, Bible data (offline-first)
 * - Skip: auth tokens, real-time data, companion chat (ephemeral)
 *
 * Usage in app layout:
 * ```tsx
 * import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
 * import { queryPersister } from '@/lib/storage';
 *
 * <PersistQueryClientProvider
 *   client={queryClient}
 *   persistOptions={{
 *     persister: queryPersister,
 *     dehydrateOptions: {
 *       shouldDehydrateQuery: (query) => {
 *         // Filter which queries to persist
 *         const key = query.queryKey[0] as string;
 *         // Persist these query types
 *         const persistKeys = ['explore', 'events', 'bible', 'community', 'give'];
 *         return persistKeys.some(k => key?.startsWith?.(k));
 *       },
 *     },
 *   }}
 * >
 *   {children}
 * </PersistQueryClientProvider>
 * ```
 */
export const queryPersister = createSyncStoragePersister({
  storage: queryStorage,
  key: 'faithflow-query-cache',
  // Throttle writes to improve performance
  throttleTime: 1000,
});

/**
 * Query persistence filter - determines which queries to persist
 * Returns true if the query should be persisted
 */
export const shouldPersistQuery = (queryKey: readonly unknown[]): boolean => {
  const key = queryKey[0] as string;
  if (!key || typeof key !== 'string') return false;

  // Persist these query prefixes (offline-first content)
  const persistKeys = [
    'explore',     // Daily devotions, verses, quizzes
    'events',      // Church events
    'bible',       // Bible data
    'community',   // Community/group data
    'give',        // Giving/donation history
    'church',      // Church settings
  ];

  // Skip these (ephemeral/sensitive data)
  const skipKeys = [
    'auth',        // Auth tokens
    'user',        // User session data
    'companion',   // AI chat (handled by Zustand)
    'mqtt',        // Real-time messaging
    'call',        // Call signaling
  ];

  // Check skip list first
  if (skipKeys.some((k) => key.startsWith(k))) return false;

  // Check persist list
  return persistKeys.some((k) => key.startsWith(k));
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clear all data from main storage
 * Useful for logout or reset scenarios
 */
export function clearAllStorage(): void {
  storage.clearAll();
}

/**
 * Get all keys in main storage
 * Useful for debugging
 */
export function getAllStorageKeys(): string[] {
  return storage.getAllKeys();
}

/**
 * Direct MMKV access for non-Zustand usage
 * Prefer Zustand stores when possible for better state management
 */
export const mmkv = {
  // String operations
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),

  // Number operations
  getNumber: (key: string): number | undefined => storage.getNumber(key),
  setNumber: (key: string, value: number): void => storage.set(key, value),

  // Boolean operations
  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean): void => storage.set(key, value),

  // Object operations (JSON serialized)
  getObject: <T>(key: string): T | undefined => {
    const value = storage.getString(key);
    if (!value) return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  },
  setObject: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  // Remove and check
  delete: (key: string): void => { storage.remove(key); },
  remove: (key: string): void => { storage.remove(key); },
  contains: (key: string): boolean => storage.contains(key),
};

export default storage;
