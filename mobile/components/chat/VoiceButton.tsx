/**
 * VoiceButton Component
 *
 * Microphone button for voice input in Faith Assistant.
 * Tap to start/stop recording, shows visual feedback.
 * Uses OpenAI/Groq Whisper API for transcription.
 *
 * Usage:
 * ```tsx
 * <VoiceButton
 *   onTranscription={(text) => sendMessage(text)}
 * />
 * ```
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import { ActivityIndicator } from 'react-native';
import { IS_DEV_VOICE_ENABLED } from '@/constants/voice';

interface VoiceButtonProps {
  /** Callback when transcription completes */
  onTranscription: (text: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Default language hint */
  defaultLanguage?: 'en' | 'id';
  /** Button size */
  size?: number;
  /** Disabled state */
  disabled?: boolean;
}

export function VoiceButton({
  onTranscription,
  onError,
  defaultLanguage = 'id',
  size = 44,
  disabled = false,
}: VoiceButtonProps) {
  const [showProcessing, setShowProcessing] = useState(false);
  const { isEnabled, isLoaded, getEffectiveApiKey } = useVoiceSettingsStore();

  // Pulse animation for recording
  const scale = useSharedValue(1);

  const {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    cancelListening,
    recordingDuration,
    isAvailable,
  } = useVoice({
    defaultLanguage,
    onTranscriptionComplete: (result) => {
      setShowProcessing(false);
      if (result.text) {
        onTranscription(result.text);
      }
    },
    onError: (err) => {
      setShowProcessing(false);
      onError?.(err);
    },
  });

  // Start pulse animation when recording
  const startPulse = useCallback(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [scale]);

  // Stop pulse animation
  const stopPulse = useCallback(() => {
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 200 });
  }, [scale]);

  const handlePress = useCallback(async () => {
    // Show feedback even if not available
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Skip loading check in dev mode (hardcoded API key)
    if (!IS_DEV_VOICE_ENABLED && !isLoaded) {
      console.log('[VoiceButton] Settings still loading...');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Check availability (useVoice hook returns true in dev mode)
    if (!isAvailable) {
      console.log('[VoiceButton] Voice not available (no API key configured)');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onError?.(new Error('Voice not configured. Please contact admin to enable voice features.'));
      return;
    }

    if (disabled || isProcessing) return;

    if (isListening) {
      // Stop recording and transcribe
      stopPulse();
      setShowProcessing(true);
      await stopListening();
    } else {
      // Start recording
      startPulse();
      await startListening();
    }
  }, [disabled, isProcessing, isAvailable, isLoaded, isListening, startListening, stopListening, startPulse, stopPulse, onError]);

  const handleLongPress = useCallback(async () => {
    // Cancel without transcribing
    if (isListening) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      stopPulse();
      await cancelListening();
    }
  }, [isListening, cancelListening, stopPulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Show visual states:
  // - Loading: settings not loaded yet (show loading spinner) - skip in dev mode
  // - Disabled: voice not configured (show grayed out)
  // - Active: recording in progress
  const isSettingsLoading = !IS_DEV_VOICE_ENABLED && !isLoaded;
  const voiceNotConfigured = !IS_DEV_VOICE_ENABLED && isLoaded && !isAvailable;
  const isActive = isListening || showProcessing;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled || isProcessing}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          isActive && styles.buttonActive,
          (disabled || voiceNotConfigured) && styles.buttonDisabled,
          isSettingsLoading && styles.buttonLoading,
        ]}
      >
        {isSettingsLoading ? (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ) : showProcessing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isListening ? (
          <View style={styles.iconContainer}>
            <MicOff size={size * 0.5} color="#FFFFFF" />
            {recordingDuration > 0 && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {Math.floor(recordingDuration)}s
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Mic
            size={size * 0.5}
            color={(disabled || voiceNotConfigured) ? '#9CA3AF' : '#3B82F6'}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLoading: {
    opacity: 0.7,
    backgroundColor: '#E5E7EB',
  },
  iconContainer: {
    position: 'relative',
  },
  durationBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default VoiceButton;
