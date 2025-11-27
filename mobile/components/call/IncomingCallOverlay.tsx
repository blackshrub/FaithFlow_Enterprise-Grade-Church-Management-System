/**
 * Incoming Call Overlay
 *
 * Full-screen overlay for incoming calls.
 * Shows caller info and accept/reject buttons.
 * Displayed as a modal over all other content.
 * Features:
 * - Ringtone playback
 * - Vibration pattern
 * - CallKit integration for native UI
 */

import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { CallerInfo } from './CallerInfo';
import { colors, shadows } from '@/constants/theme';
import { useCallStore, useIncomingCall } from '@/stores/call';
import { CallType } from '@/types/call';
import { useRingtone } from '@/services/audio/ringtone';
import { callKitService } from '@/services/callkit';

const { width, height } = Dimensions.get('window');

export function IncomingCallOverlay() {
  const incomingCall = useIncomingCall();
  const { acceptCall, rejectCall } = useCallStore();
  const { startRingtone, stopRingtone } = useRingtone();

  // Play ringtone and show native call UI
  useEffect(() => {
    if (incomingCall) {
      // Start ringtone (includes vibration)
      startRingtone();

      // Show on native call UI (CallKit/ConnectionService)
      callKitService.displayIncomingCall(
        incomingCall.call_id,
        incomingCall.caller.name,
        incomingCall.caller.id || 'FaithFlow',
        incomingCall.call_type === CallType.VIDEO
      );

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
      // Report to CallKit that call is connected
      callKitService.reportCallConnected(incomingCall.call_id);
    } catch (error) {
      console.error('Failed to accept call:', error);
      // Report call failed to CallKit
      callKitService.reportEndCall(incomingCall.call_id, 1); // 1 = failed
    }
  };

  const handleReject = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopRingtone();
    try {
      await rejectCall(incomingCall.call_id, 'rejected');
      // Report to CallKit that call was declined
      callKitService.reportEndCall(incomingCall.call_id, 5); // 5 = declined
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  };

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Call Type Indicator */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
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
        </MotiView>

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
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300 }}
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
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{
                type: 'timing',
                duration: 600,
                loop: true,
              }}
              style={styles.acceptButtonInner}
            >
              {isVideoCall ? (
                <Video size={32} color={colors.white} />
              ) : (
                <Phone size={32} color={colors.white} />
              )}
            </MotiView>
            <Text style={styles.buttonLabel}>Accept</Text>
          </Pressable>
        </MotiView>
      </LinearGradient>
    </MotiView>
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
