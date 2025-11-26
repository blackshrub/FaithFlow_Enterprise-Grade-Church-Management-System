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
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  StatusBar,
  Platform,
  FlatList,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useExploreHomeMock as useExploreHome,
  useUserProgress,
  useCurrentStreak,
  useBibleStudies,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { useStreakStore } from '@/stores/explore/streakStore';
import type { BibleStudy } from '@/types/explore';

// Components
import { DailyDevotionCard } from '@/components/explore/DailyDevotionCard';
import { VerseOfTheDayCard } from '@/components/explore/VerseOfTheDayCard';
import { BibleFigureCard } from '@/components/explore/BibleFigureCard';
import { DailyQuizCard } from '@/components/explore/DailyQuizCard';
import { ExploreHomeSkeleton } from '@/components/explore/LoadingSkeleton';
import { NoContentEmptyState } from '@/components/explore/EmptyState';
import { CelebrationModal } from '@/components/explore/CelebrationModal';

// Icons
import {
  Flame,
  Globe,
  ChevronRight,
  BookOpen,
  Users,
  Tag,
  Calendar,
  GraduationCap,
  Play,
  Clock,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(); // UI language follows global setting
  const contentLanguage = useExploreStore((state) => state.contentLanguage); // Content language is independent
  const setContentLanguage = useExploreStore((state) => state.setContentLanguage);

  // Data queries
  const { data: homeData, isLoading, error, refetch } = useExploreHome();
  const { data: progressData } = useUserProgress();
  const { data: bibleStudies } = useBibleStudies();
  const currentStreak = useCurrentStreak();

  const handleRefresh = () => {
    refetch();
  };

  const handleLanguageToggle = () => {
    // Toggle content language (independent from UI language)
    setContentLanguage(contentLanguage === 'en' ? 'id' : 'en');
  };

  // Streak store for bottom sheet
  const openStreakSheet = useStreakStore((state) => state.open);

  const handleStreakPress = () => {
    openStreakSheet();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ExploreColors.primary[600]} />

      {/* Full-bleed Header with Status Bar Coverage */}
      <LinearGradient
        colors={[ExploreColors.primary[600], ExploreColors.primary[500]]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Text
            style={styles.headerTitle}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            {t('explore.title')}
          </Text>

          <View style={styles.headerActions}>
            {/* Streak Badge - Inline styles for reliability */}
            <Pressable
              onPress={handleStreakPress}
              accessibilityRole="button"
              accessibilityLabel={`${t('explore.streak.current')}: ${currentStreak ?? 0} ${t(currentStreak === 1 ? 'explore.day' : 'explore.days')}. ${t('explore.streak.tapForDetails')}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                gap: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Flame size={18} color="#FF6B35" fill="#FF6B35" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FF6B35' }}>
                {currentStreak ?? 0}
              </Text>
            </Pressable>

            {/* Content Language Toggle - Shows which language content is in */}
            <Pressable
              onPress={handleLanguageToggle}
              style={styles.languageButton}
              accessibilityRole="button"
              accessibilityLabel={`${t('explore.language.switchTo')} ${contentLanguage === 'en' ? t('explore.language.indonesian') : t('explore.language.english')}`}
            >
              <Globe size={18} color="#FFFFFF" />
              <Text style={styles.languageText}>{contentLanguage.toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

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
              {t('explore.error.loadContent')}
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
                  {t('explore.todaysDevotions')}
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
                  {t('explore.verseOfTheDay')}
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
                  {t('explore.bibleFigureOfTheDay')}
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
                  {t('explore.dailyChallenge')}
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

            {/* Bible Studies - Featured Horizontal Carousel */}
            {bibleStudies && bibleStudies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text
                    style={styles.sectionTitle}
                    accessibilityRole="header"
                    accessibilityLevel={2}
                  >
                    {t('explore.bibleStudies')}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/explore/studies')}
                    style={styles.viewAllButton}
                  >
                    <Text style={styles.viewAllText}>
                      {t('explore.viewAll')}
                    </Text>
                    <ChevronRight size={16} color={ExploreColors.primary[600]} />
                  </Pressable>
                </View>

                <FlatList
                  data={bibleStudies.slice(0, 6)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  style={styles.studiesCarouselContainer}
                  contentContainerStyle={styles.studiesCarousel}
                  renderItem={({ item, index }) => (
                    <BibleStudyCard
                      study={item}
                      onPress={() => router.push(`/explore/studies/${item.id}`)}
                      contentLanguage={contentLanguage}
                      index={index}
                    />
                  )}
                />
              </View>
            )}

            {/* Self-Paced Content - Quick Access */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  accessibilityLevel={2}
                >
                  {t('explore.exploreMore')}
                </Text>
              </View>

              <View style={styles.quickAccessGrid}>
                <QuickAccessCard
                  title={t('explore.bibleFigures')}
                  description={t('explore.heroesOfFaith')}
                  icon={<Users size={24} color="#FFFFFF" />}
                  color="#3B82F6"
                  onPress={() => router.push('/explore/figures')}
                />
                <QuickAccessCard
                  title={t('explore.topicalVerses')}
                  description={t('explore.findByTheme')}
                  icon={<Tag size={24} color="#FFFFFF" />}
                  color="#10B981"
                  onPress={() => router.push('/explore/topical')}
                />
                <QuickAccessCard
                  title={t('explore.devotionPlans')}
                  description={t('explore.dailyJourney')}
                  icon={<Calendar size={24} color="#FFFFFF" />}
                  color="#F59E0B"
                  onPress={() => router.push('/explore/devotions')}
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
    </View>
  );
}

/**
 * Bible Study Card for horizontal carousel
 * Note: contentLanguage is used for content (title), but UI labels use useTranslation
 */
interface BibleStudyCardProps {
  study: BibleStudy;
  onPress: () => void;
  contentLanguage: string;
  index: number;
}

// Calculate card width at module level for 1.5 cards visibility (larger cards)
// Formula: (screenWidth - leftPadding - 1*gap) / 1.5
const STUDY_CARD_WIDTH = (SCREEN_WIDTH - 20 - 12) / 1.5; // ~239px on 390px screen

function BibleStudyCard({ study, onPress, contentLanguage, index }: BibleStudyCardProps) {
  const { t } = useTranslation(); // UI language
  const title = study.title[contentLanguage] || study.title.en;
  const subtitle = study.subtitle?.[contentLanguage] || study.subtitle?.en;
  const lessonCount = study.lesson_count || study.lessons?.length || 0;
  const duration = study.estimated_duration_minutes || 0;
  const rating = study.average_rating || 0;
  const difficulty = study.difficulty || 'beginner';

  // Format duration
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  };

  // Difficulty color
  const difficultyColors: Record<string, string> = {
    beginner: '#10B981',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
  };
  const difficultyColor = difficultyColors[difficulty] || '#6B7280';

  return (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={{ width: STUDY_CARD_WIDTH, marginRight: 12 }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.studyCard,
          pressed && styles.studyCardPressed,
        ]}
      >
        {/* Cover Image Section - Top Half */}
        <ImageBackground
          source={{
            uri: study.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
          }}
          style={styles.studyCardImage}
          imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']}
            style={styles.studyCardImageOverlay}
          >
            {/* Difficulty Badge - Top Right */}
            <View style={[styles.studyDifficultyBadge, { backgroundColor: difficultyColor }]}>
              <Text style={styles.studyDifficultyText}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Content Section - Bottom Half */}
        <View style={styles.studyCardContent}>
          <Text style={styles.studyCardTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.studyCardSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* Meta Info Row */}
          <View style={styles.studyCardMeta}>
            <View style={styles.studyMetaItem}>
              <BookOpen size={12} color="#6B7280" />
              <Text style={styles.studyMetaText}>{lessonCount}</Text>
            </View>
            <View style={styles.studyMetaItem}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.studyMetaText}>{formatDuration(duration)}</Text>
            </View>
            {rating > 0 && (
              <View style={styles.studyMetaItem}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.studyMetaText}>{rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Premium Quick access card - World-class design with proper icons
 */
interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}

// Premium gradient colors for each card
const cardGradients: Record<string, [string, string]> = {
  '#3B82F6': ['#3B82F6', '#1D4ED8'], // Blue - Bible Figures
  '#10B981': ['#10B981', '#059669'], // Green - Topical Verses
  '#F59E0B': ['#F59E0B', '#D97706'], // Amber - Devotion Plans
};

function QuickAccessCard({ title, description, icon, color, onPress }: QuickAccessCardProps) {
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
            {icon}
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
  headerGradient: {
    paddingBottom: ExploreSpacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingVertical: ExploreSpacing.sm,
  },
  headerTitle: {
    ...ExploreTypography.h2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 56,
  },
  streakBadgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  streakText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  languageText: {
    ...ExploreTypography.caption,
    color: '#FFFFFF',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // No paddingHorizontal - parent scrollContent provides it
    marginBottom: ExploreSpacing.md,
  },
  sectionTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md, // Same spacing as sectionHeaderRow
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  // Bible Studies Carousel - Shows 2.5 cards for scroll hint
  // Uses negative margin to escape parent ScrollView padding for edge-to-edge scrolling
  studiesCarouselContainer: {
    marginHorizontal: -ExploreSpacing.screenMargin, // Escape parent padding
  },
  studiesCarousel: {
    paddingLeft: ExploreSpacing.screenMargin,
    paddingRight: ExploreSpacing.screenMargin,
  },
  studyCard: {
    // Width controlled by STUDY_CARD_WIDTH constant on Animated.View wrapper
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studyCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  studyCardImage: {
    width: '100%',
    height: 120,
  },
  studyCardImageOverlay: {
    flex: 1,
    padding: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  studyDifficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  studyDifficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  studyCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: ExploreColors.neutral[200],
    borderRadius: 16,
  },
  studyCardImageStyle: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  studyCardGradient: {
    flex: 1,
    padding: ExploreSpacing.md,
    justifyContent: 'space-between',
  },
  studyCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studyCardBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  studyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ExploreColors.neutral[900],
    lineHeight: 18,
  },
  studyCardSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: ExploreColors.neutral[500],
    lineHeight: 16,
    marginTop: 2,
  },
  studyCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  studyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studyMetaText: {
    fontSize: 11,
    fontWeight: '500',
    color: ExploreColors.neutral[500],
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
    // No paddingHorizontal - parent scrollContent provides it
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
