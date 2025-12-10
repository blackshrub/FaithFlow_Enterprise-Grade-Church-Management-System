/**
 * useVoice Hook
 *
 * Easy-to-use hook for voice features in Faith Assistant.
 * Combines TTS (speaking via Google Cloud TTS) and STT (listening via Groq/OpenAI) with state management.
 *
 * Features:
 * - One-tap voice input (Groq STT - 10x faster than OpenAI)
 * - Auto language detection (Indonesian/English)
 * - Bilingual WaveNet voices (Google Cloud TTS)
 * - Speaking state with pause/resume
 * - Error handling
 * - Loading states
 *
 * Usage:
 * ```tsx
 * const { speak, startListening, stopListening, isListening, isSpeaking } = useVoice();
 *
 * // Speak a response (Google Cloud TTS)
 * await speak("Hello, how can I help you?");
 *
 * // Listen for voice input (Groq/OpenAI Whisper)
 * startListening();
 * // ... user speaks ...
 * const text = await stopListening();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking as checkIsSpeaking,
  type TTSOptions,
} from '@/services/voice/speechService';
import {
  startRecording,
  stopAndTranscribe,
  cancelRecording,
  isRecording as checkIsRecording,
  getTranscriptionPrompt,
  preCheckPermission,
  resetAudio,
  subscribeToMetering,
  type TranscriptionOptions,
  type TranscriptionResult,
} from '@/services/voice/voiceInputService';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import {
  DEV_GOOGLE_TTS_API_KEY,
  DEV_GROQ_API_KEY,
  DEV_OPENAI_API_KEY,
  DEFAULT_STT_PROVIDER,
  type STTProvider,
} from '@/constants/voice';
import { logError } from '@/utils/errorHelpers';

export interface UseVoiceOptions {
  /** Default language hint for better accuracy */
  defaultLanguage?: 'en' | 'id';
  /** TTS options */
  ttsOptions?: TTSOptions;
  /** STT options */
  sttOptions?: TranscriptionOptions;
  /** Callback when transcription completes */
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  /** Callback when speech completes */
  onSpeechComplete?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback for real-time metering updates (for waveform visualization + silence detection) */
  onMeteringUpdate?: (metering: number, isSilent: boolean, silenceDurationMs: number) => void;
}

export interface UseVoiceReturn {
  /** Start speaking text */
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  /** Stop speaking */
  stopSpeech: () => Promise<void>;
  /** Pause speaking */
  pauseSpeech: () => Promise<void>;
  /** Resume speaking */
  resumeSpeech: () => Promise<void>;
  /** Whether currently speaking */
  isSpeaking: boolean;

  /** Start listening for voice input */
  startListening: () => Promise<void>;
  /** Stop listening and get transcription */
  stopListening: () => Promise<TranscriptionResult | null>;
  /** Cancel listening without transcribing */
  cancelListening: () => Promise<void>;
  /** Whether currently listening */
  isListening: boolean;
  /** Recording duration in seconds */
  recordingDuration: number;

  /** Whether any voice operation is in progress */
  isProcessing: boolean;
  /** Last error if any */
  error: Error | null;
  /** Clear error */
  clearError: () => void;
  /** Whether voice is available */
  isAvailable: boolean;

  // Metering / Silence detection
  /** Current audio level in dB (updated ~10 times per second during recording) */
  metering: number;
  /** Whether currently silent (below threshold) */
  isSilent: boolean;
  /** How long silence has been detected (in ms) */
  silenceDuration: number;
}

/**
 * Hook for voice input and output
 */
export function useVoice(options?: UseVoiceOptions): UseVoiceReturn {
  const {
    defaultLanguage,
    ttsOptions,
    sttOptions,
    onTranscriptionComplete,
    onSpeechComplete,
    onError,
    onMeteringUpdate,
  } = options || {};

  // Get API key and settings from store
  const {
    getEffectiveApiKey,
    getEffectiveVoice,
    getEffectiveSpeed,
    isEnabled,
    isLoaded,
  } = useVoiceSettingsStore();

  // In dev mode, always use hardcoded key for immediate testing
  // TTS uses Google Cloud TTS
  const ttsApiKey = DEV_GOOGLE_TTS_API_KEY || getEffectiveApiKey();
  const systemVoice = getEffectiveVoice();
  const systemSpeed = getEffectiveSpeed();

  // Determine STT provider and key
  // Groq is ~10x faster than OpenAI for STT (0.3-0.5s vs 2-4s)
  const sttProvider: STTProvider = DEV_GROQ_API_KEY ? 'groq' : DEFAULT_STT_PROVIDER;
  const sttApiKey = sttProvider === 'groq' ? DEV_GROQ_API_KEY : DEV_OPENAI_API_KEY;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Metering state for waveform visualization and silence detection
  const [metering, setMetering] = useState(-160); // dB
  const [isSilentState, setIsSilentState] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const recordingStartTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const meteringUnsubscribeRef = useRef<(() => void) | null>(null);
  const lastBackgroundTimeRef = useRef<number>(0);

  // Pre-check permission on mount (speeds up first recording by ~100ms)
  useEffect(() => {
    preCheckPermission();
  }, []);

  // Reset audio when app comes back from background after inactivity
  // This prevents "recorder not prepared" errors after the app was in background
  // Threshold matches STALE_AUDIO_THRESHOLD_MS in voiceInputService.ts (30 seconds)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;

      // App was in background and is now active
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        const backgroundDuration = Date.now() - lastBackgroundTimeRef.current;

        // If app was in background for more than 30 seconds, reset audio session
        // This prevents "recorder not prepared" errors from stale audio state
        // Note: resetAudio() now properly uses operationPromise, so startRecording
        // will wait for it to complete (no more race conditions)
        if (backgroundDuration > 30 * 1000) {
          if (__DEV__) {
            console.log(`[useVoice] App returned after ${Math.round(backgroundDuration / 1000)}s, resetting audio...`);
          }
          // Reset audio (properly tracked with operationPromise now)
          resetAudio().catch((err) => {
            logError('Voice', 'backgroundAudioReset', err, 'warning');
          });
          // Also re-check permission in case it was revoked
          preCheckPermission();
        }
      }

      // App is going to background - record the time
      if (nextAppState.match(/inactive|background/)) {
        lastBackgroundTimeRef.current = Date.now();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      stopSpeaking();
      cancelRecording();
    };
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback(
    (err: Error) => {
      setError(err);
      setIsProcessing(false);
      onError?.(err);
      console.error('[useVoice] Error:', err);
    },
    [onError]
  );

  /**
   * Speak text aloud using Google Cloud TTS
   */
  const speak = useCallback(
    async (text: string, opts?: TTSOptions) => {
      if (!ttsApiKey) {
        handleError(new Error('Google Cloud TTS API key not configured'));
        return;
      }

      try {
        setIsProcessing(true);
        setIsSpeaking(true);
        setError(null);

        // Apply system defaults if not overridden
        const effectiveOpts: TTSOptions = {
          voice: systemVoice,
          speakingRate: systemSpeed,
          ...ttsOptions,
          ...opts,
        };

        await speakText(text, ttsApiKey, effectiveOpts);

        setIsSpeaking(false);
        setIsProcessing(false);
        onSpeechComplete?.();
      } catch (err) {
        setIsSpeaking(false);
        logError('Voice', 'speak', err, 'warning');
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [ttsApiKey, systemVoice, systemSpeed, ttsOptions, onSpeechComplete, handleError]
  );

  /**
   * Stop speaking
   */
  const stopSpeech = useCallback(async () => {
    try {
      await stopSpeaking();
      setIsSpeaking(false);
    } catch (err) {
      logError('Voice', 'stopSpeech', err, 'warning');
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [handleError]);

  /**
   * Pause speaking
   */
  const pauseSpeech = useCallback(async () => {
    try {
      await pauseSpeaking();
    } catch (err) {
      logError('Voice', 'pauseSpeech', err, 'warning');
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [handleError]);

  /**
   * Resume speaking
   */
  const resumeSpeech = useCallback(async () => {
    try {
      await resumeSpeaking();
    } catch (err) {
      logError('Voice', 'resumeSpeech', err, 'warning');
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [handleError]);

  /**
   * Start listening for voice input
   */
  const startListeningFn = useCallback(async () => {
    if (!sttApiKey) {
      handleError(new Error('No STT API key configured (OpenAI or Groq)'));
      return;
    }

    try {
      // Stop any current speech first
      if (checkIsSpeaking()) {
        await stopSpeaking();
        setIsSpeaking(false);
      }

      setError(null);
      setRecordingDuration(0);
      recordingStartTimeRef.current = Date.now();

      // Subscribe to metering updates BEFORE starting recording
      // This ensures we don't miss any metering updates
      if (__DEV__) console.log('[useVoice] Subscribing to metering updates...');
      meteringUnsubscribeRef.current = subscribeToMetering((meter, silent, silenceDur) => {
        setMetering(meter);
        setIsSilentState(silent);
        setSilenceDuration(silenceDur);
        onMeteringUpdate?.(meter, silent, silenceDur);
        // Debug: Log every 10th update to avoid log spam
        if (__DEV__ && Math.random() < 0.1) {
          console.log(`[useVoice] Metering: ${meter.toFixed(1)} dB, silent: ${silent}, silenceDur: ${(silenceDur / 1000).toFixed(1)}s`);
        }
      });

      await startRecording();
      setIsListening(true);

      // Start duration tracking (250ms is smooth enough for UI)
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 250);
    } catch (err) {
      logError('Voice', 'startListening', err, 'warning');
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sttApiKey, handleError, onMeteringUpdate]);

  /**
   * Stop listening and transcribe
   * Uses Groq Whisper when available (~10x faster than OpenAI)
   */
  const stopListeningFn =
    useCallback(async (): Promise<TranscriptionResult | null> => {
      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Unsubscribe from metering
      if (meteringUnsubscribeRef.current) {
        meteringUnsubscribeRef.current();
        meteringUnsubscribeRef.current = null;
      }

      // Reset metering state
      setMetering(-160);
      setIsSilentState(false);
      setSilenceDuration(0);

      if (!checkIsRecording()) {
        setIsListening(false);
        return null;
      }

      if (!sttApiKey) {
        setIsListening(false);
        handleError(new Error('No STT API key configured'));
        return null;
      }

      try {
        setIsProcessing(true);

        // Build transcription options with language hint and prompt
        const transcribeOpts: TranscriptionOptions = {
          ...sttOptions,
        };

        // Add language-specific prompt for better accuracy
        if (defaultLanguage) {
          transcribeOpts.language = defaultLanguage;
          transcribeOpts.prompt = getTranscriptionPrompt(defaultLanguage);
        }

        if (__DEV__) console.log(`[useVoice] STT: ${sttProvider}`);
        const result = await stopAndTranscribe(sttApiKey, transcribeOpts, sttProvider);

        setIsListening(false);
        setIsProcessing(false);
        setRecordingDuration(0);

        onTranscriptionComplete?.(result);

        return result;
      } catch (err) {
        setIsListening(false);
        setRecordingDuration(0);
        logError('Voice', 'stopListening', err, 'warning');
        handleError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    }, [sttApiKey, sttProvider, defaultLanguage, sttOptions, onTranscriptionComplete, handleError]);

  /**
   * Cancel listening without transcribing
   */
  const cancelListeningFn = useCallback(async () => {
    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Unsubscribe from metering
    if (meteringUnsubscribeRef.current) {
      meteringUnsubscribeRef.current();
      meteringUnsubscribeRef.current = null;
    }

    // Reset metering state
    setMetering(-160);
    setIsSilentState(false);
    setSilenceDuration(0);

    try {
      await cancelRecording();
      setIsListening(false);
      setRecordingDuration(0);
    } catch (err) {
      logError('Voice', 'cancelListening', err, 'warning');
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [handleError]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // TTS
    speak,
    stopSpeech,
    pauseSpeech,
    resumeSpeech,
    isSpeaking,

    // STT
    startListening: startListeningFn,
    stopListening: stopListeningFn,
    cancelListening: cancelListeningFn,
    isListening,
    recordingDuration,

    // General
    isProcessing,
    error,
    clearError,
    // Voice is available if we have TTS key (Google) or STT key (Groq/OpenAI)
    // In dev mode, always available; in production, check store state
    isAvailable:
      !!DEV_GOOGLE_TTS_API_KEY ||
      !!DEV_GROQ_API_KEY ||
      (isLoaded && isEnabled && !!ttsApiKey),

    // Metering / Silence detection
    metering,
    isSilent: isSilentState,
    silenceDuration,
  };
}

export default useVoice;
