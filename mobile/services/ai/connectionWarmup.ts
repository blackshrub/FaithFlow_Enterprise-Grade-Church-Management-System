/**
 * Connection Warm-up Service
 *
 * Pre-establishes connection to Anthropic API for faster first response.
 * Call warmupConnection() when user opens chat screen (before they type).
 *
 * Benefits:
 * - DNS resolution done ahead of time
 * - TLS handshake completed
 * - Connection pool ready
 * - First actual message feels instant
 *
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   // Warm up when chat screen mounts
 *   warmupConnection();
 * }, []);
 * ```
 */

// Connection state
let isWarmedUp = false;
let warmupPromise: Promise<void> | null = null;
let lastWarmupTime: number = 0;

// Warmup expires after 4 minutes (connections may close after 5 min idle)
const WARMUP_TTL_MS = 4 * 60 * 1000;

/**
 * Pre-warm connection to Anthropic API
 * Safe to call multiple times - will only execute once per TTL period
 */
export async function warmupConnection(): Promise<void> {
  const now = Date.now();

  // Already warmed up and still fresh
  if (isWarmedUp && now - lastWarmupTime < WARMUP_TTL_MS) {
    console.log('[ConnectionWarmup] Already warm, skipping');
    return;
  }

  // Warmup in progress
  if (warmupPromise) {
    console.log('[ConnectionWarmup] Warmup in progress, waiting...');
    return warmupPromise;
  }

  console.log('[ConnectionWarmup] Starting connection warmup...');

  warmupPromise = performWarmup();

  try {
    await warmupPromise;
    isWarmedUp = true;
    lastWarmupTime = now;
    console.log('[ConnectionWarmup] ✓ Connection warmed up');
  } catch (error) {
    console.warn('[ConnectionWarmup] Warmup failed (non-blocking):', error);
    // Don't throw - warmup failure shouldn't break the app
  } finally {
    warmupPromise = null;
  }
}

/**
 * Perform the actual warmup request
 * Uses HEAD request to minimize data transfer
 */
async function performWarmup(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    // Simple HEAD request to establish connection
    // This triggers DNS resolution + TLS handshake without full API call
    await fetch('https://api.anthropic.com/v1/messages', {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'anthropic-version': '2023-06-01',
      },
    });
  } catch (error: unknown) {
    // 405 Method Not Allowed is expected (API doesn't support HEAD)
    // But connection is still warmed up!
    if (error instanceof Error && error.name !== 'AbortError') {
      // Connection established even if request failed
      return;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if connection is currently warm
 */
export function isConnectionWarm(): boolean {
  if (!isWarmedUp) return false;
  return Date.now() - lastWarmupTime < WARMUP_TTL_MS;
}

/**
 * Reset warmup state (for testing or reconnection)
 */
export function resetWarmup(): void {
  isWarmedUp = false;
  lastWarmupTime = 0;
  warmupPromise = null;
}

/**
 * Get time until warmup expires (ms)
 * Returns 0 if not warmed up or expired
 */
export function getWarmupTimeRemaining(): number {
  if (!isWarmedUp) return 0;
  const remaining = WARMUP_TTL_MS - (Date.now() - lastWarmupTime);
  return Math.max(0, remaining);
}

export default {
  warmupConnection,
  isConnectionWarm,
  resetWarmup,
  getWarmupTimeRemaining,
};
