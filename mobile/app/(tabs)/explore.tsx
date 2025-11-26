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

// Components
import { DailyDevotionCard } from '@/components/explore/DailyDevotionCard';
import { VerseOfTheDayCard } from '@/components/explore/VerseOfTheDayCard';
import { BibleFigureCard } from '@/components/explore/BibleFigureCard';
import { DailyQuizCard } from '@/components/explore/DailyQuizCard';
import { ExploreHomeSkeleton } from '@/components/explore/LoadingSkeleton';
import { NoContentEmptyState } from '@/components/explore/EmptyState';
import { CelebrationModal } from '@/components/explore/CelebrationModal';

// Icons
import { Flame, Settings, Globe } from 'lucide-react-native';

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={styles.headerTitle}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            {contentLanguage === 'en' ? 'Explore' : 'Jelajahi'}
          </Text>
          {currentStreak > 0 && (
            <View
              style={styles.streakBadge}
              accessible={true}
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `Current streak: ${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`
                  : `Rangkaian saat ini: ${currentStreak} hari`
              }
              accessibilityHint={
                contentLanguage === 'en'
                  ? 'Keep your streak going by completing daily content'
                  : 'Pertahankan rangkaian Anda dengan menyelesaikan konten harian'
              }
            >
              <Flame size={16} color={ExploreColors.secondary[600]} />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
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

          {/* Settings (future) */}
          {/* <Pressable onPress={() => router.push('/explore/settings')}>
            <Settings size={24} color={ExploreColors.neutral[600]} />
          </Pressable> */}
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
                  description={
                    contentLanguage === 'en'
                      ? 'Browse in-depth Bible study guides'
                      : 'Jelajahi panduan studi Alkitab mendalam'
                  }
                  icon="📖"
                  onPress={() => router.push('/explore/studies')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
                  description={
                    contentLanguage === 'en'
                      ? 'Learn about biblical characters'
                      : 'Pelajari tentang tokoh-tokoh Alkitab'
                  }
                  icon="👤"
                  onPress={() => router.push('/explore/figures')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topik'}
                  description={
                    contentLanguage === 'en'
                      ? 'Find verses by topic'
                      : 'Temukan ayat berdasarkan topik'
                  }
                  icon="🏷️"
                  onPress={() => router.push('/explore/topical')}
                  contentLanguage={contentLanguage}
                />
                <QuickAccessCard
                  title={contentLanguage === 'en' ? 'Devotion Plans' : 'Rencana Renungan'}
                  description={
                    contentLanguage === 'en'
                      ? 'Follow multi-day devotion plans'
                      : 'Ikuti rencana renungan multi-hari'
                  }
                  icon="📅"
                  onPress={() => router.push('/explore/studies')}
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
 * Quick access card for self-paced content
 */
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  contentLanguage: string;
}

function QuickAccessCard({ title, description, icon, onPress, contentLanguage }: QuickAccessCardProps) {
  return (
    <Pressable
      style={styles.quickAccessCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <Text style={styles.quickAccessIcon}>{icon}</Text>
      <Text style={styles.quickAccessTitle}>{title}</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
  },
  headerTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ExploreColors.secondary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    ...ExploreTypography.caption,
    color: ExploreColors.secondary[700],
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
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
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ExploreSpacing.md,
  },
  quickAccessCard: {
    width: '48%',
    aspectRatio: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: ExploreSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    shadowColor: 'rgba(139, 69, 19, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  quickAccessIcon: {
    fontSize: 32,
  },
  quickAccessTitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[900],
    fontWeight: '600',
    textAlign: 'center',
  },
});
