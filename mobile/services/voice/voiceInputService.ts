/**
 * Voice Input Service - Optimized Whisper STT
 *
 * Converts speech to text using Groq/OpenAI Whisper API.
 * Optimized for minimal latency and file size.
 *
 * Performance targets:
 * - Groq latency: 300-500ms
 * - Total: <1 second end-to-end
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Recording preset for STT
 *
 * Uses LOW_QUALITY preset which is sufficient for speech recognition
 * and produces smaller files for faster upload.
 *
 * Note: Custom presets can cause "recorder not prepared" errors on some devices,
 * so we use the built-in presets which are guaranteed to work.
 */
const STT_RECORDING_PRESET = Audio.RecordingOptionsPresets.LOW_QUALITY;

// Maximum recording duration (seconds) to prevent huge uploads
const MAX_RECORDING_DURATION = 60;

export interface TranscriptionOptions {
  /** Language hint (ISO 639-1) - ALWAYS provide for faster processing */
  language?: 'en' | 'id' | string;
  /** Optional prompt for domain-specific vocabulary */
  prompt?: string;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

// Recording state (module-level for performance)
let recording: Audio.Recording | null = null;
let recordingStartTime = 0;
let permissionGranted = false; // Cache permission status

/**
 * Pre-check microphone permission (call on app start)
 * Avoids permission check delay during recording
 */
export async function preCheckPermission(): Promise<boolean> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    permissionGranted = status === 'granted';
    return permissionGranted;
  } catch {
    return false;
  }
}

/**
 * Start recording - with proper cleanup and error handling
 */
export async function startRecording(): Promise<void> {
  // Clean up any existing recording first
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Ignore cleanup errors
    }
    recording = null;
  }

  // Request permission only if not already granted
  if (!permissionGranted) {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Microphone permission not granted');
    }
    permissionGranted = true;
  }

  // Configure audio mode for recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  // Create recording using the explicit method for better compatibility
  const newRecording = new Audio.Recording();

  try {
    // Prepare the recording with the preset
    await newRecording.prepareToRecordAsync(STT_RECORDING_PRESET);

    // Start recording
    await newRecording.startAsync();

    recording = newRecording;
    recordingStartTime = Date.now();

    if (__DEV__) console.log('[STT] Recording started');
  } catch (error) {
    // Clean up on error
    try {
      await newRecording.stopAndUnloadAsync();
    } catch {
      // Ignore
    }
    throw error;
  }
}

/**
 * Stop recording - returns URI immediately
 */
export async function stopRecording(): Promise<string> {
  if (!recording) {
    throw new Error('No active recording');
  }

  const rec = recording;
  recording = null; // Clear immediately to prevent double-stop

  await rec.stopAndUnloadAsync();
  const uri = rec.getURI();

  if (!uri) {
    throw new Error('Failed to get recording URI');
  }

  if (__DEV__) {
    const duration = (Date.now() - recordingStartTime) / 1000;
    console.log(`[STT] Stopped, ${duration.toFixed(1)}s`);
  }

  // Don't reset audio mode here - do it lazily to save time
  return uri;
}

/**
 * Cancel recording without saving
 */
export async function cancelRecording(): Promise<void> {
  if (recording) {
    const rec = recording;
    recording = null;
    try {
      await rec.stopAndUnloadAsync();
    } catch {
      // Ignore errors during cancel
    }
  }
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return recording !== null;
}

/**
 * Get recording duration in seconds
 */
export function getRecordingDuration(): number {
  return recording ? (Date.now() - recordingStartTime) / 1000 : 0;
}

/**
 * Check if recording exceeded max duration
 */
export function isMaxDurationReached(): boolean {
  return getRecordingDuration() >= MAX_RECORDING_DURATION;
}

// STT Provider configuration
export type STTProvider = 'openai' | 'groq';

const STT_PROVIDERS = {
  openai: {
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
    model: 'whisper-large-v3-turbo', // Fastest Groq model
  },
} as const;

/**
 * Transcribe audio - optimized for speed
 *
 * Optimizations:
 * - Uses 'text' response format (smaller, no JSON parsing needed for simple case)
 * - Skips file existence check (we just recorded it)
 * - Minimal FormData fields
 */
export async function transcribeAudio(
  audioUri: string,
  apiKey: string,
  options?: TranscriptionOptions,
  provider: STTProvider = 'groq'
): Promise<TranscriptionResult> {
  const config = STT_PROVIDERS[provider];
  const startTime = Date.now();

  // Detect file extension from URI
  const ext = audioUri.split('.').pop()?.toLowerCase() || 'm4a';
  const mimeTypes: Record<string, string> = {
    'm4a': 'audio/m4a',
    'caf': 'audio/x-caf',
    '3gp': 'audio/3gpp',
    'mp4': 'audio/mp4',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
  };
  const mimeType = mimeTypes[ext] || 'audio/mpeg';

  // Build minimal FormData
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: mimeType,
    name: `audio.${ext}`,
  } as unknown as Blob);
  formData.append('model', config.model);

  // Always specify language for faster processing (skips detection)
  if (options?.language) {
    formData.append('language', options.language);
  }

  // Domain-specific prompt improves accuracy
  if (options?.prompt) {
    formData.append('prompt', options.prompt);
  }

  // Use 'json' format - 'text' has issues with some edge cases
  formData.append('response_format', 'json');

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `STT error: ${response.status}`
    );
  }

  const data = await response.json();
  const latency = Date.now() - startTime;

  if (__DEV__) {
    console.log(`[STT] ${provider.toUpperCase()} ${latency}ms: "${data.text?.substring(0, 40)}..."`);
  }

  return {
    text: data.text?.trim() || '',
    language: data.language,
    duration: data.duration,
  };
}

/**
 * Stop recording and transcribe in one optimized call
 *
 * Total latency breakdown (typical):
 * - Stop recording: ~50ms
 * - Upload + transcribe: ~300-500ms (Groq)
 * - Total: ~400-600ms
 */
export async function stopAndTranscribe(
  apiKey: string,
  options?: TranscriptionOptions,
  provider: STTProvider = 'groq'
): Promise<TranscriptionResult> {
  const uri = await stopRecording();

  // Start transcription immediately
  const result = await transcribeAudio(uri, apiKey, options, provider);

  // Fire-and-forget cleanup (don't await)
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

  return result;
}

/**
 * Prompt hints for church/spiritual context
 * Helps Whisper with domain-specific vocabulary
 */
export const TRANSCRIPTION_PROMPTS = {
  en: 'Bible, Jesus Christ, God, Holy Spirit, prayer, church, faith, blessing, scripture, verse, psalm, gospel',
  id: 'Alkitab, Yesus Kristus, Tuhan, Roh Kudus, doa, gereja, iman, berkat, firman, ayat, mazmur, injil',
};

export function getTranscriptionPrompt(lang: 'en' | 'id'): string {
  return TRANSCRIPTION_PROMPTS[lang];
}

export default {
  preCheckPermission,
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  getRecordingDuration,
  isMaxDurationReached,
  transcribeAudio,
  stopAndTranscribe,
  getTranscriptionPrompt,
};
