/**
 * Streak Details Bottom Sheet
 *
 * Shows detailed streak information and rules
 * Helps users understand how to maintain their streak
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Flame, Calendar, Trophy, Target, CheckCircle, Info } from 'lucide-react-native';
import { useStreakStore } from '@/stores/explore/streakStore';
import { useUserProgress, useCurrentStreak } from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab bar height constant (should match your tab bar)
const TAB_BAR_HEIGHT = 80;

export function StreakDetailsSheet() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []); // Increased to show above tab bar
  const insets = useSafeAreaInsets();

  const { visible, close } = useStreakStore();
  const { data: progressData } = useUserProgress();
  const streakFromHook = useCurrentStreak();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // Use the streak from hook as primary, fallback to progress data
  const currentStreak = streakFromHook || progressData?.streak?.current_streak || 0;
  const longestStreak = progressData?.streak?.longest_streak || currentStreak;
  const totalDaysActive = progressData?.streak?.total_days_active || currentStreak;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    close();
  }, [close]);

  // Streak rules content
  const streakRules = contentLanguage === 'en'
    ? [
        'Complete any daily content (devotion, verse, quiz, or figure)',
        'Your streak resets if you miss a day',
        'A new day starts at midnight your local time',
        'Completing multiple items in one day counts as one streak day',
      ]
    : [
        'Selesaikan konten harian apa pun (renungan, ayat, kuis, atau tokoh)',
        'Rangkaian Anda akan direset jika melewatkan satu hari',
        'Hari baru dimulai pada tengah malam waktu lokal Anda',
        'Menyelesaikan beberapa item dalam satu hari dihitung sebagai satu hari rangkaian',
      ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.fireIcon}>
            <Flame size={32} color={ExploreColors.secondary[600]} />
          </View>
          <Text style={styles.title}>
            {contentLanguage === 'en' ? 'Your Streak' : 'Rangkaian Anda'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: ExploreColors.secondary[50] }]}>
              <Flame size={20} color={ExploreColors.secondary[600]} />
            </View>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>
              {contentLanguage === 'en' ? 'Current Streak' : 'Rangkaian Saat Ini'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: ExploreColors.primary[50] }]}>
              <Trophy size={20} color={ExploreColors.primary[600]} />
            </View>
            <Text style={styles.statValue}>{longestStreak}</Text>
            <Text style={styles.statLabel}>
              {contentLanguage === 'en' ? 'Longest Streak' : 'Rangkaian Terpanjang'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: ExploreColors.success[50] }]}>
              <Calendar size={20} color={ExploreColors.success[600]} />
            </View>
            <Text style={styles.statValue}>{totalDaysActive}</Text>
            <Text style={styles.statLabel}>
              {contentLanguage === 'en' ? 'All Time' : 'Sepanjang Waktu'}
            </Text>
          </View>
        </View>

        {/* How to maintain streak */}
        <View style={styles.rulesSection}>
          <View style={styles.rulesSectionHeader}>
            <Info size={18} color={ExploreColors.neutral[600]} />
            <Text style={styles.rulesSectionTitle}>
              {contentLanguage === 'en' ? 'How to maintain your streak' : 'Cara mempertahankan rangkaian'}
            </Text>
          </View>

          <View style={styles.rulesList}>
            {streakRules.map((rule, index) => (
              <View key={index} style={styles.ruleItem}>
                <CheckCircle size={16} color={ExploreColors.success[500]} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivation text */}
        <View style={styles.motivationBox}>
          <Target size={18} color={ExploreColors.primary[600]} />
          <Text style={styles.motivationText}>
            {contentLanguage === 'en'
              ? `Keep going! You're building a powerful habit of daily spiritual growth.`
              : `Terus semangat! Anda sedang membangun kebiasaan pertumbuhan rohani harian yang kuat.`}
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: TAB_BAR_HEIGHT + insets.bottom }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: ExploreColors.neutral[300],
    width: 40,
    height: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: ExploreSpacing.screenMargin,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.lg,
    paddingTop: ExploreSpacing.sm,
  },
  fireIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ExploreColors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 16,
    padding: ExploreSpacing.md,
    alignItems: 'center',
    gap: ExploreSpacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    fontSize: 24,
  },
  statLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    textAlign: 'center',
    fontSize: 11,
  },
  rulesSection: {
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 16,
    padding: ExploreSpacing.md,
    marginBottom: ExploreSpacing.md,
  },
  rulesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    marginBottom: ExploreSpacing.sm,
  },
  rulesSectionTitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
  },
  rulesList: {
    gap: ExploreSpacing.sm,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ExploreSpacing.sm,
  },
  ruleText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    flex: 1,
    lineHeight: 18,
  },
  motivationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[50],
    borderRadius: 12,
    padding: ExploreSpacing.md,
  },
  motivationText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[800],
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
