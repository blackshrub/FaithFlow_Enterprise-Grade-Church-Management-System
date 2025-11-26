/**
 * Devotion Detail Screen
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
  ImageBackground,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExploreColors,
  ExploreTypography,
  ExploreSpacing,
} from '@/constants/explore/designSystem';
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import {
  useDevotionPlan,
  useDailyDevotion,
  useSinglePlanProgress,
  useSubscribeToPlan,
  useCompletePlanDay,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DevotionPlan, DevotionPlanDay, DailyDevotion } from '@/types/explore';
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
  User,
} from 'lucide-react-native';
import { Share } from 'react-native';
import { DailyDevotionSkeleton } from '@/components/explore/LoadingSkeleton';
import { MarkdownText } from '@/components/explore/MarkdownText';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DevotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // Try to fetch as daily devotion (dev_xxx) or devotion plan (plan_xxx)
  const { data: dailyDevotion, isLoading: isDailyLoading } = useDailyDevotion(id as string);
  const { data: plan, isLoading: isPlanLoading } = useDevotionPlan(id as string);

  const isLoading = isDailyLoading && isPlanLoading;

  // Determine which type of content we have
  const isDailyDevotion = !!dailyDevotion && !plan;
  const isDevotionPlan = !!plan && !dailyDevotion;

  // If we have a single daily devotion, show that view
  if (dailyDevotion && !plan) {
    return (
      <DailyDevotionView
        devotion={dailyDevotion}
        contentLanguage={contentLanguage}
        onBack={() => router.back()}
      />
    );
  }

  // If we have a devotion plan, show the plan view
  if (plan) {
    return (
      <DevotionPlanView
        plan={plan}
        contentLanguage={contentLanguage}
        onBack={() => router.back()}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <DailyDevotionSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // No content found
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
      </View>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {contentLanguage === 'en' ? 'Content not found' : 'Konten tidak ditemukan'}
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
  contentLanguage: string;
  onBack: () => void;
}

function DailyDevotionView({ devotion, contentLanguage, onBack }: DailyDevotionViewProps) {
  const title = devotion.title[contentLanguage] || devotion.title.en;
  const content = devotion.content[contentLanguage] || devotion.content.en;
  const summary = devotion.summary?.[contentLanguage] || devotion.summary?.en;
  const author = devotion.author?.[contentLanguage] || devotion.author?.en;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `📖 ${title}\n\n${summary || ''}\n\nShared from FaithFlow`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Go back' : 'Kembali'}
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Share' : 'Bagikan'}
        >
          <Share2 size={24} color={ExploreColors.neutral[600]} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {devotion.image_url && (
          <Animated.View entering={FadeIn.duration(400)}>
            <ImageBackground
              source={{ uri: devotion.image_url }}
              style={styles.heroImage}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.heroGradient}
              >
                {/* Reading Time Badge */}
                {devotion.reading_time_minutes && (
                  <View style={styles.heroBadge}>
                    <Clock size={14} color="#FFFFFF" />
                    <Text style={styles.heroBadgeText}>
                      {devotion.reading_time_minutes} {contentLanguage === 'en' ? 'min read' : 'menit baca'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </ImageBackground>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.contentContainer}
        >
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Author */}
          {author && (
            <View style={styles.authorRow}>
              <User size={16} color={ExploreColors.neutral[500]} />
              <Text style={styles.authorText}>{author}</Text>
            </View>
          )}

          {/* Main Verse */}
          {devotion.main_verse && (
            <View style={styles.verseContainer}>
              <View style={styles.verseAccent} />
              <View style={styles.verseContent}>
                <Text style={styles.verseText}>
                  "{devotion.main_verse.text || ''}"
                </Text>
                <Text style={styles.verseReference}>
                  {formatBibleReference(devotion.main_verse, contentLanguage)}
                </Text>
              </View>
            </View>
          )}

          {/* Main Content */}
          <MarkdownText style={styles.dayContent}>{content}</MarkdownText>

          {/* Additional Verses */}
          {devotion.additional_verses && devotion.additional_verses.length > 0 && (
            <View style={styles.additionalVersesSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Related Verses' : 'Ayat Terkait'}
              </Text>
              {devotion.additional_verses.map((verse, index) => (
                <View key={index} style={styles.additionalVerse}>
                  <Text style={styles.additionalVerseText}>
                    "{verse.text || ''}"
                  </Text>
                  <Text style={styles.additionalVerseReference}>
                    {formatBibleReference(verse, contentLanguage)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          {devotion.tags && devotion.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {devotion.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
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
  contentLanguage: string;
  onBack: () => void;
}

function DevotionPlanView({ plan, contentLanguage, onBack }: DevotionPlanViewProps) {
  const router = useRouter();

  // State for current view
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Data queries
  const { data: progress } = useSinglePlanProgress(plan.id);

  // Mutations
  const subscribeToPlan = useSubscribeToPlan();
  const completePlanDay = useCompletePlanDay();

  // Set initial day when plan loads
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
    await completePlanDay.mutateAsync({
      planId: plan.id,
      dayNumber: selectedDay,
    });

    if (selectedDay < plan.duration_days) {
      setTimeout(() => setSelectedDay(selectedDay + 1), 500);
    }
  };

  const handleShare = async () => {
    const title = plan.title[contentLanguage] || plan.title.en;
    const description = plan.description?.[contentLanguage] || plan.description?.en || '';

    try {
      await Share.share({
        message: `📖 ${title}\n\n${description}\n\n${plan.duration_days} ${
          contentLanguage === 'en' ? 'day devotion plan' : 'hari rencana renungan'
        }\n\nShared from FaithFlow`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const isDayCompleted = useCallback(
    (dayNum: number) => completedDays.includes(dayNum),
    [completedDays]
  );

  const isDayAccessible = useCallback(
    (dayNum: number) => {
      if (!isSubscribed) return false;
      return dayNum <= currentDay || dayNum === 1;
    },
    [isSubscribed, currentDay]
  );

  const title = plan.title[contentLanguage] || plan.title.en;
  const subtitle = plan.subtitle?.[contentLanguage] || plan.subtitle?.en;
  const description = plan.description?.[contentLanguage] || plan.description?.en || '';
  const introduction = plan.introduction?.[contentLanguage] || plan.introduction?.en;

  // If a day is selected, show day content
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
          onNextDay={() =>
            selectedDay < plan.duration_days &&
            isDayAccessible(selectedDay + 1) &&
            setSelectedDay(selectedDay + 1)
          }
          contentLanguage={contentLanguage}
          isPending={completePlanDay.isPending}
        />
      );
    }
  }

  // Plan overview screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Go back' : 'Kembali'}
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Share this plan' : 'Bagikan rencana ini'}
        >
          <Share2 size={24} color={ExploreColors.neutral[600]} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Animated.View entering={FadeIn.duration(400)}>
          <ImageBackground
            source={{
              uri: plan.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
            }}
            style={styles.heroImage}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.heroGradient}
            >
              {/* Duration Badge */}
              <View style={styles.heroBadge}>
                <Calendar size={16} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>
                  {plan.duration_days} {contentLanguage === 'en' ? 'Days' : 'Hari'}
                </Text>
              </View>

              {/* Completed Badge */}
              {isCompleted && (
                <View style={styles.heroCompletedBadge}>
                  <CheckCircle2 size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.heroCompletedText}>
                    {contentLanguage === 'en' ? 'Completed' : 'Selesai'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </ImageBackground>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.contentContainer}
        >
          {/* Title & Subtitle */}
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Introduction */}
          {introduction && (
            <View style={styles.introSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Introduction' : 'Pendahuluan'}
              </Text>
              <Text style={styles.introText}>{introduction}</Text>
            </View>
          )}

          {/* Progress Section (if subscribed) */}
          {isSubscribed && !isCompleted && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {contentLanguage === 'en'
                    ? `Day ${currentDay} of ${plan.duration_days}`
                    : `Hari ${currentDay} dari ${plan.duration_days}`}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round((completedDays.length / plan.duration_days) * 100)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(completedDays.length / plan.duration_days) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Day Selector */}
          <View style={styles.daySelector}>
            <Text style={styles.sectionTitle}>
              {contentLanguage === 'en' ? 'Daily Devotions' : 'Renungan Harian'}
            </Text>

            <View style={styles.daysGrid}>
              {plan.plan_days?.map((day, index) => {
                const dayNum = day.day_number;
                const completed = isDayCompleted(dayNum);
                const accessible = isDayAccessible(dayNum);
                const isCurrent = dayNum === currentDay;

                return (
                  <Animated.View
                    key={dayNum}
                    entering={FadeInRight.duration(300).delay(index * 50)}
                  >
                    <Pressable
                      onPress={() => {
                        if (accessible) {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedDay(dayNum);
                        }
                      }}
                      style={[
                        styles.dayCard,
                        completed && styles.dayCardCompleted,
                        isCurrent && !completed && styles.dayCardCurrent,
                        !accessible && styles.dayCardLocked,
                      ]}
                    >
                      {/* Day Number */}
                      <View
                        style={[
                          styles.dayNumber,
                          completed && styles.dayNumberCompleted,
                          isCurrent && !completed && styles.dayNumberCurrent,
                        ]}
                      >
                        {completed ? (
                          <Check size={16} color="#FFFFFF" />
                        ) : !accessible ? (
                          <Lock size={14} color={ExploreColors.neutral[400]} />
                        ) : (
                          <Text
                            style={[
                              styles.dayNumberText,
                              isCurrent && styles.dayNumberTextCurrent,
                            ]}
                          >
                            {dayNum}
                          </Text>
                        )}
                      </View>

                      {/* Day Title */}
                      <View style={styles.dayInfo}>
                        <Text
                          style={[
                            styles.dayLabel,
                            !accessible && styles.dayLabelLocked,
                          ]}
                        >
                          {contentLanguage === 'en' ? 'Day' : 'Hari'} {dayNum}
                        </Text>
                        <Text
                          style={[
                            styles.dayTitle,
                            !accessible && styles.dayTitleLocked,
                          ]}
                          numberOfLines={2}
                        >
                          {day.title[contentLanguage] || day.title.en}
                        </Text>
                        {day.reading_time_minutes && (
                          <View style={styles.dayMeta}>
                            <Clock
                              size={12}
                              color={
                                accessible
                                  ? ExploreColors.neutral[500]
                                  : ExploreColors.neutral[300]
                              }
                            />
                            <Text
                              style={[
                                styles.dayMetaText,
                                !accessible && styles.dayMetaTextLocked,
                              ]}
                            >
                              {day.reading_time_minutes} {contentLanguage === 'en' ? 'min' : 'mnt'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Arrow */}
                      {accessible && (
                        <ChevronRight
                          size={20}
                          color={
                            completed
                              ? ExploreColors.success[500]
                              : ExploreColors.neutral[400]
                          }
                        />
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Subscribe/Continue Button */}
      {!isSubscribed ? (
        <View style={styles.bottomContainer}>
          <Pressable
            onPress={handleSubscribe}
            style={styles.subscribeButton}
            disabled={subscribeToPlan.isPending}
          >
            <BookOpen size={20} color="#FFFFFF" />
            <Text style={styles.subscribeButtonText}>
              {subscribeToPlan.isPending
                ? contentLanguage === 'en'
                  ? 'Starting...'
                  : 'Memulai...'
                : contentLanguage === 'en'
                ? 'Start This Plan'
                : 'Mulai Rencana Ini'}
            </Text>
          </Pressable>
        </View>
      ) : !isCompleted ? (
        <View style={styles.bottomContainer}>
          <Pressable
            onPress={() => setSelectedDay(currentDay)}
            style={styles.continueButton}
          >
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.continueButtonText}>
              {contentLanguage === 'en'
                ? `Continue Day ${currentDay}`
                : `Lanjutkan Hari ${currentDay}`}
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
  contentLanguage: string;
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Back to plan' : 'Kembali ke rencana'}
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        {/* Day Navigation */}
        <View style={styles.dayNav}>
          <Pressable
            onPress={onPrevDay}
            disabled={dayNumber === 1}
            style={[
              styles.dayNavButton,
              dayNumber === 1 && styles.dayNavButtonDisabled,
            ]}
          >
            <ChevronLeft
              size={20}
              color={dayNumber === 1 ? ExploreColors.neutral[300] : ExploreColors.neutral[700]}
            />
          </Pressable>

          <Text style={styles.dayNavText}>
            {contentLanguage === 'en' ? 'Day' : 'Hari'} {dayNumber}/{totalDays}
          </Text>

          <Pressable
            onPress={onNextDay}
            disabled={dayNumber === totalDays}
            style={[
              styles.dayNavButton,
              dayNumber === totalDays && styles.dayNavButtonDisabled,
            ]}
          >
            <ChevronRight
              size={20}
              color={dayNumber === totalDays ? ExploreColors.neutral[300] : ExploreColors.neutral[700]}
            />
          </Pressable>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Day Image */}
        {day.image_url && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Image
              source={{ uri: day.image_url }}
              style={styles.dayImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.contentContainer}
        >
          {/* Plan Title */}
          <Text style={styles.planTitleSmall}>{planTitle}</Text>

          {/* Day Title */}
          <Text style={styles.dayContentTitle}>{title}</Text>

          {/* Reading Time */}
          {day.reading_time_minutes && (
            <View style={styles.readingTimeRow}>
              <Clock size={14} color={ExploreColors.neutral[500]} />
              <Text style={styles.readingTimeText}>
                {day.reading_time_minutes} {contentLanguage === 'en' ? 'min read' : 'menit baca'}
              </Text>
            </View>
          )}

          {/* Main Verse */}
          {day.main_verse && (
            <View style={styles.verseContainer}>
              <View style={styles.verseAccent} />
              <View style={styles.verseContent}>
                <Text style={styles.verseText}>"{day.main_verse.text || ''}"</Text>
                <Text style={styles.verseReference}>
                  {formatBibleReference(day.main_verse, contentLanguage)}
                </Text>
              </View>
            </View>
          )}

          {/* Content */}
          <MarkdownText style={styles.dayContent}>{content}</MarkdownText>

          {/* Additional Verses */}
          {day.additional_verses && day.additional_verses.length > 0 && (
            <View style={styles.additionalVersesSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Related Verses' : 'Ayat Terkait'}
              </Text>
              {day.additional_verses.map((verse, index) => (
                <View key={index} style={styles.additionalVerse}>
                  <Text style={styles.additionalVerseText}>"{verse.text || ''}"</Text>
                  <Text style={styles.additionalVerseReference}>
                    {formatBibleReference(verse, contentLanguage)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reflection Questions */}
          {day.reflection_questions && day.reflection_questions.length > 0 && (
            <View style={styles.reflectionSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Reflection Questions' : 'Pertanyaan Refleksi'}
              </Text>
              {day.reflection_questions.map((q, index) => {
                const question = q[contentLanguage] || q.en;
                return (
                  <View key={index} style={styles.reflectionItem}>
                    <Text style={styles.reflectionNumber}>{index + 1}</Text>
                    <Text style={styles.reflectionText}>{question}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Prayer */}
          {prayer && (
            <View style={styles.prayerSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Closing Prayer' : 'Doa Penutup'}
              </Text>
              <View style={styles.prayerContainer}>
                <Text style={styles.prayerText}>{prayer}</Text>
              </View>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* Complete Button */}
      {!isCompleted && (
        <View style={styles.bottomContainer}>
          <Pressable
            onPress={onComplete}
            style={[styles.completeButton, isPending && styles.completeButtonDisabled]}
            disabled={isPending}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>
              {isPending
                ? contentLanguage === 'en'
                  ? 'Completing...'
                  : 'Menyelesaikan...'
                : contentLanguage === 'en'
                ? 'Mark Day as Complete'
                : 'Tandai Hari Selesai'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Completed Badge */}
      {isCompleted && (
        <View style={styles.completedBadgeContainer}>
          <View style={styles.completedBadge}>
            <CheckCircle2 size={16} color={ExploreColors.success[600]} />
            <Text style={styles.completedText}>
              {contentLanguage === 'en' ? 'Day Completed' : 'Hari Selesai'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ExploreColors.neutral[100],
  },
  backButton: {
    padding: ExploreSpacing.xs,
  },
  iconButton: {
    padding: ExploreSpacing.xs,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
  },
  dayNavButton: {
    padding: ExploreSpacing.xs,
  },
  dayNavButtonDisabled: {
    opacity: 0.5,
  },
  dayNavText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ExploreSpacing.xl,
  },
  loadingContainer: {
    padding: ExploreSpacing.screenMargin,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ExploreSpacing.screenMargin,
  },
  errorText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[500],
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  heroGradient: {
    flex: 1,
    padding: ExploreSpacing.md,
    justifyContent: 'flex-end',
  },
  heroBadge: {
    position: 'absolute',
    top: ExploreSpacing.md,
    right: ExploreSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroBadgeText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  heroCompletedBadge: {
    position: 'absolute',
    top: ExploreSpacing.md,
    left: ExploreSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ExploreColors.success[500],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroCompletedText: {
    ...ExploreTypography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
  },
  title: {
    ...ExploreTypography.h1,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.xs,
  },
  subtitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    marginBottom: ExploreSpacing.md,
    fontStyle: 'italic',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ExploreSpacing.lg,
  },
  authorText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    fontWeight: '500',
  },
  description: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 26,
    marginBottom: ExploreSpacing.lg,
  },
  introSection: {
    marginBottom: ExploreSpacing.xl,
  },
  sectionTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  introText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 26,
  },
  progressSection: {
    marginBottom: ExploreSpacing.xl,
    gap: ExploreSpacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
  },
  progressPercent: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[600],
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: ExploreColors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 4,
  },
  daySelector: {
    marginTop: ExploreSpacing.md,
  },
  daysGrid: {
    gap: ExploreSpacing.sm,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 12,
    padding: ExploreSpacing.md,
    gap: ExploreSpacing.md,
  },
  dayCardCompleted: {
    backgroundColor: ExploreColors.success[50],
    borderWidth: 1,
    borderColor: ExploreColors.success[200],
  },
  dayCardCurrent: {
    backgroundColor: ExploreColors.primary[50],
    borderWidth: 2,
    borderColor: ExploreColors.primary[500],
  },
  dayCardLocked: {
    opacity: 0.6,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ExploreColors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberCompleted: {
    backgroundColor: ExploreColors.success[500],
  },
  dayNumberCurrent: {
    backgroundColor: ExploreColors.primary[500],
  },
  dayNumberText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    fontWeight: '700',
  },
  dayNumberTextCurrent: {
    color: '#FFFFFF',
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  dayLabelLocked: {
    color: ExploreColors.neutral[400],
  },
  dayTitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    fontWeight: '600',
    marginTop: 2,
  },
  dayTitleLocked: {
    color: ExploreColors.neutral[500],
  },
  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dayMetaText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
  },
  dayMetaTextLocked: {
    color: ExploreColors.neutral[300],
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: ExploreSpacing.screenMargin,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: ExploreColors.neutral[100],
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  subscribeButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  continueButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  dayImage: {
    width: '100%',
    height: 200,
  },
  planTitleSmall: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[600],
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: ExploreSpacing.xs,
  },
  dayContentTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.sm,
  },
  readingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: ExploreSpacing.lg,
  },
  readingTimeText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
  },
  verseContainer: {
    flexDirection: 'row',
    backgroundColor: ExploreColors.spiritual[50],
    borderRadius: 12,
    padding: ExploreSpacing.lg,
    marginBottom: ExploreSpacing.xl,
  },
  verseAccent: {
    width: 4,
    backgroundColor: ExploreColors.spiritual[500],
    borderRadius: 2,
    marginRight: ExploreSpacing.md,
  },
  verseContent: {
    flex: 1,
  },
  verseText: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    fontStyle: 'italic',
    lineHeight: 28,
    marginBottom: ExploreSpacing.sm,
  },
  verseReference: {
    ...ExploreTypography.body,
    color: ExploreColors.spiritual[700],
    fontWeight: '600',
  },
  dayContent: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    marginBottom: ExploreSpacing.xl,
  },
  additionalVersesSection: {
    marginBottom: ExploreSpacing.xl,
  },
  additionalVerse: {
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 12,
    padding: ExploreSpacing.md,
    marginBottom: ExploreSpacing.sm,
  },
  additionalVerseText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    fontStyle: 'italic',
    marginBottom: ExploreSpacing.xs,
  },
  additionalVerseReference: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontWeight: '600',
  },
  reflectionSection: {
    marginBottom: ExploreSpacing.xl,
  },
  reflectionItem: {
    flexDirection: 'row',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.sm,
  },
  reflectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ExploreColors.primary[100],
    textAlign: 'center',
    lineHeight: 24,
    ...ExploreTypography.caption,
    color: ExploreColors.primary[700],
    fontWeight: '700',
  },
  reflectionText: {
    flex: 1,
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 24,
  },
  prayerSection: {
    marginBottom: ExploreSpacing.xl,
  },
  prayerContainer: {
    backgroundColor: ExploreColors.spiritual[50],
    borderRadius: 12,
    padding: ExploreSpacing.lg,
  },
  prayerText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    fontStyle: 'italic',
    lineHeight: 26,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.success[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  completedBadgeContainer: {
    position: 'absolute',
    bottom: ExploreSpacing.screenMargin,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    backgroundColor: ExploreColors.success[50],
    paddingHorizontal: ExploreSpacing.lg,
    paddingVertical: ExploreSpacing.sm,
    borderRadius: 24,
  },
  completedText: {
    ...ExploreTypography.body,
    color: ExploreColors.success[700],
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: ExploreSpacing.lg,
  },
  tag: {
    backgroundColor: ExploreColors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[700],
    fontWeight: '500',
  },
});
