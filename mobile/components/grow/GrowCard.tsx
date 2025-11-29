/**
 * Grow Card Component
 *
 * Large touch-friendly card for Bible and Explore quick access.
 * Features gradient background, icon, and animated entrance.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BookOpen, Compass } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { colors, shadows, borderRadius } from '@/constants/theme';
import { useGrowStore } from '@/stores/growStore';

interface GrowCardProps {
  type: 'bible' | 'explore';
  title: string;
  subtitle: string;
  delay?: number;
}

const CARD_CONFIG = {
  bible: {
    icon: BookOpen,
    gradient: ['#0066ff', '#003d99'] as [string, string],
    route: '/(tabs)/bible' as const,
  },
  explore: {
    icon: Compass,
    gradient: ['#ff7300', '#cc5c00'] as [string, string],
    route: '/(tabs)/explore' as const,
  },
};

export function GrowCard({ type, title, subtitle, delay = 0 }: GrowCardProps) {
  const router = useRouter();
  const { close } = useGrowStore();
  const config = CARD_CONFIG[type];
  const IconComponent = config.icon;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Close panel first
    close();
    // Navigate immediately - use navigate for tab switching
    router.navigate(config.route);
  };

  // Note: Parent GrowPanel already animates opacity, so we use View instead of Animated.View
  // to avoid "opacity may be overwritten by layout animation" warning
  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <IconComponent size={32} color={colors.white} strokeWidth={2} />
          </View>

          {/* Text */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {/* Decorative circles */}
          <View style={[styles.decorativeCircle, styles.circleTopRight]} />
          <View style={[styles.decorativeCircle, styles.circleBottomLeft]} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 160,
  },
  pressable: {
    flex: 1,
    minHeight: 160,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circleTopRight: {
    top: -30,
    right: -30,
  },
  circleBottomLeft: {
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});
