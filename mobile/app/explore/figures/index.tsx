/**
 * Bible Figures Library Screen
 *
 * Design: Browsable collection of Bible characters
 * - Grid/List view toggle
 * - Search and filter by testament/era
 * - Sort by name or popularity
 * - Visual cards with images
 */

import React, { useState } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useBibleFigures } from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleFigure } from '@/types/explore';
import {
  ArrowLeft,
  Search,
  Grid3x3,
  List,
  Filter,
  User,
} from 'lucide-react-native';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { EmptyState } from '@/components/explore/EmptyState';
import { BibleFigureListSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

type ViewMode = 'grid' | 'list';
type FilterTestament = 'all' | 'old' | 'new';

export default function BibleFiguresLibraryScreen() {
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTestament, setFilterTestament] = useState<FilterTestament>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Data queries
  const { data: figures, isLoading } = useBibleFigures();

  // Filter figures
  const filteredFigures = figures?.filter((figure) => {
    // Search filter
    const name = figure.name[contentLanguage] || figure.name.en;
    const title = figure.title?.[contentLanguage] || figure.title?.en;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchLower) ||
      title?.toLowerCase().includes(searchLower);

    // Testament filter
    const matchesTestament =
      filterTestament === 'all' || figure.testament === filterTestament;

    return matchesSearch && matchesTestament;
  }) || [];

  // Sort alphabetically
  const sortedFigures = [...filteredFigures].sort((a, b) => {
    const nameA = a.name[contentLanguage] || a.name.en;
    const nameB = b.name[contentLanguage] || b.name.en;
    return nameA.localeCompare(nameB);
  });

  const handleFigurePress = (figureId: string) => {
    router.push(`/explore/figure/${figureId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <BibleFigureListSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Static, not animated */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={styles.iconButton}
          >
            {viewMode === 'grid' ? (
              <List size={20} color={ExploreColors.neutral[600]} />
            ) : (
              <Grid3x3 size={20} color={ExploreColors.neutral[600]} />
            )}
          </Pressable>
          <Pressable onPress={() => setShowFilters(!showFilters)} style={styles.iconButton}>
            <Filter size={20} color={ExploreColors.primary[600]} />
          </Pressable>
        </View>
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
              placeholder={contentLanguage === 'en' ? 'Search figures...' : 'Cari tokoh...'}
              placeholderTextColor={ExploreColors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filters */}
        {showFilters && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.filtersSection}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>
                {contentLanguage === 'en' ? 'Testament' : 'Perjanjian'}
              </Text>
              <View style={styles.filterOptions}>
                {[
                  { value: 'all', label: contentLanguage === 'en' ? 'All' : 'Semua' },
                  {
                    value: 'old_testament',
                    label: contentLanguage === 'en' ? 'Old Testament' : 'Perjanjian Lama',
                  },
                  {
                    value: 'new_testament',
                    label: contentLanguage === 'en' ? 'New Testament' : 'Perjanjian Baru',
                  },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilterTestament(option.value as FilterTestament)}
                    style={[
                      styles.filterOption,
                      filterTestament === option.value && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterTestament === option.value && styles.filterOptionTextActive,
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
          {sortedFigures.length}{' '}
          {contentLanguage === 'en'
            ? sortedFigures.length === 1
              ? 'figure found'
              : 'figures found'
            : sortedFigures.length === 1
            ? 'tokoh ditemukan'
            : 'tokoh ditemukan'}
        </Text>

        {/* Figures List */}
        {sortedFigures.length === 0 ? (
          <EmptyState
            type="no_results"
            message={
              contentLanguage === 'en'
                ? 'No figures match your search'
                : 'Tidak ada tokoh yang cocok dengan pencarian Anda'
            }
          />
        ) : viewMode === 'grid' ? (
          <View style={styles.figuresGrid}>
            {sortedFigures.map((figure, index) => (
              <FigureGridCard
                key={figure.id}
                figure={figure}
                onPress={() => handleFigurePress(figure.id)}
                contentLanguage={contentLanguage}
                index={index}
              />
            ))}
          </View>
        ) : (
          <View style={styles.figuresList}>
            {sortedFigures.map((figure, index) => (
              <FigureListCard
                key={figure.id}
                figure={figure}
                onPress={() => handleFigurePress(figure.id)}
                contentLanguage={contentLanguage}
                index={index}
              />
            ))}
          </View>
        )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FigureCardProps {
  figure: BibleFigure;
  onPress: () => void;
  contentLanguage: string;
  index: number;
}

function FigureGridCard({ figure, onPress, contentLanguage, index }: FigureCardProps) {
  const name = figure.name[contentLanguage] || figure.name.en;
  const title = figure.title?.[contentLanguage] || figure.title?.en;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 30)} style={styles.gridCardContainer}>
      <ExploreCard onPress={onPress} style={styles.gridCard}>
        {figure.image_url ? (
          <Image source={{ uri: figure.image_url }} style={styles.gridCardImage} resizeMode="cover" />
        ) : (
          <View style={styles.gridCardImagePlaceholder}>
            <User size={40} color={ExploreColors.neutral[400]} />
          </View>
        )}
        <View style={styles.gridCardContent}>
          <Text style={styles.gridCardName} numberOfLines={1}>
            {name}
          </Text>
          {title && (
            <Text style={styles.gridCardTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      </ExploreCard>
    </Animated.View>
  );
}

function FigureListCard({ figure, onPress, contentLanguage, index }: FigureCardProps) {
  const name = figure.name[contentLanguage] || figure.name.en;
  const title = figure.title?.[contentLanguage] || figure.title?.en;
  const summary = figure.summary[contentLanguage] || figure.summary.en;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 30)}>
      <ExploreCard onPress={onPress} style={styles.listCard}>
        <View style={styles.listCardContent}>
          {figure.image_url ? (
            <Image source={{ uri: figure.image_url }} style={styles.listCardImage} resizeMode="cover" />
          ) : (
            <View style={styles.listCardImagePlaceholder}>
              <User size={28} color={ExploreColors.neutral[400]} />
            </View>
          )}
          <View style={styles.listCardText}>
            <Text style={styles.listCardName}>{name}</Text>
            {title && <Text style={styles.listCardTitle}>{title}</Text>}
            <Text style={styles.listCardSummary} numberOfLines={2}>
              {summary}
            </Text>
          </View>
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
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: ExploreSpacing.xs,
  },
  iconButton: {
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
    marginBottom: ExploreSpacing.xs,
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
  figuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.md,
  },
  gridCardContainer: {
    width: '48%',
  },
  gridCard: {
    padding: 0,
    overflow: 'hidden',
  },
  gridCardImage: {
    width: '100%',
    height: 160,
  },
  gridCardImagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: ExploreColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardContent: {
    padding: ExploreSpacing.md,
  },
  gridCardName: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    fontSize: 16,
    marginBottom: 2,
  },
  gridCardTitle: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontStyle: 'italic',
  },
  figuresList: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.md,
  },
  listCard: {
    padding: ExploreSpacing.md,
  },
  listCardContent: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
  },
  listCardImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  listCardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ExploreColors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardText: {
    flex: 1,
    gap: 4,
  },
  listCardName: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
  },
  listCardTitle: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontStyle: 'italic',
  },
  listCardSummary: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    fontSize: 14,
    lineHeight: 20,
  },
});
