/**
 * Voice Feature Constants
 *
 * Centralized configuration for voice features (TTS & STT).
 * Used by voiceSettings store, useVoice hook, and voice components.
 */

/**
 * Development API keys - imported from secrets.ts
 * In production, these come from backend system settings.
 */
import {
  DEV_OPENAI_API_KEY as _DEV_OPENAI_API_KEY,
  DEV_GROQ_API_KEY as _DEV_GROQ_API_KEY,
} from './secrets';

// Re-export for other modules
export const DEV_OPENAI_API_KEY = _DEV_OPENAI_API_KEY;
export const DEV_GROQ_API_KEY = _DEV_GROQ_API_KEY;

/**
 * STT Provider - which service to use for speech-to-text
 *
 * Options (in order of preference):
 * 1. 'groq': Groq Whisper (~0.3-0.5s latency, excellent accuracy)
 *    - 10x faster than OpenAI
 *    - Free tier available
 *
 * 2. 'openai': OpenAI Whisper (~2-4s latency, excellent accuracy)
 *    - Most accurate, especially with prompt hints
 *    - Best for specialized vocabulary
 *    - Fallback when Groq is not configured
 */
export type STTProvider = 'openai' | 'groq';
export const DEFAULT_STT_PROVIDER: STTProvider = 'groq'; // Use Groq for faster STT

/**
 * Check if voice features are available in dev mode
 */
export const IS_DEV_VOICE_ENABLED = !!DEV_OPENAI_API_KEY;

/**
 * Default TTS settings
 *
 * Model options:
 * - tts-1: Faster, lower quality (~0.5s latency)
 * - tts-1-hd: Slower, higher quality (~1-2s latency)
 *   Better pronunciation for non-English languages (Indonesian, etc.)
 *
 * Voice options: alloy, echo, fable, onyx, nova, shimmer
 * - nova: Warm, friendly female voice (good for multilingual)
 * - alloy: Neutral, balanced voice
 */
export const DEFAULT_TTS_SETTINGS = {
  voice: 'nova' as const,
  model: 'tts-1-hd' as const, // HD model for better Indonesian pronunciation
  speed: 1.0,
  format: 'opus' as const, // opus is ~50% smaller than mp3
};

/**
 * Default STT settings
 */
export const DEFAULT_STT_SETTINGS = {
  model: 'whisper-1' as const,
  responseFormat: 'json' as const, // json is simpler than verbose_json, saves bandwidth
  temperature: 0,
};

/**
 * Recording preset optimized for speech-to-text
 * Lower quality than HIGH_QUALITY but sufficient for Whisper
 * Results in smaller file sizes and faster uploads
 */
export const STT_RECORDING_OPTIONS = {
  // Whisper works well with 16kHz mono audio
  // Using AAC codec which is smaller than PCM
  extension: '.m4a',
  sampleRate: 16000, // 16kHz is sufficient for speech
  numberOfChannels: 1, // Mono
  bitRate: 64000, // 64kbps is enough for speech
};
