/**
 * Speech Service - OpenAI TTS Integration
 *
 * Converts text to natural-sounding speech using OpenAI's TTS API.
 * Supports bilingual (English/Indonesian) with automatic voice selection.
 *
 * Uses expo-audio for playback.
 *
 * Models:
 * - tts-1: Standard quality, faster, lower cost
 * - tts-1-hd: Higher quality, slower, higher cost
 *
 * Voices:
 * - alloy: Neutral, balanced
 * - echo: Warm, conversational
 * - fable: Expressive, storytelling
 * - onyx: Deep, authoritative
 * - nova: Friendly, upbeat
 * - shimmer: Soft, gentle
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
// Use legacy API for file system operations (v54+ deprecated the main API)
import * as FileSystem from 'expo-file-system/legacy';

export type TTSModel = 'tts-1' | 'tts-1-hd';
export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface TTSOptions {
  /** TTS model to use */
  model?: TTSModel;
  /** Voice to use */
  voice?: TTSVoice;
  /** Playback speed (0.25 to 4.0) */
  speed?: number;
  /** Response format */
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
  /** Callback when audio starts playing (after loading) */
  onPlaybackStart?: () => void;
}

// Voice recommendations per language for best quality
const VOICE_BY_LANGUAGE: Record<'en' | 'id', TTSVoice> = {
  en: 'nova', // Friendly, clear English
  id: 'alloy', // Neutral, works well for Indonesian
};

// Default options (without onPlaybackStart which is optional)
// Using 'opus' format for faster download (smaller file size than mp3)
const DEFAULT_OPTIONS: Omit<Required<TTSOptions>, 'onPlaybackStart'> = {
  model: 'tts-1',
  voice: 'nova',
  speed: 1.0,
  responseFormat: 'opus', // opus is ~50% smaller than mp3, much faster to download
};

// Audio state
let currentPlayer: AudioPlayer | null = null;
let currentAudioUri: string | null = null;
let currentTextHash: string | null = null; // Track which text is loaded
let isPlaying = false;
let isPaused = false; // Track if audio is paused (can resume)
let isCachedAudio = false; // Track if current audio is from persistent cache (don't delete on cleanup)
let playbackSubscription: { remove: () => void } | null = null;
let currentResolve: (() => void) | null = null;

/**
 * Simple hash function to identify text content
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Detect language from text (simple heuristic)
 */
function detectLanguage(text: string): 'en' | 'id' {
  const indonesianKeywords = [
    'yang',
    'tidak',
    'apa',
    'bagaimana',
    'mengapa',
    'gereja',
    'saya',
    'kamu',
    'dan',
    'untuk',
    'dengan',
    'ini',
    'itu',
    'adalah',
    'dalam',
    'pada',
    'dari',
    'ke',
    'akan',
    'sudah',
    'bisa',
    'harus',
    'jika',
    'atau',
    'tetapi',
    'karena',
  ];

  const words = text.toLowerCase().split(/\s+/);
  const matchCount = words.filter((w) => indonesianKeywords.includes(w)).length;

  // If more than 10% of words are Indonesian keywords, assume Indonesian
  return matchCount / words.length > 0.1 ? 'id' : 'en';
}

/**
 * Get optimal voice for detected language
 */
export function getVoiceForLanguage(lang: 'en' | 'id'): TTSVoice {
  return VOICE_BY_LANGUAGE[lang];
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert text to speech and play audio
 *
 * @param text - Text to convert to speech
 * @param apiKey - OpenAI API key
 * @param options - TTS options
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(
  text: string,
  apiKey: string,
  options?: TTSOptions
): Promise<void> {
  const textHash = hashText(text);

  // Check if we can resume the same audio
  if (isPaused && currentPlayer && currentTextHash === textHash) {
    console.log('[SpeechService] Resuming paused audio');
    isPlaying = true;
    isPaused = false;
    currentPlayer.play();
    options?.onPlaybackStart?.();

    // Return existing promise or create new one
    return new Promise((resolve) => {
      currentResolve = resolve;
    });
  }

  // Different text or no cached audio - need to load fresh
  await stopSpeaking();

  // Detect language and get optimal voice
  const detectedLang = detectLanguage(text);
  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice, // Use detected language voice
    ...options,
  };

  console.log(
    `[SpeechService] Speaking ${text.length} chars, lang: ${detectedLang}, voice: ${opts.voice}`
  );

  try {
    // Request audio from OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        input: text,
        voice: opts.voice,
        speed: opts.speed,
        response_format: opts.responseFormat,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `TTS API error: ${response.status}`
      );
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioBuffer);

    // Save to temporary file (React Native needs file URI)
    const tempFileName = `tts_${Date.now()}.${opts.responseFormat}`;
    const tempFilePath = `${FileSystem.cacheDirectory}${tempFileName}`;

    await FileSystem.writeAsStringAsync(tempFilePath, base64Audio, {
      encoding: 'base64',
    });

    currentAudioUri = tempFilePath;
    currentTextHash = textHash; // Store hash for resume check
    isCachedAudio = false; // Mark as temp file - can be deleted on cleanup

    // Configure audio mode for playback
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });

    // Create player and play
    currentPlayer = createAudioPlayer(tempFilePath);
    isPlaying = true;
    isPaused = false;

    // Wait for playback to finish
    return new Promise((resolve) => {
      if (!currentPlayer) {
        resolve();
        return;
      }

      currentResolve = resolve;
      let hasStarted = false;

      // Subscribe to playback status
      playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
        // Call onPlaybackStart when audio actually starts
        if (!hasStarted && status.playing) {
          hasStarted = true;
          opts.onPlaybackStart?.();
        }

        if (status.didJustFinish) {
          isPlaying = false;
          isPaused = false;
          playbackSubscription?.remove();
          playbackSubscription = null;
          cleanup();
          currentResolve?.();
          currentResolve = null;
        }
      });

      // Start playback
      currentPlayer.play();

      // Also call onPlaybackStart immediately after play() as fallback
      // (in case status update doesn't fire quickly)
      setTimeout(() => {
        if (!hasStarted && isPlaying) {
          hasStarted = true;
          opts.onPlaybackStart?.();
        }
      }, 100);
    });
  } catch (error) {
    console.error('[SpeechService] TTS error:', error);
    throw error;
  }
}

/**
 * Clean up audio resources (full cleanup)
 * @param preserveCachedFile - If true, don't delete files from persistent cache
 */
async function cleanup(preserveCachedFile: boolean = false): Promise<void> {
  // Remove subscription
  if (playbackSubscription) {
    try {
      playbackSubscription.remove();
    } catch (e) {
      // Ignore cleanup errors
    }
    playbackSubscription = null;
  }

  // Release player
  if (currentPlayer) {
    try {
      currentPlayer.release();
    } catch (e) {
      // Ignore cleanup errors
    }
    currentPlayer = null;
  }

  // Delete temp file ONLY if it's not a cached file
  // Cached files should persist for future use
  if (currentAudioUri) {
    if (isCachedAudio) {
      console.log('[SpeechService] Preserving cached audio file:', currentAudioUri);
    } else if (!preserveCachedFile) {
      console.log('[SpeechService] Deleting temp audio file');
      try {
        await FileSystem.deleteAsync(currentAudioUri, { idempotent: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  currentAudioUri = null;

  // Reset state
  currentTextHash = null;
  currentResolve = null;
  isCachedAudio = false;
}

/**
 * Stop currently playing speech (full stop + cleanup)
 * Use this when leaving a page or switching to different content
 */
export async function stopSpeaking(): Promise<void> {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
    } catch (error) {
      console.warn('[SpeechService] Error stopping audio:', error);
    }
  }
  isPlaying = false;
  isPaused = false;
  await cleanup();
}

/**
 * Pause current speech (keeps audio cached for resume)
 * Use this for play/pause toggle on same content
 */
export async function pauseSpeaking(): Promise<void> {
  if (currentPlayer && isPlaying) {
    console.log('[SpeechService] Pausing audio (cached for resume)');
    currentPlayer.pause();
    isPlaying = false;
    isPaused = true;
  }
}

/**
 * Resume paused speech
 */
export async function resumeSpeaking(): Promise<void> {
  if (currentPlayer && isPaused) {
    console.log('[SpeechService] Resuming audio');
    currentPlayer.play();
    isPlaying = true;
    isPaused = false;
  }
}

/**
 * Check if audio is currently playing
 */
export function isSpeaking(): boolean {
  return isPlaying;
}

/**
 * Check if audio is paused (can be resumed)
 */
export function isPausedSpeaking(): boolean {
  return isPaused;
}

/**
 * Check if same text is cached and can be resumed
 */
export function canResume(text: string): boolean {
  return isPaused && currentPlayer !== null && currentTextHash === hashText(text);
}

/**
 * Get available voices
 */
export function getAvailableVoices(): TTSVoice[] {
  return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
}

/**
 * Get voice description
 */
export function getVoiceDescription(voice: TTSVoice): string {
  const descriptions: Record<TTSVoice, string> = {
    alloy: 'Neutral, balanced',
    echo: 'Warm, conversational',
    fable: 'Expressive, storytelling',
    onyx: 'Deep, authoritative',
    nova: 'Friendly, upbeat',
    shimmer: 'Soft, gentle',
  };
  return descriptions[voice];
}

// Import cache service lazily to avoid circular deps
let ttsCache: typeof import('./ttsCache') | null = null;
async function getTTSCache() {
  if (!ttsCache) {
    ttsCache = await import('./ttsCache');
  }
  return ttsCache;
}

export interface CachedTTSOptions extends TTSOptions {
  /** Content type for cache expiration */
  contentType: 'devotion' | 'verse' | 'figure' | 'general';
  /** Content ID for cache key (e.g., devotion ID, verse ID) */
  contentId: string;
}

/**
 * Speak text with caching support for daily content
 *
 * Use this for devotions, verse of the day, and bible figures
 * where content is valid for 24+ hours.
 *
 * First user triggers API call and caches result.
 * Subsequent users get instant playback from cache.
 */
export async function speakTextCached(
  text: string,
  apiKey: string,
  options: CachedTTSOptions
): Promise<void> {
  const cache = await getTTSCache();

  // Detect language and get optimal voice
  const detectedLang = detectLanguage(text);
  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  // Generate cache key
  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    opts.voice,
    opts.model,
    opts.speed
  );

  // Check if we can resume existing audio (same text)
  const textHash = hashText(text);
  if (isPaused && currentPlayer && currentTextHash === textHash) {
    console.log('[SpeechService] Resuming cached paused audio');
    isPlaying = true;
    isPaused = false;
    currentPlayer.play();
    options?.onPlaybackStart?.();
    return new Promise((resolve) => {
      currentResolve = resolve;
    });
  }

  // Stop any currently playing audio
  await stopSpeaking();

  // Check cache first
  const cachedFilePath = await cache.getCachedAudio(cacheKey);

  if (cachedFilePath) {
    // Play from cache - no API call needed!
    console.log('[SpeechService] Playing from cache:', cacheKey);
    return playCachedAudio(cachedFilePath, text, opts);
  }

  // Not cached - fetch from API and cache it
  console.log('[SpeechService] Fetching TTS and caching:', cacheKey);

  try {
    // Request audio from OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        input: text,
        voice: opts.voice,
        speed: opts.speed,
        response_format: opts.responseFormat,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `TTS API error: ${response.status}`
      );
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioBuffer);

    // Cache the audio for future use
    const filePath = await cache.cacheAudio(
      cacheKey,
      base64Audio,
      opts.responseFormat,
      options.contentType,
      options.contentId
    );

    // Play the cached audio
    return playCachedAudio(filePath, text, opts);
  } catch (error) {
    console.error('[SpeechService] Cached TTS error:', error);
    throw error;
  }
}

/**
 * Play audio from a cached file path
 */
async function playCachedAudio(
  filePath: string,
  text: string,
  opts: Required<Omit<TTSOptions, 'onPlaybackStart'>> & Pick<TTSOptions, 'onPlaybackStart'>
): Promise<void> {
  currentAudioUri = filePath;
  currentTextHash = hashText(text);
  isCachedAudio = true; // Mark as cached - don't delete on cleanup

  // Configure audio mode for playback
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });

  // Create player and play
  currentPlayer = createAudioPlayer(filePath);
  isPlaying = true;
  isPaused = false;

  // Wait for playback to finish
  return new Promise((resolve) => {
    if (!currentPlayer) {
      resolve();
      return;
    }

    currentResolve = resolve;
    let hasStarted = false;

    // Subscribe to playback status
    playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
      if (!hasStarted && status.playing) {
        hasStarted = true;
        opts.onPlaybackStart?.();
      }

      if (status.didJustFinish) {
        isPlaying = false;
        isPaused = false;
        playbackSubscription?.remove();
        playbackSubscription = null;
        // Don't cleanup cached files - just reset state
        currentPlayer?.release();
        currentPlayer = null;
        currentTextHash = null;
        currentResolve?.();
        currentResolve = null;
      }
    });

    // Start playback
    currentPlayer.play();

    // Fallback for onPlaybackStart
    setTimeout(() => {
      if (!hasStarted && isPlaying) {
        hasStarted = true;
        opts.onPlaybackStart?.();
      }
    }, 100);
  });
}

/**
 * Preload audio for cached content (fetch and cache without playing)
 *
 * Call this when a page opens to pre-fetch audio in the background.
 * When user clicks play, audio will be instantly available from cache.
 *
 * This is a fire-and-forget operation - errors are silently ignored.
 */
export async function preloadAudio(
  text: string,
  apiKey: string,
  options: CachedTTSOptions
): Promise<boolean> {
  const cache = await getTTSCache();

  // Detect language and get optimal voice
  const detectedLang = detectLanguage(text);
  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  // Generate cache key
  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    opts.voice,
    opts.model,
    opts.speed
  );

  // Check if already cached
  const cachedFilePath = await cache.getCachedAudio(cacheKey);
  if (cachedFilePath) {
    console.log('[SpeechService] Preload: Already cached:', cacheKey);
    return true; // Already cached, nothing to do
  }

  // Fetch and cache in background
  console.log('[SpeechService] Preloading audio:', cacheKey);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        input: text,
        voice: opts.voice,
        speed: opts.speed,
        response_format: opts.responseFormat,
      }),
    });

    if (!response.ok) {
      console.warn('[SpeechService] Preload failed:', response.status);
      return false;
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioBuffer);

    // Cache the audio for future use
    await cache.cacheAudio(
      cacheKey,
      base64Audio,
      opts.responseFormat,
      options.contentType,
      options.contentId
    );

    console.log('[SpeechService] Preload complete:', cacheKey);
    return true;
  } catch (error) {
    console.warn('[SpeechService] Preload error:', error);
    return false;
  }
}

/**
 * Check if audio is already cached for instant playback
 */
export async function isAudioCached(options: CachedTTSOptions): Promise<boolean> {
  const cache = await getTTSCache();
  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    options.voice ?? DEFAULT_OPTIONS.voice,
    options.model ?? DEFAULT_OPTIONS.model,
    options.speed ?? DEFAULT_OPTIONS.speed
  );
  const cachedFilePath = await cache.getCachedAudio(cacheKey);
  return cachedFilePath !== null;
}

/**
 * Speak text with chunked streaming for faster first-audio playback
 *
 * For long content, this splits text into chunks and plays the first
 * chunk immediately while fetching the rest in background.
 *
 * @param text - Full text to speak
 * @param apiKey - OpenAI API key
 * @param options - TTS options
 * @param chunkSize - Approx characters per chunk (default 300)
 */
export async function speakTextStreaming(
  text: string,
  apiKey: string,
  options?: TTSOptions,
  chunkSize: number = 300
): Promise<void> {
  // For short text, just use regular speakText
  if (text.length <= chunkSize * 1.5) {
    return speakText(text, apiKey, options);
  }

  // Split text into chunks at sentence boundaries
  const chunks = splitIntoChunks(text, chunkSize);
  console.log(`[SpeechService] Streaming ${chunks.length} chunks`);

  // Detect language and get optimal voice
  const detectedLang = detectLanguage(text);
  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  let hasCalledOnPlaybackStart = false;

  // Play chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    // Check if we should stop
    if (!isPlaying && i > 0) {
      console.log('[SpeechService] Streaming stopped');
      break;
    }

    const chunk = chunks[i];
    console.log(`[SpeechService] Playing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

    try {
      // Fetch audio for this chunk
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.model,
          input: chunk,
          voice: opts.voice,
          speed: opts.speed,
          response_format: opts.responseFormat,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = arrayBufferToBase64(audioBuffer);

      // Save to temp file
      const tempFileName = `tts_stream_${Date.now()}_${i}.${opts.responseFormat}`;
      const tempFilePath = `${FileSystem.cacheDirectory}${tempFileName}`;

      await FileSystem.writeAsStringAsync(tempFilePath, base64Audio, {
        encoding: 'base64',
      });

      // Configure audio mode
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      // Play this chunk
      await new Promise<void>((resolve) => {
        const player = createAudioPlayer(tempFilePath);
        currentPlayer = player;
        currentAudioUri = tempFilePath;
        isPlaying = true;
        isPaused = false;
        isCachedAudio = false;

        const subscription = player.addListener('playbackStatusUpdate', (status) => {
          // Call onPlaybackStart on first chunk
          if (!hasCalledOnPlaybackStart && status.playing) {
            hasCalledOnPlaybackStart = true;
            opts.onPlaybackStart?.();
          }

          if (status.didJustFinish) {
            subscription.remove();
            player.release();
            // Clean up temp file
            FileSystem.deleteAsync(tempFilePath, { idempotent: true }).catch(() => {});
            resolve();
          }
        });

        player.play();
      });

    } catch (error) {
      console.error(`[SpeechService] Chunk ${i + 1} error:`, error);
      break;
    }
  }

  // Cleanup
  isPlaying = false;
  isPaused = false;
  currentPlayer = null;
  currentAudioUri = null;
}

/**
 * Split text into chunks at sentence boundaries
 */
function splitIntoChunks(text: string, targetSize: number): string[] {
  const chunks: string[] = [];

  // Split by sentence endings
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > targetSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export default {
  speakText,
  speakTextCached,
  speakTextStreaming,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  isPausedSpeaking,
  canResume,
  preloadAudio,
  isAudioCached,
  getAvailableVoices,
  getVoiceDescription,
  getVoiceForLanguage,
};
