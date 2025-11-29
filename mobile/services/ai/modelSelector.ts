/**
 * Model Selector
 *
 * Dynamically selects the optimal Claude model based on intent.
 * Three-tier system for optimal cost/latency/quality balance:
 * - Haiku: Simple greetings, acknowledgments (~50-100ms)
 * - Sonnet: Standard conversations, pastoral care (~300-500ms)
 * - Opus: Complex theology, apologetics (~500-1000ms)
 */

import type { Intent } from './intentClassifier';

// Available models with their characteristics
export const MODELS = {
  // Fast & cheap - greetings, simple acknowledgments
  HAIKU: 'claude-3-5-haiku-20241022',
  // Balanced - most conversations, pastoral care
  SONNET: 'claude-sonnet-4-5-20250929',
  // Powerful - scholarly exegesis, apologetics debates
  OPUS: 'claude-opus-4-20250514',
} as const;

// Model metadata for logging/analytics
export const MODEL_INFO = {
  [MODELS.HAIKU]: { name: 'Haiku', tier: 'fast', avgLatency: '100ms' },
  [MODELS.SONNET]: { name: 'Sonnet', tier: 'balanced', avgLatency: '400ms' },
  [MODELS.OPUS]: { name: 'Opus', tier: 'powerful', avgLatency: '800ms' },
} as const;

/**
 * Get optimal model for the given intent
 * Returns the most appropriate model balancing speed, cost, and capability
 */
export function getModelForIntent(intent: Intent): string {
  switch (intent) {
    // ⚡ Haiku - instant responses for simple interactions
    case 'simple':
      return MODELS.HAIKU;

    // 🧠 Opus - complex reasoning requiring deep knowledge
    case 'scholarly':
    case 'apologetics':
      return MODELS.OPUS;

    // 💝 Sonnet - balanced for emotional/pastoral care
    case 'pastoral':
    case 'devotional':
    case 'other_religions':
    case 'general_faith':
      return MODELS.SONNET;

    // 🚨 Crisis - Sonnet for reliable, empathetic safety responses
    case 'crisis':
      return MODELS.SONNET;

    default:
      return MODELS.SONNET;
  }
}

/**
 * Get model info for logging/analytics
 */
export function getModelInfo(model: string) {
  return MODEL_INFO[model as keyof typeof MODEL_INFO] || { name: 'Unknown', tier: 'unknown', avgLatency: 'N/A' };
}

export default getModelForIntent;
