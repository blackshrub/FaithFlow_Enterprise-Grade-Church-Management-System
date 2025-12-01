/**
 * VoiceButton Component
 *
 * Microphone button for voice input in Faith Assistant.
 * When tapped, shows a WhatsApp-style recording overlay with:
 * - Pulsing recording indicator
 * - Waveform animation
 * - Big send button
 * - Auto-send after 3 seconds of silence
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 *
 * Usage:
 * ```tsx
 * <VoiceButton
 *   onTranscription={(text) => sendMessage(text)}
 * />
 * ```
 */

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  Pressable,
  View,
  Text,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Mic, MicOff, Send, Trash2 } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVoice } from '@/hooks/useVoice';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import { ActivityIndicator } from 'react-native';
import { IS_DEV_VOICE_ENABLED } from '@/constants/voice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom sheet height (approximate)
const SHEET_HEIGHT = 320;

// Colors matching Faith Assistant theme
const Colors = {
  primary: '#DA7756',
  primaryDark: '#C4634A',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  error: '#EF4444',
  recording: '#EF4444',
  recordingLight: '#FEE2E2',
  border: '#E5E7EB',
  blue: '#3B82F6',
};

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
  /** Auto-send after X seconds of silence (0 to disable, default 3 - uses real audio metering) */
  autoSendTimeout?: number;
}

/**
 * Format duration as MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert dB metering value to a normalized 0-1 range
 * Input: -160 (silence) to 0 (max volume)
 * Output: 0 (min) to 1 (max)
 */
const normalizeMeteringToHeight = (metering: number, minHeight = 8, maxHeight = 36): number => {
  // Clamp metering to reasonable range (-60 dB to 0 dB)
  // Values below -60 dB are effectively silence
  const clampedDb = Math.max(-60, Math.min(0, metering));
  // Convert to 0-1 range (linear scale)
  const normalized = (clampedDb + 60) / 60;
  // Map to height range
  return minHeight + normalized * (maxHeight - minHeight);
};

// Pre-calculate variation multipliers for each bar (deterministic, not random)
const BAR_VARIATIONS = Array.from({ length: 20 }, (_, i) =>
  0.8 + (Math.sin(i * 0.7) * 0.2 + Math.cos(i * 1.3) * 0.2)
);

/**
 * Animated waveform bar component - responds to real audio metering
 * Memoized for performance
 */
const WaveformBar = React.memo(({
  index,
  isRecording,
  metering,
}: {
  index: number;
  isRecording: boolean;
  metering: number;
}) => {
  const height = useSharedValue(8);
  const variation = BAR_VARIATIONS[index];

  useEffect(() => {
    if (isRecording) {
      // Use real metering value with pre-calculated variation per bar
      const targetHeight = normalizeMeteringToHeight(metering) * variation;
      // Fast response for real-time feel - no easing for snappier response
      height.value = withTiming(targetHeight, { duration: 50 });
    } else {
      cancelAnimation(height);
      height.value = withTiming(8, { duration: 150 });
    }
  }, [isRecording, metering, variation, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      className="w-1 rounded-sm min-h-[8px]"
      style={[{ backgroundColor: Colors.primary }, animatedStyle]}
    />
  );
});

// Pre-create bar indices array to avoid re-creating on each render
const BAR_INDICES = Array.from({ length: 20 }, (_, i) => i);

/**
 * Waveform visualization container - memoized to avoid re-rendering all bars
 */
const WaveformVisualization = React.memo(({
  isRecording,
  metering,
}: {
  isRecording: boolean;
  metering: number;
}) => (
  <View className="flex-row items-center justify-center gap-[3px] h-10 mb-3">
    {BAR_INDICES.map((i) => (
      <WaveformBar
        key={i}
        index={i}
        isRecording={isRecording}
        metering={metering}
      />
    ))}
  </View>
));

export function VoiceButton({
  onTranscription,
  onError,
  defaultLanguage = 'id',
  size = 44,
  disabled = false,
  autoSendTimeout = 3, // Auto-send after 3 seconds of real silence (uses audio metering)
}: VoiceButtonProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isEnabled, isLoaded, getEffectiveApiKey } = useVoiceSettingsStore();

  // Auto-send state
  const autoSendStartedRef = useRef(false);
  // Ref for handleSend to avoid stale closure in effect
  const handleSendRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Animation values
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const sheetTranslateY = useSharedValue(SHEET_HEIGHT); // Start offscreen (below)
  const backdropOpacity = useSharedValue(0);

  const {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    cancelListening,
    recordingDuration,
    isAvailable,
    // Real-time audio metering for waveform visualization + silence detection
    metering,
    isSilent,
    silenceDuration,
  } = useVoice({
    defaultLanguage,
    onTranscriptionComplete: (result) => {
      setIsTranscribing(false);
      setShowOverlay(false);
      if (result.text) {
        onTranscription(result.text);
      }
    },
    onError: (err) => {
      setIsTranscribing(false);
      setShowOverlay(false);
      onError?.(err);
    },
  });

  // Animate sheet in/out when overlay shows/hides
  useEffect(() => {
    if (showOverlay) {
      // Slide up from bottom - use smooth timing instead of spring to avoid bounce
      sheetTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Slide down to bottom
      sheetTranslateY.value = withTiming(SHEET_HEIGHT, { duration: 200, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [showOverlay]);

  // Start pulse animation when recording
  useEffect(() => {
    if (isListening && !isTranscribing) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isListening, isTranscribing]);

  // Auto-send: Trigger when silence is detected for the specified duration
  // Uses real audio metering-based silence detection instead of a fixed timer
  useEffect(() => {
    // Only run when recording and auto-send is enabled
    if (!showOverlay || autoSendTimeout <= 0) {
      autoSendStartedRef.current = false;
      return;
    }

    // Skip if not listening or already transcribing
    if (!isListening || isTranscribing) {
      return;
    }

    // Require minimum recording duration (1s) before allowing auto-send
    // This gives user time to start speaking
    if (recordingDuration < 1) {
      return;
    }

    // Debug: Log auto-send check periodically
    if (__DEV__ && Math.random() < 0.05) {
      console.log(`[VoiceButton] Auto-send check: isSilent=${isSilent}, silenceDur=${(silenceDuration / 1000).toFixed(1)}s, threshold=${autoSendTimeout}s`);
    }

    // Check if silence duration exceeds threshold
    const silenceThresholdMs = autoSendTimeout * 1000;
    if (isSilent && silenceDuration >= silenceThresholdMs) {
      // Prevent multiple triggers
      if (autoSendStartedRef.current) {
        return;
      }
      autoSendStartedRef.current = true;

      if (__DEV__) {
        console.log(`[VoiceButton] Auto-sending after ${(silenceDuration / 1000).toFixed(1)}s of silence`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleSendRef.current?.();
    } else if (!isSilent) {
      // Reset flag when user starts speaking again
      autoSendStartedRef.current = false;
    }
  }, [showOverlay, autoSendTimeout, isListening, isTranscribing, recordingDuration, isSilent, silenceDuration]);


  const handlePress = useCallback(async () => {
    // Show feedback even if not available
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

    if (disabled || isProcessing || isTranscribing) return;

    // Start recording and show overlay
    setShowOverlay(true);
    await startListening();
  }, [disabled, isProcessing, isTranscribing, isAvailable, isLoaded, startListening, onError]);

  const handleSend = useCallback(async () => {
    if (!isListening || isTranscribing) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Reset auto-send flag
    autoSendStartedRef.current = false;

    setIsTranscribing(true);
    await stopListening();
  }, [isListening, isTranscribing, stopListening]);

  // Keep handleSendRef in sync
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const handleCancel = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Reset auto-send flag
    autoSendStartedRef.current = false;

    await cancelListening();
    setIsTranscribing(false);
    setShowOverlay(false);
  }, [cancelListening]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Show visual states
  const isSettingsLoading = !IS_DEV_VOICE_ENABLED && !isLoaded;
  const voiceNotConfigured = !IS_DEV_VOICE_ENABLED && isLoaded && !isAvailable;

  return (
    <>
      {/* Mic button trigger */}
      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={disabled || isProcessing || isTranscribing}
          className={`items-center justify-center ${
            disabled || voiceNotConfigured ? 'opacity-50' : ''
          } ${isSettingsLoading ? 'opacity-70 bg-gray-200' : 'bg-gray-100'}`}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
        >
          {isSettingsLoading ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : (
            <Mic
              size={size * 0.5}
              color={(disabled || voiceNotConfigured) ? '#9CA3AF' : Colors.blue}
            />
          )}
        </Pressable>
      </Animated.View>

      {/* Recording Overlay Modal */}
      <Modal
        visible={showOverlay}
        transparent
        animationType="none"
        onRequestClose={handleCancel}
        statusBarTranslucent
      >
        {/* Animated backdrop */}
        <Animated.View
          className="absolute inset-0"
          style={[{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }, backdropAnimatedStyle]}
        >
          <Pressable className="flex-1" onPress={handleCancel} />
        </Animated.View>

        {/* Animated bottom sheet */}
        <Animated.View
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pt-6 px-5"
          style={[
            {
              paddingBottom: Platform.OS === 'ios' ? 34 : 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 20,
            },
            sheetAnimatedStyle,
          ]}
        >
          <View className="w-full">
              {/* Recording section */}
              <View className="items-center mb-6">
                {/* Pulsing record indicator */}
                <View className="w-20 h-20 items-center justify-center mb-4">
                  <Animated.View
                    className="absolute w-20 h-20 rounded-full"
                    style={[{ backgroundColor: Colors.recordingLight }, pulseAnimatedStyle]}
                  />
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      isTranscribing ? 'bg-[#DA7756]' : 'bg-[#EF4444]'
                    }`}
                    style={{
                      shadowColor: Colors.recording,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <Mic size={24} color={Colors.textOnPrimary} />
                  </View>
                </View>

                {/* Timer */}
                <Text
                  className="text-4xl font-bold text-gray-900 mb-1"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {formatDuration(recordingDuration)}
                </Text>

                {/* Status text */}
                <Text className="text-sm text-gray-500 mb-5">
                  {isTranscribing
                    ? defaultLanguage === 'id'
                      ? 'Memproses...'
                      : 'Processing...'
                    : defaultLanguage === 'id'
                    ? 'Sedang merekam...'
                    : 'Recording...'}
                </Text>

                {/* Waveform visualization - reflects real audio metering */}
                <WaveformVisualization
                  isRecording={isListening && !isTranscribing}
                  metering={metering}
                />

                {/* Auto-send hint - always visible when recording */}
                {autoSendTimeout > 0 && isListening && !isTranscribing && (
                  <Text className="text-xs text-gray-500 italic">
                    {defaultLanguage === 'id'
                      ? `Otomatis kirim dalam ${autoSendTimeout} detik jika diam`
                      : `Auto-sends in ${autoSendTimeout}s if silent`}
                  </Text>
                )}
              </View>

              {/* Action buttons - Always visible at bottom */}
              <View className="flex-row items-center gap-3 mt-2 pt-4 border-t border-gray-200">
                {/* Cancel button - icon only, centered */}
                <Pressable
                  onPress={handleCancel}
                  className="items-center justify-center w-[50px] h-[50px] rounded-xl active:opacity-70"
                  style={{ backgroundColor: Colors.recordingLight }}
                  disabled={isTranscribing}
                >
                  <Trash2 size={22} color={Colors.error} />
                </Pressable>

                {/* Big Send button - WhatsApp style */}
                <Pressable
                  onPress={handleSend}
                  className={`flex-1 flex-row items-center justify-center gap-2 h-[50px] min-h-[50px] rounded-xl ${
                    isTranscribing ? 'bg-gray-500' : 'bg-[#DA7756]'
                  }`}
                  disabled={isTranscribing || recordingDuration < 0.5}
                >
                  {isTranscribing ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                      <Text className="text-lg font-bold text-white">
                        {defaultLanguage === 'id' ? 'Memproses' : 'Processing'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Send size={20} color={Colors.textOnPrimary} />
                      <Text className="text-lg font-bold text-white">
                        {defaultLanguage === 'id' ? 'Kirim' : 'Send'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
          </View>
          </Animated.View>
      </Modal>
    </>
  );
}

export default VoiceButton;
