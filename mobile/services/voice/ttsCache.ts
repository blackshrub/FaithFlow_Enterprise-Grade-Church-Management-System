/**
 * TTS Audio Cache Service
 *
 * Caches TTS audio files locally to avoid redundant API calls.
 * Perfect for daily content like devotions and verse of the day
 * that remain valid for 24 hours.
 *
 * Cache Strategy:
 * - First user to play triggers the cache
 * - Subsequent users get instant playback from cache
 * - Cache expires based on content type (24h for daily content)
 * - Manual cache invalidation supported
 */

import {
  cacheDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  makeDirectoryAsync,
} from 'expo-file-system';

// Cache directory
const TTS_CACHE_DIR = `${cacheDirectory}tts_cache/`;

// Cache metadata file
const CACHE_METADATA_FILE = `${TTS_CACHE_DIR}metadata.json`;

interface CacheEntry {
  /** Unique cache key */
  key: string;
  /** Path to cached audio file */
  filePath: string;
  /** Timestamp when cached */
  cachedAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Content type for categorization */
  contentType: 'devotion' | 'verse' | 'figure' | 'general';
  /** Optional content ID for invalidation */
  contentId?: string;
}

interface CacheMetadata {
  entries: Record<string, CacheEntry>;
  lastCleanup: number;
}

// In-memory metadata cache
let metadataCache: CacheMetadata | null = null;

/**
 * Initialize cache directory
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await getInfoAsync(TTS_CACHE_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(TTS_CACHE_DIR, { intermediates: true });
  }
}

/**
 * Load cache metadata from disk
 */
async function loadMetadata(): Promise<CacheMetadata> {
  if (metadataCache) return metadataCache;

  try {
    await ensureCacheDir();
    const info = await getInfoAsync(CACHE_METADATA_FILE);
    if (info.exists) {
      const content = await readAsStringAsync(CACHE_METADATA_FILE);
      metadataCache = JSON.parse(content);
      return metadataCache!;
    }
  } catch (error) {
    console.warn('[TTSCache] Failed to load metadata:', error);
  }

  // Initialize empty metadata
  metadataCache = { entries: {}, lastCleanup: Date.now() };
  return metadataCache;
}

/**
 * Save cache metadata to disk
 */
async function saveMetadata(metadata: CacheMetadata): Promise<void> {
  try {
    await ensureCacheDir();
    await writeAsStringAsync(CACHE_METADATA_FILE, JSON.stringify(metadata));
    metadataCache = metadata;
  } catch (error) {
    console.error('[TTSCache] Failed to save metadata:', error);
  }
}

/**
 * Generate cache key from text and options
 */
function generateCacheKey(
  text: string,
  voice: string,
  model: string,
  speed: number
): string {
  // Simple hash for the key
  let hash = 0;
  const combined = `${text}|${voice}|${model}|${speed}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `tts_${Math.abs(hash).toString(36)}`;
}

/**
 * Generate date-based cache key for daily content
 * This ensures same content gets same key for the day
 */
export function generateDailyCacheKey(
  contentType: 'devotion' | 'verse' | 'figure',
  contentId: string,
  voice: string,
  model: string,
  speed: number
): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${contentType}_${contentId}_${today}_${voice}_${model}_${speed}`;
}

/**
 * Get expiration time based on content type
 */
function getExpirationMs(contentType: CacheEntry['contentType']): number {
  switch (contentType) {
    case 'devotion':
    case 'verse':
      // 24 hours for daily content
      return 24 * 60 * 60 * 1000;
    case 'figure':
      // 7 days for bible figures (don't change often)
      return 7 * 24 * 60 * 60 * 1000;
    case 'general':
    default:
      // 1 hour for general content
      return 60 * 60 * 1000;
  }
}

/**
 * Check if cached audio exists and is valid
 */
export async function getCachedAudio(cacheKey: string): Promise<string | null> {
  try {
    const metadata = await loadMetadata();
    const entry = metadata.entries[cacheKey];

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      console.log('[TTSCache] Cache expired for:', cacheKey);
      await removeCacheEntry(cacheKey);
      return null;
    }

    // Check if file still exists
    const fileInfo = await getInfoAsync(entry.filePath);
    if (!fileInfo.exists) {
      console.log('[TTSCache] Cache file missing for:', cacheKey);
      await removeCacheEntry(cacheKey);
      return null;
    }

    console.log('[TTSCache] Cache hit for:', cacheKey);
    return entry.filePath;
  } catch (error) {
    console.error('[TTSCache] Error checking cache:', error);
    return null;
  }
}

/**
 * Store audio in cache
 */
export async function cacheAudio(
  cacheKey: string,
  audioBase64: string,
  format: string,
  contentType: CacheEntry['contentType'],
  contentId?: string
): Promise<string> {
  try {
    await ensureCacheDir();

    const filePath = `${TTS_CACHE_DIR}${cacheKey}.${format}`;
    const now = Date.now();
    const expiresAt = now + getExpirationMs(contentType);

    // Write audio file
    await writeAsStringAsync(filePath, audioBase64, {
      encoding: 'base64',
    });

    // Update metadata
    const metadata = await loadMetadata();
    metadata.entries[cacheKey] = {
      key: cacheKey,
      filePath,
      cachedAt: now,
      expiresAt,
      contentType,
      contentId,
    };
    await saveMetadata(metadata);

    console.log('[TTSCache] Cached audio:', cacheKey, 'expires:', new Date(expiresAt).toISOString());
    return filePath;
  } catch (error) {
    console.error('[TTSCache] Error caching audio:', error);
    throw error;
  }
}

/**
 * Remove a cache entry
 */
async function removeCacheEntry(cacheKey: string): Promise<void> {
  try {
    const metadata = await loadMetadata();
    const entry = metadata.entries[cacheKey];

    if (entry) {
      // Delete file
      try {
        await deleteAsync(entry.filePath, { idempotent: true });
      } catch {
        // Ignore file deletion errors
      }

      // Remove from metadata
      delete metadata.entries[cacheKey];
      await saveMetadata(metadata);
    }
  } catch (error) {
    console.error('[TTSCache] Error removing cache entry:', error);
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const metadata = await loadMetadata();
    const now = Date.now();
    let removedCount = 0;

    // Only cleanup once per hour
    if (now - metadata.lastCleanup < 60 * 60 * 1000) {
      return 0;
    }

    for (const [key, entry] of Object.entries(metadata.entries)) {
      if (now > entry.expiresAt) {
        await removeCacheEntry(key);
        removedCount++;
      }
    }

    metadata.lastCleanup = now;
    await saveMetadata(metadata);

    console.log('[TTSCache] Cleaned up', removedCount, 'expired entries');
    return removedCount;
  } catch (error) {
    console.error('[TTSCache] Error during cleanup:', error);
    return 0;
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    await deleteAsync(TTS_CACHE_DIR, { idempotent: true });
    metadataCache = null;
    console.log('[TTSCache] All cache cleared');
  } catch (error) {
    console.error('[TTSCache] Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entryCount: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}> {
  try {
    const metadata = await loadMetadata();
    const entries = Object.values(metadata.entries);

    if (entries.length === 0) {
      return { entryCount: 0, oldestEntry: null, newestEntry: null };
    }

    const cachedAts = entries.map((e) => e.cachedAt);
    return {
      entryCount: entries.length,
      oldestEntry: Math.min(...cachedAts),
      newestEntry: Math.max(...cachedAts),
    };
  } catch {
    return { entryCount: 0, oldestEntry: null, newestEntry: null };
  }
}

export default {
  getCachedAudio,
  cacheAudio,
  generateDailyCacheKey,
  cleanupExpiredCache,
  clearAllCache,
  getCacheStats,
};
