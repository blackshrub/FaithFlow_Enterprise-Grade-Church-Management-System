/**
 * Journey Detail Screen - View journey details and enroll/continue
 *
 * Features:
 * - Full journey info (weeks, days, description)
 * - Enroll/Continue CTA
 * - Week breakdown
 * - Today's content preview (if enrolled)
 * - Progress tracking
 *
 * Styling: NativeWind-first
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  Star,
  Play,
  Pause,
  Check,
  BookOpen,
  Heart,
  Target,
  Compass,
  Crown,
  ArrowRight,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { withPremiumMotionV10 } from '@/hoc';
import {
  useJourneyDetails,
  useEnrollment,
  useEnrollJourney,
  useTodayContent,
} from '@/hooks/explore/useJourney';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

// Colors
const Colors = {
  gradient: {
    start: '#4338CA',
    mid: '#6366F1',
    end: '#8B5CF6',
  },
  accent: {
    gold: '#d4af37',
    indigo: '#6366F1',
    indigoLight: '#EEF2FF',
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
  difficulty: {
    beginner: '#10B981',
    intermediate: '#F59E0B',
    advanced: '#EF4444',
  },
};

// Category icons
const CategoryIcons: Record<string, typeof Heart> = {
  life_transition: Compass,
  spiritual_growth: Target,
  relationships: Heart,
  leadership: Crown,
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Week Accordion Item
 */
function WeekItem({
  weekNumber,
  title,
  description,
  daysCount,
  isCompleted,
  isCurrent,
  isExpanded,
  onToggle,
  language,
}: {
  weekNumber: number;
  title: { en: string; id: string };
  description?: { en: string; id: string };
  daysCount: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  language: string;
}) {
  const { t } = useTranslation();
  const titleText = title[language as 'en' | 'id'] || title.en;
  const descText = description?.[language as 'en' | 'id'] || description?.en;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      className={`mb-3 rounded-2xl overflow-hidden ${
        isCurrent ? 'border-2 border-indigo-500' : 'border border-gray-200'
      }`}
    >
      {/* Header */}
      <View className={`p-4 ${isCurrent ? 'bg-indigo-50' : 'bg-white'}`}>
        <View className="flex-row items-center">
          {/* Week number circle */}
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              isCompleted
                ? 'bg-green-500'
                : isCurrent
                ? 'bg-indigo-500'
                : 'bg-gray-200'
            }`}
          >
            {isCompleted ? (
              <Check size={18} color={Colors.white} strokeWidth={3} />
            ) : (
              <Text
                className={`text-sm font-bold ${
                  isCurrent ? 'text-white' : 'text-gray-500'
                }`}
              >
                {weekNumber}
              </Text>
            )}
          </View>

          {/* Title */}
          <View className="flex-1">
            <Text className="text-xs font-semibold text-indigo-600 mb-0.5">
              {t('journey.progress.week', { current: weekNumber, total: '' }).split(' of')[0]}
            </Text>
            <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
              {titleText}
            </Text>
          </View>

          {/* Days count */}
          <View className="flex-row items-center gap-1 mr-2">
            <Calendar size={14} color={Colors.neutral[400]} />
            <Text className="text-sm text-gray-500">{daysCount}d</Text>
          </View>

          {/* Expand indicator */}
          <ChevronRight
            size={20}
            color={Colors.neutral[400]}
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
            }}
          />
        </View>
      </View>

      {/* Expanded content */}
      {isExpanded && descText && (
        <Animated.View
          entering={FadeIn.duration(200)}
          className="px-4 pb-4 bg-white border-t border-gray-100"
        >
          <Text className="text-sm text-gray-600 mt-3">{descText}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * Today's Content Preview Card (for enrolled users)
 */
function TodayPreviewCard({
  slug,
  language,
  onPress,
}: {
  slug: string;
  language: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { data: todayContent, isLoading } = useTodayContent(slug);

  if (isLoading || !todayContent) return null;

  const dayTitle = todayContent.content.title[language as 'en' | 'id'] ||
    todayContent.content.title.en;
  const dayFocus = todayContent.content.focus[language as 'en' | 'id'] ||
    todayContent.content.focus.en;

  return (
    <Animated.View entering={FadeInUp.delay(300).duration(400)} className="mb-6">
      <Text className="text-lg font-bold text-gray-900 mb-3">
        {t('journey.today.title', "Today's Content")}
      </Text>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        className="rounded-2xl overflow-hidden active:scale-[0.98]"
        style={{
          shadowColor: Colors.accent.indigo,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={[Colors.gradient.start, Colors.gradient.mid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-5"
        >
          {/* Day badge */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="px-3 py-1 rounded-full bg-white/20">
              <Text className="text-xs font-bold text-white">
                {t('journey.progress.day', { current: todayContent.day_number })}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock size={14} color="rgba(255,255,255,0.8)" />
              <Text className="text-xs text-white/80">
                {todayContent.content.estimated_minutes}min
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-white mb-1" numberOfLines={2}>
            {dayTitle}
          </Text>
          <Text className="text-sm text-white/70 mb-4" numberOfLines={2}>
            {dayFocus}
          </Text>

          {/* Scripture preview */}
          <View className="flex-row items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
            <BookOpen size={16} color={Colors.white} />
            <Text className="text-sm text-white font-medium">
              {todayContent.content.main_scripture.book}{' '}
              {todayContent.content.main_scripture.chapter}:
              {todayContent.content.main_scripture.verses}
            </Text>
            <View className="flex-1" />
            <ArrowRight size={16} color={Colors.white} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

function JourneyDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';
  const insets = useSafeAreaInsets();

  // State
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Data
  const { data: journey, isLoading: loadingJourney } = useJourneyDetails(slug || '');
  const { data: enrollmentData, isLoading: loadingEnrollment } = useEnrollment(slug || '');
  const enrollMutation = useEnrollJourney();

  const enrollment = enrollmentData?.enrollment;
  const isEnrolled = !!enrollment && ['active', 'paused'].includes(enrollment.status);

  // Scroll animation
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT - 100], [1, 0]);
    const translateY = interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -50]);
    return { opacity, transform: [{ translateY }] };
  });

  const handleEnroll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    enrollMutation.mutate({ slug: slug || '' });
  }, [slug, enrollMutation]);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/explore/journeys/${slug}/today`);
  }, [router, slug]);

  // Loading
  if (loadingJourney) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ButtonSpinner color={Colors.accent.indigo} />
      </View>
    );
  }

  if (!journey) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-gray-500">Journey not found</Text>
      </View>
    );
  }

  const title = journey.title[language as 'en' | 'id'] || journey.title.en;
  const description = journey.description[language as 'en' | 'id'] || journey.description.en;
  const CategoryIcon = CategoryIcons[journey.category] || Compass;

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" />

      {/* Header Image */}
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }, headerAnimatedStyle]}
      >
        {journey.cover_image_url ? (
          <Image
            source={{ uri: journey.cover_image_url }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
            className="w-full h-full"
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
          className="absolute inset-0"
        />
      </Animated.View>

      {/* Fixed Back Button */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-20">
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-black/30 active:scale-95"
          >
            <ChevronLeft size={24} color={Colors.white} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Scrollable Content */}
      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT - 40 }}
      >
        {/* Content Card */}
        <View
          className="bg-white rounded-t-[32px] px-6 pt-6 pb-32 min-h-screen"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Title Section */}
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Category badge */}
            <View className="flex-row items-center gap-2 mb-3">
              <View
                className="w-8 h-8 rounded-lg items-center justify-center"
                style={{ backgroundColor: Colors.accent.indigoLight }}
              >
                <CategoryIcon size={16} color={Colors.accent.indigo} />
              </View>
              <Text className="text-sm font-semibold text-indigo-600">
                {t(`journey.categories.${journey.category}`)}
              </Text>
              <View className="flex-1" />
              <View
                className="px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor:
                    Colors.difficulty[journey.difficulty as keyof typeof Colors.difficulty] + '20',
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: Colors.difficulty[journey.difficulty as keyof typeof Colors.difficulty],
                  }}
                >
                  {t(`journey.difficulty.${journey.difficulty}`)}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-2xl font-bold text-gray-900 mb-2"
              style={{ letterSpacing: -0.5 }}
            >
              {title}
            </Text>

            {/* Stats row */}
            <View className="flex-row items-center gap-4 mb-4">
              <View className="flex-row items-center gap-1">
                <Calendar size={14} color={Colors.neutral[500]} />
                <Text className="text-sm text-gray-600">
                  {journey.duration_weeks} {t('journey.duration.weeks', { count: journey.duration_weeks })}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Clock size={14} color={Colors.neutral[500]} />
                <Text className="text-sm text-gray-600">
                  {journey.total_days} {t('journey.duration.days', { count: journey.total_days })}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Users size={14} color={Colors.neutral[500]} />
                <Text className="text-sm text-gray-600">{journey.enrollments_count}</Text>
              </View>
              {journey.average_rating > 0 && (
                <View className="flex-row items-center gap-1">
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text className="text-sm text-gray-600">
                    {journey.average_rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <Text className="text-base text-gray-600 leading-relaxed mb-6">
              {description}
            </Text>
          </Animated.View>

          {/* Today's Content (if enrolled) */}
          {isEnrolled && (
            <TodayPreviewCard
              slug={slug || ''}
              language={language}
              onPress={handleContinue}
            />
          )}

          {/* Weeks Breakdown */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text className="text-lg font-bold text-gray-900 mb-4">
              {t('journey.progress.week', { current: '', total: journey.weeks?.length || 0 }).replace(' of ', '')} Overview
            </Text>

            {journey.weeks?.map((week: any, index: number) => (
              <WeekItem
                key={index}
                weekNumber={index + 1}
                title={week.title}
                description={week.description}
                daysCount={week.days?.length || 7}
                isCompleted={
                  enrollment ? index + 1 < enrollment.current_week : false
                }
                isCurrent={
                  enrollment ? index + 1 === enrollment.current_week : index === 0
                }
                isExpanded={expandedWeek === index}
                onToggle={() =>
                  setExpandedWeek(expandedWeek === index ? null : index)
                }
                language={language}
              />
            ))}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Fixed Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6"
        style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
      >
        {isEnrolled ? (
          <View className="flex-row gap-3">
            {/* Progress info */}
            <View className="flex-1 justify-center">
              <Text className="text-sm text-gray-500">
                {t('journey.progress.week', {
                  current: enrollment?.current_week,
                  total: journey.weeks?.length || 4,
                })}
              </Text>
              <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                <View
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${
                      ((enrollment?.current_week || 1) / (journey.weeks?.length || 4)) * 100
                    }%`,
                  }}
                />
              </View>
            </View>

            {/* Continue button */}
            <View className="rounded-xl overflow-hidden">
              <Button
                size="lg"
                onPress={handleContinue}
                className="bg-transparent relative overflow-hidden px-8"
              >
                <LinearGradient
                  colors={[Colors.gradient.start, Colors.gradient.mid]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View className="flex-row items-center gap-2 z-[1]">
                  <Play size={18} color={Colors.white} fill={Colors.white} />
                  <ButtonText className="text-white font-bold">
                    {t('journey.enrollment.enrolled', 'Continue')}
                  </ButtonText>
                </View>
              </Button>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl overflow-hidden">
            <Button
              size="lg"
              onPress={handleEnroll}
              isDisabled={enrollMutation.isPending}
              className="w-full bg-transparent relative overflow-hidden"
            >
              <LinearGradient
                colors={[Colors.gradient.start, Colors.gradient.mid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View className="flex-row items-center justify-center gap-2 z-[1]">
                {enrollMutation.isPending ? (
                  <ButtonSpinner color={Colors.white} />
                ) : (
                  <Play size={20} color={Colors.white} fill={Colors.white} />
                )}
                <ButtonText className="text-white font-bold text-base">
                  {enrollMutation.isPending
                    ? 'Starting...'
                    : t('journey.enrollment.enroll', 'Start Journey')}
                </ButtonText>
              </View>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

// Memoize + Premium Motion HOC
const MemoizedScreen = memo(JourneyDetailScreen);
MemoizedScreen.displayName = 'JourneyDetailScreen';
export default withPremiumMotionV10(MemoizedScreen);
