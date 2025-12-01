/**
 * VoiceChatModal Component
 *
 * Full-screen real-time voice chat using OpenAI Realtime API.
 *
 * NOTE: This feature requires a development build (native modules).
 * In Expo Go, it shows a placeholder explaining this.
 *
 * Features (in dev build):
 * - WebRTC-based real-time voice conversation (~200ms latency)
 * - Large animated orb showing current state
 * - States: connecting, idle, listening, responding
 * - Automatic turn detection (server VAD)
 * - Live transcript display
 * - Tap orb to interrupt AI response
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Mic, Volume2, Wifi, WifiOff, AlertTriangle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/text';

// Try to import native WebRTC module (only works in dev build)
let RealtimeService: any = null;
let isRealtimeAvailable = false;

try {
  // This will fail in Expo Go
  RealtimeService = require('@/services/voice/realtimeService');
  isRealtimeAvailable = true;
} catch {
  console.log('[VoiceChatModal] WebRTC not available (Expo Go). Voice chat requires a development build.');
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH * 0.5, 200);

// Colors for different states
const StateColors = {
  connecting: '#F59E0B',
  idle: '#6B7280',
  listening: '#3B82F6',
  responding: '#10B981',
  error: '#EF4444',
  unavailable: '#6B7280',
};

type VoiceChatState = 'connecting' | 'idle' | 'listening' | 'responding' | 'error' | 'unavailable';

interface VoiceChatModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional system instructions for the AI */
  instructions?: string;
  language?: 'en' | 'id';
  /** Callback when conversation ends (for saving to history) */
  onConversationEnd?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
}

/**
 * Placeholder component shown when WebRTC is not available (Expo Go)
 */
function UnavailablePlaceholder({
  visible,
  onClose,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  language: 'en' | 'id';
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/90">
        <BlurView intensity={90} tint="dark" className="absolute inset-0" />

        {/* Close button */}
        <Pressable
          onPress={onClose}
          className="absolute top-[60px] right-6 w-12 h-12 rounded-3xl bg-white/10 items-center justify-center z-10"
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <X size={28} color="#FFFFFF" />
        </Pressable>

        <View className="flex-1 items-center justify-center px-8">
          {/* Warning icon */}
          <View
            className="items-center justify-center"
            style={{
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              backgroundColor: StateColors.unavailable,
            }}
          >
            <AlertTriangle size={ORB_SIZE * 0.35} color="#FFFFFF" />
          </View>

          <Text className="mt-10 text-xl font-semibold text-white text-center">
            {language === 'id' ? 'Tidak Tersedia di Expo Go' : 'Not Available in Expo Go'}
          </Text>

          <View className="mt-6 px-5 py-3 bg-white/5 rounded-xl max-w-[85%]">
            <Text className="text-base text-white/90 leading-[22px]">
              {language === 'id'
                ? 'Voice Chat realtime membutuhkan development build dengan native modules (WebRTC).\n\nUntuk menggunakan fitur ini, build aplikasi dengan:\n\nnpx expo prebuild\nnpx expo run:ios'
                : 'Realtime Voice Chat requires a development build with native modules (WebRTC).\n\nTo use this feature, build the app with:\n\nnpx expo prebuild\nnpx expo run:ios'}
            </Text>
          </View>

          <View className="absolute bottom-20 left-8 right-8">
            <Text className="text-sm text-white/50 text-center">
              {language === 'id'
                ? 'Fitur STT (tombol mic) tetap berfungsi menggunakan Groq/OpenAI Whisper API'
                : 'STT feature (mic button) still works using Groq/OpenAI Whisper API'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function VoiceChatModal({
  visible,
  onClose,
  instructions,
  language = 'id',
  onConversationEnd,
}: VoiceChatModalProps) {
  // If WebRTC is not available, show placeholder
  if (!isRealtimeAvailable) {
    return <UnavailablePlaceholder visible={visible} onClose={onClose} language={language} />;
  }

  const [state, setState] = useState<VoiceChatState>('connecting');
  const [statusText, setStatusText] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');

  const isMountedRef = useRef(true);
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Animations
  const orbScale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.8);
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);

  // Connect to Realtime API when modal opens
  useEffect(() => {
    if (!visible) return;

    isMountedRef.current = true;
    connectToRealtime();

    return () => {
      isMountedRef.current = false;
      RealtimeService?.disconnect?.();
    };
  }, [visible]);

  const connectToRealtime = useCallback(async () => {
    setState('connecting');
    setStatusText(language === 'id' ? 'Menghubungkan...' : 'Connecting...');

    try {
      await RealtimeService.connect(
        {
          voice: 'verse',
          instructions: instructions || getDefaultInstructions(language),
        },
        {
          onConnected: () => {
            if (!isMountedRef.current) return;
            setState('idle');
            setStatusText(language === 'id' ? 'Siap berbicara' : 'Ready to talk');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
          onDisconnected: () => {
            if (!isMountedRef.current) return;
            setState('error');
            setStatusText(language === 'id' ? 'Terputus' : 'Disconnected');
          },
          onSpeechStarted: () => {
            if (!isMountedRef.current) return;
            setState('listening');
            setStatusText(language === 'id' ? 'Mendengarkan...' : 'Listening...');
            setCurrentTranscript('');
          },
          onSpeechStopped: () => {
            if (!isMountedRef.current) return;
            setStatusText(language === 'id' ? 'Memproses...' : 'Processing...');
          },
          onResponseStarted: () => {
            if (!isMountedRef.current) return;
            setState('responding');
            setStatusText(language === 'id' ? 'Menjawab...' : 'Responding...');
            setCurrentTranscript('');
          },
          onTranscriptDelta: (_delta: string, fullText: string) => {
            if (!isMountedRef.current) return;
            setCurrentTranscript(fullText);
          },
          onResponseDone: (transcript: string) => {
            if (!isMountedRef.current) return;
            if (transcript) {
              conversationRef.current.push({
                role: 'assistant',
                content: transcript,
              });
            }
            setState('idle');
            setStatusText(language === 'id' ? 'Siap berbicara' : 'Ready to talk');
          },
          onError: (error: Error) => {
            console.error('[VoiceChatModal] Realtime error:', error);
            if (!isMountedRef.current) return;
            setState('error');
            setStatusText(error.message || (language === 'id' ? 'Terjadi kesalahan' : 'An error occurred'));
          },
          onRemoteAudioTrack: () => {
            console.log('[VoiceChatModal] Received remote audio track');
          },
        }
      );
    } catch (error: any) {
      console.error('[VoiceChatModal] Connection failed:', error);
      if (isMountedRef.current) {
        setState('error');
        setStatusText(error.message || (language === 'id' ? 'Gagal terhubung' : 'Failed to connect'));
      }
    }
  }, [language, instructions]);

  // Animate orb based on state
  useEffect(() => {
    cancelAnimation(orbScale);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring2Scale);
    cancelAnimation(ring3Scale);

    switch (state) {
      case 'connecting':
        orbScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 500 }),
            withTiming(0.95, { duration: 500 })
          ),
          -1,
          true
        );
        orbOpacity.value = withTiming(0.7, { duration: 300 });
        break;

      case 'idle':
        orbScale.value = withSpring(1, { damping: 15 });
        orbOpacity.value = withTiming(0.6, { duration: 300 });
        break;

      case 'listening':
        orbScale.value = withRepeat(
          withSequence(
            withTiming(1.08, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.92, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        );
        orbOpacity.value = withTiming(1, { duration: 200 });

        ring1Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        ring2Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        ring3Scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        break;

      case 'responding':
        orbScale.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 250, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 250, easing: Easing.in(Easing.ease) })
          ),
          -1,
          true
        );
        orbOpacity.value = withTiming(1, { duration: 200 });
        break;

      case 'error':
        orbScale.value = withSpring(1, { damping: 15 });
        orbOpacity.value = withTiming(0.5, { duration: 300 });
        break;
    }
  }, [state]);

  const handleOrbPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    switch (state) {
      case 'responding':
        RealtimeService?.interruptResponse?.();
        setState('idle');
        setStatusText(language === 'id' ? 'Siap berbicara' : 'Ready to talk');
        break;

      case 'error':
        connectToRealtime();
        break;
    }
  }, [state, language, connectToRealtime]);

  const handleClose = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await RealtimeService?.disconnect?.();

    if (conversationRef.current.length > 0 && onConversationEnd) {
      onConversationEnd(conversationRef.current);
    }

    conversationRef.current = [];
    setState('connecting');
    onClose();
  }, [onClose, onConversationEnd]);

  // Animated styles
  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
    opacity: orbOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: interpolate(ring1Scale.value, [1, 1.8], [0.6, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: interpolate(ring2Scale.value, [1, 1.8], [0.4, 0]),
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: interpolate(ring3Scale.value, [1, 1.8], [0.2, 0]),
  }));

  const currentColor = StateColors[state];

  const getStateIcon = () => {
    switch (state) {
      case 'connecting':
        return <Wifi size={ORB_SIZE * 0.3} color="#FFFFFF" />;
      case 'error':
        return <WifiOff size={ORB_SIZE * 0.3} color="#FFFFFF" />;
      case 'responding':
        return <Volume2 size={ORB_SIZE * 0.3} color="#FFFFFF" />;
      default:
        return <Mic size={ORB_SIZE * 0.3} color="#FFFFFF" />;
    }
  };

  const getHeaderIcon = () => {
    switch (state) {
      case 'responding':
        return <Volume2 size={24} color="#FFFFFF" />;
      default:
        return <Mic size={24} color="#FFFFFF" />;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-black/90"
      >
        <BlurView intensity={90} tint="dark" className="absolute inset-0" />

        {/* Close button */}
        <Pressable
          onPress={handleClose}
          className="absolute top-[60px] right-6 w-12 h-12 rounded-3xl bg-white/10 items-center justify-center z-10"
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <X size={28} color="#FFFFFF" />
        </Pressable>

        {/* Main content */}
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
          className="flex-1 items-center justify-center px-8"
        >
          {/* State icon */}
          <View className="mb-6 w-14 h-14 rounded-[28px] bg-white/10 items-center justify-center">
            {getHeaderIcon()}
          </View>

          {/* Realtime badge */}
          <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-2xl mb-6">
            <View
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: state === 'error' ? '#EF4444' : '#10B981' }}
            />
            <Text className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Realtime
            </Text>
          </View>

          {/* Orb container */}
          <View
            className="items-center justify-center"
            style={{ width: ORB_SIZE * 2, height: ORB_SIZE * 2 }}
          >
            {/* Ripple rings (only visible when listening) */}
            {state === 'listening' && (
              <>
                <Animated.View
                  className="absolute border-2"
                  style={[
                    {
                      width: ORB_SIZE,
                      height: ORB_SIZE,
                      borderRadius: ORB_SIZE / 2,
                      borderColor: currentColor,
                    },
                    ring1Style,
                  ]}
                />
                <Animated.View
                  className="absolute border-2"
                  style={[
                    {
                      width: ORB_SIZE,
                      height: ORB_SIZE,
                      borderRadius: ORB_SIZE / 2,
                      borderColor: currentColor,
                    },
                    ring2Style,
                  ]}
                />
                <Animated.View
                  className="absolute border-2"
                  style={[
                    {
                      width: ORB_SIZE,
                      height: ORB_SIZE,
                      borderRadius: ORB_SIZE / 2,
                      borderColor: currentColor,
                    },
                    ring3Style,
                  ]}
                />
              </>
            )}

            {/* Main orb */}
            <Pressable onPress={handleOrbPress}>
              <Animated.View
                className="items-center justify-center"
                style={[
                  {
                    width: ORB_SIZE,
                    height: ORB_SIZE,
                    borderRadius: ORB_SIZE / 2,
                    backgroundColor: currentColor,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 10,
                  },
                  orbAnimatedStyle,
                ]}
              >
                {/* Inner glow */}
                <View
                  className="absolute opacity-30"
                  style={{
                    width: ORB_SIZE * 0.8,
                    height: ORB_SIZE * 0.8,
                    borderRadius: (ORB_SIZE * 0.8) / 2,
                    backgroundColor: currentColor,
                  }}
                />

                {/* Icon inside orb */}
                <View className="items-center justify-center">
                  {getStateIcon()}
                </View>
              </Animated.View>
            </Pressable>
          </View>

          {/* Status text */}
          <Text className="mt-10 text-xl font-semibold text-white text-center">
            {statusText}
          </Text>

          {/* Live transcript */}
          {currentTranscript && (
            <View
              className="mt-6 px-5 py-3 bg-white/5 rounded-xl"
              style={{ maxWidth: SCREEN_WIDTH * 0.85 }}
            >
              <Text className="text-xs font-semibold text-white/50 mb-1">
                {state === 'responding'
                  ? language === 'id' ? 'AI:' : 'AI:'
                  : language === 'id' ? 'Anda:' : 'You:'}
              </Text>
              <Text className="text-base text-white/90 leading-[22px]" numberOfLines={3}>
                {currentTranscript}
              </Text>
            </View>
          )}

          {/* Instructions */}
          <View className="absolute bottom-20 left-8 right-8">
            <Text className="text-sm text-white/50 text-center">
              {state === 'connecting'
                ? language === 'id'
                  ? 'Menyiapkan koneksi realtime...'
                  : 'Setting up realtime connection...'
                : state === 'error'
                ? language === 'id'
                  ? 'Ketuk untuk mencoba lagi'
                  : 'Tap to retry'
                : state === 'responding'
                ? language === 'id'
                  ? 'Ketuk untuk menginterupsi'
                  : 'Tap to interrupt'
                : language === 'id'
                ? 'Bicara kapan saja - AI mendengarkan'
                : 'Speak anytime - AI is listening'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * Get default instructions for Faith Assistant
 */
function getDefaultInstructions(language: 'en' | 'id'): string {
  const baseInstructions = `You are "Faith Assistant" (Pendamping Iman), a warm, supportive spiritual companion for FaithFlow church app users.

Your role:
- Provide compassionate spiritual guidance based on Biblical principles
- Help users understand Scripture and apply it to daily life
- Offer encouraging words and prayerful support
- Be conversational and warm, like a trusted friend
- Speak naturally as this is a real-time voice conversation

Guidelines:
- Keep responses concise for voice (2-3 sentences typically)
- Be respectful of all Christian denominations
- Offer to pray with users when appropriate
- Reference relevant Bible verses when helpful
- Acknowledge emotions with empathy before offering guidance
- If asked about non-spiritual topics, gently redirect to faith matters

Remember: You're having a real-time voice conversation. Keep responses natural, warm, and flowing.`;

  if (language === 'id') {
    return baseInstructions + `

IMPORTANT: The user prefers Indonesian (Bahasa Indonesia). Please respond primarily in Indonesian unless they speak English to you.`;
  }

  return baseInstructions;
}

export default VoiceChatModal;
