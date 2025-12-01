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
import { ScrollView, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useTopicalCategories } from '@/hooks/explore/useExploreMock';
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
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row justify-between items-center border-b"
          style={{
            paddingHorizontal: ExploreSpacing.md,
            paddingVertical: ExploreSpacing.sm,
            borderBottomColor: ExploreColors.neutral[100],
          }}
        >
          <Pressable onPress={() => router.back()} style={{ padding: ExploreSpacing.xs }}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
          <Text
            className="flex-1 text-center"
            style={{
              ...ExploreTypography.h3,
              color: ExploreColors.neutral[900],
            }}
          >
            {contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topikal'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: ExploreSpacing.screenMargin }}>
          <TopicalCategoriesSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Static, not animated */}
      <View
        className="flex-row justify-between items-center border-b"
        style={{
          paddingHorizontal: ExploreSpacing.md,
          paddingVertical: ExploreSpacing.sm,
          borderBottomColor: ExploreColors.neutral[100],
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: ExploreSpacing.xs }}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text
          className="flex-1 text-center"
          style={{
            ...ExploreTypography.h3,
            color: ExploreColors.neutral[900],
          }}
        >
          {contentLanguage === 'en' ? 'Topical Verses' : 'Ayat Topikal'}
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
          {/* Description */}
          <Text
            className="text-center"
            style={{
              ...ExploreTypography.body,
              color: ExploreColors.neutral[700],
              paddingHorizontal: ExploreSpacing.screenMargin,
              paddingTop: ExploreSpacing.lg,
              paddingBottom: ExploreSpacing.xl,
              lineHeight: 24,
            }}
          >
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
            <View
              className="flex-row flex-wrap justify-between"
              style={{ paddingHorizontal: ExploreSpacing.screenMargin }}
            >
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
        </Animated.View>
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
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 40)}
      style={{ width: '48%', marginBottom: ExploreSpacing.md }}
    >
      <ExploreCard
        onPress={onPress}
        style={{
          padding: ExploreSpacing.lg,
          minHeight: 180,
          position: 'relative',
          backgroundColor: colorScheme.bg,
          borderWidth: 1,
          borderColor: colorScheme.border,
        }}
      >
        {/* Icon */}
        <View
          className="items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colorScheme.bg,
            marginBottom: ExploreSpacing.md,
          }}
        >
          <Icon size={32} color={colorScheme.icon} />
        </View>

        {/* Content */}
        <View>
          <Text
            style={{
              ...ExploreTypography.h4,
              color: ExploreColors.neutral[900],
              fontSize: 16,
              marginBottom: ExploreSpacing.xs,
            }}
          >
            {name}
          </Text>
          {description && (
            <Text
              numberOfLines={2}
              style={{
                ...ExploreTypography.caption,
                color: ExploreColors.neutral[700],
                lineHeight: 18,
              }}
            >
              {description}
            </Text>
          )}
          <Text
            className="font-semibold"
            style={{
              ...ExploreTypography.caption,
              color: ExploreColors.neutral[600],
              marginTop: ExploreSpacing.xs,
            }}
          >
            {category.verse_count} {contentLanguage === 'en' ? 'verses' : 'ayat'}
          </Text>
        </View>

        {/* Popular Badge */}
        {category.is_popular && (
          <View
            className="absolute flex-row items-center"
            style={{
              top: ExploreSpacing.xs,
              right: ExploreSpacing.xs,
              backgroundColor: ExploreColors.secondary[100],
              paddingHorizontal: ExploreSpacing.xs,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <TrendingUp size={12} color={ExploreColors.secondary[700]} />
            <Text
              className="font-bold uppercase"
              style={{
                ...ExploreTypography.caption,
                color: ExploreColors.secondary[800],
                fontSize: 10,
              }}
            >
              {contentLanguage === 'en' ? 'Popular' : 'Populer'}
            </Text>
          </View>
        )}
      </ExploreCard>
    </Animated.View>
  );
}

