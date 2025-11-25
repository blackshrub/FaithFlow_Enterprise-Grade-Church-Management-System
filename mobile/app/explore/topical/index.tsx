/**
 * Topical Categories Screen
 *
 * Design: Browse verses by life topics
 * - Beautiful category cards with icons
 * - Grid layout
 * - Verse count per category
 * - Popular topics highlighted
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useTopicalCategories } from '@/hooks/explore/useExplore';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { TopicalCategory } from '@/types/explore';
import {
  ArrowLeft,
  Heart,
  Zap,
  Shield,
  Users,
  Sparkles,
  Sun,
  Moon,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { EmptyState } from '@/components/explore/EmptyState';
import { TopicalCategoriesSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Icon mapping for categories
const getCategoryIcon = (iconName?: string) => {
  const icons: Record<string, any> = {
    heart: Heart,
    zap: Zap,
    shield: Shield,
    users: Users,
    sparkles: Sparkles,
    sun: Sun,
    moon: Moon,
    star: Star,
    trending: TrendingUp,
  };
  return icons[iconName || 'star'] || Star;
};

export default function TopicalCategoriesScreen() {
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // Data queries
  const { data: categories, isLoading } = useTopicalCategories();

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/explore/topical/${categoryId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topikal'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <TopicalCategoriesSkeleton />
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
          {contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topikal'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={styles.description}>
          {contentLanguage === 'en'
            ? 'Explore Bible verses organized by life topics and themes'
            : 'Jelajahi ayat-ayat Alkitab yang diatur berdasarkan topik dan tema kehidupan'}
        </Text>

        {/* Categories Grid */}
        {!categories || categories.length === 0 ? (
          <EmptyState
            type="no_content"
            message={
              contentLanguage === 'en'
                ? 'No categories available yet'
                : 'Belum ada kategori tersedia'
            }
          />
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => handleCategoryPress(category.id)}
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

interface CategoryCardProps {
  category: TopicalCategory;
  onPress: () => void;
  contentLanguage: string;
  index: number;
}

function CategoryCard({ category, onPress, contentLanguage, index }: CategoryCardProps) {
  const name = category.name[contentLanguage] || category.name.en;
  const description = category.description?.[contentLanguage] || category.description?.en;
  const Icon = getCategoryIcon(category.icon);

  // Color palette for categories
  const colors = [
    { bg: ExploreColors.primary[50], icon: ExploreColors.primary[600], border: ExploreColors.primary[200] },
    { bg: ExploreColors.spiritual[50], icon: ExploreColors.spiritual[600], border: ExploreColors.spiritual[200] },
    { bg: ExploreColors.secondary[50], icon: ExploreColors.secondary[600], border: ExploreColors.secondary[200] },
    { bg: ExploreColors.success[50], icon: ExploreColors.success[600], border: ExploreColors.success[200] },
    { bg: ExploreColors.info[50], icon: ExploreColors.info[600], border: ExploreColors.info[200] },
  ];
  const colorScheme = colors[index % colors.length];

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 40)} style={styles.categoryCardContainer}>
      <ExploreCard
        onPress={onPress}
        style={[
          styles.categoryCard,
          {
            backgroundColor: colorScheme.bg,
            borderWidth: 1,
            borderColor: colorScheme.border,
          },
        ]}
      >
        {/* Icon */}
        <View style={[styles.categoryIcon, { backgroundColor: colorScheme.bg }]}>
          <Icon size={32} color={colorScheme.icon} />
        </View>

        {/* Content */}
        <View style={styles.categoryContent}>
          <Text style={styles.categoryName}>{name}</Text>
          {description && (
            <Text style={styles.categoryDescription} numberOfLines={2}>
              {description}
            </Text>
          )}
          <Text style={styles.categoryCount}>
            {category.verse_count} {contentLanguage === 'en' ? 'verses' : 'ayat'}
          </Text>
        </View>

        {/* Popular Badge */}
        {category.is_popular && (
          <View style={styles.popularBadge}>
            <TrendingUp size={12} color={ExploreColors.secondary[700]} />
            <Text style={styles.popularText}>
              {contentLanguage === 'en' ? 'Popular' : 'Populer'}
            </Text>
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ExploreSpacing.xl,
  },
  loadingContainer: {
    padding: ExploreSpacing.screenMargin,
  },
  description: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    textAlign: 'center',
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.lg,
    paddingBottom: ExploreSpacing.xl,
    lineHeight: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.md,
  },
  categoryCardContainer: {
    width: '48%',
  },
  categoryCard: {
    padding: ExploreSpacing.lg,
    minHeight: 180,
    position: 'relative',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ExploreSpacing.md,
  },
  categoryContent: {
    gap: ExploreSpacing.xs,
  },
  categoryName: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    fontSize: 16,
  },
  categoryDescription: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[700],
    lineHeight: 18,
  },
  categoryCount: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontWeight: '600',
    marginTop: ExploreSpacing.xs,
  },
  popularBadge: {
    position: 'absolute',
    top: ExploreSpacing.xs,
    right: ExploreSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ExploreColors.secondary[100],
    paddingHorizontal: ExploreSpacing.xs,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: {
    ...ExploreTypography.caption,
    color: ExploreColors.secondary[800],
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
