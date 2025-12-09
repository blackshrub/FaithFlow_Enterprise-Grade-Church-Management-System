/**
 * Bible Studies Browser Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for ExploreColors and shadows
 * - React Native Reanimated for animations
 *
 * Design: Browsable library of in-depth studies
 * - Categories filter (topics, books, difficulty)
 * - Study cards with progress indicators
 * - Search functionality
 * - Sort options (newest, popular, alphabetical)
 */

import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExploreColors } from '@/constants/explore/designSystem';
import { useBibleStudies, useStudyProgress } from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleStudy } from '@/types/explore';
import {
  ArrowLeft,
  Search,
  Filter,
  BookOpen,
  Clock,
  CheckCircle2,
  Play,
  X,
} from 'lucide-react-native';
import { EmptyState } from '@/components/explore/EmptyState';
import { BibleStudyListSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Animated Image for shared element transitions (Reanimated 4+)
const AnimatedImage = Animated.createAnimatedComponent(Image);

type SortOption = 'newest' | 'popular' | 'alphabetical';
type FilterCategory = 'all' | 'old_testament' | 'new_testament' | 'topical';

export default function BibleStudiesBrowserScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data queries
  const { data: studies, isLoading } = useBibleStudies();
  const { data: progressData } = useStudyProgress();

  // Filter and sort studies
  const filteredStudies = studies?.filter((study) => {
    const title = study.title[contentLanguage] || study.title.en;
    const description = study.description?.[contentLanguage] || study.description?.en;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      title.toLowerCase().includes(searchLower) ||
      description?.toLowerCase().includes(searchLower);

    const matchesCategory =
      filterCategory === 'all' || study.category === filterCategory;

    return matchesSearch && matchesCategory;
  }) || [];

  // Sort studies
  const sortedStudies = [...filteredStudies].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'alphabetical') {
      const titleA = a.title[contentLanguage] || a.title.en;
      const titleB = b.title[contentLanguage] || b.title.en;
      return titleA.localeCompare(titleB);
    } else if (sortBy === 'popular') {
      return (b.completion_count || 0) - (a.completion_count || 0);
    }
    return 0;
  });

  const handleStudyPress = (studyId: string) => {
    router.push(`/explore/studies/${studyId}`);
  };

  const getStudyProgress = (studyId: string) => {
    const progress = (progressData as Record<string, { current_lesson: number; total_lessons: number } | undefined>)?.[studyId];
    if (!progress) return 0;
    return Math.round((progress.current_lesson / progress.total_lessons) * 100);
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/explore');
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center px-4 py-3 border-b"
          style={{ borderBottomColor: ExploreColors.neutral[100] }}
        >
          <Pressable
            onPress={handleGoBack}
            className="w-10 h-10 rounded-full items-center justify-center active:bg-neutral-100"
          >
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text
            className="flex-1 text-lg font-bold text-center mr-10"
            style={{ color: ExploreColors.neutral[900] }}
          >
            {t('explore.bibleStudies', 'Bible Studies')}
          </Text>
        </View>
        <ScrollView contentContainerClassName="p-5">
          <BibleStudyListSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderBottomColor: ExploreColors.neutral[100] }}
      >
        <Pressable
          onPress={handleGoBack}
          className="w-10 h-10 rounded-full items-center justify-center active:bg-neutral-100"
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text
          className="text-lg font-bold"
          style={{ color: ExploreColors.neutral[900] }}
        >
          {t('explore.bibleStudies', 'Bible Studies')}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(!showFilters);
          }}
          className="w-10 h-10 rounded-full items-center justify-center active:bg-neutral-100"
          style={{
            backgroundColor: showFilters ? `${ExploreColors.primary[500]}15` : 'transparent',
          }}
        >
          <Filter size={20} color={showFilters ? ExploreColors.primary[600] : ExploreColors.neutral[600]} />
        </Pressable>
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View className="px-5 pt-4 pb-3">
          <View
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: ExploreColors.neutral[100] }}
          >
            <Search size={20} color={ExploreColors.neutral[400]} />
            <TextInput
              className="flex-1 text-base"
              style={{ color: ExploreColors.neutral[900] }}
              placeholder={t('explore.searchStudies', 'Search studies...')}
              placeholderTextColor={ExploreColors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={ExploreColors.neutral[400]} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            className="mx-5 mb-4 rounded-2xl p-4"
            style={{
              backgroundColor: ExploreColors.neutral[50],
              borderWidth: 1,
              borderColor: ExploreColors.neutral[200],
            }}
          >
            {/* Category Filter */}
            <View className="mb-4">
              <Text
                className="text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: ExploreColors.neutral[500] }}
              >
                {t('explore.category', 'Category')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 'all', label: t('explore.all', 'All') },
                  { value: 'old_testament', label: t('explore.oldTestament', 'Old Testament') },
                  { value: 'new_testament', label: t('explore.newTestament', 'New Testament') },
                  { value: 'topical', label: t('explore.topicalCategory', 'Topical') },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFilterCategory(option.value as FilterCategory);
                    }}
                    className="px-4 py-2 rounded-full active:scale-95"
                    style={{
                      backgroundColor: filterCategory === option.value
                        ? ExploreColors.primary[500]
                        : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: filterCategory === option.value
                        ? ExploreColors.primary[500]
                        : ExploreColors.neutral[200],
                    }}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{
                        color: filterCategory === option.value
                          ? '#FFFFFF'
                          : ExploreColors.neutral[700],
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View>
              <Text
                className="text-xs font-bold uppercase tracking-wide mb-2"
                style={{ color: ExploreColors.neutral[500] }}
              >
                {t('explore.sortBy', 'Sort By')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 'newest', label: t('explore.newest', 'Newest') },
                  { value: 'popular', label: t('explore.popular', 'Popular') },
                  { value: 'alphabetical', label: 'A-Z' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSortBy(option.value as SortOption);
                    }}
                    className="px-4 py-2 rounded-full active:scale-95"
                    style={{
                      backgroundColor: sortBy === option.value
                        ? ExploreColors.primary[500]
                        : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: sortBy === option.value
                        ? ExploreColors.primary[500]
                        : ExploreColors.neutral[200],
                    }}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      style={{
                        color: sortBy === option.value
                          ? '#FFFFFF'
                          : ExploreColors.neutral[700],
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Results Count */}
        <Text
          className="text-sm px-5 mt-3 mb-2"
          style={{ color: ExploreColors.neutral[600] }}
        >
          {sortedStudies.length}{' '}
          {sortedStudies.length === 1 ? t('explore.studyFound') : t('explore.studiesFound')}
        </Text>

        {/* Studies List */}
        {sortedStudies.length === 0 ? (
          <EmptyState
            type="no_results"
            message={t('explore.noStudiesMatch')}
          />
        ) : (
          <View className="px-5 gap-4">
            {sortedStudies.map((study, index) => (
              <StudyCard
                key={study.id}
                study={study}
                progress={getStudyProgress(study.id)}
                onPress={() => handleStudyPress(study.id)}
                contentLanguage={contentLanguage}
                index={index}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface StudyCardProps {
  study: BibleStudy;
  progress: number;
  onPress: () => void;
  contentLanguage: string;
  index: number;
}

function StudyCard({ study, progress, onPress, contentLanguage, index }: StudyCardProps) {
  const { t } = useTranslation();
  const title = study.title[contentLanguage] || study.title.en;
  const subtitle = study.subtitle?.[contentLanguage] || study.subtitle?.en;
  const isCompleted = progress === 100;
  const lessonCount = study.lesson_count || study.lessons?.length || 0;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      {/* Shadow container - needs solid background to cast proper shadow */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <Pressable
          onPress={onPress}
          className="overflow-hidden active:scale-[0.98] active:opacity-95"
          style={{ borderRadius: 16 }}
        >
          {/* Cover Image with shared element transition */}
          <View className="h-[160px] relative">
          {study.cover_image_url ? (
            <>
              {/* Background Image */}
              <AnimatedImage
                source={{ uri: study.cover_image_url }}
                className="absolute inset-0 w-full h-full"
                resizeMode="cover"
              />
              {/* Gradient overlay - absolute to cover entire image */}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
                locations={[0, 0.4, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />

              {/* Content - sits on top of gradient */}
              <View className="flex-1 justify-end p-3">
                <View className="flex-row gap-3">
                  <View className="flex-row items-center gap-1">
                    <BookOpen size={14} color="#fff" />
                    <Text className="text-white text-xs font-semibold">
                      {lessonCount} {t('explore.lessons')}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Clock size={14} color="#fff" />
                    <Text className="text-white text-xs font-semibold">
                      {study.estimated_duration_minutes} {t('explore.min')}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View
              className="flex-1 items-center justify-center"
              style={{ backgroundColor: ExploreColors.primary[100] }}
            >
              <BookOpen size={40} color={ExploreColors.primary[300]} />
            </View>
          )}

          {/* Completed Overlay */}
          {isCompleted && (
            <View
              className="absolute inset-0 items-center justify-center gap-2"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.85)' }}
            >
              <CheckCircle2 size={32} color="#fff" />
              <Text className="text-white text-sm font-bold">
                {t('explore.completed')}
              </Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View className="p-3 gap-1.5">
          <Animated.Text
            className="text-[17px] font-bold leading-[22px]"
            style={{ color: ExploreColors.neutral[900] }}
            numberOfLines={2}
          >
            {title}
          </Animated.Text>
          {subtitle && (
            <Text
              className="text-[13px] font-medium"
              style={{ color: ExploreColors.neutral[600] }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}

          {/* Progress Bar (if started but not completed) */}
          {progress > 0 && !isCompleted && (
            <View className="mt-2 gap-1">
              <View
                className="h-1.5 rounded overflow-hidden"
                style={{ backgroundColor: ExploreColors.neutral[200] }}
              >
                <View
                  className="h-full rounded"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: ExploreColors.primary[500],
                  }}
                />
              </View>
              <Text
                className="text-[11px] font-medium"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {progress}% {t('explore.complete')}
              </Text>
            </View>
          )}

          {/* Start/Continue Button */}
          <View className="mt-2.5">
            <View
              className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px]"
              style={{
                backgroundColor: isCompleted
                  ? ExploreColors.success[50]
                  : progress > 0
                  ? ExploreColors.secondary[500]
                  : ExploreColors.primary[500],
                borderWidth: isCompleted ? 1 : 0,
                borderColor: ExploreColors.success[200],
              }}
            >
              <Play
                size={16}
                color={isCompleted ? ExploreColors.success[600] : '#fff'}
                fill={isCompleted ? ExploreColors.success[600] : '#fff'}
              />
              <Text
                className="text-sm font-semibold"
                style={{
                  color: isCompleted ? ExploreColors.success[700] : '#FFFFFF',
                }}
              >
                {isCompleted
                  ? t('explore.review')
                  : progress > 0
                    ? t('explore.continue')
                    : t('explore.startCourse')}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      </View>
    </Animated.View>
  );
}
