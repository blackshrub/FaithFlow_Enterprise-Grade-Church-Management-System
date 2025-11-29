/**
 * GiveHeader - Memoized Give Screen Header
 *
 * Premium gradient header with:
 * - Title and subtitle
 * - History button
 * - Stats row
 * - Back navigation for sub-steps
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { History, ArrowLeft, TrendingUp, Calendar } from 'lucide-react-native';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing, radius } from '@/constants/spacing';
import type { GiveStep } from '@/stores/ui/giveUI';

// =============================================================================
// TYPES
// =============================================================================

export interface GiveHeaderProps {
  // Stable insets
  topInset: number;

  // State
  step: GiveStep;
  showHistory: boolean;
  totalGiven: string;
  totalTransactions: number;

  // Actions
  onHistoryPress: () => void;
  onBackPress: () => void;

  // Animated styles
  headerEnterStyle: any;

  // Translations
  t: (key: string) => string;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    gold: '#D4AF37',
  },
  white: '#ffffff',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: typeof TrendingUp;
  value: string | number;
  label: string;
}

const StatCard = memo(function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <MemoIcon icon={icon} size={16} color={Colors.accent.gold} />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GiveHeader = memo(function GiveHeader({
  topInset,
  step,
  showHistory,
  totalGiven,
  totalTransactions,
  onHistoryPress,
  onBackPress,
  headerEnterStyle,
  t,
}: GiveHeaderProps) {
  const showBackButton = step !== 'choose' || showHistory;

  const handleHistoryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onHistoryPress();
  }, [onHistoryPress]);

  const handleBackPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackPress();
  }, [onBackPress]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
        style={[
          styles.headerGradient,
          { paddingTop: topInset + 8 },
          showBackButton && { paddingBottom: 12 },
        ]}
      >
        <Animated.View style={headerEnterStyle}>
          {!showBackButton ? (
            <View style={styles.headerContent}>
              {/* Title row with history button */}
              <View style={styles.titleRow}>
                <View style={styles.titleWrap}>
                  <Text style={styles.headerTitle}>{t('give.title')}</Text>
                  <Text style={styles.headerSubtitle}>{t('give.subtitle')}</Text>
                </View>
                <Pressable onPress={handleHistoryPress} style={styles.historyBtn}>
                  <MemoIcon icon={History} size={20} color={Colors.white} />
                </Pressable>
              </View>

              {/* Stats cards */}
              <View style={styles.statsRow}>
                <StatCard
                  icon={TrendingUp}
                  value={totalGiven}
                  label={t('give.totalGiven')}
                />
                <StatCard
                  icon={Calendar}
                  value={totalTransactions}
                  label={t('give.transactions')}
                />
              </View>
            </View>
          ) : (
            <View style={styles.compactHeader}>
              <Pressable onPress={handleBackPress} style={styles.backBtn}>
                <MemoIcon icon={ArrowLeft} size={24} color={Colors.white} />
              </Pressable>
              <View style={styles.compactTitleWrap}>
                <Text style={styles.compactTitle}>
                  {showHistory ? t('give.historyTitle') : t('give.title')}
                </Text>
                <Text style={styles.compactSubtitle}>
                  {showHistory ? t('give.historySubtitle') : t('give.subtitle')}
                </Text>
              </View>
              <Pressable
                onPress={handleHistoryPress}
                style={[styles.historyBtn, showHistory && styles.historyBtnActive]}
              >
                <MemoIcon
                  icon={History}
                  size={20}
                  color={showHistory ? Colors.gradient.start : Colors.white}
                />
              </Pressable>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: spacing.l,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: spacing.l,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.ml,
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.m,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: {
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.ml,
    paddingVertical: spacing.sm,
  },
  compactTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  compactSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnActive: {
    backgroundColor: Colors.white,
  },
});

export default GiveHeader;
