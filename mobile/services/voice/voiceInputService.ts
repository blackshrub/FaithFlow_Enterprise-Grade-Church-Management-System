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
// Use legacy API for file system operations (v54+ deprecated the main API)
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Recording preset for STT with metering enabled for silence detection
 *
 * We construct a full preset explicitly to avoid issues with spread operator
 * potentially not copying all required fields from presets.
 */
const STT_RECORDING_PRESET: Audio.RecordingOptions = {
  isMeteringEnabled: true, // Enable metering for silence detection
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.LOW,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

// Maximum recording duration (seconds) to prevent huge uploads
const MAX_RECORDING_DURATION = 60;

// Adaptive silence detection constants
const METERING_UPDATE_INTERVAL_MS = 100; // How often to check audio levels
const NOISE_FLOOR_CALIBRATION_MS = 500; // Time to calibrate ambient noise at start
const SPEECH_THRESHOLD_DB = 10; // dB above noise floor to detect speech
const SILENCE_ENTER_THRESHOLD_DB = 3; // dB above noise floor to ENTER silence (lower = stricter)
const SILENCE_EXIT_THRESHOLD_DB = 8; // dB above noise floor to EXIT silence (hysteresis - higher = more tolerant)
const SILENCE_BREAK_DEBOUNCE_MS = 300; // Require sustained above-threshold to break silence
export const SILENCE_THRESHOLD_DB_LEGACY = -45; // Legacy absolute threshold (not used)

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
let lastSuccessfulRecordingTime = 0; // Track when we last successfully recorded
let permissionGranted = false; // Cache permission status
let lastPermissionCheck = 0; // Timestamp of last permission check
const PERMISSION_CACHE_DURATION = 5 * 60 * 1000; // Re-check permission every 5 minutes
const STALE_AUDIO_THRESHOLD_MS = 30 * 1000; // Consider audio stale after 30 seconds of inactivity

// Operation lock to prevent race conditions
// This ensures stop completes before start can begin
let operationInProgress: 'idle' | 'starting' | 'recording' | 'stopping' | 'resetting' = 'idle';
let operationPromise: Promise<void> | null = null;

// Adaptive silence detection state
let lastMeteringValue: number = -160; // Current audio level in dB
let silenceStartTime: number | null = null; // When silence began
let meteringCallback: ((metering: number, isSilent: boolean, silenceDurationMs: number) => void) | null = null;

// Adaptive noise floor tracking
let noiseFloor: number = -60; // Ambient noise level (adapts to environment)
let calibrationSamples: number[] = []; // Samples collected during calibration
let isCalibrating: boolean = false; // Whether we're still calibrating noise floor
let calibrationStartTime: number = 0;
let speechDetected: boolean = false; // Has user started speaking?
let peakLevel: number = -160; // Peak level during current recording
let inSilence: boolean = false; // Current silence state (with hysteresis)
let aboveExitThresholdStart: number | null = null; // When level went above exit threshold (for debounce)

/**
 * Reset silence detection state - call at start of each new recording
 */
function resetSilenceDetectionState(): void {
  lastMeteringValue = -160;
  silenceStartTime = null;
  noiseFloor = -60;
  calibrationSamples = [];
  isCalibrating = true;
  calibrationStartTime = Date.now();
  speechDetected = false;
  peakLevel = -160;
  inSilence = false;
  aboveExitThresholdStart = null;
}

/**
 * Handle metering update - shared logic for adaptive silence detection
 * Used by both createAsync callback and manual recording status update
 */
function handleMeteringUpdate(metering: number): void {
  lastMeteringValue = metering;
  const now = Date.now();

  // === ADAPTIVE NOISE FLOOR CALIBRATION ===
  if (isCalibrating) {
    calibrationSamples.push(metering);
    if (now - calibrationStartTime >= NOISE_FLOOR_CALIBRATION_MS) {
      const sorted = [...calibrationSamples].sort((a, b) => a - b);
      noiseFloor = sorted[Math.floor(sorted.length / 2)];
      isCalibrating = false;
      if (__DEV__) {
        console.log(`[STT] Noise floor calibrated: ${noiseFloor.toFixed(1)} dB (${calibrationSamples.length} samples)`);
      }
    }
    meteringCallback?.(metering, false, 0);
    return;
  }

  // Update peak level
  if (metering > peakLevel) {
    peakLevel = metering;
  }

  // === ADAPTIVE SPEECH/SILENCE DETECTION WITH HYSTERESIS ===
  const speechThreshold = noiseFloor + SPEECH_THRESHOLD_DB;
  const silenceEnterThreshold = noiseFloor + SILENCE_ENTER_THRESHOLD_DB;
  const silenceExitThreshold = noiseFloor + SILENCE_EXIT_THRESHOLD_DB;

  const isSpeakingNow = metering > speechThreshold;
  const belowEnterThreshold = metering < silenceEnterThreshold;
  const aboveExitThreshold = metering > silenceExitThreshold;

  // Detect when user starts speaking
  if (isSpeakingNow && !speechDetected) {
    speechDetected = true;
    inSilence = false;
    silenceStartTime = null;
    aboveExitThresholdStart = null;
    if (__DEV__) {
      console.log(`[STT] Speech detected (${metering.toFixed(1)} dB > ${speechThreshold.toFixed(1)} dB)`);
    }
  }

  // Only track silence AFTER speech has been detected
  if (speechDetected) {
    if (!inSilence) {
      if (belowEnterThreshold) {
        inSilence = true;
        silenceStartTime = now;
        aboveExitThresholdStart = null;
        if (__DEV__) {
          console.log(`[STT] Silence ENTERED (${metering.toFixed(1)} dB < ${silenceEnterThreshold.toFixed(1)} dB)`);
        }
      }
    } else {
      if (aboveExitThreshold) {
        if (!aboveExitThresholdStart) {
          aboveExitThresholdStart = now;
        } else if (now - aboveExitThresholdStart >= SILENCE_BREAK_DEBOUNCE_MS) {
          inSilence = false;
          const silenceDuration = silenceStartTime ? now - silenceStartTime : 0;
          silenceStartTime = null;
          aboveExitThresholdStart = null;
          if (__DEV__) {
            console.log(`[STT] Silence EXITED after ${(silenceDuration / 1000).toFixed(1)}s (${metering.toFixed(1)} dB > ${silenceExitThreshold.toFixed(1)} dB for ${SILENCE_BREAK_DEBOUNCE_MS}ms)`);
          }
        }
      } else {
        aboveExitThresholdStart = null;
      }
    }
  }

  // Notify subscriber
  const silenceDuration = silenceStartTime ? now - silenceStartTime : 0;
  meteringCallback?.(metering, inSilence, silenceDuration);
}

/**
 * Subscribe to metering updates for silence detection
 * @param callback Called with (metering in dB, isSilent boolean, silence duration in ms)
 * @returns Unsubscribe function
 */
export function subscribeToMetering(
  callback: (metering: number, isSilent: boolean, silenceDurationMs: number) => void
): () => void {
  meteringCallback = callback;
  return () => {
    meteringCallback = null;
  };
}

/**
 * Get current metering value
 */
export function getCurrentMetering(): number {
  return lastMeteringValue;
}

/**
 * Check if currently silent (using hysteresis state)
 */
export function isSilent(): boolean {
  return inSilence;
}

/**
 * Get how long silence has been detected (in ms)
 */
export function getSilenceDuration(): number {
  if (!silenceStartTime) return 0;
  return Date.now() - silenceStartTime;
}

/**
 * Pre-check microphone permission (call on app start)
 * Avoids permission check delay during recording
 */
export async function preCheckPermission(): Promise<boolean> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    permissionGranted = status === 'granted';
    lastPermissionCheck = Date.now();
    return permissionGranted;
  } catch {
    return false;
  }
}

/**
 * Force reset audio session - clears any stale audio state
 * Call this when recovering from errors or after long inactivity
 *
 * @param aggressive - If true, use longer delays and more thorough reset
 */
async function resetAudioSession(aggressive: boolean = false): Promise<void> {
  const delay = aggressive ? 600 : 300;

  // Step 1: Disable all audio recording capabilities
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
      ...(Platform.OS === 'ios' ? { interruptionModeIOS: 0 } : {}), // Mix with others
    });
  } catch {
    // Ignore errors during reset
  }

  // Step 2: Wait for the audio system to release resources
  await new Promise(resolve => setTimeout(resolve, delay));

  // Step 3: On aggressive reset, do an additional cycle
  if (aggressive) {
    // Reset to playback mode first (helps clear recording state on some devices)
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {
      // Ignore
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Step 4: Now set recording mode fresh with iOS-specific options
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    ...(Platform.OS === 'ios' ? { interruptionModeIOS: 1 } : {}), // Do not mix - take exclusive access
  });

  // Step 5: Additional delay to ensure mode is active (critical for iOS)
  await new Promise(resolve => setTimeout(resolve, aggressive ? 200 : 150));
}

/**
 * Wait for any pending operation to complete
 * This prevents race conditions between start/stop/cancel/reset
 */
async function waitForPendingOperation(): Promise<void> {
  if (operationPromise) {
    if (__DEV__) console.log(`[STT] Waiting for pending ${operationInProgress} operation...`);
    try {
      await operationPromise;
    } catch {
      // Ignore errors from previous operation
    }
    // Small delay to ensure audio system is fully released
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Check if audio state is stale (hasn't been used recently)
 * After long inactivity, the audio system may need a reset before recording
 */
function isAudioStale(): boolean {
  if (lastSuccessfulRecordingTime === 0) {
    // Never recorded before - consider stale on first use
    return true;
  }
  return Date.now() - lastSuccessfulRecordingTime > STALE_AUDIO_THRESHOLD_MS;
}

/**
 * Start recording - with proper cleanup, retry logic, and error handling
 *
 * Uses Audio.Recording.createAsync which is the recommended pattern
 * and handles prepare + start atomically to avoid "not prepared" errors.
 *
 * If recording fails (e.g., after long inactivity), it will:
 * 1. Do progressive cleanup and reset
 * 2. Retry up to 3 times with increasing aggressiveness
 * 3. On final attempt, use "warm-up" recording technique
 */
export async function startRecording(): Promise<void> {
  // Wait for any pending stop/cancel operation to complete
  await waitForPendingOperation();

  // Prevent concurrent start operations
  if (operationInProgress === 'starting' || operationInProgress === 'recording') {
    if (__DEV__) console.log(`[STT] Already ${operationInProgress}, ignoring start request`);
    return;
  }

  operationInProgress = 'starting';

  // Clean up any existing recording first
  await cleanupRecording();

  // Re-check permission if cache is stale (> 5 minutes old)
  const isPermissionStale = Date.now() - lastPermissionCheck > PERMISSION_CACHE_DURATION;
  if (!permissionGranted || isPermissionStale) {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Microphone permission not granted');
    }
    permissionGranted = true;
    lastPermissionCheck = Date.now();
  }

  // Try to start recording with progressive retry strategy
  let lastError: Error | null = null;
  const maxAttempts = 3;
  const audioIsStale = isAudioStale();

  if (__DEV__ && audioIsStale) {
    const staleDuration = lastSuccessfulRecordingTime > 0
      ? Math.round((Date.now() - lastSuccessfulRecordingTime) / 1000)
      : 'never';
    console.log(`[STT] Audio is stale (last recording: ${staleDuration}s ago), will do reset on first attempt`);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Progressive reset strategy:
      // Attempt 1: Normal setup (or standard reset if audio is stale)
      // Attempt 2: Standard reset (200ms delay)
      // Attempt 3: Aggressive reset (500ms delay) + warm-up recording
      if (attempt === 1) {
        if (audioIsStale) {
          // Audio hasn't been used recently - do a preventive reset
          if (__DEV__) console.log('[STT] Attempt 1: Preventive reset for stale audio...');
          await resetAudioSession(false);
        } else {
          // Audio was used recently - simple mode set should work
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        }
      } else if (attempt === 2) {
        if (__DEV__) console.log('[STT] Attempt 2: Standard audio session reset...');
        await resetAudioSession(false);
      } else {
        if (__DEV__) console.log('[STT] Attempt 3: Nuclear reset + manual prepare...');

        // Nuclear option: Fully disable audio, wait longer, then re-enable
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
        } catch {}

        // Longer wait to ensure audio system is fully released
        await new Promise(resolve => setTimeout(resolve, 800));

        // Re-request permission to ensure fresh audio session
        try {
          await Audio.requestPermissionsAsync();
        } catch {}

        await new Promise(resolve => setTimeout(resolve, 200));

        // Set recording mode with fresh state
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Wait for mode to take effect
        await new Promise(resolve => setTimeout(resolve, 300));

        // On attempt 3, use manual prepare + start instead of createAsync
        // This gives us more control and allows adding delays between steps
        if (__DEV__) console.log('[STT] Using manual prepareToRecordAsync + startAsync...');

        const manualRecording = new Audio.Recording();
        await manualRecording.prepareToRecordAsync(STT_RECORDING_PRESET);

        // Wait after prepare before starting
        await new Promise(resolve => setTimeout(resolve, 150));

        // Set up status callback for metering
        let meteringLogCounter = 0;
        manualRecording.setOnRecordingStatusUpdate((status) => {
          if (__DEV__ && meteringLogCounter < 5) {
            console.log(`[STT] Status #${meteringLogCounter}: metering=${status.metering?.toFixed(1)}`);
            meteringLogCounter++;
          }

          if (status.isRecording && status.metering !== undefined) {
            handleMeteringUpdate(status.metering);
          }
        });
        manualRecording.setProgressUpdateInterval(METERING_UPDATE_INTERVAL_MS);

        await manualRecording.startAsync();

        recording = manualRecording;
        recordingStartTime = Date.now();
        lastSuccessfulRecordingTime = Date.now();
        operationInProgress = 'recording';
        operationPromise = null;

        // Reset adaptive silence detection state
        resetSilenceDetectionState();

        if (__DEV__) console.log('[STT] Recording started (attempt 3 - manual method)');
        return; // Success with manual method!
      }

      // Use createAsync which handles prepare + start atomically
      // This is more reliable than manual prepareToRecordAsync + startAsync
      let meteringLogCounter = 0;
      const { recording: newRecording } = await Audio.Recording.createAsync(
        STT_RECORDING_PRESET,
        // Status callback for metering (adaptive silence detection + waveform visualization)
        (status) => {
          // Debug: Log first few status updates to verify metering is working
          if (__DEV__ && meteringLogCounter < 5) {
            console.log(`[STT] Status #${meteringLogCounter}: metering=${status.metering?.toFixed(1)}`);
            meteringLogCounter++;
          }

          if (status.isRecording && status.metering !== undefined) {
            handleMeteringUpdate(status.metering);
          }
        },
        METERING_UPDATE_INTERVAL_MS // Update interval for metering
      );

      recording = newRecording;
      recordingStartTime = Date.now();
      lastSuccessfulRecordingTime = Date.now(); // Track for stale detection
      operationInProgress = 'recording';
      operationPromise = null;

      // Reset adaptive silence detection state
      resetSilenceDetectionState();

      if (__DEV__) console.log(`[STT] Recording started (attempt ${attempt})`);
      return; // Success!

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (__DEV__) {
        console.warn(`[STT] Recording attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
      }

      // Clean up before retry
      await cleanupRecording();

      // Add delay between attempts (increasing with each attempt)
      if (attempt < maxAttempts) {
        const delayMs = attempt * 200; // 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All attempts failed - reset audio mode and throw
  operationInProgress = 'idle';
  operationPromise = null;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
  }).catch(() => {});

  throw lastError || new Error('Failed to start recording');
}

/**
 * Aggressively clean up any existing recording and audio state
 * This tries multiple approaches to ensure the recording is fully released
 */
async function cleanupRecording(): Promise<void> {
  const rec = recording;
  recording = null; // Clear reference immediately to prevent race conditions

  if (rec) {
    // Method 1: Try to get status and use appropriate cleanup
    try {
      const status = await rec.getStatusAsync().catch(() => null);

      if (status?.isRecording) {
        // Recording is active - stop it properly
        await rec.stopAndUnloadAsync().catch(() => {});
      } else if (status?.canRecord) {
        // Recording is prepared but not started - unload it
        await rec.stopAndUnloadAsync().catch(() => {});
      } else {
        // Unknown state - try stopAndUnloadAsync anyway
        await rec.stopAndUnloadAsync().catch(() => {});
      }
    } catch {
      // Method 2: getStatusAsync failed, try direct cleanup
      try {
        await rec.stopAndUnloadAsync();
      } catch {
        // Method 3: Even stopAndUnloadAsync failed, try _cleanupForUnloadedRecorder
        // This is an internal expo-av method that forces cleanup
        try {
          if (typeof (rec as any)._cleanupForUnloadedRecorder === 'function') {
            (rec as any)._cleanupForUnloadedRecorder();
          }
        } catch {
          // All cleanup attempts exhausted
        }
      }
    }
  }
}

/**
 * Stop recording - returns URI after fully stopping
 *
 * This properly releases the audio session to prevent "recorder not prepared"
 * errors on subsequent recordings.
 */
export async function stopRecording(): Promise<string> {
  if (!recording) {
    operationInProgress = 'idle';
    throw new Error('No active recording');
  }

  // Mark as stopping - this allows startRecording to wait
  operationInProgress = 'stopping';

  const rec = recording;
  recording = null; // Clear reference to prevent double-stop

  let uri: string | null = null;
  let stopError: Error | null = null;

  // Create a promise that tracks the stop operation
  operationPromise = (async () => {
    try {
      // Stop and unload the recording
      await rec.stopAndUnloadAsync();
      uri = rec.getURI();

      if (__DEV__) {
        const duration = (Date.now() - recordingStartTime) / 1000;
        console.log(`[STT] Stopped, ${duration.toFixed(1)}s`);
      }

      // IMPORTANT: Reset audio mode after stopping to prevent stale sessions
      // This was previously skipped "to save time" but caused "recorder not prepared" errors
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});

      // Small delay to ensure audio system is fully released
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      stopError = error instanceof Error ? error : new Error(String(error));
      if (__DEV__) console.warn('[STT] Error during stop:', stopError.message);
    } finally {
      operationInProgress = 'idle';
      operationPromise = null;
    }
  })();

  // Wait for the stop operation to complete
  await operationPromise;

  if (stopError) {
    throw stopError;
  }

  if (!uri) {
    throw new Error('Failed to get recording URI');
  }

  return uri;
}

/**
 * Cancel recording without saving
 */
export async function cancelRecording(): Promise<void> {
  // Wait for any pending operation first
  await waitForPendingOperation();

  // Mark as stopping during cleanup
  operationInProgress = 'stopping';

  operationPromise = (async () => {
    try {
      await cleanupRecording();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});

      // Small delay to ensure audio system is fully released
      await new Promise(resolve => setTimeout(resolve, 50));
    } finally {
      operationInProgress = 'idle';
      operationPromise = null;
    }
  })();

  await operationPromise;
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  return recording !== null && operationInProgress === 'recording';
}

/**
 * Check if any recording operation is in progress
 */
export function isOperationInProgress(): boolean {
  return operationInProgress !== 'idle';
}

/**
 * Get current operation state (for debugging)
 */
export function getOperationState(): string {
  return operationInProgress;
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

/**
 * Force reset audio state - use to recover from errors
 * This cleans up any stale recording and resets the audio session.
 *
 * IMPORTANT: This properly sets operationPromise so that
 * waitForPendingOperation() in startRecording() will wait for it.
 */
export async function resetAudio(): Promise<void> {
  // Wait for any pending operation
  await waitForPendingOperation();

  // Mark as resetting and set operationPromise so others can wait
  operationInProgress = 'resetting';

  operationPromise = (async () => {
    try {
      await cleanupRecording();
      await resetAudioSession(true); // Aggressive reset
      if (__DEV__) console.log('[STT] Audio state reset complete');
    } finally {
      operationInProgress = 'idle';
      operationPromise = null;
    }
  })();

  // Wait for the reset to complete
  await operationPromise;
}

export default {
  preCheckPermission,
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  isOperationInProgress,
  getOperationState,
  getRecordingDuration,
  isMaxDurationReached,
  transcribeAudio,
  stopAndTranscribe,
  getTranscriptionPrompt,
  resetAudio,
  // Metering / silence detection
  subscribeToMetering,
  getCurrentMetering,
  isSilent,
  getSilenceDuration,
};
