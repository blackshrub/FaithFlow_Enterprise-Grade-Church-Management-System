/**
 * Faith Assistant UI Hook
 *
 * Provides optimistic UI state management for instant feedback.
 * Shows typing indicators, skeleton responses, and smooth transitions.
 *
 * Features:
 * - Immediate visual feedback when user sends message
 * - Typing indicator with realistic timing
 * - Skeleton response placeholder
 * - Smooth transition to real response
 * - Connection warmup on mount
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { warmupConnection, isConnectionWarm } from '@/services/ai/connectionWarmup';

export type AssistantState =
  | 'idle'           // Ready for input
  | 'thinking'       // Processing (show typing indicator)
  | 'streaming'      // Receiving response (show tokens)
  | 'error';         // Error state

export interface OptimisticUIState {
  /** Current state of the assistant */
  state: AssistantState;
  /** Whether to show typing indicator */
  showTypingIndicator: boolean;
  /** Whether to show skeleton placeholder */
  showSkeleton: boolean;
  /** Current streamed text */
  streamedText: string;
  /** Error message if any */
  errorMessage: string | null;
  /** Time spent in current state (ms) */
  stateTime: number;
  /** Whether connection is pre-warmed */
  isWarm: boolean;
}

export interface UseFaithAssistantUIOptions {
  /** Minimum time to show typing indicator (ms) */
  minTypingTime?: number;
  /** Whether to auto-warmup connection on mount */
  autoWarmup?: boolean;
  /** Callback when state changes */
  onStateChange?: (state: AssistantState) => void;
}

const DEFAULT_OPTIONS: Required<UseFaithAssistantUIOptions> = {
  minTypingTime: 800, // At least 800ms typing indicator for natural feel
  autoWarmup: true,
  onStateChange: () => {},
};

/**
 * Hook for managing Faith Assistant UI with optimistic updates
 */
export function useFaithAssistantUI(options?: UseFaithAssistantUIOptions) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<AssistantState>('idle');
  const [streamedText, setStreamedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stateStartTime, setStateStartTime] = useState(Date.now());
  const [isWarm, setIsWarm] = useState(false);

  const minTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canTransitionToStreamingRef = useRef(true);

  // Auto-warmup connection on mount
  useEffect(() => {
    if (opts.autoWarmup) {
      warmupConnection().then(() => {
        setIsWarm(isConnectionWarm());
      });
    }

    return () => {
      if (minTypingTimerRef.current) {
        clearTimeout(minTypingTimerRef.current);
      }
    };
  }, [opts.autoWarmup]);

  /**
   * Transition to new state
   */
  const transitionTo = useCallback((newState: AssistantState) => {
    setState(newState);
    setStateStartTime(Date.now());
    opts.onStateChange(newState);
  }, [opts.onStateChange]);

  /**
   * Start thinking state (user sent message)
   * Shows typing indicator immediately
   */
  const startThinking = useCallback(() => {
    setStreamedText('');
    setErrorMessage(null);
    canTransitionToStreamingRef.current = false;
    transitionTo('thinking');

    // Enforce minimum typing time for natural feel
    minTypingTimerRef.current = setTimeout(() => {
      canTransitionToStreamingRef.current = true;
    }, opts.minTypingTime);
  }, [transitionTo, opts.minTypingTime]);

  /**
   * Start streaming state (first token received)
   */
  const startStreaming = useCallback(() => {
    // Wait for minimum typing time if not elapsed
    if (!canTransitionToStreamingRef.current) {
      // Will transition when timer fires and more tokens arrive
      return;
    }
    transitionTo('streaming');
  }, [transitionTo]);

  /**
   * Add streamed token
   */
  const addToken = useCallback((token: string) => {
    setStreamedText(prev => prev + token);

    // Transition to streaming if we can
    if (state === 'thinking' && canTransitionToStreamingRef.current) {
      transitionTo('streaming');
    }
  }, [state, transitionTo]);

  /**
   * Complete response
   */
  const complete = useCallback(() => {
    if (minTypingTimerRef.current) {
      clearTimeout(minTypingTimerRef.current);
    }
    transitionTo('idle');
  }, [transitionTo]);

  /**
   * Handle error
   */
  const handleError = useCallback((message: string) => {
    if (minTypingTimerRef.current) {
      clearTimeout(minTypingTimerRef.current);
    }
    setErrorMessage(message);
    transitionTo('error');
  }, [transitionTo]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    if (minTypingTimerRef.current) {
      clearTimeout(minTypingTimerRef.current);
    }
    setStreamedText('');
    setErrorMessage(null);
    canTransitionToStreamingRef.current = true;
    transitionTo('idle');
  }, [transitionTo]);

  // Compute derived state
  const uiState: OptimisticUIState = {
    state,
    showTypingIndicator: state === 'thinking',
    showSkeleton: state === 'thinking' && streamedText.length === 0,
    streamedText,
    errorMessage,
    stateTime: Date.now() - stateStartTime,
    isWarm,
  };

  return {
    ...uiState,
    startThinking,
    startStreaming,
    addToken,
    complete,
    handleError,
    reset,
    warmupConnection: () => warmupConnection().then(() => setIsWarm(true)),
  };
}

/**
 * Typing indicator phrases for more natural feel
 */
export const TYPING_PHRASES = {
  en: [
    'Thinking...',
    'Reflecting on Scripture...',
    'Preparing a thoughtful response...',
  ],
  id: [
    'Sedang berpikir...',
    'Merenungkan Firman...',
    'Menyiapkan jawaban...',
  ],
};

/**
 * Get random typing phrase
 */
export function getTypingPhrase(lang: 'en' | 'id' = 'en'): string {
  const phrases = TYPING_PHRASES[lang];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export default useFaithAssistantUI;
