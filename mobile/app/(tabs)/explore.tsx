/**
 * Explore Home Screen - Premium Motion V10 Ultra
 *
 * Design Philosophy: "A sanctuary in your pocket"
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for: dynamic values, shadows, custom colors from Colors object
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
  RefreshControl,
  Pressable,
  StatusBar,
  FlatList,
  Dimensions,
  Image,
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

// Animated Image for shared element transitions (Reanimated 4+)
const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STUDY_CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 1.8;

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
    headerPaddingAnimatedStyle,
  } = useTodayCollapsibleHeader(scrollY);

  // Render premium header with shared today-motion (matching Today screen structure)
  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
      className="overflow-hidden"
      style={{ paddingTop: insets.top + 4 }}
    >
      {/* Animated content wrapper - matching Today screen pattern with animated padding */}
      <Animated.View className="px-5" style={[headerEnterStyle, headerPaddingAnimatedStyle]}>
        {/* Top row: Title + Language toggle - aligned horizontally */}
        <Animated.View
          key={`top-${animationKey}`}
          entering={todayListItemMotion(0)}
          style={titleRowAnimatedStyle}
          className="flex-row justify-between items-start mb-5"
        >
          {/* Title section - left side */}
          <View>
            <Text className="text-[32px] font-bold text-white mb-1" style={{ letterSpacing: -0.5 }}>
              {t('explore.title', 'Explore')}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Compass size={14} color={Colors.accent.gold} />
              <Text className="text-[13px] text-white/60 font-medium">
                {t('explore.subtitle', 'Discover your faith journey')}
              </Text>
            </View>
          </View>

          {/* Language toggle - right side */}
          <Pressable
            onPress={handleLanguageToggle}
            className="flex-row items-center gap-2 bg-white/15 px-4 py-2.5 rounded-full active:scale-95 active:opacity-90 mt-1"
          >
            <Globe size={16} color={Colors.white} />
            <Text className="text-[13px] font-semibold text-white">{contentLanguage.toUpperCase()}</Text>
          </Pressable>
        </Animated.View>

        {/* Stats row - Collapsible with shared statsRowAnimatedStyle - stagger index 1 */}
        <Animated.View
          key={`stats-${animationKey}`}
          entering={todayListItemMotion(1)}
          style={statsRowAnimatedStyle}
          className="flex-row items-center rounded-2xl py-4 px-6"
        >
          <View
            className="absolute inset-0 rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
          />
          {/* Streak */}
          <Pressable
            onPress={handleStreakPress}
            className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
              <Flame size={20} color={Colors.streak} fill={Colors.streak} />
            </View>
            <View className="gap-0.5">
              <Text className="text-[18px] font-bold text-white leading-tight">{currentStreak ?? 0}</Text>
              <Text className="text-[11px] font-medium text-white/60">{t('explore.streak.label', 'Streak')}</Text>
            </View>
          </Pressable>

          <View className="w-px h-8 bg-white/15 mx-2" />

          {/* Completed today */}
          <Pressable
            onPress={handleCompletedTodayPress}
            className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
              <Sparkles size={20} color={Colors.accent.gold} />
            </View>
            <View className="gap-0.5">
              <Text className="text-[18px] font-bold text-white leading-tight">
                {homeData?.daily_devotion?.completed ? 1 : 0}
              </Text>
              <Text className="text-[11px] font-medium text-white/60">{t('explore.completedToday', 'Done')}</Text>
            </View>
          </Pressable>

          <View className="w-px h-8 bg-white/15 mx-2" />

          {/* Studies */}
          <Pressable
            onPress={handleStudiesPress}
            className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
              <BookOpen size={20} color={Colors.accent.gold} />
            </View>
            <View className="gap-0.5">
              <Text className="text-[18px] font-bold text-white leading-tight">{bibleStudies?.length || 0}</Text>
              <Text className="text-[11px] font-medium text-white/60">{t('explore.studies', 'Studies')}</Text>
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
          className="p-8 items-center"
        >
          <Text className="text-[15px] text-red-500 text-center">{t('explore.error.loadContent', 'Failed to load content')}</Text>
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
      <View>
        {/* Daily Devotion */}
        {homeData.daily_devotion && (
          <Animated.View
            key={`devotion-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            className="mb-8"
          >
            <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
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
              sharedTransitionTag={`devotion-${homeData.daily_devotion?.id}`}
            />
          </Animated.View>
        )}

        {/* Verse of the Day */}
        {homeData.verse_of_the_day && (
          <Animated.View
            key={`verse-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            className="mb-8"
          >
            <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
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
            className="mb-8"
          >
            <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
              {t('explore.bibleFigureOfTheDay', 'Bible Figure of the Day')}
            </Text>
            <BibleFigureCard
              figure={homeData.bible_figure}
              language={contentLanguage}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/explore/figure/${homeData.bible_figure?.id}`);
              }}
              sharedTransitionTag={`figure-${homeData.bible_figure?.id}`}
            />
          </Animated.View>
        )}

        {/* Daily Quiz */}
        {homeData.daily_quiz && (
          <Animated.View
            key={`quiz-${animationKey}`}
            entering={todayListItemMotion(sectionIndex++)}
            className="mb-8"
          >
            <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
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
            className="mb-8"
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
                {t('explore.bibleStudies', 'Bible Studies')}
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/explore/studies');
                }}
                className="flex-row items-center gap-1 active:scale-95 active:opacity-90"
              >
                <Text className="text-sm font-semibold" style={{ color: Colors.accent.goldDark }}>
                  {t('explore.viewAll', 'View All')}
                </Text>
                <ChevronRight size={16} color={Colors.accent.goldDark} />
              </Pressable>
            </View>

            <FlatList
              data={bibleStudies.slice(0, 6)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              className="-mx-6"
              contentContainerStyle={{ paddingHorizontal: 24 }}
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
          className="mb-8"
        >
          <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
            {t('companion.sectionTitle', 'Your Companion')}
          </Text>
          <FaithAssistantCard variant="compact" />
        </Animated.View>

        {/* Explore More */}
        <Animated.View
          key={`more-${animationKey}`}
          entering={todayListItemMotion(sectionIndex++)}
          className="mb-8"
        >
          <Text className="text-xl font-bold text-neutral-900 mb-4" style={{ letterSpacing: -0.3 }}>
            {t('explore.exploreMore', 'Explore More')}
          </Text>

          <View className="gap-4">
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
        <View className="h-[120px]" />
      </View>
    );
  };

  return (
    <Animated.View className="flex-1 bg-neutral-100">
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24 }}
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
    <View
      style={{
        width: STUDY_CARD_WIDTH,
        height: 180,
        marginRight: 16,
        borderRadius: 20,
        backgroundColor: Colors.neutral[900],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <Pressable
        onPress={onPress}
        className="flex-1 overflow-hidden rounded-[20px] active:scale-[0.97] active:opacity-95"
      >
        {/* Background Image with shared element transition */}
        <AnimatedImage
          source={{
            uri: study.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400',
          }}
          className="absolute inset-0 w-full h-full rounded-[20px]"
          resizeMode="cover"
          sharedTransitionTag={`study-${study.id}-image`}
        />

        {/* Gradient overlay - absolute to cover entire image */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          className="absolute inset-0 rounded-[20px]"
        />

        {/* Content - sits on top of gradient */}
        <View className="flex-1 justify-between p-3.5">
          {/* Difficulty badge */}
          <View
            className="self-end px-3 py-1.5 rounded-full"
            style={{ backgroundColor: difficultyColors[difficulty] || Colors.neutral[500] }}
          >
            <Text className="text-[10px] font-bold text-white uppercase tracking-wide">
              {getDifficultyLabel(difficulty)}
            </Text>
          </View>

          {/* Bottom content */}
          <View className="gap-2.5">
            <Animated.Text
              className="text-[16px] font-bold text-white leading-[20px]"
              numberOfLines={2}
              sharedTransitionTag={`study-${study.id}-title`}
            >
              {title}
            </Animated.Text>
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full">
                <BookOpen size={11} color={Colors.white} />
                <Text className="text-[11px] font-semibold text-white">{lessonCount}</Text>
              </View>
              <View className="flex-row items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full">
                <Clock size={11} color={Colors.white} />
                <Text className="text-[11px] font-semibold text-white">{formatDuration(duration)}</Text>
              </View>
              {rating > 0 && (
                <View className="flex-row items-center gap-1">
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text className="text-[11px] font-semibold text-white">{rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
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
      className="overflow-hidden active:scale-[0.98] active:opacity-95"
      style={{
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="relative overflow-hidden"
        style={{ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 }}
      >
        {/* Decorative circles */}
        <View
          className="absolute rounded-full"
          style={{ width: 80, height: 80, top: -30, right: -20, backgroundColor: 'rgba(255,255,255,0.1)' }}
        />
        <View
          className="absolute rounded-full"
          style={{ width: 50, height: 50, bottom: -25, left: 10, backgroundColor: 'rgba(255,255,255,0.1)' }}
        />

        <View className="flex-row items-center gap-[14px]">
          <View
            className="w-12 h-12 items-center justify-center"
            style={{ borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            {icon}
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-white">{title}</Text>
            <Text className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{desc}</Text>
          </View>
          <View
            className="w-8 h-8 items-center justify-center"
            style={{ borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
