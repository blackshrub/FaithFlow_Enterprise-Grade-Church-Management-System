/**
 * Journey Discovery Screen - Browse and discover life stage journeys
 *
 * Features:
 * - Category filtering
 * - Difficulty filtering
 * - AI-recommended journeys
 * - Active enrollments at top
 * - Premium card design
 *
 * Styling: NativeWind-first
 */

import React, { useState, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  Dimensions,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Target,
  Heart,
  Users,
  Crown,
  Clock,
  Calendar,
  Star,
  Play,
  Pause,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { withPremiumMotionV10 } from '@/hoc';
import {
  useAvailableJourneys,
  useRecommendedJourneys,
  useMyEnrollments,
  useJourneyCategories,
} from '@/hooks/explore/useJourney';
import type { Journey, JourneyEnrollment, JourneyRecommendation } from '@/services/api/explore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium color palette
const Colors = {
  gradient: {
    start: '#0f0f0f',
    mid: '#1a1a1a',
    end: '#252525',
  },
  accent: {
    gold: '#d4af37',
    goldLight: '#e8d5a8',
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
  categories: {
    life_transition: '#3B82F6',
    spiritual_growth: '#10B981',
    relationships: '#EC4899',
    leadership: '#F59E0B',
  },
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
 * Active Journey Card (horizontal scroll at top)
 */
function ActiveJourneyCard({
  enrollment,
  onPress,
  language,
}: {
  enrollment: JourneyEnrollment;
  onPress: () => void;
  language: string;
}) {
  const { t } = useTranslation();
  const title = enrollment.journey_title?.[language as 'en' | 'id'] ||
    enrollment.journey_title?.en || enrollment.journey_slug;
  const progress = enrollment.journey_title
    ? Math.round((enrollment.total_days_completed / 28) * 100) // Estimate
    : 0;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="mr-4 overflow-hidden rounded-2xl active:scale-[0.98]"
      style={{
        width: SCREEN_WIDTH * 0.7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[Colors.accent.indigo, '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-4"
      >
        {/* Status badge */}
        <View className="flex-row items-center justify-between mb-3">
          <View
            className="px-2.5 py-1 rounded-full flex-row items-center gap-1.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {enrollment.status === 'paused' ? (
              <Pause size={12} color={Colors.white} />
            ) : (
              <Play size={12} color={Colors.white} fill={Colors.white} />
            )}
            <Text className="text-xs font-semibold text-white">
              {enrollment.status === 'paused'
                ? t('journey.enrollment.paused')
                : t('journey.enrollment.enrolled')}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Clock size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs text-white/80">
              {t('journey.progress.week', {
                current: enrollment.current_week,
                total: 4, // Estimate
              })}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text className="text-lg font-bold text-white mb-2" numberOfLines={2}>
          {title}
        </Text>

        {/* Progress bar */}
        <View className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
          <View
            className="h-full rounded-full bg-white"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* Progress text */}
        <Text className="text-xs text-white/70">
          {t('journey.progress.day', { current: enrollment.current_day })} · {enrollment.streak_current} 🔥
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

/**
 * Recommended Journey Card
 */
function RecommendedCard({
  recommendation,
  journey,
  onPress,
  language,
}: {
  recommendation: JourneyRecommendation;
  journey?: Journey;
  onPress: () => void;
  language: string;
}) {
  const { t } = useTranslation();
  const reason = recommendation.reason[language as 'en' | 'id'] || recommendation.reason.en;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="mr-4 overflow-hidden rounded-2xl bg-white active:scale-[0.98]"
      style={{
        width: SCREEN_WIDTH * 0.65,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {/* AI Badge */}
      <View className="absolute top-3 left-3 z-10 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100">
        <Sparkles size={12} color={Colors.accent.gold} />
        <Text className="text-[10px] font-bold text-amber-700">
          {Math.round(recommendation.relevance_score * 100)}% Match
        </Text>
      </View>

      {/* Cover image */}
      <View className="h-24 bg-gray-100">
        {journey?.cover_image_url ? (
          <Image
            source={{ uri: journey.cover_image_url }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[Colors.accent.indigo, '#4338CA']}
            className="w-full h-full items-center justify-center"
          >
            <Compass size={32} color={Colors.white} />
          </LinearGradient>
        )}
      </View>

      {/* Content */}
      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={1}>
          {journey?.title?.[language as 'en' | 'id'] || journey?.title?.en || recommendation.journey_slug}
        </Text>
        <Text className="text-sm text-gray-500 mb-2" numberOfLines={2}>
          {reason}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="px-2 py-0.5 rounded-full bg-indigo-100">
            <Text className="text-[10px] font-semibold text-indigo-700">
              {journey?.duration_weeks} {t('journey.duration.weeks', { count: journey?.duration_weeks || 0 })}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Journey Card for grid display
 */
function JourneyCard({
  journey,
  onPress,
  language,
}: {
  journey: Journey;
  onPress: () => void;
  language: string;
}) {
  const { t } = useTranslation();
  const title = journey.title[language as 'en' | 'id'] || journey.title.en;
  const description = journey.description[language as 'en' | 'id'] || journey.description.en;
  const categoryColor = Colors.categories[journey.category as keyof typeof Colors.categories] || Colors.accent.indigo;
  const CategoryIcon = CategoryIcons[journey.category] || Compass;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="mb-4 overflow-hidden rounded-2xl bg-white active:scale-[0.98]"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="flex-row">
        {/* Icon section */}
        <View
          className="w-20 items-center justify-center py-6"
          style={{ backgroundColor: categoryColor + '15' }}
        >
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mb-2"
            style={{ backgroundColor: categoryColor + '25' }}
          >
            <CategoryIcon size={24} color={categoryColor} />
          </View>
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: Colors.difficulty[journey.difficulty as keyof typeof Colors.difficulty] + '20' }}
          >
            <Text
              className="text-[9px] font-bold uppercase"
              style={{ color: Colors.difficulty[journey.difficulty as keyof typeof Colors.difficulty] }}
            >
              {t(`journey.difficulty.${journey.difficulty}`)}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 p-4">
          <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
            {description}
          </Text>

          {/* Stats row */}
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color={Colors.neutral[400]} />
              <Text className="text-xs text-gray-500">
                {journey.duration_weeks}w
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Users size={12} color={Colors.neutral[400]} />
              <Text className="text-xs text-gray-500">
                {journey.enrollments_count}
              </Text>
            </View>
            {journey.average_rating > 0 && (
              <View className="flex-row items-center gap-1">
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs text-gray-500">
                  {journey.average_rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View className="justify-center pr-4">
          <ChevronRight size={20} color={Colors.neutral[300]} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Category Filter Pill
 */
function CategoryPill({
  id,
  label,
  selected,
  onPress,
}: {
  id: string | null;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const CategoryIcon = id ? CategoryIcons[id] || Compass : Compass;
  const color = id
    ? Colors.categories[id as keyof typeof Colors.categories] || Colors.accent.indigo
    : Colors.accent.indigo;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={`mr-2 px-4 py-2.5 rounded-full flex-row items-center gap-2 active:scale-95 ${
        selected ? 'bg-indigo-100' : 'bg-white'
      }`}
      style={{
        borderWidth: selected ? 0 : 1,
        borderColor: Colors.neutral[200],
      }}
    >
      <CategoryIcon size={14} color={selected ? Colors.accent.indigo : Colors.neutral[500]} />
      <Text
        className={`text-sm font-semibold ${
          selected ? 'text-indigo-700' : 'text-gray-600'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

function JourneyDiscoveryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const animationKeyRef = useRef(Date.now());

  // Data queries
  const { data: categories } = useJourneyCategories();
  const { data: enrollments, refetch: refetchEnrollments } = useMyEnrollments('active');
  const { data: recommended } = useRecommendedJourneys(3);
  const {
    data: journeys,
    isLoading,
    refetch: refetchJourneys,
  } = useAvailableJourneys(selectedCategory || undefined);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetchEnrollments();
    refetchJourneys();
  }, [refetchEnrollments, refetchJourneys]);

  const navigateToJourney = useCallback((slug: string) => {
    router.push(`/explore/journeys/${slug}`);
  }, [router]);

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
        className="pt-12 pb-6 px-6"
      >
        <SafeAreaView edges={['top']}>
          {/* Back + Title */}
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center bg-white/15 active:scale-95 mr-4"
            >
              <ChevronLeft size={24} color={Colors.white} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white" style={{ letterSpacing: -0.5 }}>
                {t('journey.title', 'Journeys')}
              </Text>
              <Text className="text-sm text-white/60">
                {t('journey.subtitle', 'Guided spiritual programs')}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.gold}
          />
        }
      >
        {/* Active Journeys (if any) */}
        {enrollments && enrollments.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="pt-6"
          >
            <View className="flex-row items-center justify-between px-6 mb-4">
              <Text className="text-lg font-bold text-gray-900">
                {t('journey.myJourneys', 'My Journeys')}
              </Text>
              <View className="px-2.5 py-1 rounded-full bg-indigo-100">
                <Text className="text-xs font-bold text-indigo-700">
                  {enrollments.length} Active
                </Text>
              </View>
            </View>
            <FlatList
              data={enrollments}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 24 }}
              renderItem={({ item }) => (
                <ActiveJourneyCard
                  enrollment={item}
                  onPress={() => navigateToJourney(item.journey_slug)}
                  language={language}
                />
              )}
            />
          </Animated.View>
        )}

        {/* Recommended Journeys */}
        {recommended && recommended.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="pt-6"
          >
            <View className="flex-row items-center gap-2 px-6 mb-4">
              <Sparkles size={18} color={Colors.accent.gold} />
              <Text className="text-lg font-bold text-gray-900">
                {t('journey.recommended', 'Recommended for You')}
              </Text>
            </View>
            <FlatList
              data={recommended}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.journey_id}
              contentContainerStyle={{ paddingHorizontal: 24 }}
              renderItem={({ item }) => (
                <RecommendedCard
                  recommendation={item}
                  journey={journeys?.find((j) => j.slug === item.journey_slug)}
                  onPress={() => navigateToJourney(item.journey_slug)}
                  language={language}
                />
              )}
            />
          </Animated.View>
        )}

        {/* Categories */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          className="pt-6"
        >
          <Text className="text-lg font-bold text-gray-900 px-6 mb-4">
            {t('journey.discover', 'Discover Journeys')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            <CategoryPill
              id={null}
              label={t('common.all', 'All')}
              selected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {categories?.map((cat) => (
              <CategoryPill
                key={cat.id}
                id={cat.id}
                label={cat.name[language as 'en' | 'id'] || cat.name.en}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* All Journeys */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="px-6 pt-6 pb-32"
        >
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <View
                key={i}
                className="mb-4 h-24 rounded-2xl bg-gray-200 animate-pulse"
              />
            ))
          ) : journeys && journeys.length > 0 ? (
            journeys.map((journey, index) => (
              <Animated.View
                key={journey.id}
                entering={FadeInRight.delay(index * 50).duration(300)}
              >
                <JourneyCard
                  journey={journey}
                  onPress={() => navigateToJourney(journey.slug)}
                  language={language}
                />
              </Animated.View>
            ))
          ) : (
            <View className="items-center py-12">
              <Compass size={48} color={Colors.neutral[300]} />
              <Text className="text-base text-gray-500 mt-4">
                {t('journey.empty.noActive', 'No journeys available')}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Memoize + Premium Motion HOC
const MemoizedScreen = memo(JourneyDiscoveryScreen);
MemoizedScreen.displayName = 'JourneyDiscoveryScreen';
export default withPremiumMotionV10(MemoizedScreen);
