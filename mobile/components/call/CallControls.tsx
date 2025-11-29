/**
 * Call Controls Component
 *
 * Bottom control bar for voice/video calls.
 * Includes mute, video toggle, speaker, end call buttons.
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  SwitchCamera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { colors, shadows } from '@/constants/theme';
import { CallType } from '@/types/call';

interface CallControlsProps {
  callType: CallType;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera: () => void;
  onEndCall: () => void;
}

export function CallControls({
  callType,
  isMuted,
  isVideoEnabled,
  isSpeakerOn,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
}: CallControlsProps) {
  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const handleEndCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onEndCall();
  };

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      style={styles.container}
    >
      <View style={styles.controlsRow}>
        {/* Mute Button */}
        <Pressable
          onPress={() => handlePress(onToggleMute)}
          style={[
            styles.controlButton,
            isMuted && styles.controlButtonActive,
          ]}
        >
          {isMuted ? (
            <MicOff size={24} color={colors.white} />
          ) : (
            <Mic size={24} color={colors.white} />
          )}
          <Text style={styles.controlLabel}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        {/* Video Button (only for video calls) */}
        {callType === CallType.VIDEO && (
          <Pressable
            onPress={() => handlePress(onToggleVideo)}
            style={[
              styles.controlButton,
              !isVideoEnabled && styles.controlButtonActive,
            ]}
          >
            {isVideoEnabled ? (
              <Video size={24} color={colors.white} />
            ) : (
              <VideoOff size={24} color={colors.white} />
            )}
            <Text style={styles.controlLabel}>
              {isVideoEnabled ? 'Stop Video' : 'Start Video'}
            </Text>
          </Pressable>
        )}

        {/* Speaker Button (only for voice calls) */}
        {callType === CallType.VOICE && (
          <Pressable
            onPress={() => handlePress(onToggleSpeaker)}
            style={[
              styles.controlButton,
              isSpeakerOn && styles.controlButtonActive,
            ]}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color={colors.white} />
            ) : (
              <VolumeX size={24} color={colors.white} />
            )}
            <Text style={styles.controlLabel}>
              {isSpeakerOn ? 'Speaker' : 'Earpiece'}
            </Text>
          </Pressable>
        )}

        {/* Switch Camera (only for video calls with video enabled) */}
        {callType === CallType.VIDEO && isVideoEnabled && (
          <Pressable
            onPress={() => handlePress(onSwitchCamera)}
            style={styles.controlButton}
          >
            <SwitchCamera size={24} color={colors.white} />
            <Text style={styles.controlLabel}>Flip</Text>
          </Pressable>
        )}
      </View>

      {/* End Call Button */}
      <Pressable
        onPress={handleEndCall}
        style={styles.endCallButton}
      >
        <PhoneOff size={28} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: colors.primary[500],
  },
  controlLabel: {
    color: colors.white,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.error[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
