/**
 * Faith Assistant Card (Pendamping Iman)
 *
 * A beautiful, prominent card that introduces users to the AI spiritual companion.
 * Designed to feel warm, inviting, and spiritually focused.
 *
 * Three variants:
 * - "featured": Large card with gradient background (for Today screen)
 * - "compact": Smaller card that fits in grid layouts (for Explore screen)
 * - "button": Full-width button with flowing glow animation (for Grow panel)
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  MessageCircle,
  Sparkles,
  Heart,
  ChevronRight,
} from 'lucide-react-native';
import { useCompanionStore, getTimeBasedContext } from '@/stores/companionStore';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

// Standardized spacing (from design system)
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

// Standardized typography sizes
const TYPOGRAPHY = {
  label: 11,      // uppercase labels
  caption: 12,    // small text
  body: 14,       // body text
  subtitle: 15,   // subtitles
  title: 18,      // card titles
  heading: 22,    // section headings
};

// Premium color palette
const Colors = {
  // Spiritual gradient - deep purple to warm indigo
  gradient: {
    primary: ['#4F46E5', '#7C3AED', '#A855F7'] as const,
    secondary: ['#6366F1', '#8B5CF6', '#C084FC'] as const,
    warm: ['#7C3AED', '#9333EA', '#A855F7'] as const,
  },
  accent: {
    gold: '#F59E0B',
    light: '#FDE68A',
  },
  white: '#FFFFFF',
};

interface FaithAssistantCardProps {
  variant?: 'featured' | 'compact' | 'button';
  onPress?: () => void;
  /** Called before navigation (for closing panels, etc.) */
  onBeforeNavigate?: () => void;
}

/**
 * Button variant with flowing glow animation
 * Separated to avoid animation initialization overhead for other variants
 */
function ButtonVariant({ onPress, t }: { onPress: () => void; t: (key: string, fallback: string) => string }) {
  // Flowing glow animation - only initialized for button variant
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    // Start flowing animation
    glowProgress.value = withRepeat(
      withTiming(1, {
        duration: 2500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse
    );
  }, []);

  const glowAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(glowProgress.value, [0, 1], [-100, 350]);
    const opacity = interpolate(glowProgress.value, [0, 0.5, 1], [0.3, 0.8, 0.3]);
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(glowProgress.value, [0, 0.5, 1], [1, 1.02, 1]);
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={pulseAnimatedStyle}>
      <Pressable
        onPress={onPress}
        className="rounded-2xl overflow-hidden active:opacity-90 active:scale-[0.98]"
      >
        <LinearGradient
          colors={[...Colors.gradient.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="relative overflow-hidden"
          style={{ paddingVertical: 14, paddingHorizontal: 16 }}
        >
          {/* Flowing glow effect */}
          <Animated.View
            className="absolute top-0 left-0 w-[100px] h-full bg-white/35 -skew-x-[20deg]"
            style={glowAnimatedStyle}
          />

          {/* Content */}
          <View className="flex-row items-center gap-3.5 z-[1]">
            <View className="w-11 h-11 rounded-xl bg-white/25 items-center justify-center relative">
              <MessageCircle size={22} color={Colors.white} strokeWidth={2} />
              <View className="absolute -top-1 -right-1 bg-white/90 rounded-lg p-0.5">
                <Sparkles size={10} color={Colors.accent.gold} fill={Colors.accent.gold} />
              </View>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-[15px] font-bold text-white tracking-tight">
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text className="text-[12px] font-medium text-white/85">
                {t('companion.buttonDesc', 'Chat with your spiritual companion')}
              </Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-white/25 items-center justify-center">
              <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function FaithAssistantCardComponent({ variant = 'featured', onPress, onBeforeNavigate }: FaithAssistantCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const setEntryContext = useCompanionStore((s) => s.setEntryContext);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Set time-based context for personalized greeting
    const context = getTimeBasedContext();
    setEntryContext(context);

    // Call onBeforeNavigate if provided (e.g., to close panel)
    if (onBeforeNavigate) {
      onBeforeNavigate();
    }

    if (onPress) {
      onPress();
    } else {
      router.push('/companion');
    }
  };

  // Button variant - full width with flowing glow animation
  // Delegated to separate component to avoid animation overhead for other variants
  if (variant === 'button') {
    return <ButtonVariant onPress={handlePress} t={t} />;
  }

  // Compact variant - matches QuickCard height/style in Explore screen
  // Uses Pressable instead of Gluestack Button to allow custom height
  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handlePress}
        className="rounded-2xl overflow-hidden active:opacity-90 active:scale-[0.98]"
      >
        <LinearGradient
          colors={[...Colors.gradient.warm]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16 }}
        >
          {/* Content - matches QuickCard padding */}
          <View className="flex-row items-center" style={{ gap: 14 }}>
            <View className="w-12 h-12 rounded-[14px] bg-white/25 items-center justify-center">
              <MessageCircle size={22} color={Colors.white} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-bold text-white">
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text className="text-[13px] font-medium text-white/80">
                {t('companion.shortDesc', 'Ask anything')}
              </Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Featured variant - large, prominent card (using Gluestack Button)
  // Clean layout: Icon left, Text center-left, CTA right
  // Padding: 12px horizontal, 14px vertical for balanced look
  return (
    <View className="rounded-2xl overflow-hidden">
      <Button
        size="lg"
        onPress={handlePress}
        className="w-full bg-transparent relative overflow-hidden items-start px-0"
        style={{ minHeight: 120, height: 'auto' }}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={[...Colors.gradient.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative orbs */}
        <View className="absolute inset-0 overflow-hidden">
          <View className="absolute w-24 h-24 rounded-full bg-white/[0.08] -top-6 -right-3" />
          <View className="absolute w-16 h-16 rounded-full bg-white/[0.06] bottom-0 left-8" />
        </View>

        {/* Content - padding: 12px horizontal, 14px vertical */}
        <View
          className="flex-row items-center z-[1] w-full"
          style={{ paddingHorizontal: SPACING.md, paddingVertical: 14 }}
        >
          {/* Icon - 44x44 */}
          <View className="relative mr-3">
            <View
              className="rounded-xl bg-white/20 items-center justify-center"
              style={{ width: 44, height: 44 }}
            >
              <MessageCircle size={24} color={Colors.white} strokeWidth={2} />
            </View>
            <View className="absolute -top-1 -right-1 bg-white/90 rounded-md p-0.5">
              <Sparkles size={10} color={Colors.accent.gold} fill={Colors.accent.gold} />
            </View>
          </View>

          {/* Text - flex-1 to fill space */}
          <View className="flex-1 mr-2">
            <View className="flex-row items-center mb-0.5">
              <Heart size={10} color={Colors.accent.light} fill={Colors.accent.light} />
              <Text
                className="font-medium text-white/70 uppercase tracking-wide ml-1"
                style={{ fontSize: 10 }}
              >
                {t('companion.label', 'Spiritual Companion')}
              </Text>
            </View>
            <Text
              className="font-bold text-white"
              style={{ fontSize: 17, lineHeight: 22 }}
            >
              {t('companion.title', 'Faith Assistant')}
            </Text>
            <Text
              className="text-white/80"
              style={{ fontSize: 13, lineHeight: 18, marginTop: 2 }}
              numberOfLines={3}
            >
              {t('companion.description', 'Ask questions about faith, get biblical guidance, or simply talk through what\'s on your heart.')}
            </Text>
          </View>

          {/* CTA button */}
          <View
            className="flex-row items-center bg-white rounded-lg"
            style={{ paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <Text
              className="font-semibold"
              style={{ fontSize: 13, color: Colors.gradient.primary[0] }}
            >
              {t('companion.cta', 'Chat Now')}
            </Text>
            <ChevronRight size={14} color={Colors.gradient.primary[0]} strokeWidth={2.5} />
          </View>
        </View>
      </Button>
    </View>
  );
}

export const FaithAssistantCard = memo(FaithAssistantCardComponent);
export default FaithAssistantCard;
