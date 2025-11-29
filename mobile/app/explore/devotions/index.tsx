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
  StyleSheet,
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {t('explore.devotionPlans')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <ExploreHomeSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Static, not animated */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t('explore.goBack')}
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t('explore.devotionPlans')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content - Animated */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={ExploreColors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('explore.searchDevotionPlans')}
                placeholderTextColor={ExploreColors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {t('explore.devotionPlansDescription')}
          </Text>

          {/* Results Count */}
          <Text style={styles.resultsCount}>
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
            <View style={styles.plansList}>
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
        style={({ pressed }) => [
          styles.planCard,
          pressed && styles.planCardPressed,
        ]}
      >
        {/* Cover Image with Gradient Overlay */}
        <ImageBackground
          source={{
            uri:
              plan.cover_image_url ||
              'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
          }}
          style={styles.coverImageContainer}
          imageStyle={styles.coverImage}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          >
            {/* Top Right Badges Container */}
            <View style={styles.topRightBadges}>
              {/* Duration Badge */}
              <View style={styles.durationBadge}>
                <Calendar size={14} color="#FFFFFF" />
                <Text style={styles.durationText}>
                  {plan.duration_days} {t('explore.days')}
                </Text>
              </View>

              {/* Completed Badge - Under Duration */}
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <CheckCircle2 size={14} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.completedBadgeText}>
                    {t('explore.completed')}
                  </Text>
                </View>
              )}
            </View>

            {/* Title on Image */}
            <View style={styles.imageTextContainer}>
              <Text style={styles.planTitleOnImage} numberOfLines={2}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.planSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Description */}
          <Text style={styles.planDescription} numberOfLines={2}>
            {description}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Rating */}
            {plan.average_rating !== undefined && plan.average_rating > 0 && (
              <View style={styles.statItem}>
                <Star
                  size={14}
                  color={ExploreColors.warning[500]}
                  fill={ExploreColors.warning[500]}
                />
                <Text style={styles.statText}>
                  {plan.average_rating.toFixed(1)}
                </Text>
              </View>
            )}

            {/* Categories */}
            {plan.categories && plan.categories.length > 0 && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>
                  {plan.categories[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar (if subscribed and not completed) */}
          {isSubscribed && !isCompleted && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {t('explore.dayOf', { current: currentDay, total: plan.duration_days })}
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                />
              </View>
            </View>
          )}

          {/* Action Button */}
          <Pressable
            style={[
              styles.actionButton,
              isCompleted && styles.actionButtonCompleted,
            ]}
            onPress={onPress}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {t('explore.review')}
                </Text>
              </>
            ) : isSubscribed ? (
              <>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {t('explore.resume')}
                </Text>
              </>
            ) : (
              <>
                <BookOpen size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
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
  headerTitle: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
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
  searchContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.md,
    paddingBottom: ExploreSpacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.sm,
  },
  searchInput: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[900],
    flex: 1,
  },
  description: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingVertical: ExploreSpacing.md,
    lineHeight: 24,
  },
  resultsCount: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    paddingHorizontal: ExploreSpacing.screenMargin,
    marginBottom: ExploreSpacing.md,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  plansList: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.lg,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  planCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  coverImageContainer: {
    height: 180,
  },
  coverImage: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageGradient: {
    flex: 1,
    padding: ExploreSpacing.md,
    justifyContent: 'space-between',
  },
  topRightBadges: {
    position: 'absolute',
    top: ExploreSpacing.md,
    right: ExploreSpacing.md,
    alignItems: 'flex-end',
    gap: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    ...ExploreTypography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ExploreColors.success[500],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedBadgeText: {
    ...ExploreTypography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  imageTextContainer: {
    marginTop: 'auto',
  },
  planTitleOnImage: {
    ...ExploreTypography.h3,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  planSubtitle: {
    ...ExploreTypography.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardContent: {
    padding: ExploreSpacing.lg,
    gap: ExploreSpacing.md,
  },
  planDescription: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontWeight: '500',
  },
  categoryTag: {
    backgroundColor: ExploreColors.spiritual[50],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    ...ExploreTypography.caption,
    color: ExploreColors.spiritual[700],
    fontWeight: '600',
    fontSize: 11,
  },
  progressSection: {
    gap: ExploreSpacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
  },
  progressPercent: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[600],
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: ExploreColors.neutral[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: ExploreSpacing.sm + 2,
    borderRadius: 12,
  },
  actionButtonCompleted: {
    backgroundColor: ExploreColors.success[500],
  },
  actionButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
