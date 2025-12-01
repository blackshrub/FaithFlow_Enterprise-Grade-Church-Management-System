/**
 * Speech Service - Google Cloud TTS Integration
 *
 * Converts text to natural-sounding speech using Google Cloud Text-to-Speech API.
 * Supports bilingual (English/Indonesian) with WaveNet voices.
 *
 * Uses expo-audio for playback.
 *
 * Voice Types:
 * - WaveNet: Neural network-based, most natural (recommended)
 * - Standard: Basic TTS, faster but less natural
 * - Neural2: Latest generation, even more natural
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
// Use legacy API for file system operations (v54+ deprecated the main API)
import * as FileSystem from 'expo-file-system/legacy';
import {
  type GoogleTTSVoice,
  GOOGLE_TTS_VOICES,
  DEFAULT_TTS_SETTINGS,
} from '@/constants/voice';

export type { GoogleTTSVoice };

export interface TTSOptions {
  /** Voice to use (e.g., 'id-ID-Wavenet-D') */
  voice?: GoogleTTSVoice;
  /** Speaking rate (0.25 to 4.0, default 1.0) */
  speakingRate?: number;
  /** Pitch adjustment (-20.0 to 20.0 semitones, default 0) */
  pitch?: number;
  /** Audio encoding (MP3, OGG_OPUS, LINEAR16) */
  audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
  /** Callback when audio starts playing (after loading) */
  onPlaybackStart?: () => void;
  /** Known language - skip auto-detection when provided */
  language?: 'en' | 'id';
}

// Google Cloud TTS API endpoint
const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Default options
const DEFAULT_OPTIONS: Omit<Required<TTSOptions>, 'onPlaybackStart'> = {
  voice: DEFAULT_TTS_SETTINGS.voice,
  speakingRate: DEFAULT_TTS_SETTINGS.speakingRate,
  pitch: DEFAULT_TTS_SETTINGS.pitch,
  audioEncoding: DEFAULT_TTS_SETTINGS.audioEncoding,
};

// Audio state
let currentPlayer: AudioPlayer | null = null;
let currentAudioUri: string | null = null;
let currentTextHash: string | null = null;
let isPlaying = false;
let isPaused = false;
let isCachedAudio = false;
let playbackSubscription: { remove: () => void } | null = null;
let currentResolve: (() => void) | null = null;

// Session cache - keeps TTS audio in memory during session
const sessionCache = new Map<string, string>();
const MAX_SESSION_CACHE_SIZE = 10; // Limit cache to 10 audio files

/**
 * Manage session cache size - evict oldest entries when full
 */
function maintainCacheSize(): void {
  if (sessionCache.size > MAX_SESSION_CACHE_SIZE) {
    // Get oldest entry (first in map)
    const oldestKey = sessionCache.keys().next().value;
    if (oldestKey) {
      const oldPath = sessionCache.get(oldestKey);
      sessionCache.delete(oldestKey);
      // Delete file in background
      if (oldPath) {
        FileSystem.deleteAsync(oldPath, { idempotent: true }).catch(() => {});
      }
      if (__DEV__) console.log('[SpeechService] Evicted oldest cache entry');
    }
  }
}

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
 * Number to words conversion for Indonesian
 */
const INDONESIAN_NUMBERS: Record<number, string> = {
  0: 'nol', 1: 'satu', 2: 'dua', 3: 'tiga', 4: 'empat',
  5: 'lima', 6: 'enam', 7: 'tujuh', 8: 'delapan', 9: 'sembilan',
  10: 'sepuluh', 11: 'sebelas', 12: 'dua belas', 13: 'tiga belas',
  14: 'empat belas', 15: 'lima belas', 16: 'enam belas',
  17: 'tujuh belas', 18: 'delapan belas', 19: 'sembilan belas',
  20: 'dua puluh', 30: 'tiga puluh', 40: 'empat puluh', 50: 'lima puluh',
  60: 'enam puluh', 70: 'tujuh puluh', 80: 'delapan puluh', 90: 'sembilan puluh',
  100: 'seratus',
};

function numberToIndonesian(num: number): string {
  if (num <= 20) return INDONESIAN_NUMBERS[num] || String(num);
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const ones = num % 10;
    return ones === 0 ? INDONESIAN_NUMBERS[tens] : `${INDONESIAN_NUMBERS[tens]} ${INDONESIAN_NUMBERS[ones]}`;
  }
  if (num < 200) {
    const remainder = num % 100;
    return remainder === 0 ? 'seratus' : `seratus ${numberToIndonesian(remainder)}`;
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    return remainder === 0
      ? `${INDONESIAN_NUMBERS[hundreds]} ratus`
      : `${INDONESIAN_NUMBERS[hundreds]} ratus ${numberToIndonesian(remainder)}`;
  }
  return String(num);
}

/**
 * Number to words conversion for English
 */
const ENGLISH_NUMBERS: Record<number, string> = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four',
  5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
  10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
  14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
  17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
  20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
  60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
};

function numberToEnglish(num: number): string {
  if (num <= 20) return ENGLISH_NUMBERS[num] || String(num);
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const ones = num % 10;
    return ones === 0 ? ENGLISH_NUMBERS[tens] : `${ENGLISH_NUMBERS[tens]} ${ENGLISH_NUMBERS[ones]}`;
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    return remainder === 0
      ? `${ENGLISH_NUMBERS[hundreds]} hundred`
      : `${ENGLISH_NUMBERS[hundreds]} hundred ${numberToEnglish(remainder)}`;
  }
  return String(num);
}

/**
 * Convert Bible verse references to spoken form
 * Examples:
 * - "Yohanes 1:23-24" → "Yohanes pasal satu ayat dua puluh tiga sampai dua puluh empat"
 * - "John 1:23-24" → "John chapter one verse twenty three to twenty four"
 */
function convertVerseReferences(text: string, lang: 'en' | 'id'): string {
  // Pattern: Book Chapter:Verse or Book Chapter:Verse-Verse
  // e.g., "Yohanes 3:16", "John 3:16-17", "Mazmur 23:1-6"
  const versePattern = /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?/g;

  return text.replace(versePattern, (match, book, chapter, verseStart, verseEnd) => {
    const chapterNum = parseInt(chapter, 10);
    const verseStartNum = parseInt(verseStart, 10);
    const verseEndNum = verseEnd ? parseInt(verseEnd, 10) : null;

    if (lang === 'id') {
      // Indonesian: "Yohanes pasal satu ayat dua puluh tiga sampai dua puluh empat"
      const chapterWord = numberToIndonesian(chapterNum);
      const verseStartWord = numberToIndonesian(verseStartNum);
      if (verseEndNum) {
        const verseEndWord = numberToIndonesian(verseEndNum);
        return `${book} pasal ${chapterWord} ayat ${verseStartWord} sampai ${verseEndWord}`;
      }
      return `${book} pasal ${chapterWord} ayat ${verseStartWord}`;
    } else {
      // English: "John chapter one verse twenty three to twenty four"
      const chapterWord = numberToEnglish(chapterNum);
      const verseStartWord = numberToEnglish(verseStartNum);
      if (verseEndNum) {
        const verseEndWord = numberToEnglish(verseEndNum);
        return `${book} chapter ${chapterWord} verse ${verseStartWord} to ${verseEndWord}`;
      }
      return `${book} chapter ${chapterWord} verse ${verseStartWord}`;
    }
  });
}

/**
 * Strip markdown formatting from text for TTS
 * Removes: bold, italic, headers, links, code blocks, lists, etc.
 */
function stripMarkdown(text: string): string {
  return text
    // Remove code blocks (```...```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code (`...`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Convert links [text](url) to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bold/italic (**, *, __, _)
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/___([^_]+)___/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers (-, *, +, 1.)
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detect language from text (simple heuristic)
 */
function detectLanguage(text: string): 'en' | 'id' {
  const indonesianKeywords = [
    'yang', 'tidak', 'apa', 'bagaimana', 'mengapa', 'gereja', 'saya',
    'kamu', 'dan', 'untuk', 'dengan', 'ini', 'itu', 'adalah', 'dalam',
    'pada', 'dari', 'ke', 'akan', 'sudah', 'bisa', 'harus', 'jika',
    'atau', 'tetapi', 'karena', 'Tuhan', 'Yesus', 'Alkitab', 'doa',
  ];

  const words = text.toLowerCase().split(/\s+/);
  const matchCount = words.filter((w) => indonesianKeywords.includes(w)).length;

  return matchCount / words.length > 0.1 ? 'id' : 'en';
}

/**
 * Get the appropriate voice for detected language
 */
export function getVoiceForLanguage(lang: 'en' | 'id'): GoogleTTSVoice {
  return lang === 'id' ? DEFAULT_TTS_SETTINGS.voice : DEFAULT_TTS_SETTINGS.voiceEN;
}

/**
 * Get language code from voice name
 */
function getLanguageCode(voice: GoogleTTSVoice): string {
  // Extract language code from voice name (e.g., 'id-ID-Wavenet-D' -> 'id-ID')
  const parts = voice.split('-');
  return `${parts[0]}-${parts[1]}`;
}

/**
 * Get file extension for audio encoding
 */
function getFileExtension(encoding: string): string {
  switch (encoding) {
    case 'OGG_OPUS': return 'ogg';
    case 'LINEAR16': return 'wav';
    default: return 'mp3';
  }
}

/**
 * Clear session cache (call when starting new conversation)
 */
export async function clearSessionCache(): Promise<void> {
  if (__DEV__) console.log(`[SpeechService] Clearing session cache (${sessionCache.size} entries)`);

  for (const filePath of sessionCache.values()) {
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch {
      // Ignore deletion errors
    }
  }

  sessionCache.clear();
}

/**
 * Play audio from file path (internal helper)
 */
async function playAudioFile(
  filePath: string,
  textHash: string,
  isFromCache: boolean,
  opts: Omit<Required<TTSOptions>, 'onPlaybackStart'> & { onPlaybackStart?: () => void }
): Promise<void> {
  currentAudioUri = filePath;
  currentTextHash = textHash;
  isCachedAudio = isFromCache;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });

  currentPlayer = createAudioPlayer(filePath);
  isPlaying = true;
  isPaused = false;

  return new Promise((resolve) => {
    if (!currentPlayer) {
      resolve();
      return;
    }

    currentResolve = resolve;
    let hasStarted = false;

    playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
      if (!hasStarted && status.playing) {
        hasStarted = true;
        opts.onPlaybackStart?.();
      }

      if (status.didJustFinish) {
        console.log('[SpeechService] Playback finished (playAudioFile)');
        isPlaying = false;
        isPaused = false;
        playbackSubscription?.remove();
        playbackSubscription = null;
        const resolveFunc = currentResolve;
        currentResolve = null;
        resolveFunc?.();
      }
    });

    currentPlayer.play();
  });
}

/**
 * Convert text to speech and play audio using Google Cloud TTS
 *
 * @param text - Text to convert to speech
 * @param apiKey - Google Cloud API key
 * @param options - TTS options
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(
  text: string,
  apiKey: string,
  options?: TTSOptions
): Promise<void> {
  // Strip markdown formatting before TTS (prevents reading *, #, etc.)
  let cleanText = stripMarkdown(text);

  // Detect language first (needed for verse conversion)
  const lang = options?.language ?? detectLanguage(cleanText);

  // Convert Bible verse references to spoken form (e.g., "John 3:16" → "John chapter three verse sixteen")
  cleanText = convertVerseReferences(cleanText, lang);

  const textHash = hashText(cleanText);

  // Check if we can resume the same audio
  if (isPaused && currentPlayer && currentTextHash === textHash) {
    console.log('[SpeechService] Resuming paused audio');
    isPlaying = true;
    isPaused = false;

    if (!playbackSubscription) {
      playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          console.log('[SpeechService] Playback finished (after resume)');
          isPlaying = false;
          isPaused = false;
          playbackSubscription?.remove();
          playbackSubscription = null;
          currentResolve?.();
          currentResolve = null;
        }
      });
    }

    currentPlayer.play();
    options?.onPlaybackStart?.();

    return new Promise((resolve) => {
      currentResolve = resolve;
    });
  }

  // Different text or no cached audio - need to load fresh
  await stopSpeaking();

  const optimalVoice = getVoiceForLanguage(lang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  if (__DEV__) {
    console.log(
      `[SpeechService] Speaking ${cleanText.length} chars (was ${text.length}), lang: ${lang}${options?.language ? ' (explicit)' : ' (detected)'}, voice: ${opts.voice}`
    );
  }

  try {
    // Check session cache first
    const cachedPath = sessionCache.get(textHash);
    if (cachedPath) {
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      if (fileInfo.exists) {
        console.log('[SpeechService] Using session cache');
        return playAudioFile(cachedPath, textHash, true, opts);
      } else {
        sessionCache.delete(textHash);
      }
    }

    // Request audio from Google Cloud TTS API
    const languageCode = getLanguageCode(opts.voice);

    const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: {
          languageCode,
          name: opts.voice,
        },
        audioConfig: {
          audioEncoding: opts.audioEncoding,
          speakingRate: opts.speakingRate,
          pitch: opts.pitch,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Google TTS API error: ${response.status}`
      );
    }

    const data = await response.json();
    const audioContent = data.audioContent; // Base64 encoded audio

    if (!audioContent) {
      throw new Error('No audio content in response');
    }

    // Save to temporary file
    const ext = getFileExtension(opts.audioEncoding);
    const tempFileName = `tts_${Date.now()}.${ext}`;
    const tempFilePath = `${FileSystem.cacheDirectory}${tempFileName}`;

    await FileSystem.writeAsStringAsync(tempFilePath, audioContent, {
      encoding: 'base64',
    });

    // Save to session cache (with size limit)
    sessionCache.set(textHash, tempFilePath);
    maintainCacheSize();

    currentAudioUri = tempFilePath;
    currentTextHash = textHash;
    isCachedAudio = true;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });

    currentPlayer = createAudioPlayer(tempFilePath);
    isPlaying = true;
    isPaused = false;

    return new Promise((resolve) => {
      if (!currentPlayer) {
        resolve();
        return;
      }

      currentResolve = resolve;
      let hasStarted = false;

      playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
        if (!hasStarted && status.playing) {
          hasStarted = true;
          opts.onPlaybackStart?.();
        }

        if (status.didJustFinish) {
          console.log('[SpeechService] Playback finished naturally');
          isPlaying = false;
          isPaused = false;
          playbackSubscription?.remove();
          playbackSubscription = null;
          const resolveFunc = currentResolve;
          cleanup();
          resolveFunc?.();
        }
      });

      currentPlayer.play();

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
 * Clean up audio resources
 */
async function cleanup(preserveCachedFile: boolean = false): Promise<void> {
  if (playbackSubscription) {
    try {
      playbackSubscription.remove();
    } catch {
      // Ignore
    }
    playbackSubscription = null;
  }

  if (currentPlayer) {
    try {
      currentPlayer.release();
    } catch {
      // Ignore
    }
    currentPlayer = null;
  }

  if (currentAudioUri) {
    if (isCachedAudio) {
      console.log('[SpeechService] Preserving cached audio file');
    } else if (!preserveCachedFile) {
      console.log('[SpeechService] Deleting temp audio file');
      try {
        await FileSystem.deleteAsync(currentAudioUri, { idempotent: true });
      } catch {
        // Ignore
      }
    }
  }
  currentAudioUri = null;
  currentTextHash = null;
  currentResolve = null;
  isCachedAudio = false;
}

/**
 * Stop currently playing speech
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
 * Pause current speech
 */
export async function pauseSpeaking(): Promise<void> {
  if (currentPlayer && isPlaying) {
    console.log('[SpeechService] Pausing audio');
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
 * Check if audio is paused
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
export function getAvailableVoices(): GoogleTTSVoice[] {
  return Object.keys(GOOGLE_TTS_VOICES) as GoogleTTSVoice[];
}

/**
 * Get voice description
 */
export function getVoiceDescription(voice: GoogleTTSVoice): string {
  const info = GOOGLE_TTS_VOICES[voice];
  return info ? `${info.label} (${info.gender})` : voice;
}

// Import cache service lazily
let ttsCache: typeof import('./ttsCache') | null = null;
async function getTTSCache() {
  if (!ttsCache) {
    ttsCache = await import('./ttsCache');
  }
  return ttsCache;
}

export interface CachedTTSOptions extends TTSOptions {
  contentType: 'devotion' | 'verse' | 'figure' | 'general';
  contentId: string;
}

/**
 * Speak text with caching support for daily content
 */
export async function speakTextCached(
  text: string,
  apiKey: string,
  options: CachedTTSOptions
): Promise<void> {
  const cache = await getTTSCache();

  // Clean text same as speakText (strip markdown, convert verse references)
  let cleanText = stripMarkdown(text);
  const detectedLang = options.language ?? detectLanguage(cleanText);
  cleanText = convertVerseReferences(cleanText, detectedLang);

  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    opts.voice,
    'google-tts',
    opts.speakingRate
  );

  const textHash = hashText(cleanText);
  if (isPaused && currentPlayer && currentTextHash === textHash) {
    console.log('[SpeechService] Resuming cached paused audio');
    isPlaying = true;
    isPaused = false;

    if (!playbackSubscription) {
      playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          console.log('[SpeechService] Playback finished (after resume)');
          isPlaying = false;
          isPaused = false;
          playbackSubscription?.remove();
          playbackSubscription = null;
          currentResolve?.();
          currentResolve = null;
        }
      });
    }

    currentPlayer.play();
    options?.onPlaybackStart?.();
    return new Promise((resolve) => {
      currentResolve = resolve;
    });
  }

  await stopSpeaking();

  const cachedFilePath = await cache.getCachedAudio(cacheKey);

  if (cachedFilePath) {
    console.log('[SpeechService] Playing from cache:', cacheKey);
    return playCachedAudio(cachedFilePath, cleanText, opts);
  }

  if (__DEV__) {
    console.log(
      `[SpeechService] Fetching TTS: ${cleanText.length} chars (was ${text.length}), lang: ${detectedLang}, voice: ${opts.voice}`
    );
  }

  try {
    const languageCode = getLanguageCode(opts.voice);

    const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: {
          languageCode,
          name: opts.voice,
        },
        audioConfig: {
          audioEncoding: opts.audioEncoding,
          speakingRate: opts.speakingRate,
          pitch: opts.pitch,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Google TTS API error: ${response.status}`
      );
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      throw new Error('No audio content in response');
    }

    const filePath = await cache.cacheAudio(
      cacheKey,
      audioContent,
      getFileExtension(opts.audioEncoding),
      options.contentType,
      options.contentId
    );

    return playCachedAudio(filePath, cleanText, opts);
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
  isCachedAudio = true;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
  });

  currentPlayer = createAudioPlayer(filePath);
  isPlaying = true;
  isPaused = false;

  return new Promise((resolve) => {
    if (!currentPlayer) {
      resolve();
      return;
    }

    currentResolve = resolve;
    let hasStarted = false;
    let audioDuration = 0;
    let lastPosition = 0;
    let stuckCount = 0;

    const finishPlayback = () => {
      if (__DEV__) console.log('[SpeechService] Playback finished (playCachedAudio)');
      isPlaying = false;
      isPaused = false;
      playbackSubscription?.remove();
      playbackSubscription = null;
      currentPlayer?.release();
      currentPlayer = null;
      currentTextHash = null;
      const resolveFunc = currentResolve;
      currentResolve = null;
      resolveFunc?.();
    };

    playbackSubscription = currentPlayer.addListener('playbackStatusUpdate', (status) => {
      // Track when playback actually starts
      if (!hasStarted && status.playing) {
        hasStarted = true;
        opts.onPlaybackStart?.();
      }

      // Store duration for fallback detection (expo-audio uses seconds)
      if (status.duration && status.duration > 0) {
        audioDuration = status.duration;
      }

      // Primary: Check didJustFinish (most reliable)
      if (status.didJustFinish) {
        finishPlayback();
        return;
      }

      // Fallback 1: Position reached/exceeded duration (both in seconds)
      if (
        audioDuration > 0 &&
        status.currentTime !== undefined &&
        status.currentTime >= audioDuration - 0.1 // within 100ms of end
      ) {
        if (__DEV__) console.log('[SpeechService] Detected end via position');
        finishPlayback();
        return;
      }

      // Fallback 2: Position stuck at near-end (for OGG_OPUS issues)
      if (hasStarted && audioDuration > 0 && status.currentTime !== undefined) {
        const nearEnd = status.currentTime >= audioDuration - 0.5; // within 500ms of end
        const positionStuck = Math.abs(status.currentTime - lastPosition) < 0.01; // position not moving

        if (nearEnd && positionStuck) {
          stuckCount++;
          if (stuckCount >= 3) {
            if (__DEV__) console.log('[SpeechService] Detected end via stuck position');
            finishPlayback();
            return;
          }
        } else {
          stuckCount = 0;
        }
        lastPosition = status.currentTime;
      }

      // Fallback 3: Playback stopped unexpectedly (not paused, not buffering)
      if (hasStarted && !status.playing && !status.isBuffering && !isPaused && isPlaying) {
        // Small delay to avoid false positives during buffering
        setTimeout(() => {
          if (!isPlaying) return; // Already handled
          if (currentPlayer && !isPaused) {
            if (__DEV__) console.log('[SpeechService] Detected end via stopped state');
            finishPlayback();
          }
        }, 200);
      }
    });

    currentPlayer.play();

    setTimeout(() => {
      if (!hasStarted && isPlaying) {
        hasStarted = true;
        opts.onPlaybackStart?.();
      }
    }, 100);
  });
}

/**
 * Preload audio for cached content
 */
export async function preloadAudio(
  text: string,
  apiKey: string,
  options: CachedTTSOptions
): Promise<boolean> {
  const cache = await getTTSCache();

  const detectedLang = detectLanguage(text);
  const optimalVoice = getVoiceForLanguage(detectedLang);

  const opts = {
    ...DEFAULT_OPTIONS,
    voice: optimalVoice,
    ...options,
  };

  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    opts.voice,
    'google-tts',
    opts.speakingRate
  );

  const cachedFilePath = await cache.getCachedAudio(cacheKey);
  if (cachedFilePath) {
    console.log('[SpeechService] Preload: Already cached:', cacheKey);
    return true;
  }

  console.log('[SpeechService] Preloading audio:', cacheKey);

  try {
    const languageCode = getLanguageCode(opts.voice);

    const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          name: opts.voice,
        },
        audioConfig: {
          audioEncoding: opts.audioEncoding,
          speakingRate: opts.speakingRate,
          pitch: opts.pitch,
        },
      }),
    });

    if (!response.ok) {
      console.warn('[SpeechService] Preload failed:', response.status);
      return false;
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      return false;
    }

    await cache.cacheAudio(
      cacheKey,
      audioContent,
      getFileExtension(opts.audioEncoding),
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
 * Check if audio is already cached
 */
export async function isAudioCached(options: CachedTTSOptions): Promise<boolean> {
  const cache = await getTTSCache();
  const cacheKey = cache.generateDailyCacheKey(
    options.contentType,
    options.contentId,
    options.voice ?? DEFAULT_OPTIONS.voice,
    'google-tts',
    options.speakingRate ?? DEFAULT_OPTIONS.speakingRate
  );
  const cachedFilePath = await cache.getCachedAudio(cacheKey);
  return cachedFilePath !== null;
}

export default {
  speakText,
  speakTextCached,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  isPausedSpeaking,
  canResume,
  preloadAudio,
  isAudioCached,
  clearSessionCache,
  getAvailableVoices,
  getVoiceDescription,
  getVoiceForLanguage,
};
