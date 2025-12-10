/**
 * Devotion Detail Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for: custom colors from ExploreColors
 *
 * Handles both:
 * - Single Daily Devotions (dev_xxx IDs)
 * - Devotion Plans (plan_xxx IDs) with day-by-day navigation
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors } from '@/constants/explore/designSystem';
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import {
  useDevotionPlan,
  useDailyDevotion,
  useSinglePlanProgress,
  useSubscribeToPlan,
  useCompletePlanDay,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DevotionPlan, DevotionPlanDay, DailyDevotion, Language } from '@/types/explore';
import {
  ArrowLeft,
  Share2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Play,
  Lock,
} from 'lucide-react-native';
import { DailyDevotionSkeleton } from '@/components/explore/LoadingSkeleton';
import { MarkdownText } from '@/components/explore/MarkdownText';
import { AudioPlayButton } from '@/components/explore/AudioPlayButton';
import { QuickAskInput } from '@/components/companion/QuickAskInput';
import { profileApi } from '@/services/api/explore';
import Animated, { FadeIn, FadeInDown, FadeInRight, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedImage, sharedTags } from '@/utils/sharedTransitions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DevotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const { data: dailyDevotion, isLoading: isDailyLoading } = useDailyDevotion(id as string);
  const { data: plan, isLoading: isPlanLoading } = useDevotionPlan(id as string);

  const isLoading = isDailyLoading && isPlanLoading;

  if (dailyDevotion && !plan) {
    return (
      <DailyDevotionView
        devotion={dailyDevotion}
        contentLanguage={contentLanguage}
        onBack={() => router.back()}
      />
    );
  }

  if (plan) {
    return (
      <DevotionPlanView
        plan={plan}
        contentLanguage={contentLanguage}
        onBack={() => router.back()}
      />
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <DailyDevotionSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
        <Pressable
          onPress={() => router.back()}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
      </View>
      <View className="flex-1 justify-center items-center p-5">
        <Text className="text-base text-neutral-500">
          {t('explore.devotion.contentNotFound')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// DAILY DEVOTION VIEW (Single devotion)
// ============================================================================

interface DailyDevotionViewProps {
  devotion: DailyDevotion;
  contentLanguage: Language;
  onBack: () => void;
}

function DailyDevotionView({ devotion, contentLanguage, onBack }: DailyDevotionViewProps) {
  const { t } = useTranslation();
  const title = devotion.title[contentLanguage] || devotion.title.en;
  const content = devotion.content[contentLanguage] || devotion.content.en;
  const summary = devotion.summary?.[contentLanguage] || devotion.summary?.en;

  const verseText = devotion.main_verse?.text
    ? (typeof devotion.main_verse.text === 'string'
        ? devotion.main_verse.text
        : devotion.main_verse.text?.[contentLanguage] || devotion.main_verse.text?.en || '')
    : '';

  const ttsText = [title, verseText, content.substring(0, 500)].filter(Boolean).join('. ');

  // Track content view when mounted
  useEffect(() => {
    if (devotion.id) {
      profileApi.trackContentView(
        devotion.id,
        'devotion',
        devotion.topics || [],
        devotion.main_verse ? {
          book: devotion.main_verse.book,
          chapter: devotion.main_verse.chapter,
        } : undefined
      ).catch(err => console.warn('[Devotion] Failed to track view:', err));
    }
  }, [devotion.id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `📖 ${title}\n\n${summary || ''}\n\n${t('explore.devotion.sharedFrom')}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
        <Pressable
          onPress={onBack}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Pressable
          onPress={handleShare}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share devotion"
        >
          <Share2 size={24} color={ExploreColors.neutral[600]} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {devotion.image_url && (
          <View className="relative w-full h-[220px]">
            {/* Background Image - Shared Element Transition */}
            <AnimatedImage
              source={{ uri: devotion.image_url }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
              sharedTransitionTag={sharedTags.devotionImage(devotion.id)}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} className="flex-1 p-3 justify-end">
              {devotion.reading_time_minutes && (
                <View className="absolute top-3 right-3 flex-row items-center gap-1.5 bg-black/60 px-2 py-1.5 rounded-lg">
                  <Clock size={14} color="#FFFFFF" />
                  <Text className="text-white text-sm font-semibold">
                    {devotion.reading_time_minutes} {t('explore.devotion.readTime')}
                  </Text>
                </View>
              )}
              {ttsText && devotion.id && (
                <View className="absolute bottom-3 right-3">
                  <AudioPlayButton
                    text={ttsText}
                    variant="icon"
                    size={56}
                    color="#FFFFFF"
                    backgroundColor="rgba(0, 0, 0, 0.6)"
                    cacheConfig={{ contentType: 'devotion', contentId: devotion.id }}
                    autoPreload
                  />
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        <Animated.View entering={SlideInRight.duration(250).delay(30)} className="px-5 pt-6">
          {/* Title with Audio Button */}
          <View className="flex-row items-start justify-between mb-1">
            <Animated.Text
              className="text-[32px] font-extrabold flex-1 mr-3"
              style={{ color: ExploreColors.neutral[900], lineHeight: 40, letterSpacing: -0.5 }}
            >
              {title}
            </Animated.Text>
            {ttsText && devotion.id && (
              <AudioPlayButton
                text={ttsText}
                variant="icon"
                size={48}
                color={ExploreColors.primary[500]}
                backgroundColor={ExploreColors.primary[50]}
                cacheConfig={{ contentType: 'devotion', contentId: devotion.id }}
                autoPreload
              />
            )}
          </View>

          {devotion.main_verse && (
            <View className="flex-row rounded-xl p-4 mb-6" style={{ backgroundColor: ExploreColors.spiritual[50] }}>
              <View className="w-1 rounded-full mr-3" style={{ backgroundColor: ExploreColors.spiritual[500] }} />
              <View className="flex-1">
                <Text className="text-lg font-semibold italic mb-2" style={{ color: ExploreColors.neutral[900], lineHeight: 28 }}>
                  "{typeof devotion.main_verse.text === 'string'
                    ? devotion.main_verse.text
                    : devotion.main_verse.text?.[contentLanguage] || devotion.main_verse.text?.en || ''}"
                </Text>
                <Text className="text-base font-semibold" style={{ color: ExploreColors.spiritual[700] }}>
                  {formatBibleReference(devotion.main_verse, contentLanguage)}
                </Text>
              </View>
            </View>
          )}

          <MarkdownText style={{ fontSize: 16, color: ExploreColors.neutral[800], lineHeight: 28, marginBottom: 24 }}>
            {content}
          </MarkdownText>

          {devotion.additional_verses && devotion.additional_verses.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
                {contentLanguage === 'en' ? 'Related Verses' : 'Ayat Terkait'}
              </Text>
              {devotion.additional_verses.map((verse, index) => (
                <View key={index} className="rounded-xl p-3 mb-2" style={{ backgroundColor: ExploreColors.neutral[50] }}>
                  <Text className="text-base italic mb-1" style={{ color: ExploreColors.neutral[800] }}>
                    "{typeof verse.text === 'string' ? verse.text : verse.text?.[contentLanguage] || verse.text?.en || ''}"
                  </Text>
                  <Text className="text-[13px] font-semibold" style={{ color: ExploreColors.neutral[600] }}>
                    {formatBibleReference(verse, contentLanguage)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {devotion.tags && devotion.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-4">
              {devotion.tags.map((tag, index) => (
                <View key={index} className="px-3 py-1.5 rounded-2xl" style={{ backgroundColor: ExploreColors.primary[50] }}>
                  <Text className="text-[13px] font-medium" style={{ color: ExploreColors.primary[700] }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ask Faith Assistant about this devotion */}
          <View className="mt-6 mb-4">
            <QuickAskInput
              context="devotion_reflection"
              contentId={devotion.id}
              contextData={{
                devotionId: devotion.id,
                devotionTitle: title,
                verseReference: devotion.main_verse
                  ? `${devotion.main_verse.book} ${devotion.main_verse.chapter}:${devotion.main_verse.verse_start}`
                  : undefined,
                verseText: verseText || undefined,
              }}
              language={contentLanguage}
            />
          </View>

          <View className="h-10" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// DEVOTION PLAN VIEW (Multi-day plan)
// ============================================================================

interface DevotionPlanViewProps {
  plan: DevotionPlan;
  contentLanguage: Language;
  onBack: () => void;
}

function DevotionPlanView({ plan, contentLanguage, onBack }: DevotionPlanViewProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { data: progress } = useSinglePlanProgress(plan.id);
  const subscribeToPlan = useSubscribeToPlan();
  const completePlanDay = useCompletePlanDay();

  useEffect(() => {
    if (plan && progress?.subscribed && progress.current_day > 0) {
      setSelectedDay(progress.current_day);
    }
  }, [plan, progress]);

  const isSubscribed = progress?.subscribed ?? false;
  const isCompleted = progress?.completed ?? false;
  const currentDay = progress?.current_day ?? 0;
  const completedDays = progress?.completed_days ?? [];

  const handleSubscribe = async () => {
    if (!plan.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await subscribeToPlan.mutateAsync({ planId: plan.id });
    setSelectedDay(1);
  };

  const handleCompleteDay = async () => {
    if (!plan.id || !selectedDay) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completePlanDay.mutateAsync({ planId: plan.id, dayNumber: selectedDay });
    if (selectedDay < plan.duration_days) {
      setTimeout(() => setSelectedDay(selectedDay + 1), 500);
    }
  };

  const handleShare = async () => {
    const title = plan.title[contentLanguage] || plan.title.en;
    const description = plan.description?.[contentLanguage] || plan.description?.en || '';
    try {
      await Share.share({
        message: `📖 ${title}\n\n${description}\n\n${plan.duration_days} ${contentLanguage === 'en' ? 'day devotion plan' : 'hari rencana renungan'}\n\nShared from FaithFlow`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const isDayCompleted = useCallback((dayNum: number) => completedDays.includes(dayNum), [completedDays]);
  const isDayAccessible = useCallback((dayNum: number) => {
    if (!isSubscribed) return false;
    return dayNum <= currentDay || dayNum === 1;
  }, [isSubscribed, currentDay]);

  const title = plan.title[contentLanguage] || plan.title.en;
  const subtitle = plan.subtitle?.[contentLanguage] || plan.subtitle?.en;
  const description = plan.description?.[contentLanguage] || plan.description?.en || '';
  const introduction = plan.introduction?.[contentLanguage] || plan.introduction?.en;

  if (selectedDay !== null && plan.plan_days && plan.plan_days.length > 0) {
    const dayData = plan.plan_days.find((d) => d.day_number === selectedDay);
    if (dayData) {
      return (
        <DayContentView
          plan={plan}
          day={dayData}
          dayNumber={selectedDay}
          totalDays={plan.duration_days}
          isCompleted={isDayCompleted(selectedDay)}
          onBack={() => setSelectedDay(null)}
          onComplete={handleCompleteDay}
          onPrevDay={() => selectedDay > 1 && setSelectedDay(selectedDay - 1)}
          onNextDay={() => selectedDay < plan.duration_days && isDayAccessible(selectedDay + 1) && setSelectedDay(selectedDay + 1)}
          contentLanguage={contentLanguage}
          isPending={completePlanDay.isPending}
        />
      );
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
        <Pressable
          onPress={onBack}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Pressable
          onPress={handleShare}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Share devotion plan"
        >
          <Share2 size={24} color={ExploreColors.neutral[600]} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)} className="relative w-full h-[220px]">
          {/* Background Image */}
          <AnimatedImage
            source={{ uri: plan.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800' }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} className="flex-1 p-3 justify-end">
            <View className="absolute top-3 right-3 flex-row items-center gap-1.5 bg-black/60 px-2 py-1.5 rounded-lg">
              <Calendar size={16} color="#FFFFFF" />
              <Text className="text-white text-sm font-semibold">
                {plan.duration_days} {contentLanguage === 'en' ? 'Days' : 'Hari'}
              </Text>
            </View>
            {isCompleted && (
              <View className="absolute top-3 left-3 flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ backgroundColor: ExploreColors.success[500] }}>
                <CheckCircle2 size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text className="text-white text-[13px] font-bold">{contentLanguage === 'en' ? 'Completed' : 'Selesai'}</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} className="px-5 pt-6">
          <Animated.Text
            className="text-[36px] font-extrabold mb-1"
            style={{ color: ExploreColors.neutral[900], lineHeight: 44, letterSpacing: -0.5 }}
          >
            {title}
          </Animated.Text>
          {subtitle && <Text className="text-base italic mb-3" style={{ color: ExploreColors.neutral[600] }}>{subtitle}</Text>}
          <Text className="text-base mb-4" style={{ color: ExploreColors.neutral[700], lineHeight: 26 }}>{description}</Text>

          {introduction && (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
                {contentLanguage === 'en' ? 'Introduction' : 'Pendahuluan'}
              </Text>
              <Text className="text-base" style={{ color: ExploreColors.neutral[700], lineHeight: 26 }}>{introduction}</Text>
            </View>
          )}

          {isSubscribed && !isCompleted && (
            <View className="mb-6 gap-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-base" style={{ color: ExploreColors.neutral[600] }}>
                  {contentLanguage === 'en' ? `Day ${currentDay} of ${plan.duration_days}` : `Hari ${currentDay} dari ${plan.duration_days}`}
                </Text>
                <Text className="text-base font-bold" style={{ color: ExploreColors.primary[600] }}>
                  {Math.round((completedDays.length / plan.duration_days) * 100)}%
                </Text>
              </View>
              <View className="h-2 rounded overflow-hidden" style={{ backgroundColor: ExploreColors.neutral[100] }}>
                <View
                  className="h-full rounded"
                  style={{ width: `${(completedDays.length / plan.duration_days) * 100}%`, backgroundColor: ExploreColors.primary[500] }}
                />
              </View>
            </View>
          )}

          <View className="mt-3">
            <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
              {contentLanguage === 'en' ? 'Daily Devotions' : 'Renungan Harian'}
            </Text>
            <View className="gap-2">
              {plan.plan_days?.map((day, index) => {
                const dayNum = day.day_number;
                const completed = isDayCompleted(dayNum);
                const accessible = isDayAccessible(dayNum);
                const isCurrent = dayNum === currentDay;

                return (
                  <Animated.View key={dayNum} entering={FadeInRight.duration(300).delay(index * 50)}>
                    <Pressable
                      onPress={() => {
                        if (accessible) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDay(dayNum);
                        }
                      }}
                      className={`flex-row items-center rounded-xl p-3 gap-3 ${
                        completed ? 'border' : isCurrent && !completed ? 'border-2' : ''
                      } ${!accessible ? 'opacity-60' : ''}`}
                      style={{
                        backgroundColor: completed
                          ? ExploreColors.success[50]
                          : isCurrent
                          ? ExploreColors.primary[50]
                          : ExploreColors.neutral[50],
                        borderColor: completed
                          ? ExploreColors.success[200]
                          : isCurrent
                          ? ExploreColors.primary[500]
                          : 'transparent',
                      }}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${dayNum}. ${day.title[contentLanguage] || day.title.en}. ${completed ? 'Completed' : accessible ? 'Available' : 'Locked'}`}
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: completed
                            ? ExploreColors.success[500]
                            : isCurrent
                            ? ExploreColors.primary[500]
                            : ExploreColors.neutral[200],
                        }}
                      >
                        {completed ? (
                          <Check size={16} color="#FFFFFF" />
                        ) : !accessible ? (
                          <Lock size={14} color={ExploreColors.neutral[400]} />
                        ) : (
                          <Text className={`text-base font-bold ${isCurrent ? 'text-white' : ''}`} style={{ color: isCurrent ? '#FFFFFF' : ExploreColors.neutral[600] }}>
                            {dayNum}
                          </Text>
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold uppercase" style={{ color: accessible ? ExploreColors.neutral[500] : ExploreColors.neutral[400] }}>
                          {contentLanguage === 'en' ? 'Day' : 'Hari'} {dayNum}
                        </Text>
                        <Text
                          className="text-base font-semibold mt-0.5"
                          numberOfLines={2}
                          style={{ color: accessible ? ExploreColors.neutral[800] : ExploreColors.neutral[500] }}
                        >
                          {day.title[contentLanguage] || day.title.en}
                        </Text>
                        {day.reading_time_minutes && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Clock size={12} color={accessible ? ExploreColors.neutral[500] : ExploreColors.neutral[300]} />
                            <Text className="text-[13px]" style={{ color: accessible ? ExploreColors.neutral[500] : ExploreColors.neutral[300] }}>
                              {day.reading_time_minutes} {contentLanguage === 'en' ? 'min' : 'mnt'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {accessible && <ChevronRight size={20} color={completed ? ExploreColors.success[500] : ExploreColors.neutral[400]} />}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          <View className="h-[100px]" />
        </Animated.View>
      </ScrollView>

      {!isSubscribed ? (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-neutral-100">
          <Pressable
            onPress={handleSubscribe}
            disabled={subscribeToPlan.isPending}
            className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ backgroundColor: ExploreColors.primary[500] }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={contentLanguage === 'en' ? 'Start this devotion plan' : 'Mulai rencana renungan ini'}
          >
            <BookOpen size={20} color="#FFFFFF" />
            <Text className="text-base font-bold text-white">
              {subscribeToPlan.isPending
                ? contentLanguage === 'en' ? 'Starting...' : 'Memulai...'
                : contentLanguage === 'en' ? 'Start This Plan' : 'Mulai Rencana Ini'}
            </Text>
          </Pressable>
        </View>
      ) : !isCompleted ? (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-neutral-100">
          <Pressable
            onPress={() => setSelectedDay(currentDay)}
            className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ backgroundColor: ExploreColors.primary[500] }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={contentLanguage === 'en' ? `Continue day ${currentDay}` : `Lanjutkan hari ${currentDay}`}
          >
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            <Text className="text-base font-bold text-white">
              {contentLanguage === 'en' ? `Continue Day ${currentDay}` : `Lanjutkan Hari ${currentDay}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ============================================================================
// DAY CONTENT VIEW (Individual day within a plan)
// ============================================================================

interface DayContentViewProps {
  plan: DevotionPlan;
  day: DevotionPlanDay;
  dayNumber: number;
  totalDays: number;
  isCompleted: boolean;
  onBack: () => void;
  onComplete: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  contentLanguage: Language;
  isPending: boolean;
}

function DayContentView({
  plan,
  day,
  dayNumber,
  totalDays,
  isCompleted,
  onBack,
  onComplete,
  onPrevDay,
  onNextDay,
  contentLanguage,
  isPending,
}: DayContentViewProps) {
  const title = day.title[contentLanguage] || day.title.en;
  const content = day.content[contentLanguage] || day.content.en;
  const prayer = day.prayer?.[contentLanguage] || day.prayer?.en;
  const planTitle = plan.title[contentLanguage] || plan.title.en;

  const verseText = day.main_verse?.text || '';
  const ttsText = [title, verseText, content.substring(0, 500), prayer].filter(Boolean).join('. ');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
        <Pressable
          onPress={onBack}
          className="p-1"
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back to plan overview"
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onPrevDay}
            disabled={dayNumber === 1}
            className={`p-1 ${dayNumber === 1 ? 'opacity-50' : ''}`}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Previous day"
          >
            <ChevronLeft size={20} color={dayNumber === 1 ? ExploreColors.neutral[300] : ExploreColors.neutral[700]} />
          </Pressable>
          <Text className="text-base font-semibold" style={{ color: ExploreColors.neutral[700] }}>
            {contentLanguage === 'en' ? 'Day' : 'Hari'} {dayNumber}/{totalDays}
          </Text>
          <Pressable
            onPress={onNextDay}
            disabled={dayNumber === totalDays}
            className={`p-1 ${dayNumber === totalDays ? 'opacity-50' : ''}`}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <ChevronRight size={20} color={dayNumber === totalDays ? ExploreColors.neutral[300] : ExploreColors.neutral[700]} />
          </Pressable>
        </View>

        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {day.image_url && (
          <Animated.View entering={FadeIn.duration(400)}>
            <View className="relative w-full">
              <Image source={{ uri: day.image_url }} className="w-full h-[200px]" resizeMode="cover" />
              {ttsText && plan.id && (
                <View className="absolute bottom-3 right-3">
                  <AudioPlayButton
                    text={ttsText}
                    variant="icon"
                    size={56}
                    color="#FFFFFF"
                    backgroundColor="rgba(0, 0, 0, 0.6)"
                    cacheConfig={{ contentType: 'devotion', contentId: `${plan.id}_day${dayNumber}` }}
                    autoPreload
                  />
                </View>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(200)} className="px-5 pt-6">
          <Text className="text-[13px] font-semibold uppercase mb-1" style={{ color: ExploreColors.primary[600] }}>{planTitle}</Text>
          {/* Title with Audio Button */}
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-[26px] font-bold flex-1 mr-3" style={{ color: ExploreColors.neutral[900], lineHeight: 34, letterSpacing: -0.3 }}>{title}</Text>
            {ttsText && plan.id && (
              <AudioPlayButton
                text={ttsText}
                variant="icon"
                size={44}
                color={ExploreColors.primary[500]}
                backgroundColor={ExploreColors.primary[50]}
                cacheConfig={{ contentType: 'devotion', contentId: `${plan.id}_day${dayNumber}` }}
                autoPreload
              />
            )}
          </View>

          {day.reading_time_minutes && (
            <View className="flex-row items-center gap-1.5 mb-4">
              <Clock size={14} color={ExploreColors.neutral[500]} />
              <Text className="text-[13px]" style={{ color: ExploreColors.neutral[500] }}>
                {day.reading_time_minutes} {contentLanguage === 'en' ? 'min read' : 'menit baca'}
              </Text>
            </View>
          )}

          {day.main_verse && (
            <View className="flex-row rounded-xl p-4 mb-6" style={{ backgroundColor: ExploreColors.spiritual[50] }}>
              <View className="w-1 rounded-full mr-3" style={{ backgroundColor: ExploreColors.spiritual[500] }} />
              <View className="flex-1">
                <Text className="text-lg font-semibold italic mb-2" style={{ color: ExploreColors.neutral[900], lineHeight: 28 }}>
                  "{day.main_verse.text || ''}"
                </Text>
                <Text className="text-base font-semibold" style={{ color: ExploreColors.spiritual[700] }}>
                  {formatBibleReference(day.main_verse, contentLanguage)}
                </Text>
              </View>
            </View>
          )}

          <MarkdownText style={{ fontSize: 16, color: ExploreColors.neutral[800], lineHeight: 28, marginBottom: 24 }}>
            {content}
          </MarkdownText>

          {day.additional_verses && day.additional_verses.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
                {contentLanguage === 'en' ? 'Related Verses' : 'Ayat Terkait'}
              </Text>
              {day.additional_verses.map((verse, index) => (
                <View key={index} className="rounded-xl p-3 mb-2" style={{ backgroundColor: ExploreColors.neutral[50] }}>
                  <Text className="text-base italic mb-1" style={{ color: ExploreColors.neutral[800] }}>"{verse.text || ''}"</Text>
                  <Text className="text-[13px] font-semibold" style={{ color: ExploreColors.neutral[600] }}>
                    {formatBibleReference(verse, contentLanguage)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {day.reflection_questions && day.reflection_questions.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
                {contentLanguage === 'en' ? 'Reflection Questions' : 'Pertanyaan Refleksi'}
              </Text>
              {day.reflection_questions.map((q, index) => {
                const question = q[contentLanguage] || q.en;
                return (
                  <View key={index} className="flex-row gap-2 mb-2">
                    <Text
                      className="w-6 h-6 rounded-full text-center text-[13px] font-bold"
                      style={{ backgroundColor: ExploreColors.primary[100], color: ExploreColors.primary[700], lineHeight: 24 }}
                    >
                      {index + 1}
                    </Text>
                    <Text className="flex-1 text-base" style={{ color: ExploreColors.neutral[700], lineHeight: 24 }}>{question}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {prayer && (
            <View className="mb-6">
              <Text className="text-lg font-semibold mb-3" style={{ color: ExploreColors.neutral[900], lineHeight: 24 }}>
                {contentLanguage === 'en' ? 'Closing Prayer' : 'Doa Penutup'}
              </Text>
              <View className="rounded-xl p-4" style={{ backgroundColor: ExploreColors.spiritual[50] }}>
                <Text className="text-base italic" style={{ color: ExploreColors.neutral[800], lineHeight: 26 }}>{prayer}</Text>
              </View>
            </View>
          )}

          {/* Ask Faith Assistant about this day's content */}
          <View className="mb-6">
            <QuickAskInput
              context="devotion_reflection"
              contentId={plan.id}
              contextData={{
                devotionId: plan.id,
                devotionTitle: `${planTitle} - Day ${dayNumber}`,
                verseReference: day.main_verse
                  ? `${day.main_verse.book} ${day.main_verse.chapter}:${day.main_verse.verse_start}`
                  : undefined,
                verseText: day.main_verse?.text || undefined,
              }}
              title={contentLanguage === 'en' ? 'Questions about today\'s reading?' : 'Pertanyaan tentang bacaan hari ini?'}
              language={contentLanguage}
            />
          </View>

          <View className="h-[120px]" />
        </Animated.View>
      </ScrollView>

      {!isCompleted && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-neutral-100">
          <Pressable
            onPress={onComplete}
            disabled={isPending}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl ${isPending ? 'opacity-60' : ''}`}
            style={{ backgroundColor: ExploreColors.success[500] }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={contentLanguage === 'en' ? 'Mark day as complete' : 'Tandai hari selesai'}
          >
            <Check size={20} color="#FFFFFF" />
            <Text className="text-base font-bold text-white">
              {isPending
                ? contentLanguage === 'en' ? 'Completing...' : 'Menyelesaikan...'
                : contentLanguage === 'en' ? 'Mark Day as Complete' : 'Tandai Hari Selesai'}
            </Text>
          </Pressable>
        </View>
      )}

      {isCompleted && (
        <View className="absolute bottom-5 left-0 right-0 items-center">
          <View className="flex-row items-center gap-1 px-4 py-2 rounded-3xl" style={{ backgroundColor: ExploreColors.success[50] }}>
            <CheckCircle2 size={16} color={ExploreColors.success[600]} />
            <Text className="text-base font-semibold" style={{ color: ExploreColors.success[700] }}>
              {contentLanguage === 'en' ? 'Day Completed' : 'Hari Selesai'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
