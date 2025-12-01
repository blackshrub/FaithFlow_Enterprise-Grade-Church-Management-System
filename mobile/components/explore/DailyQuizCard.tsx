/**
 * DailyQuizCard - Premium gamified card for daily quiz challenge
 *
 * Design: World-class UI with gamified elements
 * - Engaging gradient background
 * - Progress indicators
 * - Celebration elements
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { DailyQuiz } from '@/types/explore';
import { Brain, Trophy, Clock, Zap, ChevronRight, CheckCircle } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface DailyQuizCardProps {
  quiz: DailyQuiz;
  language: 'en' | 'id';
  onPress: () => void;
  completed?: boolean;
  score?: number;
}

// Colors for icon usage
const Colors = {
  secondary: {
    100: '#FFEDD5',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
  },
  success: {
    600: '#16A34A',
  },
  neutral: {
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const DailyQuizCard = memo(function DailyQuizCard({
  quiz,
  language,
  onPress,
  completed = false,
  score,
}: DailyQuizCardProps) {
  const scale = useSharedValue(1);

  const title = quiz.title[language] || quiz.title.en;
  const description = quiz.description?.[language] || quiz.description?.en;
  const questionCount = quiz.questions?.length || 5;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isPerfect = score === 100;
  const isPassed = score !== undefined && score >= (quiz.passing_score_percentage || 70);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="rounded-2xl overflow-hidden"
      style={[
        animatedStyle,
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        },
      ]}
      testID="daily-quiz-card"
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={completed
          ? isPerfect
            ? ['#FEF3C7', '#FDE68A', '#FCD34D'] // Gold for perfect
            : ['#F0FDF4', '#DCFCE7', '#BBF7D0'] // Green for completed
          : ['#FFF7ED', '#FFEDD5', '#FED7AA'] // Warm orange for not started
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      {/* Main Content */}
      <View className="p-5 gap-4">
        {/* Header */}
        <View className="flex-row items-center gap-4">
          {/* Icon */}
          <View
            className={`w-12 h-12 rounded-full items-center justify-center ${
              completed && isPerfect ? '' : ''
            }`}
            style={{
              backgroundColor: completed && isPerfect
                ? Colors.secondary[100]
                : 'rgba(255,255,255,0.8)',
            }}
          >
            {completed ? (
              isPerfect ? (
                <Trophy size={24} color={Colors.secondary[600]} />
              ) : (
                <CheckCircle size={24} color={Colors.success[600]} />
              )
            ) : (
              <Brain size={24} color={Colors.secondary[600]} />
            )}
          </View>

          {/* Title & Description */}
          <View className="flex-1 gap-0.5">
            <Text className="text-[17px] font-bold text-neutral-900" numberOfLines={1}>
              {title}
            </Text>
            {description && (
              <Text className="text-sm text-neutral-600" numberOfLines={1}>
                {description}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-5">
          <View className="flex-row items-center gap-1">
            <Zap size={16} color={Colors.secondary[600]} />
            <Text className="text-[13px] font-semibold text-neutral-700">
              Questions: {questionCount}
            </Text>
          </View>

          {quiz.time_limit_seconds && (
            <View className="flex-row items-center gap-1">
              <Clock size={16} color={Colors.neutral[500]} />
              <Text className="text-[13px] font-semibold text-neutral-700">
                {Math.floor(quiz.time_limit_seconds / 60)} min
              </Text>
            </View>
          )}
        </View>

        {/* CTA Button */}
        {completed && score !== undefined ? (
          <View
            className={`p-3 rounded-xl items-center ${
              isPerfect
                ? ''
                : isPassed
                  ? ''
                  : ''
            }`}
            style={{
              backgroundColor: isPerfect
                ? 'rgba(245, 158, 11, 0.2)'
                : isPassed
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            <Text
              className="text-base font-bold"
              style={{ color: isPerfect ? Colors.secondary[700] : Colors.neutral[800] }}
            >
              {isPerfect ? '🏆 Perfect Score!' : `Score: ${score}%`}
            </Text>
            {isPerfect && (
              <Text
                className="text-[13px] font-medium mt-0.5"
                style={{ color: Colors.secondary[600] }}
              >
                Amazing job!
              </Text>
            )}
          </View>
        ) : (
          <View
            className="flex-row items-center justify-center gap-1.5 py-4 px-5 rounded-xl"
            style={{ backgroundColor: Colors.secondary[500] }}
          >
            <Text className="text-[15px] font-semibold text-white">
              {language === 'en' ? 'Start Challenge' : 'Mulai Tantangan'}
            </Text>
            <ChevronRight size={18} color={Colors.white} />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});
