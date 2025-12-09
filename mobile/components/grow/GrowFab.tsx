/**
 * Grow FAB Component
 *
 * Central floating action button in the tab bar.
 * Opens the GrowPanel with Bible and Explore options.
 *
 * Features:
 * - Gentle pulse animation when closed (attention-grabbing)
 * - Animated rotation when panel is open
 * - Gradient background (green closed, red open)
 * - Haptic feedback
 *
 * Note: Pulse animation now works because Today screen moved to today.tsx
 * (avoiding Expo Router's index route lag issue).
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { GrowIcon, PlusIcon } from '@/components/navigation/TabIcons';
import { colors, shadows } from '@/constants/theme';
import { useGrowStore } from '@/stores/growStore';

interface GrowFabProps {
  size?: number;
}

export function GrowFab({ size = 56 }: GrowFabProps) {
  // Selective subscriptions to prevent re-renders
  const isOpen = useGrowStore((s) => s.isOpen);
  const toggle = useGrowStore((s) => s.toggle);

  // Animated values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  // Pulse animation when closed - gentle breathing effect
  useEffect(() => {
    if (isOpen) {
      // Stop pulse when open
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    } else {
      // Start pulse animation when closed
      // Outer ring pulse
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.4, { duration: 1200, easing: Easing.out(Easing.ease) })
        ),
        -1, // Infinite
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [isOpen, pulseScale, pulseOpacity]);

  // Update rotation and scale when isOpen changes
  useEffect(() => {
    rotation.value = withSpring(isOpen ? 45 : 0, { damping: 15, stiffness: 200 });
    scale.value = withSpring(isOpen ? 1.05 : 1, { damping: 15, stiffness: 200 });
  }, [isOpen, rotation, scale]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggle();
  };

  return (
    <View className="items-center justify-center -mt-5">
      {/* Pulse Ring - Expanding circle animation */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#00a651',
          },
          pulseRingStyle,
        ]}
        pointerEvents="none"
      />

      {/* Main FAB */}
      <Pressable onPress={handlePress} style={{ zIndex: 10 }}>
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.white,
              overflow: 'hidden',
              ...shadows.xl,
            },
            fabStyle,
          ]}
        >
          <LinearGradient
            colors={isOpen ? ['#ff4d4d', '#cc0000'] : ['#00a651', '#006431']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="items-center justify-center"
            style={{ width: size, height: size, borderRadius: size / 2 }}
          >
            {isOpen ? (
              <PlusIcon size={28} color={colors.white} />
            ) : (
              <GrowIcon size={28} color={colors.white} isActive />
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}
