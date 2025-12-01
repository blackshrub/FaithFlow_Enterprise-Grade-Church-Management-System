/**
 * Caller Info Component
 *
 * Displays caller/callee information during calls.
 * Shows avatar, name, and call status/duration.
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CallDuration, CallUIState } from '@/types/call';

interface CallerInfoProps {
  name: string;
  avatar?: string | null;
  uiState: CallUIState;
  duration?: CallDuration;
  subtitle?: string;
}

export function CallerInfo({
  name,
  avatar,
  uiState,
  duration,
  subtitle,
}: CallerInfoProps) {
  // Pulse animation for ringing state
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (uiState === 'outgoing' || uiState === 'incoming') {
      pulseScale.value = withRepeat(withTiming(1.4, { duration: 1500 }), -1, false);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
    }
  }, [uiState, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const getStatusText = (): string => {
    switch (uiState) {
      case 'outgoing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming call';
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return duration?.formatted || '00:00';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  return (
    <Animated.View
      entering={ZoomIn.delay(100).springify()}
      className="items-center px-5"
    >
      {/* Avatar */}
      <View className="relative mb-5">
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            className="w-[120px] h-[120px] rounded-full"
            style={{ borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.3)' }}
            contentFit="cover"
          />
        ) : (
          <View
            className="w-[120px] h-[120px] rounded-full items-center justify-center"
            style={{
              backgroundColor: colors.primary[500],
              borderWidth: 3,
              borderColor: 'rgba(255, 255, 255, 0.3)',
            }}
          >
            <Text className="text-5xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Pulsing ring for ringing state */}
        {(uiState === 'outgoing' || uiState === 'incoming') && (
          <Animated.View
            className="absolute w-[120px] h-[120px] rounded-full"
            style={[
              {
                borderWidth: 3,
                borderColor: colors.primary[400],
              },
              pulseStyle,
            ]}
          />
        )}
      </View>

      {/* Name */}
      <Text className="text-[28px] font-bold text-white text-center mb-2" numberOfLines={1}>
        {name}
      </Text>

      {/* Status / Duration */}
      <Text className="text-lg text-white/80 text-center">
        {getStatusText()}
      </Text>

      {/* Optional subtitle (e.g., community name) */}
      {subtitle && (
        <Text className="text-sm text-white/60 text-center mt-2">
          {subtitle}
        </Text>
      )}
    </Animated.View>
  );
}
