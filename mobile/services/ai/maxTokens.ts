/**
 * Max Tokens Configuration
 *
 * Controls output length based on intent for speed optimization.
 */

import type { Intent } from './intentClassifier';

/**
 * Get optimal max tokens for the given intent
 */
export function getMaxTokens(intent: Intent): number {
  switch (intent) {
    // ⚡ Simple - very short responses for instant feel
    case 'simple':
      return 150; // Quick greeting/acknowledgment

    // Longer responses for depth
    case 'scholarly':
      return 3000; // Deep theological analysis

    case 'apologetics':
      return 2500; // Thorough defense

    // Medium responses
    case 'pastoral':
      return 1500; // Empathetic but focused

    case 'general_faith':
      return 1500; // Standard length

    case 'other_religions':
      return 2000; // Careful explanation

    // Shorter responses
    case 'devotional':
      return 1000; // Warm but concise

    case 'crisis':
      return 800; // Direct safety response

    default:
      return 1500;
  }
}

export default getMaxTokens;
