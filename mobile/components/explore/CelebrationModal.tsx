/**
 * CelebrationModal - Celebration moments for achievements
 *
 * Design: Joyful, delightful animations following Duolingo-style celebrations
 * Triggered for: Streak milestones (3,7,14,30,60,90,365), perfect quiz scores
 *
 * Following UI/UX spec: "Delight over Duty" principle
 */

import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { Trophy, Sparkles, Target, Flame } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

type CelebrationType = 'streak' | 'quiz_perfect' | 'milestone' | 'complete';

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
  data: any,
  language: 'en' | 'id' = 'en'
): CelebrationConfig {
  const configs: Record<string, CelebrationConfig> = {
    streak: {
      icon: <Flame size={64} color={ExploreColors.secondary[500]} />,
      title: language === 'en' ? `${data.streak} Day Streak!` : `Streak ${data.streak} Hari!`,
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
 * Confetti particle component
 */
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const translateY = useSharedValue(-100);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const delay = index * 50;
    const randomX = (Math.random() - 0.5) * width;
    const randomRotate = Math.random() * 720;

    translateY.value = withDelay(
      delay,
      withTiming(height + 100, { duration: 2000 + Math.random() * 1000 })
    );
    translateX.value = withDelay(delay, withSpring(randomX, { damping: 10 }));
    rotate.value = withDelay(delay, withTiming(randomRotate, { duration: 2000 }));
    opacity.value = withDelay(
      delay + 1500,
      withTiming(0, { duration: 500 })
    );
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
        {
          position: 'absolute',
          top: 0,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Main celebration modal component
 */
export function CelebrationModal() {
  const { showCelebration, celebrationType, celebrationData, closeCelebration } = useExploreStore();

  // Animation values
  const scale = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (showCelebration) {
      // Entrance animation
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 200,
      });
      iconScale.value = withSequence(
        withDelay(200, withSpring(1.2, { damping: 10 })),
        withSpring(1, { damping: 15 })
      );
    } else {
      // Exit animation
      scale.value = withTiming(0.8, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [showCelebration]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!showCelebration || !celebrationType) {
    return null;
  }

  const config = getCelebrationConfig(celebrationType, celebrationData);

  const confettiColors = [
    ExploreColors.primary[500],
    ExploreColors.secondary[500],
    ExploreColors.spiritual[500],
    ExploreColors.success[500],
  ];

  return (
    <Modal
      visible={showCelebration}
      transparent
      animationType="none"
      onRequestClose={closeCelebration}
    >
      <BlurView
        intensity={80}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Confetti */}
        {Array.from({ length: 20 }).map((_, index) => (
          <ConfettiParticle
            key={index}
            index={index}
            color={confettiColors[index % confettiColors.length]}
          />
        ))}

        {/* Content */}
        <Animated.View
          className="items-center bg-white"
          style={[
            {
              width: width * 0.85,
              borderRadius: 28,
              paddingTop: 32,
              paddingBottom: 28,
              paddingHorizontal: ExploreSpacing['2xl'],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            },
            containerStyle,
          ]}
        >
          {/* Icon */}
          <Animated.View
            style={[
              {
                marginBottom: ExploreSpacing.xl,
                padding: ExploreSpacing.lg,
                borderRadius: 50,
                backgroundColor: ExploreColors.neutral[50],
              },
              iconStyle,
            ]}
          >
            {config.icon}
          </Animated.View>

          {/* Title */}
          <Text
            className="text-center"
            style={{
              ...ExploreTypography.h2,
              color: ExploreColors.neutral[900],
              marginBottom: ExploreSpacing.md,
            }}
          >
            {config.title}
          </Text>

          {/* Message */}
          <Text
            className="text-center"
            style={{
              ...ExploreTypography.body,
              color: ExploreColors.neutral[600],
              marginBottom: ExploreSpacing.xl,
              lineHeight: 24,
              paddingHorizontal: ExploreSpacing.sm,
            }}
          >
            {config.message}
          </Text>

          {/* Sparkles decoration */}
          <View style={{ marginBottom: ExploreSpacing.lg }}>
            <Sparkles size={24} color={config.color} />
          </View>

          {/* Close button */}
          <Pressable
            className="items-center"
            style={{
              backgroundColor: ExploreColors.primary[500],
              paddingHorizontal: ExploreSpacing['2xl'],
              paddingVertical: ExploreSpacing.md + 2,
              borderRadius: 16,
              minWidth: 180,
            }}
            onPress={closeCelebration}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Continue and close celebration"
          >
            <Text style={{ ...ExploreTypography.body, color: '#FFFFFF', fontWeight: '600' }}>Continue</Text>
          </Pressable>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

