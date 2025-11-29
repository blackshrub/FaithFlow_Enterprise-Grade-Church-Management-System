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
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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
import { ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  neutral: {
    100: '#F5F5F5',
    200: '#E5E5E5',
    400: '#A3A3A3',
    500: '#737373',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

interface FaithAssistantCardProps {
  variant?: 'featured' | 'compact' | 'button';
  onPress?: () => void;
  /** Called before navigation (for closing panels, etc.) */
  onBeforeNavigate?: () => void;
}

function FaithAssistantCardComponent({ variant = 'featured', onPress, onBeforeNavigate }: FaithAssistantCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const setEntryContext = useCompanionStore((s) => s.setEntryContext);

  // Flowing glow animation for button variant
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    if (variant === 'button') {
      // Start flowing animation
      glowProgress.value = withRepeat(
        withTiming(1, {
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // Infinite repeat
        true // Reverse
      );
    }
  }, [variant]);

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
  if (variant === 'button') {
    return (
      <Animated.View style={pulseAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.buttonCard,
            pressed && styles.cardPressed,
          ]}
        >
          <LinearGradient
            colors={Colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {/* Flowing glow effect */}
            <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />

            {/* Decorative elements */}
            <View style={[styles.buttonDecor, styles.buttonDecor1]} />
            <View style={[styles.buttonDecor, styles.buttonDecor2]} />

            {/* Content */}
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconWrap}>
                <MessageCircle size={22} color={Colors.white} strokeWidth={2} />
                <View style={styles.buttonSparkle}>
                  <Sparkles size={10} color={Colors.accent.gold} fill={Colors.accent.gold} />
                </View>
              </View>
              <View style={styles.buttonTextWrap}>
                <Text style={styles.buttonTitle}>
                  {t('companion.title', 'Faith Assistant')}
                </Text>
                <Text style={styles.buttonDesc}>
                  {t('companion.buttonDesc', 'Chat with your spiritual companion')}
                </Text>
              </View>
              <View style={styles.buttonArrow}>
                <ChevronRight size={20} color={Colors.white} strokeWidth={2.5} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactCard,
          pressed && styles.cardPressed,
        ]}
      >
        <LinearGradient
          colors={Colors.gradient.warm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          {/* Decorative elements */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />

          <View style={styles.compactContent}>
            <View style={styles.compactIconWrap}>
              <MessageCircle size={24} color={Colors.white} />
            </View>
            <View style={styles.compactTextWrap}>
              <Text style={styles.compactTitle}>
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text style={styles.compactDesc}>
                {t('companion.shortDesc', 'Ask anything')}
              </Text>
            </View>
            <View style={styles.compactArrow}>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Featured variant - large, prominent card
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.featuredCard,
        pressed && styles.cardPressed,
      ]}
    >
      <LinearGradient
        colors={Colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredGradient}
      >
        {/* Decorative background elements */}
        <View style={styles.bgPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
          <View style={[styles.patternCircle, styles.patternCircle3]} />
        </View>

        {/* Content */}
        <View style={styles.featuredContent}>
          {/* Left side - Icon and text */}
          <View style={styles.featuredLeft}>
            {/* Animated icon container */}
            <View style={styles.iconContainer}>
              <View style={styles.iconGlow} />
              <View style={styles.iconInner}>
                <MessageCircle size={28} color={Colors.white} strokeWidth={2} />
              </View>
              {/* Sparkle accent */}
              <View style={styles.sparkleWrap}>
                <Sparkles size={14} color={Colors.accent.gold} fill={Colors.accent.gold} />
              </View>
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
              <View style={styles.labelRow}>
                <Heart size={12} color={Colors.accent.light} fill={Colors.accent.light} />
                <Text style={styles.labelText}>
                  {t('companion.label', 'Your Spiritual Companion')}
                </Text>
              </View>
              <Text style={styles.featuredTitle}>
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text style={styles.featuredDesc}>
                {t('companion.description', 'Ask questions about faith, get biblical guidance, or simply talk through what\'s on your heart.')}
              </Text>
            </View>
          </View>

          {/* Right side - CTA button */}
          <View style={styles.ctaWrap}>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>
                {t('companion.cta', 'Start Chat')}
              </Text>
              <ChevronRight size={16} color={Colors.gradient.primary[0]} strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Featured variant styles
  featuredCard: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    ...ExploreShadows.level2,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  featuredGradient: {
    padding: 20,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  patternCircle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -20,
  },
  patternCircle2: {
    width: 80,
    height: 80,
    bottom: -30,
    left: 40,
  },
  patternCircle3: {
    width: 60,
    height: 60,
    top: 30,
    right: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  featuredLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -4,
    left: -4,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sparkleWrap: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 3,
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  featuredDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    maxWidth: '95%',
  },
  ctaWrap: {
    marginLeft: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gradient.primary[0],
  },

  // Compact variant styles
  compactCard: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    ...ExploreShadows.level2,
  },
  compactGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle1: {
    width: 80,
    height: 80,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    width: 50,
    height: 50,
    bottom: -25,
    left: 10,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  compactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTextWrap: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  compactDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  compactArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Button variant styles - full width with flowing glow
  buttonCard: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    ...ExploreShadows.level2,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ skewX: '-20deg' }],
  },
  buttonDecor: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  buttonDecor1: {
    width: 100,
    height: 100,
    top: -50,
    right: 20,
  },
  buttonDecor2: {
    width: 60,
    height: 60,
    bottom: -30,
    left: -10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  buttonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 2,
  },
  buttonTextWrap: {
    flex: 1,
    gap: 2,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  buttonDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  buttonArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const FaithAssistantCard = memo(FaithAssistantCardComponent);
export default FaithAssistantCard;
