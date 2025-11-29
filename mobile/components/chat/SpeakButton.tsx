/**
 * SpeakButton Component
 *
 * Button to read text aloud using OpenAI TTS.
 * Shows play/pause/stop states with visual feedback.
 * Uses API key from voiceSettings store.
 *
 * Usage:
 * ```tsx
 * <SpeakButton text={assistantResponse} />
 * ```
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react-native';
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  type TTSVoice,
} from '@/services/voice/speechService';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';

interface SpeakButtonProps {
  /** Text to speak */
  text: string;
  /** Optional voice override */
  voice?: TTSVoice;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Button size */
  size?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Icon color */
  color?: string;
}

type SpeakState = 'idle' | 'loading' | 'playing' | 'paused';

export function SpeakButton({
  text,
  voice,
  onStart,
  onEnd,
  onError,
  size = 24,
  disabled = false,
  color = '#6B7280',
}: SpeakButtonProps) {
  const [state, setState] = useState<SpeakState>('idle');
  const { isEnabled, getEffectiveApiKey, preferences } = useVoiceSettingsStore();

  const handlePress = useCallback(async () => {
    if (disabled || !text || !isEnabled) return;

    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      console.warn('[SpeakButton] No API key available');
      onError?.(new Error('No API key configured'));
      return;
    }

    try {
      switch (state) {
        case 'idle':
          // Start speaking
          setState('loading');
          onStart?.();

          setState('playing');
          await speakText(text, apiKey, {
            voice: voice ?? preferences.voice,
            speed: preferences.speed,
            model: preferences.useHDModel ? 'tts-1-hd' : 'tts-1',
          });

          setState('idle');
          onEnd?.();
          break;

        case 'playing':
          // Pause
          await pauseSpeaking();
          setState('paused');
          break;

        case 'paused':
          // Resume
          await resumeSpeaking();
          setState('playing');
          break;

        case 'loading':
          // Cancel loading
          await stopSpeaking();
          setState('idle');
          break;
      }
    } catch (error) {
      console.error('[SpeakButton] Error:', error);
      setState('idle');
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [state, text, voice, disabled, isEnabled, getEffectiveApiKey, preferences, onStart, onEnd, onError]);

  const handleLongPress = useCallback(async () => {
    // Stop completely
    await stopSpeaking();
    setState('idle');
  }, []);

  const isDisabled = disabled || !text || !isEnabled;

  const renderIcon = () => {
    const iconSize = size * 0.7;

    switch (state) {
      case 'loading':
        return <ActivityIndicator size="small" color={color} />;

      case 'playing':
        return <Pause size={iconSize} color={color} />;

      case 'paused':
        return <Play size={iconSize} color={color} />;

      default:
        return <Volume2 size={iconSize} color={isDisabled ? '#D1D5DB' : color} />;
    }
  };

  // Don't render if voice is not available
  if (!isEnabled) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        state === 'playing' && styles.buttonActive,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {renderIcon()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default SpeakButton;
