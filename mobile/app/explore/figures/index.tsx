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
import { ScrollView, View, Text, Image, Pressable, TextInput } from 'react-native';
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

// Animated Image for shared element transitions (Reanimated 4+)
const AnimatedImage = Animated.createAnimatedComponent(Image);

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
          <Text
            className="flex-1 text-center"
            style={{ ...ExploreTypography.h3, color: ExploreColors.neutral[900] }}
          >
            {contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: ExploreSpacing.screenMargin }}>
          <BibleFigureListSkeleton />
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
        <Pressable onPress={() => router.back()} style={{ padding: ExploreSpacing.xs }}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{ ...ExploreTypography.h3, color: ExploreColors.neutral[900] }}
        >
          {contentLanguage === 'en' ? 'Bible Figures' : 'Tokoh Alkitab'}
        </Text>
        <View className="flex-row" style={{ gap: ExploreSpacing.xs }}>
          <Pressable
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{ padding: ExploreSpacing.xs }}
          >
            {viewMode === 'grid' ? (
              <List size={20} color={ExploreColors.neutral[600]} />
            ) : (
              <Grid3x3 size={20} color={ExploreColors.neutral[600]} />
            )}
          </Pressable>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={{ padding: ExploreSpacing.xs }}
          >
            <Filter size={20} color={ExploreColors.primary[600]} />
          </Pressable>
        </View>
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
                placeholder={contentLanguage === 'en' ? 'Search figures...' : 'Cari tokoh...'}
                placeholderTextColor={ExploreColors.neutral[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Filters */}
          {showFilters && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={{
                paddingHorizontal: ExploreSpacing.screenMargin,
                paddingVertical: ExploreSpacing.md,
                backgroundColor: ExploreColors.neutral[50],
                borderRadius: 16,
                marginHorizontal: ExploreSpacing.screenMargin,
                marginBottom: ExploreSpacing.md,
              }}
            >
              <View style={{ marginBottom: ExploreSpacing.xs }}>
                <Text
                  className="uppercase font-semibold"
                  style={{
                    ...ExploreTypography.caption,
                    color: ExploreColors.neutral[700],
                    marginBottom: ExploreSpacing.xs,
                  }}
                >
                  {contentLanguage === 'en' ? 'Testament' : 'Perjanjian'}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: ExploreSpacing.xs }}>
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
                      style={{
                        paddingHorizontal: ExploreSpacing.md,
                        paddingVertical: ExploreSpacing.xs,
                        borderRadius: 16,
                        backgroundColor:
                          filterTestament === option.value
                            ? ExploreColors.primary[500]
                            : '#FFFFFF',
                        borderWidth: 1,
                        borderColor:
                          filterTestament === option.value
                            ? ExploreColors.primary[500]
                            : ExploreColors.neutral[200],
                      }}
                    >
                      <Text
                        className="font-semibold"
                        style={{
                          ...ExploreTypography.caption,
                          color:
                            filterTestament === option.value
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
            style={{
              ...ExploreTypography.caption,
              color: ExploreColors.neutral[600],
              paddingHorizontal: ExploreSpacing.screenMargin,
              marginBottom: ExploreSpacing.md,
            }}
          >
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
            <View
              className="flex-row flex-wrap"
              style={{ paddingHorizontal: ExploreSpacing.screenMargin, gap: ExploreSpacing.md }}
            >
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
            <View style={{ paddingHorizontal: ExploreSpacing.screenMargin, gap: ExploreSpacing.md }}>
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
    <Animated.View entering={FadeInDown.duration(400).delay(index * 30)} style={{ width: '48%' }}>
      <ExploreCard onPress={onPress} style={{ padding: 0, overflow: 'hidden' }}>
        {figure.image_url ? (
          <AnimatedImage
            source={{ uri: figure.image_url }}
            style={{ width: '100%', height: 160 }}
            resizeMode="cover"
            sharedTransitionTag={`figure-${figure.id}-image`}
          />
        ) : (
          <View
            className="items-center justify-center"
            style={{
              width: '100%',
              height: 160,
              backgroundColor: ExploreColors.neutral[100],
            }}
          >
            <User size={40} color={ExploreColors.neutral[400]} />
          </View>
        )}
        <View style={{ padding: ExploreSpacing.md }}>
          <Animated.Text
            numberOfLines={1}
            style={{
              ...ExploreTypography.h4,
              color: ExploreColors.neutral[900],
              fontSize: 16,
              marginBottom: 2,
            }}
            sharedTransitionTag={`figure-${figure.id}-name`}
          >
            {name}
          </Animated.Text>
          {title && (
            <Text
              numberOfLines={1}
              className="italic"
              style={{ ...ExploreTypography.caption, color: ExploreColors.neutral[600] }}
            >
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
      <ExploreCard onPress={onPress} style={{ padding: ExploreSpacing.md }}>
        <View className="flex-row" style={{ gap: ExploreSpacing.md }}>
          {figure.image_url ? (
            <AnimatedImage
              source={{ uri: figure.image_url }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              resizeMode="cover"
              sharedTransitionTag={`figure-${figure.id}-image`}
            />
          ) : (
            <View
              className="items-center justify-center"
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: ExploreColors.neutral[100],
              }}
            >
              <User size={28} color={ExploreColors.neutral[400]} />
            </View>
          )}
          <View className="flex-1" style={{ gap: 4 }}>
            <Animated.Text
              style={{ ...ExploreTypography.h4, color: ExploreColors.neutral[900] }}
              sharedTransitionTag={`figure-${figure.id}-name`}
            >
              {name}
            </Animated.Text>
            {title && (
              <Text
                className="italic"
                style={{ ...ExploreTypography.caption, color: ExploreColors.neutral[600] }}
              >
                {title}
              </Text>
            )}
            <Text
              numberOfLines={2}
              style={{
                ...ExploreTypography.body,
                color: ExploreColors.neutral[700],
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {summary}
            </Text>
          </View>
        </View>
      </ExploreCard>
    </Animated.View>
  );
}

