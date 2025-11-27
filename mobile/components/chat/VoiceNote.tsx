/**
 * VoiceNote Component
 *
 * WhatsApp-style voice message recording and playback using expo-audio.
 * Features:
 * - Hold-to-record with slide-to-cancel
 * - Waveform visualization during recording
 * - Playback with progress bar
 * - WhatsApp-exact styling
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
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
import { MotiView } from 'moti';
import {
  Mic,
  Play,
  Pause,
  Trash2,
  Send,
  X,
  ChevronLeft,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

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
    <View style={{ flexDirection: 'row', alignItems: 'center', height, width }}>
      {heights.map((h, i) => {
        const isActive = progress > i / heights.length;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h * height,
              backgroundColor: isActive ? activeColor : color,
              borderRadius: 2,
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
    <View style={styles.waveformContainer}>
      {bars.map((height, i) => (
        <MotiView
          key={i}
          from={{ scaleY: 0.3 }}
          animate={{ scaleY: height }}
          transition={{ type: 'timing', duration: 100 }}
          style={[
            styles.waveformBar,
            { backgroundColor: '#EF4444' }, // Red for recording
          ]}
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
    <View style={styles.recorderContainer}>
      {isRecording ? (
        <Animated.View
          style={[
            styles.recordingUI,
            { transform: [{ translateX: slideX }] },
          ]}
        >
          {/* Cancel hint */}
          <HStack space="sm" className="items-center">
            <MotiView
              from={{ opacity: 0.5 }}
              animate={{ opacity: isCancelling ? 1 : 0.5 }}
            >
              <Icon
                as={ChevronLeft}
                size="sm"
                style={{ color: isCancelling ? '#EF4444' : '#8696a0' }}
              />
            </MotiView>
            <Text
              style={{
                color: isCancelling ? '#EF4444' : '#8696a0',
                fontSize: 12,
              }}
            >
              {isCancelling ? 'Release to cancel' : 'Slide to cancel'}
            </Text>
          </HStack>

          {/* Waveform */}
          <RecordingWaveform isRecording={isRecording} />

          {/* Duration */}
          <HStack space="sm" className="items-center">
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 500, loop: true }}
              style={styles.recordingDot}
            />
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </HStack>
        </Animated.View>
      ) : (
        <View style={styles.micButtonContainer} {...panResponder.panHandlers}>
          <View style={styles.micButton}>
            <Icon as={Mic} size="md" style={{ color: '#FFFFFF' }} />
          </View>
          <Text style={styles.holdText}>Hold to record</Text>
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
    <Pressable onPress={togglePlayback} style={styles.playerContainer}>
      <View
        style={[
          styles.playerBubble,
          { backgroundColor },
          compact && styles.playerBubbleCompact,
        ]}
      >
        {/* Play/Pause button */}
        <View
          style={[
            styles.playButton,
            { backgroundColor: isOwnMessage ? '#128C7E' : '#075E54' },
          ]}
        >
          <Icon
            as={isPlaying ? Pause : Play}
            size={compact ? 'sm' : 'md'}
            style={{ color: '#FFFFFF', marginLeft: isPlaying ? 0 : 2 }}
          />
        </View>

        {/* Waveform */}
        <View style={styles.playerWaveformContainer}>
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
        <Text style={[styles.playerDuration, { color: waveColor }]}>
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
      <Pressable style={styles.disabledMicButton}>
        <Icon as={Mic} size="md" style={{ color: '#9CA3AF' }} />
      </Pressable>
    );
  }

  if (mode === 'preview' && recordedUri) {
    return (
      <View style={styles.previewContainer}>
        {/* Delete button */}
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Icon as={Trash2} size="md" style={{ color: '#EF4444' }} />
        </Pressable>

        {/* Preview player */}
        <View style={styles.previewPlayer}>
          <VoiceNotePlayer uri={recordedUri} duration={recordedDuration} compact />
        </View>

        {/* Send button */}
        <Pressable onPress={handleSend} style={styles.sendVoiceButton}>
          <Icon as={Send} size="md" style={{ color: '#FFFFFF' }} />
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

  // Idle mode - show mic button
  return (
    <Pressable
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMode('recording');
      }}
      delayLongPress={150}
      style={styles.idleMicButton}
    >
      <Icon as={Mic} size="md" style={{ color: '#6B7280' }} />
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Recorder styles
  recorderContainer: {
    flex: 1,
    minHeight: 44,
  },
  recordingUI: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    height: 30,
    borderRadius: 1.5,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    minWidth: 40,
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // Player styles
  playerContainer: {
    minWidth: 200,
  },
  playerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    gap: 8,
  },
  playerBubbleCompact: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerWaveformContainer: {
    flex: 1,
  },
  playerDuration: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'right',
  },

  // Input styles
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlayer: {
    flex: 1,
  },
  sendVoiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleMicButton: {
    padding: 8,
    marginBottom: 4,
  },
  disabledMicButton: {
    padding: 8,
    marginBottom: 4,
    opacity: 0.5,
  },
});

export default VoiceNoteInput;
