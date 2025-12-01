/**
 * Voice Feature Constants
 *
 * Centralized configuration for voice features (TTS & STT).
 * Uses Google Cloud TTS for text-to-speech and Groq/OpenAI for speech-to-text.
 */

/**
 * Development API keys - imported from secrets.ts
 * In production, these come from backend system settings.
 */
import {
  DEV_GOOGLE_TTS_API_KEY as _DEV_GOOGLE_TTS_API_KEY,
  DEV_GROQ_API_KEY as _DEV_GROQ_API_KEY,
  DEV_OPENAI_API_KEY as _DEV_OPENAI_API_KEY,
} from './secrets';

// Re-export for other modules
export const DEV_GOOGLE_TTS_API_KEY = _DEV_GOOGLE_TTS_API_KEY;
export const DEV_GROQ_API_KEY = _DEV_GROQ_API_KEY;
export const DEV_OPENAI_API_KEY = _DEV_OPENAI_API_KEY;

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
export const IS_DEV_VOICE_ENABLED = !!DEV_GOOGLE_TTS_API_KEY;

/**
 * Google Cloud TTS Voice Types
 *
 * Chirp3-HD voices: Latest generation, most natural and expressive (recommended)
 * WaveNet voices: Neural network-based, high quality
 * Standard voices: Basic, lower quality but faster
 *
 * Voice naming convention:
 * - Chirp3-HD: {language}-{region}-Chirp3-HD-{name}
 * - WaveNet: {language}-{region}-Wavenet-{letter}
 */
export type GoogleTTSVoice =
  // Indonesian Chirp3-HD voices (latest, most natural)
  | 'id-ID-Chirp3-HD-Sulafat'   // Male - warm, conversational (recommended)
  | 'id-ID-Chirp3-HD-Aoede'     // Female - expressive
  | 'id-ID-Chirp3-HD-Puck'      // Male - friendly
  | 'id-ID-Chirp3-HD-Charon'    // Male - deep
  | 'id-ID-Chirp3-HD-Kore'      // Female - gentle
  | 'id-ID-Chirp3-HD-Fenrir'    // Male - energetic
  // English Chirp-HD voices (high quality)
  | 'en-US-Chirp-HD-F'          // Female - natural (recommended)
  | 'en-US-Chirp-HD-D'          // Male - natural
  | 'en-US-Chirp-HD-O'          // Female - expressive
  // English Chirp3-HD voices (latest generation)
  | 'en-US-Chirp3-HD-Despina'   // Female - warm, natural
  | 'en-US-Chirp3-HD-Aoede'     // Female - expressive
  | 'en-US-Chirp3-HD-Puck'      // Male - friendly, conversational
  | 'en-US-Chirp3-HD-Charon'    // Male - deep, authoritative
  | 'en-US-Chirp3-HD-Kore'      // Female - gentle, soothing
  | 'en-US-Chirp3-HD-Fenrir'    // Male - energetic
  | 'en-US-Chirp3-HD-Leda'      // Female - bright
  // Indonesian WaveNet voices (fallback)
  | 'id-ID-Wavenet-A'  // Female
  | 'id-ID-Wavenet-B'  // Female
  | 'id-ID-Wavenet-C'  // Male
  | 'id-ID-Wavenet-D'  // Female
  // English WaveNet voices (fallback)
  | 'en-US-Wavenet-C'  // Female
  | 'en-US-Wavenet-F'  // Female
  | 'en-US-Wavenet-D'  // Male
  | 'en-US-Wavenet-J'; // Male

/**
 * Voice metadata for UI display
 */
export const GOOGLE_TTS_VOICES: Record<GoogleTTSVoice, { label: string; gender: 'female' | 'male'; language: 'id' | 'en' }> = {
  // Indonesian Chirp3-HD (recommended)
  'id-ID-Chirp3-HD-Sulafat': { label: 'Sulafat (ID) ✨', gender: 'male', language: 'id' },
  'id-ID-Chirp3-HD-Aoede': { label: 'Aoede (ID) ✨', gender: 'female', language: 'id' },
  'id-ID-Chirp3-HD-Puck': { label: 'Puck (ID) ✨', gender: 'male', language: 'id' },
  'id-ID-Chirp3-HD-Charon': { label: 'Charon (ID) ✨', gender: 'male', language: 'id' },
  'id-ID-Chirp3-HD-Kore': { label: 'Kore (ID) ✨', gender: 'female', language: 'id' },
  'id-ID-Chirp3-HD-Fenrir': { label: 'Fenrir (ID) ✨', gender: 'male', language: 'id' },
  // English Chirp-HD (recommended)
  'en-US-Chirp-HD-F': { label: 'Chirp F (EN) ✨', gender: 'female', language: 'en' },
  'en-US-Chirp-HD-D': { label: 'Chirp D (EN) ✨', gender: 'male', language: 'en' },
  'en-US-Chirp-HD-O': { label: 'Chirp O (EN) ✨', gender: 'female', language: 'en' },
  // English Chirp3-HD
  'en-US-Chirp3-HD-Despina': { label: 'Despina (EN)', gender: 'female', language: 'en' },
  'en-US-Chirp3-HD-Aoede': { label: 'Aoede (EN)', gender: 'female', language: 'en' },
  'en-US-Chirp3-HD-Puck': { label: 'Puck (EN)', gender: 'male', language: 'en' },
  'en-US-Chirp3-HD-Charon': { label: 'Charon (EN)', gender: 'male', language: 'en' },
  'en-US-Chirp3-HD-Kore': { label: 'Kore (EN)', gender: 'female', language: 'en' },
  'en-US-Chirp3-HD-Fenrir': { label: 'Fenrir (EN)', gender: 'male', language: 'en' },
  'en-US-Chirp3-HD-Leda': { label: 'Leda (EN)', gender: 'female', language: 'en' },
  // Indonesian WaveNet (legacy)
  'id-ID-Wavenet-A': { label: 'Sari (ID)', gender: 'female', language: 'id' },
  'id-ID-Wavenet-B': { label: 'Dewi (ID)', gender: 'female', language: 'id' },
  'id-ID-Wavenet-C': { label: 'Budi (ID)', gender: 'male', language: 'id' },
  'id-ID-Wavenet-D': { label: 'Putri (ID)', gender: 'female', language: 'id' },
  // English WaveNet (legacy)
  'en-US-Wavenet-C': { label: 'Clara (EN)', gender: 'female', language: 'en' },
  'en-US-Wavenet-F': { label: 'Faith (EN)', gender: 'female', language: 'en' },
  'en-US-Wavenet-D': { label: 'David (EN)', gender: 'male', language: 'en' },
  'en-US-Wavenet-J': { label: 'James (EN)', gender: 'male', language: 'en' },
};

/**
 * Default TTS settings for Google Cloud TTS
 *
 * Using Chirp3-HD voices for most natural, expressive speech.
 * These are Google's latest generation voices with superior quality.
 */
export const DEFAULT_TTS_SETTINGS = {
  voice: 'id-ID-Chirp3-HD-Sulafat' as GoogleTTSVoice, // Indonesian - warm, conversational male
  voiceEN: 'en-US-Chirp-HD-F' as GoogleTTSVoice, // English - natural female (Chirp-HD)
  speakingRate: 1.0, // 0.25 to 4.0
  pitch: 0, // -20.0 to 20.0 semitones
  audioEncoding: 'OGG_OPUS' as const, // OGG_OPUS: 40-50% smaller than MP3, lowest latency
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
