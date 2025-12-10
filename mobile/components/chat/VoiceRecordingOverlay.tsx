/**
 * VoiceRecordingOverlay Component
 *
 * WhatsApp-style voice recording UI that appears when user starts recording.
 * Features:
 * - Pulsing recording indicator with waveform animation
 * - Recording duration timer
 * - Big/wide send button (like WhatsApp)
 * - Cancel button to discard recording
 * - Auto-send after 3 seconds of silence (no audio detected)
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 *
 * Usage:
 * ```tsx
 * <VoiceRecordingOverlay
 *   visible={isRecording}
 *   recordingDuration={duration}
 *   onSend={handleSend}
 *   onCancel={handleCancel}
 *   isProcessing={isTranscribing}
 *   language="id"
 * />
 * ```
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  interpolate,
  Extrapolate,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Mic, Send, X, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VoiceRecordingOverlayProps {
  /** Whether overlay is visible */
  visible: boolean;
  /** Recording duration in seconds */
  recordingDuration: number;
  /** Callback to send the recording */
  onSend: () => void;
  /** Callback to cancel recording */
  onCancel: () => void;
  /** Whether transcription is in progress */
  isProcessing?: boolean;
  /** Language for labels */
  language?: 'en' | 'id';
  /** Auto-send timeout in seconds (0 to disable) */
  autoSendTimeout?: number;
  /** Callback when auto-send triggers */
  onAutoSend?: () => void;
}

// Colors matching Faith Assistant theme
const Colors = {
  primary: '#DA7756',
  primaryLight: '#E8956F',
  primaryDark: '#C4634A',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  error: '#EF4444',
  success: '#10B981',
  border: '#E5E7EB',
  recording: '#EF4444',
  recordingLight: '#FEE2E2',
};

/**
 * Format duration as MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Animated waveform bar component
 */
const WaveformBar = ({ index, isRecording }: { index: number; isRecording: boolean }) => {
  const height = useSharedValue(8);

  useEffect(() => {
    if (isRecording) {
      // Each bar animates with different timing for organic feel
      const baseDelay = index * 80;
      const duration = 300 + Math.random() * 200;

      height.value = withRepeat(
        withSequence(
          withTiming(8 + Math.random() * 24, {
            duration,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(8 + Math.random() * 16, {
            duration: duration * 0.8,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(8, { duration: 200 });
    }
  }, [isRecording, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      className="w-1 rounded-sm min-h-[8px]"
      style={[{ backgroundColor: Colors.primary }, animatedStyle]}
    />
  );
};

export function VoiceRecordingOverlay({
  visible,
  recordingDuration,
  onSend,
  onCancel,
  isProcessing = false,
  language = 'id',
  autoSendTimeout = 3,
  onAutoSend,
}: VoiceRecordingOverlayProps) {
  // Auto-send timer ref
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDurationRef = useRef(recordingDuration);

  // Animation values
  const pulseScale = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);

  // Start pulse animation when recording
  useEffect(() => {
    if (visible && !isProcessing) {
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
  }, [visible, isProcessing]);

  // Auto-send detection: if recording duration hasn't changed for autoSendTimeout seconds, auto-send
  useEffect(() => {
    if (!visible || isProcessing || autoSendTimeout <= 0 || recordingDuration < 1) {
      // Clear timer if not recording or too short
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
      lastDurationRef.current = recordingDuration;
      return;
    }

    // If duration changed, reset the timer
    if (recordingDuration !== lastDurationRef.current) {
      lastDurationRef.current = recordingDuration;

      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }

      // Start new timer - if no change for autoSendTimeout seconds, auto-send
      autoSendTimerRef.current = setTimeout(() => {
        if (recordingDuration >= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onAutoSend?.();
          onSend();
        }
      }, autoSendTimeout * 1000);
    }

    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, [visible, recordingDuration, isProcessing, autoSendTimeout, onSend, onAutoSend]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendButtonScale.value = withSequence(
      withSpring(0.9),
      withSpring(1)
    );
    onSend();
  }, [onSend, sendButtonScale]);

  const handleCancel = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onCancel();
  }, [onCancel]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  if (!visible) return null;

  const isRecording = !isProcessing;

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify()}
      exiting={SlideOutDown.duration(200)}
      className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pt-6 px-5"
      style={{
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
      }}
    >
      {/* Recording indicator and timer section */}
      <View className="items-center mb-6">
        {/* Pulsing record indicator */}
        <View className="w-20 h-20 items-center justify-center mb-4">
          <Animated.View
            className="absolute w-20 h-20 rounded-full"
            style={[{ backgroundColor: Colors.recordingLight }, pulseAnimatedStyle]}
          />
          <View
            className={`w-14 h-14 rounded-full items-center justify-center ${
              isProcessing ? 'bg-[#DA7756]' : 'bg-[#EF4444]'
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
          {isProcessing
            ? language === 'id'
              ? 'Memproses...'
              : 'Processing...'
            : language === 'id'
            ? 'Sedang merekam...'
            : 'Recording...'}
        </Text>

        {/* Waveform visualization */}
        <View className="flex-row items-center justify-center gap-[3px] h-10 mb-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <WaveformBar key={i} index={i} isRecording={isRecording} />
          ))}
        </View>

        {/* Auto-send hint */}
        {autoSendTimeout > 0 && recordingDuration >= 1 && isRecording && (
          <Animated.Text
            entering={FadeIn.delay(500).duration(300)}
            className="text-xs text-gray-500 italic"
          >
            {language === 'id'
              ? `Otomatis kirim dalam ${autoSendTimeout} detik jika diam`
              : `Auto-sends in ${autoSendTimeout}s if silent`}
          </Animated.Text>
        )}
      </View>

      {/* Action buttons */}
      <View className="flex-row items-center justify-between gap-4">
        {/* Cancel button */}
        <Pressable
          onPress={handleCancel}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancel voice recording"
          className="flex-row items-center justify-center gap-2 py-3.5 px-5 rounded-2xl min-w-[100px] active:opacity-70"
          style={{ backgroundColor: Colors.recordingLight }}
          disabled={isProcessing}
        >
          <Trash2 size={24} color={Colors.error} />
          <Text className="text-base font-semibold" style={{ color: Colors.error }}>
            {language === 'id' ? 'Batal' : 'Cancel'}
          </Text>
        </Pressable>

        {/* Big Send button - WhatsApp style */}
        <Animated.View style={[{ flex: 1 }, sendButtonAnimatedStyle]}>
          <Pressable
            onPress={handleSend}
            accessible
            accessibilityRole="button"
            accessibilityLabel={isProcessing ? 'Processing voice message' : `Send voice message, ${formatDuration(recordingDuration)}`}
            className={`flex-row items-center justify-center py-4 px-8 rounded-2xl ${
              isProcessing ? 'bg-gray-500' : 'bg-[#DA7756]'
            } active:opacity-90`}
            style={{
              minWidth: SCREEN_WIDTH * 0.5,
              shadowColor: Colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isProcessing ? 0.1 : 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            disabled={isProcessing || recordingDuration < 0.5}
          >
            {isProcessing ? (
              <View className="flex-row items-center gap-2.5">
                <View className="flex-row gap-1">
                  <View className="w-2 h-2 rounded-full bg-white opacity-100" />
                  <View className="w-2 h-2 rounded-full bg-white opacity-60" />
                  <View className="w-2 h-2 rounded-full bg-white opacity-30" />
                </View>
                <Text className="text-lg font-bold text-white">
                  {language === 'id' ? 'Memproses' : 'Processing'}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2.5">
                <Send size={24} color={Colors.textOnPrimary} />
                <Text className="text-lg font-bold text-white">
                  {language === 'id' ? 'Kirim' : 'Send'}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default VoiceRecordingOverlay;
