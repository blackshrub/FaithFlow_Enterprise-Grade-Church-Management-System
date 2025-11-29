/**
 * CelebrationModal - Unified Overlay Version
 *
 * Celebration moments for achievements using the unified overlay system.
 * Triggered for: Streak milestones (3,7,14,30,60,90,365), perfect quiz scores
 *
 * Design: Joyful, delightful animations following Duolingo-style celebrations
 * Following UI/UX spec: "Delight over Duty" principle
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Trophy, Sparkles, Target, Flame } from 'lucide-react-native';
import type { OverlayComponentProps } from '@/stores/overlayStore';
import { spacing, radius } from '@/constants/spacing';

const { width } = Dimensions.get('window');

// Colors from Explore design system
const ExploreColors = {
  primary: {
    400: '#60A5FA',
    500: '#3B82F6',
  },
  secondary: {
    500: '#F97316',
  },
  spiritual: {
    500: '#8B5CF6',
  },
  success: {
    500: '#22C55E',
  },
  neutral: {
    50: '#FAFAFA',
    600: '#525252',
    900: '#171717',
  },
};

export type CelebrationType = 'streak' | 'quiz_perfect' | 'milestone' | 'complete';

export interface CelebrationPayload {
  type: CelebrationType;
  data?: {
    streak?: number;
    score?: number;
    title?: string;
    [key: string]: any;
  };
  language?: 'en' | 'id';
}

interface CelebrationConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
}

/**
 * Get celebration configuration based on type and data
 */
function getCelebrationConfig(
  type: CelebrationType,
  data: CelebrationPayload['data'],
  language: 'en' | 'id' = 'en'
): CelebrationConfig {
  const configs: Record<string, CelebrationConfig> = {
    streak: {
      icon: <Flame size={64} color={ExploreColors.secondary[500]} />,
      title: language === 'en' ? `${data?.streak ?? 0} Day Streak!` : `Streak ${data?.streak ?? 0} Hari!`,
      message:
        language === 'en'
          ? "You're on fire! Keep going, you're doing amazing."
          : 'Anda luar biasa! Terus lanjutkan, Anda hebat.',
      color: ExploreColors.secondary[500],
    },
    quiz_perfect: {
      icon: <Trophy size={64} color={ExploreColors.primary[500]} />,
      title: language === 'en' ? 'Perfect Score!' : 'Nilai Sempurna!',
      message:
        language === 'en'
          ? 'You aced it! 100% correct. Outstanding work!'
          : 'Anda luar biasa! 100% benar. Kerja yang hebat!',
      color: ExploreColors.primary[500],
    },
    milestone: {
      icon: <Target size={64} color={ExploreColors.spiritual[500]} />,
      title: language === 'en' ? 'Milestone Reached!' : 'Pencapaian Tercapai!',
      message:
        language === 'en'
          ? `You've reached an important milestone. Well done!`
          : 'Anda telah mencapai pencapaian penting. Kerja bagus!',
      color: ExploreColors.spiritual[500],
    },
    complete: {
      icon: <Sparkles size={64} color={ExploreColors.primary[400]} />,
      title: language === 'en' ? 'Completed!' : 'Selesai!',
      message:
        language === 'en'
          ? `Great job! You've completed this content.`
          : 'Kerja bagus! Anda telah menyelesaikan konten ini.',
      color: ExploreColors.primary[400],
    },
  };

  return configs[type] || configs.milestone;
}

/**
 * Confetti particle component - Toned down version
 * Reduced: particle count, fall distance, rotation, duration
 */
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue((Math.random() - 0.5) * width * 0.4);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0.8);
  const initialX = (Math.random() - 0.5) * width * 0.3;

  useEffect(() => {
    const delay = index * 30; // Faster stagger
    const randomRotate = Math.random() * 360; // Less rotation
    const fallDistance = 200 + Math.random() * 100; // Shorter fall

    translateY.value = withDelay(
      delay,
      withTiming(fallDistance, { duration: 1200 }) // Faster fall
    );
    translateX.value = withDelay(delay, withTiming(initialX, { duration: 1000 }));
    rotate.value = withDelay(delay, withTiming(randomRotate, { duration: 1200 }));
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { backgroundColor: color, left: width / 2 },
        animatedStyle,
      ]}
    />
  );
}

/**
 * CelebrationModal - Unified Overlay Component
 */
export function CelebrationModal({
  payload,
  onClose,
}: OverlayComponentProps<CelebrationPayload>) {
  const type = payload?.type ?? 'milestone';
  const data = payload?.data;
  const language = payload?.language ?? 'en';

  // Animation values - Toned down for subtler entrance
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0.8);

  useEffect(() => {
    // Subtler entrance animation
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withTiming(1, { duration: 250 });
    iconScale.value = withDelay(150, withSpring(1, { damping: 15, stiffness: 150 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const config = getCelebrationConfig(type, data, language);

  const confettiColors = [
    ExploreColors.primary[500],
    ExploreColors.secondary[500],
    ExploreColors.spiritual[500],
    ExploreColors.success[500],
  ];

  return (
    <View style={styles.wrapper}>
      {/* Confetti - Reduced count for subtler effect */}
      {Array.from({ length: 10 }).map((_, index) => (
        <ConfettiParticle
          key={index}
          index={index}
          color={confettiColors[index % confettiColors.length]}
        />
      ))}

      {/* Content */}
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Icon */}
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          {config.icon}
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>{config.title}</Text>

        {/* Message */}
        <Text style={styles.message}>{config.message}</Text>

        {/* Sparkles decoration */}
        <View style={styles.sparklesContainer}>
          <Sparkles size={24} color={config.color} />
        </View>

        {/* Close button */}
        <Pressable style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: spacing.l,
    padding: spacing.m,
    borderRadius: 50,
    backgroundColor: ExploreColors.neutral[50],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: ExploreColors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    color: ExploreColors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.l,
    lineHeight: 24,
    paddingHorizontal: spacing.s,
  },
  sparklesContainer: {
    marginBottom: spacing.m,
  },
  button: {
    backgroundColor: ExploreColors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confettiParticle: {
    position: 'absolute',
    top: -50,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default CelebrationModal;
