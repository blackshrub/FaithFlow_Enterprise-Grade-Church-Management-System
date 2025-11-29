/**
 * Context Builder
 *
 * Builds minimal context for API calls to reduce latency.
 */

import type { Intent } from './intentClassifier';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build minimal context based on intent
 * Keeps token count low for faster responses
 */
export function buildContext(
  systemPrompt: string,
  userInput: string,
  intent: Intent
): Message[] {
  // Add intent-specific context hints
  const intentHints: Record<Intent, string> = {
    pastoral: '\n\n[MODE: PASTORAL - Be gentle, empathetic, validate feelings first]',
    scholarly: '\n\n[MODE: SCHOLARLY - Be precise, cite Scripture, use theological terms]',
    devotional: '\n\n[MODE: DEVOTIONAL - Be warm, prayerful, encouraging]',
    apologetics: '\n\n[MODE: APOLOGETICS - Be logical, charitable, well-reasoned]',
    other_religions: '\n\n[MODE: INTERFAITH - Be respectful, informative, non-confrontational]',
    general_faith: '',
    crisis: '\n\n[MODE: CRISIS - Safety first, provide resources, do not continue normal discussion]',
  };

  const enhancedSystemPrompt = systemPrompt + (intentHints[intent] || '');

  return [
    { role: 'system', content: enhancedSystemPrompt },
    { role: 'user', content: userInput },
  ];
}

export default buildContext;
