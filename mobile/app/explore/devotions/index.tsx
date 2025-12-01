/**
 * Devotion Plans Library Screen
 *
 * Design: E-learning style course cards for multi-day devotion plans
 * - Beautiful cover images with gradient overlays
 * - Progress tracking and day counts
 * - Subscription status and ratings
 * - Search and filter functionality
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  ImageBackground,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExploreColors,
  ExploreTypography,
  ExploreSpacing,
} from '@/constants/explore/designSystem';
import {
  useDevotionPlans,
  useDevotionPlanProgress,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DevotionPlan } from '@/types/explore';
import {
  ArrowLeft,
  Search,
  Calendar,
  Star,
  Play,
  CheckCircle2,
  BookOpen,
} from 'lucide-react-native';
import { EmptyState } from '@/components/explore/EmptyState';
import { ExploreHomeSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

export default function DevotionPlansLibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation(); // UI language follows global setting
  const contentLanguage = useExploreStore((state) => state.contentLanguage); // Content language is independent
  const [searchQuery, setSearchQuery] = useState('');

  // Data queries
  const { data: plans, isLoading } = useDevotionPlans();
  const { data: progressData } = useDevotionPlanProgress();

  // Filter plans by search
  const filteredPlans =
    plans?.filter((plan) => {
      if (!searchQuery) return true;
      const title = plan.title[contentLanguage] || plan.title.en;
      const description =
        plan.description?.[contentLanguage] || plan.description?.en || '';
      const searchLower = searchQuery.toLowerCase();
      return (
        title.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower)
      );
    }) || [];

  const handlePlanPress = (planId: string) => {
    router.push(`/explore/devotion/${planId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row justify-between items-center"
          style={{
            paddingHorizontal: ExploreSpacing.md,
            paddingVertical: ExploreSpacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: ExploreColors.neutral[100],
          }}
        >
          <Pressable onPress={() => router.back()} style={{ padding: ExploreSpacing.xs }}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text style={{ ...ExploreTypography.h3, color: ExploreColors.neutral[900] }}>
            {t('explore.devotionPlans')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: ExploreSpacing.screenMargin }}>
          <ExploreHomeSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Static, not animated */}
      <View
        className="flex-row justify-between items-center"
        style={{
          paddingHorizontal: ExploreSpacing.md,
          paddingVertical: ExploreSpacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: ExploreColors.neutral[100],
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ padding: ExploreSpacing.xs }}
          accessibilityRole="button"
          accessibilityLabel={t('explore.goBack')}
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text style={{ ...ExploreTypography.h3, color: ExploreColors.neutral[900] }}>
          {t('explore.devotionPlans')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content - Animated */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: ExploreSpacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)}>
          {/* Search Bar */}
          <View
            style={{
              paddingHorizontal: ExploreSpacing.screenMargin,
              paddingTop: ExploreSpacing.md,
              paddingBottom: ExploreSpacing.sm,
            }}
          >
            <View
              className="flex-row items-center"
              style={{
                gap: ExploreSpacing.sm,
                backgroundColor: ExploreColors.neutral[50],
                borderRadius: 12,
                paddingHorizontal: ExploreSpacing.md,
                paddingVertical: ExploreSpacing.sm,
              }}
            >
              <Search size={20} color={ExploreColors.neutral[400]} />
              <TextInput
                className="flex-1"
                style={{ ...ExploreTypography.body, color: ExploreColors.neutral[900] }}
                placeholder={t('explore.searchDevotionPlans')}
                placeholderTextColor={ExploreColors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Description */}
          <Text
            style={{
              ...ExploreTypography.body,
              color: ExploreColors.neutral[700],
              paddingHorizontal: ExploreSpacing.screenMargin,
              paddingVertical: ExploreSpacing.md,
              lineHeight: 24,
            }}
          >
            {t('explore.devotionPlansDescription')}
          </Text>

          {/* Results Count */}
          <Text
            className="uppercase font-semibold"
            style={{
              ...ExploreTypography.caption,
              color: ExploreColors.neutral[600],
              paddingHorizontal: ExploreSpacing.screenMargin,
              marginBottom: ExploreSpacing.md,
            }}
          >
            {filteredPlans.length}{' '}
            {filteredPlans.length === 1 ? t('explore.plan') : t('explore.plans')}
          </Text>

          {/* Plans List */}
          {filteredPlans.length === 0 ? (
            <EmptyState
              type="no_results"
              message={t('explore.noDevotionPlansMatch')}
            />
          ) : (
            <View style={{ paddingHorizontal: ExploreSpacing.screenMargin, gap: ExploreSpacing.lg }}>
              {filteredPlans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  progress={progressData?.[plan.id]}
                  onPress={() => handlePlanPress(plan.id)}
                  contentLanguage={contentLanguage}
                  index={index}
                />
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

interface PlanCardProps {
  plan: DevotionPlan;
  progress?: {
    subscribed: boolean;
    current_day: number;
    completed_days: number[];
    total_days: number;
    completed: boolean;
  };
  onPress: () => void;
  contentLanguage: string;
  index: number;
}

function PlanCard({
  plan,
  progress,
  onPress,
  contentLanguage,
  index,
}: PlanCardProps) {
  const { t } = useTranslation(); // UI language follows global setting
  const title = plan.title[contentLanguage] || plan.title.en; // Content uses contentLanguage
  const subtitle = plan.subtitle?.[contentLanguage] || plan.subtitle?.en;
  const description =
    plan.description?.[contentLanguage] || plan.description?.en || '';

  const isSubscribed = progress?.subscribed ?? false;
  const isCompleted = progress?.completed ?? false;
  const currentDay = progress?.current_day ?? 0;
  const completedDays = progress?.completed_days?.length ?? 0;
  const progressPercent =
    plan.duration_days > 0 ? (completedDays / plan.duration_days) * 100 : 0;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <Pressable
        onPress={onPress}
        className="bg-white overflow-hidden"
        style={({ pressed }) => [
          {
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          },
          pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
        ]}
      >
        {/* Cover Image with Gradient Overlay */}
        <ImageBackground
          source={{
            uri:
              plan.cover_image_url ||
              'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
          }}
          style={{ height: 180 }}
          imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            className="flex-1 justify-between"
            style={{ padding: ExploreSpacing.md }}
          >
            {/* Top Right Badges Container */}
            <View
              className="absolute items-end"
              style={{ top: ExploreSpacing.md, right: ExploreSpacing.md, gap: 6 }}
            >
              {/* Duration Badge */}
              <View
                className="flex-row items-center"
                style={{
                  gap: 4,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  paddingHorizontal: ExploreSpacing.sm,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Calendar size={14} color="#FFFFFF" />
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.caption, color: '#FFFFFF', fontSize: 12 }}
                >
                  {plan.duration_days} {t('explore.days')}
                </Text>
              </View>

              {/* Completed Badge - Under Duration */}
              {isCompleted && (
                <View
                  className="flex-row items-center"
                  style={{
                    gap: 4,
                    backgroundColor: ExploreColors.success[500],
                    paddingHorizontal: ExploreSpacing.sm,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <CheckCircle2 size={14} color="#FFFFFF" fill="#FFFFFF" />
                  <Text
                    className="font-bold"
                    style={{ ...ExploreTypography.caption, color: '#FFFFFF', fontSize: 11 }}
                  >
                    {t('explore.completed')}
                  </Text>
                </View>
              )}
            </View>

            {/* Title on Image */}
            <View className="mt-auto">
              <Text
                numberOfLines={2}
                style={{
                  ...ExploreTypography.h3,
                  color: '#FFFFFF',
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  numberOfLines={1}
                  style={{
                    ...ExploreTypography.body,
                    color: 'rgba(255,255,255,0.9)',
                    marginTop: 4,
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Card Content */}
        <View style={{ padding: ExploreSpacing.lg, gap: ExploreSpacing.md }}>
          {/* Description */}
          <Text
            numberOfLines={2}
            style={{ ...ExploreTypography.body, color: ExploreColors.neutral[700], lineHeight: 22 }}
          >
            {description}
          </Text>

          {/* Stats Row */}
          <View className="flex-row items-center flex-wrap" style={{ gap: ExploreSpacing.md }}>
            {/* Rating */}
            {plan.average_rating !== undefined && plan.average_rating > 0 && (
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Star
                  size={14}
                  color={ExploreColors.warning[500]}
                  fill={ExploreColors.warning[500]}
                />
                <Text
                  className="font-medium"
                  style={{ ...ExploreTypography.caption, color: ExploreColors.neutral[600] }}
                >
                  {plan.average_rating.toFixed(1)}
                </Text>
              </View>
            )}

            {/* Categories */}
            {plan.categories && plan.categories.length > 0 && (
              <View
                style={{
                  backgroundColor: ExploreColors.spiritual[50],
                  paddingHorizontal: ExploreSpacing.sm,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.caption, color: ExploreColors.spiritual[700], fontSize: 11 }}
                >
                  {plan.categories[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar (if subscribed and not completed) */}
          {isSubscribed && !isCompleted && (
            <View style={{ gap: ExploreSpacing.xs }}>
              <View className="flex-row justify-between items-center">
                <Text style={{ ...ExploreTypography.caption, color: ExploreColors.neutral[600] }}>
                  {t('explore.dayOf', { current: currentDay, total: plan.duration_days })}
                </Text>
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.caption, color: ExploreColors.primary[600] }}
                >
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View
                className="overflow-hidden"
                style={{ height: 6, backgroundColor: ExploreColors.neutral[100], borderRadius: 3 }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    backgroundColor: ExploreColors.primary[500],
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            className="flex-row items-center justify-center"
            style={{
              gap: ExploreSpacing.sm,
              backgroundColor: isCompleted ? ExploreColors.success[500] : ExploreColors.primary[500],
              paddingVertical: ExploreSpacing.sm + 2,
              borderRadius: 12,
            }}
            onPress={onPress}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.body, color: '#FFFFFF' }}
                >
                  {t('explore.review')}
                </Text>
              </>
            ) : isSubscribed ? (
              <>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.body, color: '#FFFFFF' }}
                >
                  {t('explore.resume')}
                </Text>
              </>
            ) : (
              <>
                <BookOpen size={18} color="#FFFFFF" />
                <Text
                  className="font-semibold"
                  style={{ ...ExploreTypography.body, color: '#FFFFFF' }}
                >
                  {t('explore.start')}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

