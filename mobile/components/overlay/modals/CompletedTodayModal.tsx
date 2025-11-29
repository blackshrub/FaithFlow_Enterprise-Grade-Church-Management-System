/**
 * CompletedTodayModal - Unified Overlay System (Bottom Sheet)
 *
 * Shows today's completed activities and progress.
 * Used via: overlay.showBottomSheet(CompletedTodayModal, payload)
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, BookOpen, CheckCircle2, Circle, Calendar } from 'lucide-react-native';

import type { OverlayProps } from '@/components/overlay/types';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

// Payload type
export interface CompletedTodayPayload {
  devotionCompleted: boolean;
  devotionTitle?: string;
  quizzesCompleted: number;
  versesRead: number;
  totalActivities: number;
}

export const CompletedTodayModal: React.FC<OverlayProps<CompletedTodayPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const activities = [
    {
      label: t('explore.completedToday.devotion', 'Daily Devotion'),
      completed: payload.devotionCompleted,
      detail: payload.devotionTitle || t('explore.completedToday.noDevotionYet', 'Not started yet'),
      icon: BookOpen,
      color: colors.primary[600],
      bgColor: colors.primary[50],
    },
    {
      label: t('explore.completedToday.quizzes', 'Quizzes Completed'),
      completed: payload.quizzesCompleted > 0,
      detail: payload.quizzesCompleted > 0
        ? t('explore.completedToday.quizzesCount', '{{count}} completed today', { count: payload.quizzesCompleted })
        : t('explore.completedToday.noQuizzesYet', 'No quizzes taken yet'),
      icon: Sparkles,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      label: t('explore.completedToday.verses', 'Verses Read'),
      completed: payload.versesRead > 0,
      detail: payload.versesRead > 0
        ? t('explore.completedToday.versesCount', '{{count}} verses today', { count: payload.versesRead })
        : t('explore.completedToday.noVersesYet', 'No verses read yet'),
      icon: Calendar,
      color: colors.success[600],
      bgColor: colors.success[50],
    },
  ];

  const completedCount = activities.filter(a => a.completed).length;

  return (
    <View style={styles.sheetContainer}>
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <HStack className="justify-between items-center mb-6">
            <HStack space="md" className="items-center">
              <View style={styles.headerIconContainer}>
                <Sparkles size={28} color="#F59E0B" />
              </View>
              <Heading size="xl" className="text-gray-900 font-bold">
                {t('explore.completedToday.title', "Today's Progress")}
              </Heading>
            </HStack>

            <Pressable
              onPress={() => {
                interaction.haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressedMicro,
              ]}
            >
              <Icon as={X} size="md" className="text-gray-600" />
            </Pressable>
          </HStack>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{completedCount}</Text>
              <Text style={styles.summaryLabel}>
                {t('explore.completedToday.of', 'of')} {activities.length} {t('explore.completedToday.activities', 'activities')}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(completedCount / activities.length) * 100}%` }
                ]}
              />
            </View>
          </View>

          {/* Activities List */}
          <View style={styles.activitiesContainer}>
            <Text style={styles.sectionTitle}>
              {t('explore.completedToday.activitiesTitle', 'Activities')}
            </Text>
            {activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: activity.bgColor }]}>
                  <activity.icon size={20} color={activity.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityLabel}>{activity.label}</Text>
                  <Text style={styles.activityDetail}>{activity.detail}</Text>
                </View>
                {activity.completed ? (
                  <CheckCircle2 size={24} color={colors.success[500]} fill={colors.success[100]} />
                ) : (
                  <Circle size={24} color={colors.gray[300]} />
                )}
              </View>
            ))}
          </View>

          {/* Encouragement */}
          <View style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>
              {completedCount === activities.length
                ? t('explore.completedToday.allDone', '🎉 Amazing! You completed all activities today!')
                : completedCount > 0
                  ? t('explore.completedToday.keepGoing', '💪 Great progress! Keep going!')
                  : t('explore.completedToday.getStarted', '✨ Start your spiritual journey today!')}
            </Text>
          </View>

          {/* Close Button */}
          <Button
            onPress={() => {
              interaction.haptics.tap();
              onClose();
            }}
            size="lg"
            className="mt-4"
          >
            <ButtonText className="font-bold">{t('common.done')}</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  closeButton: {
    width: overlayTheme.closeButton.size,
    height: overlayTheme.closeButton.size,
    borderRadius: overlayTheme.closeButton.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlayTheme.closeButton.backgroundColor,
  },
  pressedMicro: {
    opacity: interaction.press.opacity,
    transform: [{ scale: interaction.press.scale }],
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gray[50],
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F59E0B',
    lineHeight: 52,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.gray[600],
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  activitiesContainer: {
    marginBottom: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 13,
    color: colors.gray[500],
  },
  encouragementCard: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    backgroundColor: '#FEF3C7',
  },
  encouragementText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default CompletedTodayModal;
