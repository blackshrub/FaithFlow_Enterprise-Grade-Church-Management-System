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
import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useBibleStudies, useStudyProgress } from '@/hooks/explore/useExploreMock';
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
  Star,
  Users,
  Play,
} from 'lucide-react-native';
import { EmptyState } from '@/components/explore/EmptyState';
import { BibleStudyListSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { data: progressData } = useStudyProgress();

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
    // progressData is an object keyed by study ID, not an array
    const progress = progressData?.[studyId];
    if (!progress) return 0;
    return Math.round((progress.current_lesson / progress.total_lessons) * 100);
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
  const subtitle = study.subtitle?.[contentLanguage] || study.subtitle?.en;
  const description = study.description?.[contentLanguage] || study.description?.en;
  const author = study.author?.[contentLanguage] || study.author?.en;
  const isCompleted = progress === 100;
  const lessonCount = study.lesson_count || study.lessons?.length || 0;

  // Difficulty badge color
  const difficultyColors = {
    beginner: { bg: '#10B981', text: '#fff' },
    intermediate: { bg: '#F59E0B', text: '#fff' },
    advanced: { bg: '#EF4444', text: '#fff' },
  };
  const difficultyStyle = difficultyColors[study.difficulty] || difficultyColors.beginner;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.courseCard,
          pressed && styles.courseCardPressed,
        ]}
      >
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          {study.cover_image_url ? (
            <ImageBackground
              source={{ uri: study.cover_image_url }}
              style={styles.coverImage}
              imageStyle={styles.coverImageStyle}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.coverGradient}
              >
                {/* Difficulty Badge */}
                <View style={[styles.difficultyBadge, { backgroundColor: difficultyStyle.bg }]}>
                  <Text style={[styles.difficultyText, { color: difficultyStyle.text }]}>
                    {study.difficulty.charAt(0).toUpperCase() + study.difficulty.slice(1)}
                  </Text>
                </View>

                {/* Lessons & Duration on Image */}
                <View style={styles.coverStats}>
                  <View style={styles.coverStatItem}>
                    <BookOpen size={14} color="#fff" />
                    <Text style={styles.coverStatText}>
                      {lessonCount} {contentLanguage === 'en' ? 'lessons' : 'pelajaran'}
                    </Text>
                  </View>
                  <View style={styles.coverStatItem}>
                    <Clock size={14} color="#fff" />
                    <Text style={styles.coverStatText}>
                      {study.estimated_duration_minutes} {contentLanguage === 'en' ? 'min' : 'mnt'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <View style={styles.coverPlaceholder}>
              <BookOpen size={40} color={ExploreColors.primary[300]} />
            </View>
          )}

          {/* Progress/Completed Overlay */}
          {isCompleted && (
            <View style={styles.completedOverlay}>
              <CheckCircle2 size={32} color="#fff" />
              <Text style={styles.completedOverlayText}>
                {contentLanguage === 'en' ? 'Completed' : 'Selesai'}
              </Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.courseContent}>
          {/* Title & Subtitle */}
          <Text style={styles.courseTitle} numberOfLines={2}>{title}</Text>
          {subtitle && (
            <Text style={styles.courseSubtitle} numberOfLines={1}>{subtitle}</Text>
          )}

          {/* Author */}
          {author && (
            <Text style={styles.courseAuthor}>
              {contentLanguage === 'en' ? 'By ' : 'Oleh '}{author}
            </Text>
          )}

          {/* Rating & Students */}
          <View style={styles.courseMetaRow}>
            {study.average_rating && (
              <View style={styles.ratingContainer}>
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{study.average_rating.toFixed(1)}</Text>
                {study.ratings_count && (
                  <Text style={styles.ratingCount}>({study.ratings_count})</Text>
                )}
              </View>
            )}
            {study.completion_count && study.completion_count > 0 && (
              <View style={styles.studentsContainer}>
                <Users size={14} color={ExploreColors.neutral[500]} />
                <Text style={styles.studentsText}>
                  {study.completion_count.toLocaleString()} {contentLanguage === 'en' ? 'completed' : 'selesai'}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar (if started but not completed) */}
          {progress > 0 && !isCompleted && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}% {contentLanguage === 'en' ? 'complete' : 'selesai'}</Text>
            </View>
          )}

          {/* Start/Continue Button */}
          <View style={styles.actionRow}>
            <View style={[
              styles.actionButton,
              progress > 0 && !isCompleted && styles.actionButtonContinue,
              isCompleted && styles.actionButtonCompleted,
            ]}>
              <Play size={16} color={isCompleted ? ExploreColors.success[600] : '#fff'} fill={isCompleted ? ExploreColors.success[600] : '#fff'} />
              <Text style={[
                styles.actionButtonText,
                isCompleted && styles.actionButtonTextCompleted,
              ]}>
                {isCompleted
                  ? (contentLanguage === 'en' ? 'Review' : 'Tinjau')
                  : progress > 0
                    ? (contentLanguage === 'en' ? 'Continue' : 'Lanjutkan')
                    : (contentLanguage === 'en' ? 'Start Course' : 'Mulai Kursus')}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ExploreColors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.sm,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: ExploreSpacing.screenMargin,
  },
  searchContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.md,
    paddingBottom: ExploreSpacing.sm,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.neutral[100],
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: ExploreColors.neutral[100],
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
    marginTop: ExploreSpacing.md,
    marginBottom: ExploreSpacing.sm,
  },
  studiesList: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.lg,
  },

  // E-Learning Course Card Styles
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  courseCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  coverImageContainer: {
    height: 160,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  coverGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: ExploreSpacing.md,
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: ExploreColors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coverStats: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
  },
  coverStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coverStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completedOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  courseContent: {
    padding: ExploreSpacing.md,
    gap: 6,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: ExploreColors.neutral[900],
    lineHeight: 22,
  },
  courseSubtitle: {
    fontSize: 13,
    color: ExploreColors.neutral[600],
    fontWeight: '500',
  },
  courseAuthor: {
    fontSize: 12,
    color: ExploreColors.neutral[500],
    marginTop: 2,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
    marginTop: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: ExploreColors.neutral[900],
  },
  ratingCount: {
    fontSize: 12,
    color: ExploreColors.neutral[500],
  },
  studentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  studentsText: {
    fontSize: 12,
    color: ExploreColors.neutral[500],
  },
  progressSection: {
    marginTop: 8,
    gap: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: ExploreColors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: ExploreColors.neutral[600],
    fontWeight: '500',
  },
  actionRow: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonContinue: {
    backgroundColor: ExploreColors.secondary[500],
  },
  actionButtonCompleted: {
    backgroundColor: ExploreColors.success[50],
    borderWidth: 1,
    borderColor: ExploreColors.success[200],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextCompleted: {
    color: ExploreColors.success[700],
  },
});
