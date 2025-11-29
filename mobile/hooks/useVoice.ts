/**
 * useVoice Hook
 *
 * Easy-to-use hook for voice features in Faith Assistant.
 * Combines TTS (speaking) and STT (listening) with state management.
 *
 * Features:
 * - One-tap voice input
 * - Auto language detection
 * - Speaking state with pause/resume
 * - Error handling
 * - Loading states
 *
 * Usage:
 * ```tsx
 * const { speak, startListening, stopListening, isListening, isSpeaking } = useVoice();
 *
 * // Speak a response
 * await speak("Hello, how can I help you?");
 *
 * // Listen for voice input
 * startListening();
 * // ... user speaks ...
 * const text = await stopListening();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
  type TranscriptionOptions,
  type TranscriptionResult,
} from '@/services/voice/voiceInputService';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import {
  DEV_OPENAI_API_KEY,
  DEV_GROQ_API_KEY,
  DEFAULT_STT_PROVIDER,
  type STTProvider,
} from '@/constants/voice';

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
  } = options || {};

  // Get API key and settings from store
  const {
    getEffectiveApiKey,
    getEffectiveVoice,
    getEffectiveSpeed,
    getEffectiveModel,
    isEnabled,
    isLoaded,
  } = useVoiceSettingsStore();

  // In dev mode, always use hardcoded key for immediate testing
  const apiKey = DEV_OPENAI_API_KEY || getEffectiveApiKey();
  const systemVoice = getEffectiveVoice();
  const systemSpeed = getEffectiveSpeed();
  const systemModel = getEffectiveModel();

  // Determine STT provider and key
  // Groq is ~10x faster than OpenAI for STT (0.3-0.5s vs 2-4s)
  const sttProvider: STTProvider = DEV_GROQ_API_KEY ? 'groq' : DEFAULT_STT_PROVIDER;
  const sttApiKey = sttProvider === 'groq' ? DEV_GROQ_API_KEY : apiKey;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const recordingStartTimeRef = useRef<number>(0);

  // Pre-check permission on mount (speeds up first recording by ~100ms)
  useEffect(() => {
    preCheckPermission();
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
   * Speak text aloud
   */
  const speak = useCallback(
    async (text: string, opts?: TTSOptions) => {
      if (!apiKey) {
        handleError(new Error('OpenAI API key not configured'));
        return;
      }

      try {
        setIsProcessing(true);
        setIsSpeaking(true);
        setError(null);

        // Apply system defaults if not overridden
        const effectiveOpts: TTSOptions = {
          voice: systemVoice,
          speed: systemSpeed,
          model: systemModel,
          ...ttsOptions,
          ...opts,
        };

        await speakText(text, apiKey, effectiveOpts);

        setIsSpeaking(false);
        setIsProcessing(false);
        onSpeechComplete?.();
      } catch (err) {
        setIsSpeaking(false);
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [apiKey, systemVoice, systemSpeed, systemModel, ttsOptions, onSpeechComplete, handleError]
  );

  /**
   * Stop speaking
   */
  const stopSpeech = useCallback(async () => {
    try {
      await stopSpeaking();
      setIsSpeaking(false);
    } catch (err) {
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

      await startRecording();
      setIsListening(true);

      // Start duration tracking (250ms is smooth enough for UI)
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
      }, 250);
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sttApiKey, handleError]);

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

    try {
      await cancelRecording();
      setIsListening(false);
      setRecordingDuration(0);
    } catch (err) {
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
    // Voice is available if we have TTS key (OpenAI) or STT key (OpenAI/Groq)
    // In dev mode, always available; in production, check store state
    isAvailable:
      !!DEV_OPENAI_API_KEY ||
      !!DEV_GROQ_API_KEY ||
      (isLoaded && isEnabled && !!apiKey),
  };
}

export default useVoice;
