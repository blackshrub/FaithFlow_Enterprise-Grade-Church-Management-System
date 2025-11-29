/**
 * DailyQuizCard - Premium gamified card for daily quiz challenge
 *
 * Design: World-class UI with gamified elements
 * - Engaging gradient background
 * - Progress indicators
 * - Celebration elements
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreSpacing, ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';
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
      style={[styles.container, animatedStyle]}
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
        style={styles.gradient}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Icon */}
          <View style={[
            styles.iconContainer,
            completed && isPerfect && styles.iconContainerPerfect,
          ]}>
            {completed ? (
              isPerfect ? (
                <Trophy size={24} color={ExploreColors.secondary[600]} />
              ) : (
                <CheckCircle size={24} color={ExploreColors.success[600]} />
              )
            ) : (
              <Brain size={24} color={ExploreColors.secondary[600]} />
            )}
          </View>

          {/* Title & Description */}
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {description && (
              <Text style={styles.description} numberOfLines={1}>
                {description}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Zap size={16} color={ExploreColors.secondary[600]} />
            <Text style={styles.statText}>Questions:{questionCount}</Text>
          </View>

          {quiz.time_limit_seconds && (
            <View style={styles.statItem}>
              <Clock size={16} color={ExploreColors.neutral[500]} />
              <Text style={styles.statText}>
                {Math.floor(quiz.time_limit_seconds / 60)} min
              </Text>
            </View>
          )}
        </View>

        {/* CTA Button */}
        {completed && score !== undefined ? (
          <View style={[
            styles.resultBadge,
            isPerfect && styles.resultBadgePerfect,
            !isPerfect && isPassed && styles.resultBadgePassed,
            !isPassed && styles.resultBadgeFailed,
          ]}>
            <Text style={[
              styles.resultText,
              isPerfect && styles.resultTextPerfect,
            ]}>
              {isPerfect ? '🏆 Perfect Score!' : `Score: ${score}%`}
            </Text>
            {isPerfect && (
              <Text style={styles.resultSubtext}>Amazing job!</Text>
            )}
          </View>
        ) : (
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>
              {language === 'en' ? 'Start Challenge' : 'Mulai Tantangan'}
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    ...ExploreShadows.level1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: ExploreSpacing.lg,
    gap: ExploreSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerPerfect: {
    backgroundColor: ExploreColors.secondary[100],
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: ExploreColors.neutral[900],
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: ExploreColors.neutral[600],
  },
  statsRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: ExploreColors.neutral[700],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ExploreColors.secondary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: ExploreBorderRadius.button,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultBadge: {
    padding: 12,
    borderRadius: ExploreBorderRadius.button,
    alignItems: 'center',
  },
  resultBadgePerfect: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  resultBadgePassed: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  resultBadgeFailed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '700',
    color: ExploreColors.neutral[800],
  },
  resultTextPerfect: {
    color: ExploreColors.secondary[700],
  },
  resultSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: ExploreColors.secondary[600],
    marginTop: 2,
  },
});
