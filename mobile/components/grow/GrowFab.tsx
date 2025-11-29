/**
 * Grow FAB Component
 *
 * Central floating action button in the tab bar.
 * Opens the GrowPanel with Bible and Explore options.
 *
 * Features:
 * - Animated rotation when panel is open
 * - Gradient background
 * - Pulsing animation on idle
 * - Haptic feedback
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
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
  const { isOpen, toggle } = useGrowStore();

  // Animated values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  // Update rotation and scale when isOpen changes
  useEffect(() => {
    rotation.value = withSpring(isOpen ? 45 : 0, { damping: 15, stiffness: 200 });
    scale.value = withSpring(isOpen ? 1.05 : 1, { damping: 15, stiffness: 200 });

    if (!isOpen) {
      // Start pulse animation
      pulseScale.value = withRepeat(withTiming(1.3, { duration: 1500 }), -1, false);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
    } else {
      // Stop pulse animation
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [isOpen, rotation, scale, pulseScale, pulseOpacity]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggle();
  };

  return (
    <View style={styles.container}>
      {/* Pulsing ring when closed */}
      {!isOpen && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
            pulseStyle,
          ]}
        />
      )}

      {/* Main FAB */}
      <Pressable onPress={handlePress} style={styles.pressable}>
        <Animated.View
          style={[
            styles.fab,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
            fabStyle,
          ]}
        >
          <LinearGradient
            colors={isOpen ? ['#ff4d4d', '#cc0000'] : ['#00a651', '#006431']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradient,
              { borderRadius: size / 2 },
            ]}
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20, // Float above the tab bar
  },
  pressable: {
    zIndex: 10,
  },
  fab: {
    ...shadows.xl,
    backgroundColor: colors.white,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: colors.success[500],
  },
});
