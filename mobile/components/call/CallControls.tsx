/**
 * Call Controls Component
 *
 * Bottom control bar for voice/video calls.
 * Includes mute, video toggle, speaker, end call buttons.
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
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
      className="absolute bottom-0 left-0 right-0 pb-10 pt-5 px-5 items-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <View className="flex-row items-center justify-center gap-6 mb-6">
        {/* Mute Button */}
        <Pressable
          onPress={() => handlePress(onToggleMute)}
          className="w-[60px] h-[60px] rounded-full items-center justify-center"
          style={{
            backgroundColor: isMuted ? colors.primary[500] : 'rgba(255, 255, 255, 0.2)',
          }}
        >
          {isMuted ? (
            <MicOff size={24} color={colors.white} />
          ) : (
            <Mic size={24} color={colors.white} />
          )}
          <Text className="text-white text-[10px] mt-1 text-center">
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        {/* Video Button (only for video calls) */}
        {callType === CallType.VIDEO && (
          <Pressable
            onPress={() => handlePress(onToggleVideo)}
            className="w-[60px] h-[60px] rounded-full items-center justify-center"
            style={{
              backgroundColor: !isVideoEnabled ? colors.primary[500] : 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {isVideoEnabled ? (
              <Video size={24} color={colors.white} />
            ) : (
              <VideoOff size={24} color={colors.white} />
            )}
            <Text className="text-white text-[10px] mt-1 text-center">
              {isVideoEnabled ? 'Stop Video' : 'Start Video'}
            </Text>
          </Pressable>
        )}

        {/* Speaker Button (only for voice calls) */}
        {callType === CallType.VOICE && (
          <Pressable
            onPress={() => handlePress(onToggleSpeaker)}
            className="w-[60px] h-[60px] rounded-full items-center justify-center"
            style={{
              backgroundColor: isSpeakerOn ? colors.primary[500] : 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {isSpeakerOn ? (
              <Volume2 size={24} color={colors.white} />
            ) : (
              <VolumeX size={24} color={colors.white} />
            )}
            <Text className="text-white text-[10px] mt-1 text-center">
              {isSpeakerOn ? 'Speaker' : 'Earpiece'}
            </Text>
          </Pressable>
        )}

        {/* Switch Camera (only for video calls with video enabled) */}
        {callType === CallType.VIDEO && isVideoEnabled && (
          <Pressable
            onPress={() => handlePress(onSwitchCamera)}
            className="w-[60px] h-[60px] rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <SwitchCamera size={24} color={colors.white} />
            <Text className="text-white text-[10px] mt-1 text-center">Flip</Text>
          </Pressable>
        )}
      </View>

      {/* End Call Button */}
      <Pressable
        onPress={handleEndCall}
        className="w-[70px] h-[70px] rounded-full items-center justify-center"
        style={{ backgroundColor: colors.error[500], ...shadows.lg }}
      >
        <PhoneOff size={28} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}
