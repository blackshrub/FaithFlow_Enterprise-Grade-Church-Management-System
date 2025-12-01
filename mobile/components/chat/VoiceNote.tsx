/**
 * VoiceNote Component
 *
 * WhatsApp-style voice message recording and playback using expo-audio.
 * Features:
 * - Hold-to-record with slide-to-cancel
 * - Waveform visualization during recording
 * - Playback with progress bar
 * - WhatsApp-exact styling
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import AnimatedRN, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import {
  Mic,
  Play,
  Pause,
  Trash2,
  Send,
  X,
  ChevronLeft,
} from 'lucide-react-native';

// =============================================================================
// TYPES
// =============================================================================

interface VoiceNoteRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // Max recording duration in seconds (default: 60)
}

interface VoiceNotePlayerProps {
  uri: string;
  duration: number;
  isOwnMessage?: boolean;
  compact?: boolean;
}

interface VoiceNoteInputProps {
  onSend: (uri: string, duration: number) => void;
  disabled?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CANCEL_THRESHOLD = -100; // Swipe left threshold to cancel
const WAVEFORM_BARS = 30;
const MAX_RECORDING_DURATION = 60; // seconds

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate random waveform heights for visualization
function generateWaveform(count: number): number[] {
  return Array.from({ length: count }, () => Math.random() * 0.7 + 0.3);
}

// =============================================================================
// WAVEFORM VISUALIZATION
// =============================================================================

interface WaveformProps {
  heights: number[];
  progress?: number; // 0-1 for playback progress
  color?: string;
  activeColor?: string;
  width?: number;
  height?: number;
}

function Waveform({
  heights,
  progress = 0,
  color = '#8696a0',
  activeColor = '#34B7F1',
  width = 150,
  height = 30,
}: WaveformProps) {
  const barWidth = (width - (heights.length - 1) * 2) / heights.length;

  return (
    <View className="flex-row items-center" style={{ height, width }}>
      {heights.map((h, i) => {
        const isActive = progress > i / heights.length;
        return (
          <View
            key={i}
            className="rounded-sm"
            style={{
              width: barWidth,
              height: h * height,
              backgroundColor: isActive ? activeColor : color,
              marginRight: i < heights.length - 1 ? 2 : 0,
            }}
          />
        );
      })}
    </View>
  );
}

// =============================================================================
// RECORDING WAVEFORM (Animated)
// =============================================================================

function RecordingWaveform({ isRecording }: { isRecording: boolean }) {
  const [bars, setBars] = useState(() => generateWaveform(WAVEFORM_BARS));

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setBars(generateWaveform(WAVEFORM_BARS));
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <View className="flex-row items-center h-[30px] gap-0.5">
      {bars.map((height, i) => (
        <View
          key={i}
          className="w-[3px] rounded-[1.5px]"
          style={{ backgroundColor: '#EF4444', transform: [{ scaleY: height }], height: 30 }}
        />
      ))}
    </View>
  );
}

// =============================================================================
// VOICE NOTE RECORDER
// =============================================================================

export function VoiceNoteRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = MAX_RECORDING_DURATION,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;
  const durationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Request permissions on mount
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync();
  }, []);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);

        // Auto-stop at max duration
        if (durationRef.current >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  const startRecording = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      durationRef.current = 0;
      setDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    try {
      await recorder.stop();
      setIsRecording(false);

      if (!isCancelling && recorder.uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRecordingComplete(recorder.uri, durationRef.current);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [isRecording, isCancelling, recorder, onRecordingComplete]);

  const cancelRecording = useCallback(async () => {
    setIsCancelling(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      await recorder.stop();
      setIsRecording(false);
      onCancel();
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    } finally {
      setIsCancelling(false);
    }
  }, [recorder, onCancel]);

  // Pan responder for slide-to-cancel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          slideX.setValue(gestureState.dx);

          if (gestureState.dx < CANCEL_THRESHOLD) {
            setIsCancelling(true);
          } else {
            setIsCancelling(false);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < CANCEL_THRESHOLD) {
          cancelRecording();
        } else {
          stopRecording();
        }

        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View className="flex-1 min-h-[44px]">
      {isRecording ? (
        <Animated.View
          className="flex-row items-center justify-between px-3 py-2 bg-white rounded-2xl border border-red-500"
          style={{ transform: [{ translateX: slideX }] }}
        >
          {/* Cancel hint */}
          <View className="flex-row items-center gap-1">
            <View style={{ opacity: isCancelling ? 1 : 0.5 }}>
              <ChevronLeft size={16} color={isCancelling ? '#EF4444' : '#8696a0'} />
            </View>
            <Text
              className="text-xs ml-1"
              style={{ color: isCancelling ? '#EF4444' : '#8696a0' }}
            >
              {isCancelling ? 'Release to cancel' : 'Slide to cancel'}
            </Text>
          </View>

          {/* Waveform */}
          <RecordingWaveform isRecording={isRecording} />

          {/* Duration */}
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full bg-red-500" />
            <Text className="text-sm font-medium text-gray-900 min-w-[40px]">
              {formatDuration(duration)}
            </Text>
          </View>
        </Animated.View>
      ) : (
        <View className="items-center justify-center py-2" {...panResponder.panHandlers}>
          <View className="w-11 h-11 rounded-full bg-[#128C7E] items-center justify-center">
            <Mic size={20} color="#FFFFFF" />
          </View>
          <Text className="text-[10px] text-gray-400 mt-1">Hold to record</Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// VOICE NOTE PLAYER
// =============================================================================

export function VoiceNotePlayer({
  uri,
  duration,
  isOwnMessage = false,
  compact = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waveform] = useState(() => generateWaveform(WAVEFORM_BARS));

  const player = useAudioPlayer(uri);

  // Track playback progress
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      if (player.playing && player.duration > 0) {
        setProgress(player.currentTime / player.duration);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player]);

  const togglePlayback = useCallback(() => {
    if (!player) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      // Reset if at end
      if (progress >= 0.99) {
        player.seekTo(0);
        setProgress(0);
      }
      player.play();
      setIsPlaying(true);
    }
  }, [player, progress]);

  const backgroundColor = isOwnMessage ? '#DCF8C6' : '#FFFFFF';
  const waveColor = isOwnMessage ? '#6B9B78' : '#8696a0';
  const activeColor = '#34B7F1';

  return (
    <Pressable onPress={togglePlayback} className="min-w-[200px]">
      <View
        className={`flex-row items-center gap-2 rounded-2xl ${
          compact ? 'px-1.5 py-1.5' : 'px-2 py-2'
        }`}
        style={{ backgroundColor }}
      >
        {/* Play/Pause button */}
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: isOwnMessage ? '#128C7E' : '#075E54' }}
        >
          {isPlaying ? (
            <Pause size={compact ? 16 : 20} color="#FFFFFF" />
          ) : (
            <Play size={compact ? 16 : 20} color="#FFFFFF" style={{ marginLeft: 2 }} />
          )}
        </View>

        {/* Waveform */}
        <View className="flex-1">
          <Waveform
            heights={waveform}
            progress={progress}
            color={waveColor}
            activeColor={activeColor}
            width={compact ? 100 : 150}
            height={compact ? 20 : 30}
          />
        </View>

        {/* Duration */}
        <Text
          className="text-xs font-medium min-w-[35px] text-right"
          style={{ color: waveColor }}
        >
          {formatDuration(isPlaying ? Math.floor(progress * duration) : duration)}
        </Text>
      </View>
    </Pressable>
  );
}

// =============================================================================
// VOICE NOTE INPUT (Full recording UI)
// =============================================================================

export function VoiceNoteInput({ onSend, disabled }: VoiceNoteInputProps) {
  const [mode, setMode] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const handleRecordingComplete = useCallback((uri: string, duration: number) => {
    setRecordedUri(uri);
    setRecordedDuration(duration);
    setMode('preview');
  }, []);

  const handleCancel = useCallback(() => {
    setMode('idle');
    setRecordedUri(null);
    setRecordedDuration(0);
  }, []);

  const handleSend = useCallback(() => {
    if (recordedUri && recordedDuration > 0) {
      onSend(recordedUri, recordedDuration);
      handleCancel();
    }
  }, [recordedUri, recordedDuration, onSend, handleCancel]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleCancel();
  }, [handleCancel]);

  if (disabled) {
    return (
      <Pressable
        className="w-11 h-11 rounded-full items-center justify-center opacity-50"
        style={{ backgroundColor: '#128C7E' }}
      >
        <Mic size={20} color="#FFFFFF" />
      </Pressable>
    );
  }

  if (mode === 'preview' && recordedUri) {
    return (
      <View className="flex-row items-center gap-2 px-2">
        {/* Delete button */}
        <Pressable
          onPress={handleDelete}
          className="w-10 h-10 rounded-full bg-red-100 items-center justify-center"
        >
          <Trash2 size={20} color="#EF4444" />
        </Pressable>

        {/* Preview player */}
        <View className="flex-1">
          <VoiceNotePlayer uri={recordedUri} duration={recordedDuration} compact />
        </View>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          className="w-11 h-11 rounded-full bg-[#128C7E] items-center justify-center"
        >
          <Send size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  if (mode === 'recording') {
    return (
      <VoiceNoteRecorder
        onRecordingComplete={handleRecordingComplete}
        onCancel={handleCancel}
      />
    );
  }

  // Idle mode - show mic button (WhatsApp style circular green)
  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMode('recording');
      }}
      delayLongPress={150}
      className="w-11 h-11 rounded-full items-center justify-center active:opacity-80"
      style={{ backgroundColor: '#128C7E' }}
    >
      <Mic size={20} color="#FFFFFF" />
    </Pressable>
  );
}

export default VoiceNoteInput;
