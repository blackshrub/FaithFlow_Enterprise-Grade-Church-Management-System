/**
 * Incoming Call Overlay
 *
 * Full-screen overlay for incoming calls.
 * Shows caller info and accept/reject buttons.
 * Displayed as a modal over all other content.
 *
 * Features:
 * - Ringtone playback
 * - Vibration pattern
 * - In-app call UI (WhatsApp-style)
 *
 * Note: We do NOT use CallKit here because:
 * 1. iOS only supports CallKit with VoIP PushKit (we use standard FCM)
 * 2. When app is foregrounded, in-app UI provides better UX
 * 3. Android notification already shows Accept/Decline buttons
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { useEffect } from 'react';
import { View, Pressable, StatusBar } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInDown,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui/text';
import { CallerInfo } from './CallerInfo';
import { colors, shadows } from '@/constants/theme';
import { useCallStore, useIncomingCall } from '@/stores/call';
import { CallType } from '@/types/call';
import { useRingtone } from '@/services/audio/ringtone';

export function IncomingCallOverlay() {
  const router = useRouter();
  const incomingCall = useIncomingCall();
  const { acceptCall, rejectCall } = useCallStore();
  const { startRingtone, stopRingtone } = useRingtone();

  // Pulsing animation for accept button
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (incomingCall) {
      pulseScale.value = withRepeat(
        withTiming(1.1, { duration: 600 }),
        -1,
        true
      );
    }
  }, [incomingCall, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Play ringtone when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      // Start ringtone (includes vibration pattern)
      startRingtone();

      return () => {
        stopRingtone();
      };
    }

    return undefined;
  }, [incomingCall, startRingtone, stopRingtone]);

  if (!incomingCall) return null;

  const isVideoCall = incomingCall.call_type === CallType.VIDEO;

  const handleAccept = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopRingtone();
    try {
      await acceptCall(incomingCall.call_id);
      // Navigate to the call screen
      router.push(`/call/${incomingCall.call_id}`);
    } catch {
      // Accept failed silently
    }
  };

  const handleReject = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopRingtone();
    try {
      await rejectCall(incomingCall.call_id, 'rejected');
    } catch {
      // Reject failed silently
    }
  };

  return (
    <View className="absolute inset-0 z-[9999]">
      <StatusBar barStyle="light-content" />

      {/* Background with fade animation */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="absolute inset-0"
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          className="flex-1 pt-[60px] pb-[60px]"
        />
      </Animated.View>

      {/* Content with slide animations */}
      <View className="flex-1 pt-[60px] pb-[60px]">
        {/* Call Type Indicator */}
        <Animated.View
          entering={SlideInDown.delay(200).springify()}
          className="flex-row items-center justify-center gap-2 mb-5"
        >
          {isVideoCall ? (
            <Video size={20} color={colors.white} />
          ) : (
            <Phone size={20} color={colors.white} />
          )}
          <Text className="text-white text-base font-semibold">
            {isVideoCall ? 'Video Call' : 'Voice Call'}
          </Text>
        </Animated.View>

        {/* Caller Info */}
        <View className="flex-1 justify-center items-center">
          <CallerInfo
            name={incomingCall.caller.name}
            avatar={incomingCall.caller.avatar}
            uiState="incoming"
            subtitle={incomingCall.community_name ?? undefined}
          />
        </View>

        {/* Action Buttons */}
        <Animated.View
          entering={SlideInUp.delay(300).springify()}
          className="flex-row justify-center items-center gap-[60px] px-10"
        >
          {/* Reject Button */}
          <Pressable
            onPress={handleReject}
            className="items-center"
          >
            <View
              className="w-[70px] h-[70px] rounded-full items-center justify-center"
              style={{ backgroundColor: colors.error[500], ...shadows.lg }}
            >
              <PhoneOff size={32} color={colors.white} />
            </View>
            <Text className="text-white text-sm mt-3 font-medium">Decline</Text>
          </Pressable>

          {/* Accept Button */}
          <Pressable
            onPress={handleAccept}
            className="items-center"
          >
            <Animated.View
              className="w-[70px] h-[70px] rounded-full items-center justify-center"
              style={[{ backgroundColor: colors.success[500], ...shadows.lg }, pulseStyle]}
            >
              {isVideoCall ? (
                <Video size={32} color={colors.white} />
              ) : (
                <Phone size={32} color={colors.white} />
              )}
            </Animated.View>
            <Text className="text-white text-sm mt-3 font-medium">Accept</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
