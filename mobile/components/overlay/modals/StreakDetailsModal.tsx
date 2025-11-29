/**
 * StreakDetailsModal - Unified Overlay System (Bottom Sheet)
 *
 * Streak statistics and progress bottom sheet.
 * Used via: overlay.showBottomSheet(StreakDetailsModal, payload)
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
import { X, Flame, Trophy, Target, Check } from 'lucide-react-native';

import type { OverlayProps } from '@/components/overlay/types';
import type { StreakDetailsPayload } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { ExploreColors } from '@/constants/explore/designSystem';
import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

export const StreakDetailsModal: React.FC<OverlayProps<StreakDetailsPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const streakRules = [
    t('explore.streakRules.rule1'),
    t('explore.streakRules.rule2'),
    t('explore.streakRules.rule3'),
    t('explore.streakRules.rule4'),
  ];

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
              <View style={styles.fireIconContainer}>
                <Flame size={28} color={ExploreColors.secondary[600]} />
              </View>
              <Heading size="xl" className="text-gray-900 font-bold">
                {t('explore.yourStreak')}
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

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={[styles.statIconContainer, { backgroundColor: ExploreColors.secondary[50] }]}>
                  <Flame size={24} color={ExploreColors.secondary[600]} fill={ExploreColors.secondary[600]} />
                </View>
                <Text style={[styles.statValue, { color: ExploreColors.secondary[600] }]}>{payload.streakCount}</Text>
              </View>
              <Text style={styles.statLabel}>{t('explore.currentStreak')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primary[50] }]}>
                  <Trophy size={24} color={colors.primary[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary[600] }]}>{payload.longestStreak}</Text>
              </View>
              <Text style={styles.statLabel}>{t('explore.longestStreak')}</Text>
            </View>
          </View>

          {/* Week Progress */}
          <View style={styles.weekProgressContainer}>
            <Text style={styles.sectionTitle}>{t('explore.thisWeek')}</Text>
            <HStack className="justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <View key={index} style={styles.dayContainer}>
                  <View style={[
                    styles.dayCircle,
                    payload.currentWeekDays[index] && styles.dayCircleActive,
                  ]}>
                    {payload.currentWeekDays[index] && (
                      <Check size={16} color={colors.white} strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </HStack>
          </View>

          {/* Rules */}
          <View style={styles.rulesContainer}>
            <Text style={styles.sectionTitle}>{t('explore.howStreaksWork')}</Text>
            {streakRules.map((rule, index) => (
              <HStack key={index} space="sm" className="items-start mb-2">
                <View style={styles.ruleBullet}>
                  <Target size={14} color={colors.primary[600]} />
                </View>
                <Text style={styles.ruleText}>{rule}</Text>
              </HStack>
            ))}
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
  fireIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ExploreColors.secondary[50],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gray[50],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.gray[900],
    lineHeight: 44, // Match icon container height for vertical alignment
    includeFontPadding: false, // Android: remove extra font padding
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  weekProgressContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gray[50],
    marginBottom: spacing.lg,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[200],
  },
  dayCircleActive: {
    backgroundColor: ExploreColors.secondary[500],
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  rulesContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gray[50],
  },
  ruleBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    marginTop: 2,
  },
  ruleText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray[600],
    flex: 1,
  },
});

export default StreakDetailsModal;
