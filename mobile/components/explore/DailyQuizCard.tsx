/**
 * DailyQuizCard - Card component for daily quiz challenge
 *
 * Design: Playful with secondary color accent (celebration gold)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExploreCard } from './ExploreCard';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import type { DailyQuiz } from '@/types/explore';
import { Brain, Trophy, Clock } from 'lucide-react-native';

interface DailyQuizCardProps {
  quiz: DailyQuiz;
  language: 'en' | 'id';
  onPress: () => void;
  completed?: boolean;
  score?: number;
}

export function DailyQuizCard({
  quiz,
  language,
  onPress,
  completed = false,
  score,
}: DailyQuizCardProps) {
  const title = quiz.title[language] || quiz.title.en;
  const description = quiz.description?.[language] || quiz.description?.en;

  return (
    <ExploreCard onPress={onPress} testID="daily-quiz-card">
      {/* Header with Icon */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Brain size={24} color={ExploreColors.secondary[600]} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          )}
        </View>
      </View>

      {/* Quiz Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Questions:</Text>
          <Text style={styles.metaValue}>{quiz.questions.length}</Text>
        </View>

        {quiz.time_limit_minutes && (
          <View style={styles.metaItem}>
            <Clock size={14} color={ExploreColors.neutral[500]} />
            <Text style={styles.metaValue}>{quiz.time_limit_minutes} min</Text>
          </View>
        )}

        {quiz.difficulty && (
          <View style={[styles.difficultyBadge, styles[`difficulty_${quiz.difficulty}`]]}>
            <Text style={styles.difficultyText}>
              {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Completion Status */}
      {completed && score !== undefined ? (
        <View style={styles.completedContainer}>
          <Trophy size={20} color={ExploreColors.secondary[600]} />
          <Text style={styles.completedText}>
            Completed: {score}%
          </Text>
          {score === 100 && (
            <Text style={styles.perfectBadge}>Perfect!</Text>
          )}
        </View>
      ) : (
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>
            {language === 'en' ? 'Start Challenge' : 'Mulai Tantangan'}
          </Text>
        </View>
      )}
    </ExploreCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ExploreColors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: ExploreSpacing.xs,
  },
  title: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
  },
  description: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
  },
  metaRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.lg,
    paddingVertical: ExploreSpacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ExploreColors.neutral[200],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
  },
  metaLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
  },
  metaValue: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficulty_easy: {
    backgroundColor: ExploreColors.success[50],
  },
  difficulty_medium: {
    backgroundColor: ExploreColors.warning[50],
  },
  difficulty_hard: {
    backgroundColor: ExploreColors.error[50],
  },
  difficultyText: {
    ...ExploreTypography.caption,
    fontWeight: '600',
    color: ExploreColors.neutral[700],
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    marginTop: ExploreSpacing.md,
    padding: ExploreSpacing.sm,
    backgroundColor: ExploreColors.secondary[50],
    borderRadius: 12,
  },
  completedText: {
    ...ExploreTypography.body,
    color: ExploreColors.secondary[700],
    fontWeight: '600',
  },
  perfectBadge: {
    ...ExploreTypography.caption,
    color: ExploreColors.secondary[600],
    fontWeight: '700',
    marginLeft: 'auto',
  },
  ctaContainer: {
    marginTop: ExploreSpacing.md,
    padding: ExploreSpacing.sm,
    backgroundColor: ExploreColors.secondary[500],
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
