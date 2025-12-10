/**
 * GrowInFaithSection - Bible + Explore Dual Cards
 *
 * Bottom section with two equal-width cards for Bible and Explore.
 * Features:
 * - 2-column equal width cards
 * - Subtle gradient backgrounds
 * - Icon centered
 * - Scale animation on press
 *
 * Styling: NativeWind-first with inline styles for gradients/shadows
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { BookOpen, Compass, Sprout } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PMotion } from '@/components/motion/premium-motion';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING_HORIZONTAL * 2 - GAP) / 2;
const CARD_HEIGHT = 100;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
  },
  bible: {
    light: '#EFF6FF',
    medium: '#DBEAFE',
    accent: '#3B82F6',
  },
  explore: {
    light: '#F5F3FF',
    medium: '#EDE9FE',
    accent: '#8B5CF6',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GrowInFaithSectionProps {
  focusKey?: number | string;
}

export const GrowInFaithSection = memo(function GrowInFaithSection({
  focusKey = 0,
}: GrowInFaithSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBiblePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/bible');
  }, [router]);

  const handleExplorePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/explore');
  }, [router]);

  return (
    <Animated.View
      key={`grow-faith-${focusKey}`}
      entering={PMotion.sectionStagger(7)}
      className="mb-6 px-5"
    >
      {/* Section Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Sprout size={16} color={Colors.accent.primary} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.growInFaith', 'Grow in Faith')}
        </Text>
      </View>

      {/* Cards Row */}
      <View style={styles.cardsRow}>
        {/* Bible Card */}
        <GrowCard
          icon={BookOpen}
          title={t('today.bible', 'Read Scripture')}
          gradientColors={[Colors.bible.light, Colors.bible.medium]}
          iconColor={Colors.bible.accent}
          onPress={handleBiblePress}
        />

        {/* Explore Card */}
        <GrowCard
          icon={Compass}
          title={t('today.explore', 'Discover More')}
          gradientColors={[Colors.explore.light, Colors.explore.medium]}
          iconColor={Colors.explore.accent}
          onPress={handleExplorePress}
        />
      </View>
    </Animated.View>
  );
});

// =============================================================================
// GROW CARD COMPONENT
// =============================================================================

interface GrowCardProps {
  icon: typeof BookOpen;
  title: string;
  gradientColors: [string, string];
  iconColor: string;
  onPress: () => void;
}

const GrowCard = memo(function GrowCard({
  icon: Icon,
  title,
  gradientColors,
  iconColor,
  onPress,
}: GrowCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Icon size={28} color={iconColor} strokeWidth={1.5} />
        </View>
        <Text style={[styles.cardTitle, { color: iconColor }]} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  cardsRow: {
    flexDirection: 'row',
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
