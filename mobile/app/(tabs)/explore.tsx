/**
 * Explore Home Screen
 *
 * Design Philosophy: "A sanctuary in your pocket"
 * - Progressive disclosure (show daily content first)
 * - Generous spacing and white space
 * - One primary action per card
 * - Celebration moments for achievements
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useExploreHomeMock as useExploreHome,
  useUserProgress,
  useCurrentStreak,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { useStreakStore } from '@/stores/explore/streakStore';

// Components
import { DailyDevotionCard } from '@/components/explore/DailyDevotionCard';
import { VerseOfTheDayCard } from '@/components/explore/VerseOfTheDayCard';
import { BibleFigureCard } from '@/components/explore/BibleFigureCard';
import { DailyQuizCard } from '@/components/explore/DailyQuizCard';
import { ExploreHomeSkeleton } from '@/components/explore/LoadingSkeleton';
import { NoContentEmptyState } from '@/components/explore/EmptyState';
import { CelebrationModal } from '@/components/explore/CelebrationModal';

// Icons
import { Flame, Settings, Globe, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExploreScreen() {
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);
  const setContentLanguage = useExploreStore((state) => state.setContentLanguage);

  // Data queries
  const { data: homeData, isLoading, error, refetch } = useExploreHome();
  const { data: progressData } = useUserProgress();
  const currentStreak = useCurrentStreak();

  const handleRefresh = () => {
    refetch();
  };

  const handleLanguageToggle = () => {
    setContentLanguage(contentLanguage === 'en' ? 'id' : 'en');
  };

  // Streak store for bottom sheet
  const openStreakSheet = useStreakStore((state) => state.open);

  const handleStreakPress = () => {
    openStreakSheet();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
          accessibilityLevel={1}
        >
          {contentLanguage === 'en' ? 'Explore' : 'Jelajahi'}
        </Text>

        <View style={styles.headerActions}>
          {/* Streak Badge - Always visible so users understand the feature */}
          <Pressable
            onPress={handleStreakPress}
            style={({ pressed }) => [
              styles.streakBadge,
              pressed && styles.streakBadgePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              contentLanguage === 'en'
                ? `Current streak: ${currentStreak ?? 0} ${currentStreak === 1 ? 'day' : 'days'}. Tap for details.`
                : `Rangkaian saat ini: ${currentStreak ?? 0} hari. Ketuk untuk detail.`
            }
            accessibilityHint={
              contentLanguage === 'en'
                ? 'Double tap to view your streak details'
                : 'Ketuk dua kali untuk melihat detail rangkaian Anda'
            }
          >
            <View style={styles.streakIconContainer}>
              <Flame size={16} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={styles.streakText}>{currentStreak ?? 0}</Text>
          </Pressable>

          {/* Language Toggle */}
          <Pressable
            onPress={handleLanguageToggle}
            style={styles.languageButton}
            accessibilityRole="button"
            accessibilityLabel={
              contentLanguage === 'en'
                ? 'Switch to Indonesian'
                : 'Beralih ke Bahasa Inggris'
            }
            accessibilityHint={
              contentLanguage === 'en'
                ? 'Double tap to change content language to Indonesian'
                : 'Ketuk dua kali untuk mengubah bahasa konten ke Bahasa Inggris'
            }
          >
            <Globe size={20} color={ExploreColors.neutral[600]} />
            <Text style={styles.languageText}>{contentLanguage.toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={ExploreColors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ExploreHomeSkeleton />
        ) : error ? (
          <View
            style={styles.errorContainer}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <Text style={styles.errorText}>
              {contentLanguage === 'en'
                ? 'Unable to load content. Please try again.'
                : 'Tidak dapat memuat konten. Silakan coba lagi.'}
            </Text>
          </View>
        ) : homeData ? (
          <View style={styles.contentContainer}>
            {/* Daily Devotion */}
            {homeData.daily_devotion ? (
              <View style={styles.section}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {contentLanguage === 'en' ? "Today's Devotion" : 'Renungan Hari Ini'}
                </Text>
                <DailyDevotionCard
                  devotion={homeData.daily_devotion}
                  language={contentLanguage}
                  onPress={() =>
                    router.push(`/explore/devotion/${homeData.daily_devotion?.id}`)
                  }
                  completed={homeData.daily_devotion.completed}
                />
              </View>
            ) : null}

            {/* Verse of the Day */}
            {homeData.verse_of_the_day ? (
              <View style={styles.section}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {contentLanguage === 'en' ? 'Verse of the Day' : 'Ayat Hari Ini'}
                </Text>
                <VerseOfTheDayCard
                  verse={homeData.verse_of_the_day}
                  language={contentLanguage}
                  onPress={() =>
                    router.push(`/explore/verse/${homeData.verse_of_the_day?.id}`)
                  }
                />
              </View>
            ) : null}

            {/* Bible Figure of the Day */}
            {homeData.bible_figure ? (
              <View style={styles.section}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {contentLanguage === 'en' ? 'Bible Figure of the Day' : 'Tokoh Alkitab Hari Ini'}
                </Text>
                <BibleFigureCard
                  figure={homeData.bible_figure}
                  language={contentLanguage}
                  onPress={() =>
                    router.push(`/explore/figure/${homeData.bible_figure?.id}`)
                  }
                />
              </View>
            ) : null}

            {/* Daily Quiz */}
            {homeData.daily_quiz ? (
              <View style={styles.section}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {contentLanguage === 'en' ? 'Daily Challenge' : 'Tantangan Harian'}
                </Text>
                <DailyQuizCard
                  quiz={homeData.daily_quiz}
                  language={contentLanguage}
                  onPress={() =>
                    router.push(`/explore/quiz/${homeData.daily_quiz?.id}`)
                  }
                  completed={homeData.daily_quiz.completed}
                  score={homeData.daily_quiz.score}
                />
              </View>
            ) : null}

            {/* Self-Paced Content - Quick Access */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {contentLanguage === 'en' ? 'Explore More' : 'Jelajahi Lebih Banyak'}
                </Text>
              </View>

              <View
                style={styles.quickAccessGrid}
                accessible={false}
                accessibilityLabel={
                  contentLanguage === 'en'
                    ? 'Self-paced content categories'
                    : 'Kategori konten mandiri'
                }
              >
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Bible Studies' : 'Studi Alkitab'}
                  description={contentLanguage === 'en' ? 'In-depth guides' : 'Panduan mendalam'}
                  icon="📖"
                  color="#8B5CF6"
                  onPress={() => router.push('/explore/studies')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
                  description={contentLanguage === 'en' ? 'Learn stories' : 'Pelajari kisah'}
                  icon="👤"
                  color="#3B82F6"
                  onPress={() => router.push('/explore/figures')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topik'}
                  description={contentLanguage === 'en' ? 'By topic' : 'Per topik'}
                  icon="🏷️"
                  color="#10B981"
                  onPress={() => router.push('/explore/topical')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Devotion Plans' : 'Rencana Renungan'}
                  description={contentLanguage === 'en' ? 'Daily readings' : 'Renungan harian'}
                  icon="📅"
                  color="#F59E0B"
                  onPress={() => router.push('/explore/devotions')}
                  contentLanguage={contentLanguage}
                />
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 100 }} />
          </View>
        ) : (
          <NoContentEmptyState contentType="default" />
        )}
      </ScrollView>

      {/* Celebration Modal */}
      <CelebrationModal />
    </SafeAreaView>
  );
}

/**
 * Premium Quick access card for self-paced content - World-class design
 */
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress: () => void;
  contentLanguage: string;
}

// Premium gradient colors for each card
const cardGradients: Record<string, [string, string]> = {
  '#8B5CF6': ['#8B5CF6', '#6D28D9'], // Purple - Bible Studies
  '#3B82F6': ['#3B82F6', '#1D4ED8'], // Blue - Bible Figures
  '#10B981': ['#10B981', '#059669'], // Green - Topical Verses
  '#F59E0B': ['#F59E0B', '#D97706'], // Amber - Devotion Plans
};

function QuickAccessCard({ title, description, icon, color, onPress, contentLanguage }: QuickAccessCardProps) {
  const gradientColors = cardGradients[color] || [color, color];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickAccessCard,
        pressed && styles.quickAccessCardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickAccessGradient}
      >
        {/* Decorative background pattern */}
        <View style={styles.quickAccessPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
        </View>

        {/* Content */}
        <View style={styles.quickAccessContent}>
          <View style={styles.quickAccessIconContainer}>
            <Text style={styles.quickAccessIcon}>{icon}</Text>
          </View>

          <View style={styles.quickAccessTextContainer}>
            <Text style={styles.quickAccessTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.quickAccessSubtitle} numberOfLines={1}>
              {description}
            </Text>
          </View>

          {/* Arrow indicator */}
          <View style={styles.quickAccessArrow}>
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ExploreColors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingVertical: ExploreSpacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: ExploreColors.neutral[200],
  },
  headerTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  streakBadgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  streakIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: ExploreColors.neutral[100],
  },
  languageText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ExploreSpacing.screenMargin,
  },
  contentContainer: {
    paddingTop: ExploreSpacing.lg,
  },
  section: {
    marginBottom: ExploreSpacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ExploreSpacing.md,
  },
  sectionTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  errorContainer: {
    padding: ExploreSpacing.xl,
    alignItems: 'center',
  },
  errorText: {
    ...ExploreTypography.body,
    color: ExploreColors.error[600],
    textAlign: 'center',
  },
  // World-class Explore More cards
  quickAccessGrid: {
    gap: 12,
  },
  quickAccessCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  quickAccessCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  quickAccessGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  quickAccessPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  patternCircle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  patternCircle2: {
    width: 60,
    height: 60,
    bottom: -30,
    left: 20,
  },
  quickAccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickAccessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessIcon: {
    fontSize: 26,
  },
  quickAccessTextContainer: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickAccessSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  quickAccessArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
