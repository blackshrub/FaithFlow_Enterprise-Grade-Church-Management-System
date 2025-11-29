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
 */

import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, StatusBar } from 'react-native';
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

const { width, height } = Dimensions.get('window');

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background with fade animation */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Content with slide animations */}
      <View style={styles.gradient}>
        {/* Call Type Indicator */}
        <Animated.View
          entering={SlideInDown.delay(200).springify()}
          style={styles.callTypeIndicator}
        >
          {isVideoCall ? (
            <Video size={20} color={colors.white} />
          ) : (
            <Phone size={20} color={colors.white} />
          )}
          <Text style={styles.callTypeText}>
            {isVideoCall ? 'Video Call' : 'Voice Call'}
          </Text>
        </Animated.View>

        {/* Caller Info */}
        <View style={styles.callerContainer}>
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
          style={styles.actionsContainer}
        >
          {/* Reject Button */}
          <Pressable
            onPress={handleReject}
            style={styles.rejectButton}
          >
            <View style={styles.rejectButtonInner}>
              <PhoneOff size={32} color={colors.white} />
            </View>
            <Text style={styles.buttonLabel}>Decline</Text>
          </Pressable>

          {/* Accept Button */}
          <Pressable
            onPress={handleAccept}
            style={styles.acceptButton}
          >
            <Animated.View
              style={[styles.acceptButtonInner, pulseStyle]}
            >
              {isVideoCall ? (
                <Video size={32} color={colors.white} />
              ) : (
                <Phone size={32} color={colors.white} />
              )}
            </Animated.View>
            <Text style={styles.buttonLabel}>Accept</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 60,
  },
  callTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  callTypeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  callerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    paddingHorizontal: 40,
  },
  rejectButton: {
    alignItems: 'center',
  },
  rejectButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  acceptButton: {
    alignItems: 'center',
  },
  acceptButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.success[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  buttonLabel: {
    color: colors.white,
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
});
