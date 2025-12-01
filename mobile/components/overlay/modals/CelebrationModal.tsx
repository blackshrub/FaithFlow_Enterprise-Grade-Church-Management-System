/**
 * CelebrationModal - Unified Overlay Version
 *
 * Celebration moments for achievements using the unified overlay system.
 * Triggered for: Streak milestones (3,7,14,30,60,90,365), perfect quiz scores
 *
 * Standardized styling:
 * - Title: 24px font-bold
 * - Message: 16px
 * - Button: 16px font-semibold
 * - NativeWind + minimal inline styles
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Trophy, Sparkles, Target, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayComponentProps } from '@/stores/overlayStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Consistent colors
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    600: '#525252',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
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

function getCelebrationConfig(
  type: CelebrationType,
  data: CelebrationPayload['data'],
  language: 'en' | 'id' = 'en'
): CelebrationConfig {
  const configs: Record<string, CelebrationConfig> = {
    streak: {
      icon: <Flame size={64} color={Colors.secondary[500]} />,
      title: language === 'en' ? `${data?.streak ?? 0} Day Streak!` : `Streak ${data?.streak ?? 0} Hari!`,
      message:
        language === 'en'
          ? "You're on fire! Keep going, you're doing amazing."
          : 'Anda luar biasa! Terus lanjutkan, Anda hebat.',
      color: Colors.secondary[500],
    },
    quiz_perfect: {
      icon: <Trophy size={64} color={Colors.primary[500]} />,
      title: language === 'en' ? 'Perfect Score!' : 'Nilai Sempurna!',
      message:
        language === 'en'
          ? 'You aced it! 100% correct. Outstanding work!'
          : 'Anda luar biasa! 100% benar. Kerja yang hebat!',
      color: Colors.primary[500],
    },
    milestone: {
      icon: <Target size={64} color={Colors.spiritual[500]} />,
      title: language === 'en' ? 'Milestone Reached!' : 'Pencapaian Tercapai!',
      message:
        language === 'en'
          ? `You've reached an important milestone. Well done!`
          : 'Anda telah mencapai pencapaian penting. Kerja bagus!',
      color: Colors.spiritual[500],
    },
    complete: {
      icon: <Sparkles size={64} color={Colors.primary[400]} />,
      title: language === 'en' ? 'Completed!' : 'Selesai!',
      message:
        language === 'en'
          ? `Great job! You've completed this content.`
          : 'Kerja bagus! Anda telah menyelesaikan konten ini.',
      color: Colors.primary[400],
    },
  };

  return configs[type] || configs.milestone;
}

/**
 * Confetti particle component
 */
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue((Math.random() - 0.5) * SCREEN_WIDTH * 0.4);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0.8);
  const initialX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.3;

  useEffect(() => {
    const delay = index * 30;
    const randomRotate = Math.random() * 360;
    const fallDistance = 200 + Math.random() * 100;

    translateY.value = withDelay(delay, withTiming(fallDistance, { duration: 1200 }));
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
      className="absolute w-2.5 h-2.5 rounded-full"
      style={[
        { backgroundColor: color, left: SCREEN_WIDTH / 2, top: -50 },
        animatedStyle,
      ]}
    />
  );
}

export function CelebrationModal({
  payload,
  onClose,
}: OverlayComponentProps<CelebrationPayload>) {
  const type = payload?.type ?? 'milestone';
  const data = payload?.data;
  const language = payload?.language ?? 'en';

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0.8);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    Colors.primary[500],
    Colors.secondary[500],
    Colors.spiritual[500],
    Colors.success[500],
  ];

  return (
    <View className="items-center justify-center">
      {/* Confetti */}
      {Array.from({ length: 10 }).map((_, index) => (
        <ConfettiParticle
          key={index}
          index={index}
          color={confettiColors[index % confettiColors.length]}
        />
      ))}

      {/* Content */}
      <Animated.View
        className="items-center rounded-[28px] pt-8 pb-7 px-6"
        style={[
          containerStyle,
          {
            width: SCREEN_WIDTH * 0.85,
            backgroundColor: Colors.white,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          },
        ]}
      >
        {/* Icon */}
        <Animated.View
          className="mb-5 p-4 rounded-full"
          style={[iconStyle, { backgroundColor: Colors.neutral[50] }]}
        >
          {config.icon}
        </Animated.View>

        {/* Title */}
        <Text
          className="text-[24px] font-bold text-center mb-2"
          style={{ color: Colors.neutral[900] }}
        >
          {config.title}
        </Text>

        {/* Message */}
        <Text
          className="text-base text-center mb-5 leading-6 px-2"
          style={{ color: Colors.neutral[600] }}
        >
          {config.message}
        </Text>

        {/* Sparkles decoration */}
        <View className="mb-4">
          <Sparkles size={24} color={config.color} />
        </View>

        {/* Continue button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
          className="items-center justify-center py-3.5 px-8 rounded-2xl min-w-[180px] active:opacity-80"
          style={{ backgroundColor: Colors.primary[500] }}
        >
          <Text className="text-base font-semibold text-white">Continue</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default CelebrationModal;
