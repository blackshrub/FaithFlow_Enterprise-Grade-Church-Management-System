/**
 * Explore Home Screen - Premium Motion V10 Ultra
 *
 * Design Philosophy: "A sanctuary in your pocket"
 * - Premium monochrome palette with gold accent
 * - Full-bleed gradient header matching Today/Give/Events
 * - Progressive disclosure (show daily content first)
 * - Generous spacing and premium shadows
 * - Celebration moments via unified overlay system
 * - V10 Ultra smooth animations with card-level stagger
 *
 * Option D Makeover:
 * - Unified overlay for CelebrationModal and StreakDetailsModal
 * - No double-Pressable patterns (cards handle their own onPress)
 * - PremiumCard3 wrapper for consistent card styling
 * - Single sharedAxisX at screen level only
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  StatusBar,
  FlatList,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useExploreHomeMock as useExploreHome,
  useUserProgress,
  useCurrentStreak,
  useBibleStudies,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import {
  useOverlay,
  StreakDetailsModal,
  CelebrationModal,
  CompletedTodayModal,
  StudiesModal,
  type CelebrationPayload,
} from '@/components/overlay';
import type { BibleStudy } from '@/types/explore';
import * as Haptics from 'expo-haptics';

// Components
import { DailyDevotionCard } from '@/components/explore/DailyDevotionCard';
import { VerseOfTheDayCard } from '@/components/explore/VerseOfTheDayCard';
import { BibleFigureCard } from '@/components/explore/BibleFigureCard';
import { DailyQuizCard } from '@/components/explore/DailyQuizCard';
import { ExploreHomeSkeleton } from '@/components/explore/LoadingSkeleton';
import { NoContentEmptyState } from '@/components/explore/EmptyState';
import { FaithAssistantCard } from '@/components/companion';

// Icons
import {
  Flame,
  Globe,
  ChevronRight,
  BookOpen,
  Users,
  Tag,
  Calendar,
  Clock,
  Star,
  Compass,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';
import { spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium monochrome palette with gold accent (V10 aligned)
const Colors = {
  gradient: {
    start: '#0f0f0f',
    mid: '#1a1a1a',
    end: '#252525',
  },
  accent: {
    gold: '#d4af37',
    goldLight: '#e8d5a8',
    goldDark: '#b8960c',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  streak: '#FF6B35',
  success: '#10B981',
  error: '#EF4444',
};

function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);
  const setContentLanguage = useExploreStore((state) => state.setContentLanguage);

  // Animation key - only changes on initial mount, not on every focus
  // This prevents flickering when returning from sub-pages
  const animationKeyRef = useRef(Date.now());
  const animationKey = animationKeyRef.current;

  // Data queries
  const { data: homeData, isLoading, error, refetch } = useExploreHome();
  const { data: progressData } = useUserProgress();
  const { data: bibleStudies } = useBibleStudies();
  const currentStreak = useCurrentStreak();

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const handleLanguageToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setContentLanguage(contentLanguage === 'en' ? 'id' : 'en');
  };

  // Unified Overlay System
  const overlay = useOverlay();

  // Watch for celebration triggers from exploreStore and show via unified overlay
  const showCelebration = useExploreStore((state) => state.showCelebration);
  const celebrationType = useExploreStore((state) => state.celebrationType);
  const celebrationData = useExploreStore((state) => state.celebrationData);
  const closeCelebration = useExploreStore((state) => state.closeCelebration);
  const celebrationShownRef = useRef(false);

  useEffect(() => {
    if (showCelebration && celebrationType && !celebrationShownRef.current) {
      celebrationShownRef.current = true;
      const payload: CelebrationPayload = {
        type: celebrationType,
        data: celebrationData,
        language: contentLanguage,
      };
      overlay.showCenterModal(
        (props) => <CelebrationModal {...props} />,
        payload
      );
      // Close the exploreStore celebration state after showing
      closeCelebration();
    }
    if (!showCelebration) {
      celebrationShownRef.current = false;
    }
  }, [showCelebration, celebrationType, celebrationData, contentLanguage, overlay, closeCelebration]);

  const handleStreakPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics may not be available
    }
    // Open streak details via unified overlay bottom sheet
    const longestStreak = progressData?.streak?.longest_streak || currentStreak;
    // Calculate current week completion days (M-S)
    const today = new Date().getDay();
    const currentWeekDays = Array(7).fill(false).map((_, i) => {
      // For demo, mark days up to today as completed if streak > 0
      return currentStreak > 0 && i <= (today === 0 ? 6 : today - 1);
    });
    overlay.showBottomSheet(
      (props) => <StreakDetailsModal {...props} />,
      {
        streakCount: currentStreak,
        longestStreak: longestStreak,
        currentWeekDays: currentWeekDays,
      }
    );
  };

  // Handler for Completed Today stat press
  const handleCompletedTodayPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics may not be available
    }
    // Extract devotion title as string (handle multilingual object)
    const devotionTitleRaw = homeData?.daily_devotion?.title;
    const devotionTitle = typeof devotionTitleRaw === 'string'
      ? devotionTitleRaw
      : devotionTitleRaw?.[contentLanguage] || devotionTitleRaw?.en || '';

    overlay.showBottomSheet(
      (props) => <CompletedTodayModal {...props} />,
      {
        devotionCompleted: homeData?.daily_devotion?.completed ?? false,
        devotionTitle,
        quizzesCompleted: 0, // TODO: Track from progress
        versesRead: 0, // TODO: Track from progress
        totalActivities: 3,
      }
    );
  };

  // Handler for Studies stat press
  const handleStudiesPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics may not be available
    }
    const studyList = bibleStudies?.map(study => ({
      id: study.id,
      title: typeof study.title === 'string' ? study.title : study.title?.[contentLanguage] || study.title?.en || '',
      description: typeof study.description === 'string' ? study.description : study.description?.[contentLanguage] || study.description?.en || '',
      totalDays: study.lesson_count || study.lessons?.length || 7,
      completedDays: 0, // TODO: Track from progress
      isActive: false,
    })) || [];

    overlay.showBottomSheet(
      (props) => <StudiesModal {...props} />,
      {
        studies: studyList,
        totalStudies: studyList.length,
        completedStudies: 0, // TODO: Track from progress
      }
    );
  };

  // Shared header enter animation from today-motion
  const { headerEnterStyle } = useTodayHeaderMotion();

  // Collapsible header animation - using shared today-motion module
  const scrollY = useSharedValue(0);

  // Scroll handler - updates scrollY for collapsible header
  const handleScrollEvent = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  // Shared collapsible header styles from today-motion
  const {
    statsRowAnimatedStyle,
    greetingAnimatedStyle: titleRowAnimatedStyle,
  } = useTodayCollapsibleHeader(scrollY);

  // Render premium header with shared today-motion
  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
      style={[styles.headerGradient, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Animated content wrapper with shared headerEnterStyle */}
      <Animated.View style={headerEnterStyle}>
        {/* Title row - stagger index 0 */}
        <Animated.View key={`title-${animationKey}`} entering={todayListItemMotion(0)} style={[styles.headerTop, titleRowAnimatedStyle]}>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <Compass size={24} color={Colors.accent.gold} style={styles.titleIcon} />
              <Text style={styles.headerTitle}>{t('explore.title', 'Explore')}</Text>
            </View>
            <Text style={styles.headerSubtitle}>{t('explore.subtitle', 'Discover your faith journey')}</Text>
          </View>

          {/* Language toggle */}
          <Pressable
            onPress={handleLanguageToggle}
            className="active:scale-95 active:opacity-90"
            style={styles.langBtn}
          >
            <Globe size={16} color={Colors.white} />
            <Text style={styles.langText}>{contentLanguage.toUpperCase()}</Text>
          </Pressable>
        </Animated.View>

        {/* Stats row - Collapsible with shared statsRowAnimatedStyle - stagger index 1 */}
        <Animated.View key={`stats-${animationKey}`} entering={todayListItemMotion(1)} style={[styles.statsRow, statsRowAnimatedStyle]}>
          {/* Streak */}
          <Pressable
            onPress={handleStreakPress}
            className="active:scale-95 active:opacity-90"
            style={styles.statItem}
          >
            <View style={styles.statIconWrap}>
              <Flame size={18} color={Colors.streak} fill={Colors.streak} />
            </View>
            <View>
              <Text style={styles.statValue}>{currentStreak ?? 0}</Text>
              <Text style={styles.statLabel}>{t('explore.streak.label', 'Streak')}</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          {/* Completed today */}
          <Pressable
            onPress={handleCompletedTodayPress}
            className="active:scale-95 active:opacity-90"
            style={styles.statItem}
          >
            <View style={styles.statIconWrap}>
              <Sparkles size={18} color={Colors.accent.gold} />
            </View>
            <View>
              <Text style={styles.statValue}>
                {homeData?.daily_devotion?.completed ? 1 : 0}
              </Text>
              <Text style={styles.statLabel}>{t('explore.completedToday', 'Done')}</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          {/* Studies */}
          <Pressable
            onPress={handleStudiesPress}
            className="active:scale-95 active:opacity-90"
            style={styles.statItem}
          >
            <View style={styles.statIconWrap}>
              <BookOpen size={18} color={Colors.accent.gold} />
            </View>
            <View>
              <Text style={styles.statValue}>{bibleStudies?.length || 0}</Text>
              <Text style={styles.statLabel}>{t('explore.studies', 'Studies')}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );

  // Render content with card-level V10 stagger animations
  const renderContent = () => {
    if (isLoading) {
      return <ExploreHomeSkeleton />;
    }

    if (error) {
      return (
        <Animated.View
          entering={PMotionV10.screenFadeIn}
          style={styles.errorContainer}
        >
          <Text style={styles.errorText}>{t('explore.error.loadContent', 'Failed to load content')}</Text>
        </Animated.View>
      );
    }

    if (!homeData) {
      return (
        <Animated.View entering={PMotionV10.screenFadeIn}>
          <NoContentEmptyState contentType="default" />
        </Animated.View>
      );
    }

    // Start at index 2 to continue after header animations (title=0, stats=1)
    let sectionIndex = 2;

    return (
      <View style={styles.contentContainer}>
        {/* Daily Devotion */}
        {homeData.daily_devotion && (
          <Animated.View
            key={`devotion-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              {t('explore.todaysDevotions', "Today's Devotion")}
            </Text>
            <DailyDevotionCard
              devotion={homeData.daily_devotion}
              language={contentLanguage}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/explore/devotion/${homeData.daily_devotion?.id}`);
              }}
              completed={homeData.daily_devotion.completed}
            />
          </Animated.View>
        )}

        {/* Verse of the Day */}
        {homeData.verse_of_the_day && (
          <Animated.View
            key={`verse-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              {t('explore.verseOfTheDay', 'Verse of the Day')}
            </Text>
            <VerseOfTheDayCard
              verse={homeData.verse_of_the_day}
              language={contentLanguage}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/explore/verse/${homeData.verse_of_the_day?.id}`);
              }}
            />
          </Animated.View>
        )}

        {/* Bible Figure of the Day */}
        {homeData.bible_figure && (
          <Animated.View
            key={`figure-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              {t('explore.bibleFigureOfTheDay', 'Bible Figure of the Day')}
            </Text>
            <BibleFigureCard
              figure={homeData.bible_figure}
              language={contentLanguage}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/explore/figure/${homeData.bible_figure?.id}`);
              }}
            />
          </Animated.View>
        )}

        {/* Daily Quiz */}
        {homeData.daily_quiz && (
          <Animated.View
            key={`quiz-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              {t('explore.dailyChallenge', 'Daily Challenge')}
            </Text>
            <DailyQuizCard
              quiz={homeData.daily_quiz}
              language={contentLanguage}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/explore/quiz/${homeData.daily_quiz?.id}`);
              }}
              completed={homeData.daily_quiz.completed}
              score={homeData.daily_quiz.score ?? undefined}
            />
          </Animated.View>
        )}

        {/* Bible Studies Carousel */}
        {bibleStudies && bibleStudies.length > 0 && (
          <Animated.View
            key={`studies-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('explore.bibleStudies', 'Bible Studies')}
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/explore/studies');
                }}
                className="active:scale-95 active:opacity-90"
                style={styles.viewAllBtn}
              >
                <Text style={styles.viewAllText}>{t('explore.viewAll', 'View All')}</Text>
                <ChevronRight size={16} color={Colors.accent.goldDark} />
              </Pressable>
            </View>

            <FlatList
              data={bibleStudies.slice(0, 6)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              style={styles.carouselContainer}
              contentContainerStyle={styles.carousel}
              renderItem={({ item, index }) => (
                <Animated.View entering={todayListItemMotion(index)}>
                  <BibleStudyCard
                    study={item}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/explore/studies/${item.id}`);
                    }}
                    contentLanguage={contentLanguage}
                  />
                </Animated.View>
              )}
            />
          </Animated.View>
        )}

        {/* Faith Assistant - Spiritual Companion */}
        <Animated.View
          key={`companion-${animationKey}`}
          entering={todayListItemMotion(sectionIndex++)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            {t('companion.sectionTitle', 'Your Companion')}
          </Text>
          <FaithAssistantCard variant="compact" />
        </Animated.View>

        {/* Explore More */}
        <Animated.View
          key={`more-${animationKey}`}
          entering={todayListItemMotion(sectionIndex++)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>
            {t('explore.exploreMore', 'Explore More')}
          </Text>

          <View style={styles.quickGrid}>
            <QuickCard
              title={t('explore.bibleFigures', 'Bible Figures')}
              desc={t('explore.heroesOfFaith', 'Heroes of Faith')}
              icon={<Users size={22} color={Colors.white} />}
              gradient={['#3B82F6', '#1D4ED8']}
              onPress={() => router.push('/explore/figures')}
            />
            <QuickCard
              title={t('explore.topicalVerses', 'Topical Verses')}
              desc={t('explore.findByTheme', 'Find by Theme')}
              icon={<Tag size={22} color={Colors.white} />}
              gradient={['#10B981', '#059669']}
              onPress={() => router.push('/explore/topical')}
            />
            <QuickCard
              title={t('explore.devotionPlans', 'Devotion Plans')}
              desc={t('explore.dailyJourney', 'Daily Journey')}
              icon={<Calendar size={22} color={Colors.white} />}
              gradient={['#F59E0B', '#D97706']}
              onPress={() => router.push('/explore/devotions')}
            />
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </View>
    );
  };

  return (
    <Animated.View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScrollEvent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.gold}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </Animated.ScrollView>

      {/* CelebrationModal and StreakDetailsModal now rendered via OverlayHost in _layout.tsx */}
    </Animated.View>
  );
}

// Memoize screen + Apply Premium Motion V10 Ultra HOC for zero-blink tab transitions
const MemoizedExploreScreen = memo(ExploreScreen);
MemoizedExploreScreen.displayName = 'ExploreScreen';
export default withPremiumMotionV10(MemoizedExploreScreen);

// Bible Study Card with V10 touch scaling
interface BibleStudyCardProps {
  study: BibleStudy;
  onPress: () => void;
  contentLanguage: string;
}

const STUDY_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 1.8;

function BibleStudyCard({ study, onPress, contentLanguage }: BibleStudyCardProps) {
  const { t } = useTranslation();
  const title = study.title[contentLanguage] || study.title.en;
  const lessonCount = study.lesson_count || study.lessons?.length || 0;
  const duration = study.estimated_duration_minutes || 0;
  const rating = study.average_rating || 0;
  const difficulty = study.difficulty || 'beginner';

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}${t('explore.time.minutes', 'm')}`;
    return `${Math.floor(mins / 60)}${t('explore.time.hours', 'h')}`;
  };

  const difficultyColors: Record<string, string> = {
    beginner: '#10B981',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
  };

  const getDifficultyLabel = (diff: string) => {
    const labels: Record<string, string> = {
      beginner: t('explore.difficulty.beginner', 'Beginner'),
      intermediate: t('explore.difficulty.intermediate', 'Intermediate'),
      advanced: t('explore.difficulty.advanced', 'Advanced'),
    };
    return labels[diff] || diff.charAt(0).toUpperCase() + diff.slice(1);
  };

  return (
    <View style={styles.studyCardWrapper}>
      <Pressable
        onPress={onPress}
        className="active:scale-95 active:opacity-90"
        style={styles.studyCard}
      >
        <ImageBackground
          source={{
            uri: study.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
          }}
          style={styles.studyImage}
          imageStyle={styles.studyImageStyle}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.studyOverlay}
          >
            <View
              style={[
                styles.difficultyBadge,
                { backgroundColor: difficultyColors[difficulty] || Colors.neutral[500] },
              ]}
            >
              <Text style={styles.difficultyText}>
                {getDifficultyLabel(difficulty)}
              </Text>
            </View>

            <View style={styles.studyInfo}>
              <Text style={styles.studyTitle} numberOfLines={2}>{title}</Text>
              <View style={styles.studyMeta}>
                <View style={styles.metaItem}>
                  <BookOpen size={12} color={Colors.white} />
                  <Text style={styles.metaText}>{lessonCount}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={12} color={Colors.white} />
                  <Text style={styles.metaText}>{formatDuration(duration)}</Text>
                </View>
                {rating > 0 && (
                  <View style={styles.metaItem}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.metaText}>{rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    </View>
  );
}

// Quick Access Card - Optimized for instant response
interface QuickCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  gradient: [string, string];
  onPress: () => void;
}

function QuickCard({ title, desc, icon, gradient, onPress }: QuickCardProps) {
  const handlePress = () => {
    // Fire haptics in background (non-blocking) and navigate immediately
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics may not be available
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="active:scale-95 active:opacity-90"
      style={styles.quickCard}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.quickCircle, styles.quickCircle1]} />
        <View style={[styles.quickCircle, styles.quickCircle2]} />

        <View style={styles.quickContent}>
          <View style={styles.quickIconWrap}>{icon}</View>
          <View style={styles.quickTextWrap}>
            <Text style={styles.quickTitle}>{title}</Text>
            <Text style={styles.quickDesc}>{desc}</Text>
          </View>
          <View style={styles.quickArrow}>
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
    backgroundColor: Colors.neutral[100],
  },
  // Header
  headerGradient: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  titleIcon: {},
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
    lineHeight: 32,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.sm,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  contentContainer: {},
  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent.goldDark,
  },
  // Carousel
  carouselContainer: {
    marginHorizontal: -spacing.lg,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
  },
  // Study Card
  studyCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[200],
  },
  studyImage: {
    flex: 1,
  },
  studyImageStyle: {
    borderRadius: 16,
  },
  studyOverlay: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  difficultyBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  studyInfo: {
    gap: spacing.sm,
  },
  studyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 20,
  },
  studyMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  // Quick Access Cards
  quickGrid: {
    gap: spacing.md,
  },
  quickCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  quickGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  quickCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickCircle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  quickCircle2: {
    width: 60,
    height: 60,
    bottom: -30,
    left: 20,
  },
  quickContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  quickDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  quickArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Error
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: Colors.error,
    textAlign: 'center',
  },
  // Bottom spacing
  bottomSpacer: {
    height: 120,
  },
  // Study card wrapper
  studyCardWrapper: {
    width: STUDY_CARD_WIDTH,
    marginRight: spacing.md,
  },
});
