/**
 * Offline Sync Manager
 *
 * Provides offline-first data synchronization:
 * - Queue mutations when offline
 * - Sync when back online
 * - Conflict resolution
 * - IndexedDB persistence
 *
 * Works with the Service Worker background sync API.
 */

const DB_NAME = 'faithflow-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-mutations';

let db = null;

/**
 * Initialize IndexedDB for offline storage
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for pending mutations
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('endpoint', 'endpoint');
        store.createIndex('status', 'status');
      }
    };
  });
}

/**
 * Queue a mutation for offline sync
 * @param {Object} mutation - Mutation details
 * @param {string} mutation.endpoint - API endpoint
 * @param {string} mutation.method - HTTP method
 * @param {Object} mutation.body - Request body
 * @param {Object} mutation.meta - Additional metadata
 */
export async function queueMutation(mutation) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      ...mutation,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    };

    const request = store.add(record);

    request.onsuccess = () => {
      resolve(request.result);

      // Request background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('faithflow-sync');
        });
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark mutation as completed
 */
export async function completeMutation(id) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark mutation as failed
 */
export async function failMutation(id, error) {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.status = record.retries >= 3 ? 'failed' : 'pending';
        record.retries++;
        record.lastError = error;
        store.put(record);
      }
      resolve();
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Process pending mutations (called when back online)
 */
export async function processPendingMutations(authToken) {
  const pending = await getPendingMutations();

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const mutation of pending) {
    try {
      const response = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(mutation.body),
      });

      if (response.ok) {
        await completeMutation(mutation.id);
        results.success++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      await failMutation(mutation.id, error.message);
      results.failed++;
      results.errors.push({
        id: mutation.id,
        endpoint: mutation.endpoint,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Clear all pending mutations
 */
export async function clearPendingMutations() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of pending mutations
 */
export async function getPendingCount() {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Hook into online/offline events
 */
export function setupOfflineSync(authTokenGetter) {
  // Process pending when coming back online
  window.addEventListener('online', async () => {
    const token = authTokenGetter();
    if (token) {
      const results = await processPendingMutations(token);
      if (results.success > 0) {
        // Dispatch custom event for UI notification
        window.dispatchEvent(
          new CustomEvent('offlineSync', {
            detail: { results },
          })
        );
      }
    }
  });
}

export default {
  queueMutation,
  getPendingMutations,
  completeMutation,
  failMutation,
  processPendingMutations,
  clearPendingMutations,
  getPendingCount,
  setupOfflineSync,
};
