/**
 * Prompt Cache Manager
 *
 * Implements Anthropic's prompt caching for faster responses.
 * Static system prompts are cached for up to 5 minutes.
 *
 * Benefits:
 * - First request: normal latency
 * - Subsequent requests: ~2x faster (cached prompt skip)
 * - Reduced token costs (cached tokens are cheaper)
 *
 * How it works:
 * - System prompt marked with cache_control: { type: "ephemeral" }
 * - Anthropic caches the prompt on their servers
 * - Subsequent requests reuse cached prompt
 */

export interface CacheableMessage {
  role: 'user' | 'assistant';
  content: string | CacheableContent[];
}

export interface CacheableContent {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface CacheableSystemPrompt {
  type: 'text';
  text: string;
  cache_control: { type: 'ephemeral' };
}

/**
 * Wrap system prompt with cache control
 * This tells Anthropic to cache this prompt for subsequent requests
 */
export function createCacheableSystemPrompt(systemPrompt: string): CacheableSystemPrompt[] {
  return [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/**
 * Check if system prompt should use caching
 * Only cache prompts that are:
 * - Longer than 1024 tokens (minimum for caching benefit)
 * - Static/reusable across requests
 */
export function shouldUsePromptCache(systemPrompt: string): boolean {
  // Rough token estimate: 1 token ≈ 4 characters
  const estimatedTokens = Math.ceil(systemPrompt.length / 4);

  // Anthropic requires minimum 1024 tokens for caching to be effective
  // But we use 512 as threshold since our prompts are valuable to cache
  return estimatedTokens >= 512;
}

/**
 * Build request body with prompt caching enabled
 */
export function buildCachedRequestBody(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    max_tokens: number;
    temperature: number;
    stream?: boolean;
  }
): Record<string, unknown> {
  const useCache = shouldUsePromptCache(systemPrompt);

  return {
    model,
    max_tokens: options.max_tokens,
    temperature: options.temperature,
    stream: options.stream ?? true,
    // Use array format for system to enable caching
    system: useCache
      ? createCacheableSystemPrompt(systemPrompt)
      : systemPrompt,
    messages,
  };
}

/**
 * Parse cache performance from response headers
 */
export interface CacheStats {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  wasCacheHit: boolean;
}

export function parseCacheStats(headers: Headers | Record<string, string>): CacheStats | null {
  try {
    const getHeader = (name: string): string | null => {
      if (headers instanceof Headers) {
        return headers.get(name);
      }
      return headers[name] || null;
    };

    const creationTokens = parseInt(getHeader('anthropic-cache-creation-input-tokens') || '0', 10);
    const readTokens = parseInt(getHeader('anthropic-cache-read-input-tokens') || '0', 10);

    return {
      cacheCreationInputTokens: creationTokens,
      cacheReadInputTokens: readTokens,
      wasCacheHit: readTokens > 0,
    };
  } catch {
    return null;
  }
}

/**
 * Log cache performance (for debugging)
 */
export function logCachePerformance(stats: CacheStats | null): void {
  if (!stats) {
    console.log('[PromptCache] No cache stats available');
    return;
  }

  if (stats.wasCacheHit) {
    console.log(`[PromptCache] ✓ Cache HIT - ${stats.cacheReadInputTokens} tokens read from cache`);
  } else if (stats.cacheCreationInputTokens > 0) {
    console.log(`[PromptCache] ○ Cache CREATED - ${stats.cacheCreationInputTokens} tokens cached for next request`);
  } else {
    console.log('[PromptCache] - No caching (prompt too short)');
  }
}

export default {
  createCacheableSystemPrompt,
  shouldUsePromptCache,
  buildCachedRequestBody,
  parseCacheStats,
  logCachePerformance,
};
