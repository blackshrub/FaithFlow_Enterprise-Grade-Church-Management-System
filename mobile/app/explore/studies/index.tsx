/**
 * Bible Studies Browser Screen
 *
 * Design: Browsable library of in-depth studies
 * - Categories filter (topics, books, difficulty)
 * - Study cards with progress indicators
 * - Search functionality
 * - Sort options (newest, popular, alphabetical)
 */

import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useBibleStudies, useStudyProgress } from '@/hooks/explore/useExplore';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleStudy } from '@/types/explore';
import {
  ArrowLeft,
  Search,
  Filter,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react-native';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { EmptyState } from '@/components/explore/EmptyState';
import { BibleStudyListSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SortOption = 'newest' | 'popular' | 'alphabetical';
type FilterCategory = 'all' | 'old_testament' | 'new_testament' | 'topical';

export default function BibleStudiesBrowserScreen() {
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data queries
  const { data: studies, isLoading } = useBibleStudies();
  const progressData = useStudyProgress();

  // Filter and sort studies
  const filteredStudies = studies?.filter((study) => {
    // Search filter
    const title = study.title[contentLanguage] || study.title.en;
    const description = study.description?.[contentLanguage] || study.description?.en;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      title.toLowerCase().includes(searchLower) ||
      description?.toLowerCase().includes(searchLower);

    // Category filter
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
    const progress = progressData?.find((p) => p.content_id === studyId);
    if (!progress) return 0;
    return Math.round((progress.lessons_completed / progress.total_lessons) * 100);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {contentLanguage === 'en' ? 'Bible Studies' : 'Studi Alkitab'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <BibleStudyListSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {contentLanguage === 'en' ? 'Bible Studies' : 'Studi Alkitab'}
        </Text>
        <Pressable onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <Filter size={20} color={ExploreColors.primary[600]} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={ExploreColors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder={contentLanguage === 'en' ? 'Search studies...' : 'Cari studi...'}
              placeholderTextColor={ExploreColors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filters */}
        {showFilters && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.filtersSection}>
            {/* Category Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>
                {contentLanguage === 'en' ? 'Category' : 'Kategori'}
              </Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'all', label: contentLanguage === 'en' ? 'All' : 'Semua' },
                  { value: 'old_testament', label: contentLanguage === 'en' ? 'Old Testament' : 'Perjanjian Lama' },
                  { value: 'new_testament', label: contentLanguage === 'en' ? 'New Testament' : 'Perjanjian Baru' },
                  { value: 'topical', label: contentLanguage === 'en' ? 'Topical' : 'Topikal' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilterCategory(option.value as FilterCategory)}
                    style={[
                      styles.filterOption,
                      filterCategory === option.value && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterCategory === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>
                {contentLanguage === 'en' ? 'Sort By' : 'Urutkan'}
              </Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'newest', label: contentLanguage === 'en' ? 'Newest' : 'Terbaru' },
                  { value: 'popular', label: contentLanguage === 'en' ? 'Popular' : 'Populer' },
                  { value: 'alphabetical', label: contentLanguage === 'en' ? 'A-Z' : 'A-Z' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setSortBy(option.value as SortOption)}
                    style={[
                      styles.filterOption,
                      sortBy === option.value && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === option.value && styles.filterOptionTextActive,
                      ]}
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
        <Text style={styles.resultsCount}>
          {sortedStudies.length}{' '}
          {contentLanguage === 'en'
            ? sortedStudies.length === 1
              ? 'study found'
              : 'studies found'
            : sortedStudies.length === 1
            ? 'studi ditemukan'
            : 'studi ditemukan'}
        </Text>

        {/* Studies List */}
        {sortedStudies.length === 0 ? (
          <EmptyState
            type="no_results"
            message={
              contentLanguage === 'en'
                ? 'No studies match your search'
                : 'Tidak ada studi yang cocok dengan pencarian Anda'
            }
          />
        ) : (
          <View style={styles.studiesList}>
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
    </SafeAreaView>
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
  const title = study.title[contentLanguage] || study.title.en;
  const description = study.description?.[contentLanguage] || study.description?.en;
  const isCompleted = progress === 100;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <ExploreCard onPress={onPress} style={styles.studyCard}>
        {/* Progress Badge */}
        {progress > 0 && (
          <View style={styles.progressBadge}>
            {isCompleted ? (
              <>
                <CheckCircle2 size={14} color={ExploreColors.success[600]} />
                <Text style={styles.progressBadgeTextCompleted}>
                  {contentLanguage === 'en' ? 'Completed' : 'Selesai'}
                </Text>
              </>
            ) : (
              <Text style={styles.progressBadgeText}>{progress}%</Text>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.studyCardContent}>
          <Text style={styles.studyTitle}>{title}</Text>
          {description && (
            <Text style={styles.studyDescription} numberOfLines={2}>
              {description}
            </Text>
          )}

          {/* Meta Info */}
          <View style={styles.studyMeta}>
            <View style={styles.metaItem}>
              <BookOpen size={14} color={ExploreColors.neutral[600]} />
              <Text style={styles.metaText}>
                {study.lesson_count} {contentLanguage === 'en' ? 'lessons' : 'pelajaran'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Clock size={14} color={ExploreColors.neutral[600]} />
              <Text style={styles.metaText}>
                {study.estimated_duration_minutes}{' '}
                {contentLanguage === 'en' ? 'min' : 'mnt'}
              </Text>
            </View>

            {study.completion_count > 0 && (
              <View style={styles.metaItem}>
                <TrendingUp size={14} color={ExploreColors.neutral[600]} />
                <Text style={styles.metaText}>{study.completion_count}</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {progress > 0 && !isCompleted && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          )}
        </View>
      </ExploreCard>
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
  filterButton: {
    padding: ExploreSpacing.xs,
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
  filtersSection: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingVertical: ExploreSpacing.md,
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 16,
    marginHorizontal: ExploreSpacing.screenMargin,
    marginBottom: ExploreSpacing.md,
  },
  filterGroup: {
    marginBottom: ExploreSpacing.md,
  },
  filterLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: ExploreSpacing.xs,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ExploreSpacing.xs,
  },
  filterOption: {
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ExploreColors.neutral[200],
  },
  filterOptionActive: {
    backgroundColor: ExploreColors.primary[500],
    borderColor: ExploreColors.primary[500],
  },
  filterOptionText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  resultsCount: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    paddingHorizontal: ExploreSpacing.screenMargin,
    marginBottom: ExploreSpacing.md,
  },
  studiesList: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.md,
  },
  studyCard: {
    position: 'relative',
  },
  progressBadge: {
    position: 'absolute',
    top: ExploreSpacing.sm,
    right: ExploreSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    backgroundColor: ExploreColors.primary[50],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  progressBadgeText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[700],
    fontWeight: '700',
    fontSize: 12,
  },
  progressBadgeTextCompleted: {
    ...ExploreTypography.caption,
    color: ExploreColors.success[700],
    fontWeight: '700',
    fontSize: 11,
  },
  studyCardContent: {
    gap: ExploreSpacing.sm,
  },
  studyTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
  },
  studyDescription: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 22,
  },
  studyMeta: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
  },
  progressBarContainer: {
    marginTop: ExploreSpacing.xs,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: ExploreColors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 2,
  },
});
