/**
 * Temperature Configuration
 *
 * Dynamically adjusts temperature based on intent for optimal responses.
 * Lower = more focused/precise, Higher = more creative/warm
 */

import type { Intent } from './intentClassifier';

/**
 * Get optimal temperature for the given intent
 */
export function getTemperature(intent: Intent): number {
  switch (intent) {
    // ⚡ Simple - friendly but consistent greetings
    case 'simple':
      return 0.6; // Warm, natural greetings

    // Low temperature for precision
    case 'scholarly':
      return 0.2; // Crisp, logical, accurate

    case 'crisis':
      return 0.1; // Very stable, safe responses

    case 'apologetics':
      return 0.35; // Firm yet respectful

    // Medium temperature for balance
    case 'pastoral':
      return 0.3; // Gentle, stable, safe

    case 'general_faith':
      return 0.4; // Balanced

    case 'other_religions':
      return 0.3; // Careful, respectful

    // Higher temperature for warmth
    case 'devotional':
      return 0.5; // Warm, expressive

    default:
      return 0.4;
  }
}

export default getTemperature;
