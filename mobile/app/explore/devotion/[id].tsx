/**
 * Daily Devotion Reader Screen
 *
 * Design: Immersive reading experience with generous spacing
 * - Focus on content, minimize distractions
 * - Readable typography (line height 1.7)
 * - Progress tracking on complete
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useContentById,
  useTrackContentStart,
  useTrackContentComplete,
  useBookmarkContent,
  useIsBookmarked,
  useIsCompleted,
} from '@/hooks/explore/useExplore';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DailyDevotion } from '@/types/explore';
import { ArrowLeft, BookmarkIcon, Check, Share2 } from 'lucide-react-native';
import { DailyDevotionSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function DailyDevotionReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  // Data queries
  const { data: devotion, isLoading } = useContentById<DailyDevotion>(
    'devotion',
    id as string
  );
  const isBookmarked = useIsBookmarked(id as string);
  const isCompleted = useIsCompleted(id as string);

  // Mutations
  const trackStart = useTrackContentStart();
  const trackComplete = useTrackContentComplete();
  const bookmarkMutation = useBookmarkContent();

  // Track content start on mount
  useEffect(() => {
    if (id && !hasTrackedStart && !isCompleted) {
      trackStart.mutate({ contentId: id as string, contentType: 'devotion' });
      setHasTrackedStart(true);
    }
  }, [id, hasTrackedStart, isCompleted]);

  const handleComplete = () => {
    if (id && !isCompleted) {
      trackComplete.mutate({ contentId: id as string, contentType: 'devotion' });
    }
  };

  const handleBookmark = () => {
    if (id) {
      bookmarkMutation.mutate({ contentId: id as string, bookmarked: !isBookmarked });
    }
  };

  if (isLoading || !devotion) {
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

  const title = devotion.title[contentLanguage] || devotion.title.en;
  const content = devotion.content[contentLanguage] || devotion.content.en;
  const author = devotion.author?.[contentLanguage] || devotion.author?.en;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable onPress={handleBookmark} style={styles.iconButton}>
            <BookmarkIcon
              size={24}
              color={isBookmarked ? ExploreColors.primary[500] : ExploreColors.neutral[400]}
              fill={isBookmarked ? ExploreColors.primary[500] : 'transparent'}
            />
          </Pressable>

          <Pressable style={styles.iconButton}>
            <Share2 size={24} color={ExploreColors.neutral[400]} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {devotion.image_url && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Image
              source={{ uri: devotion.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Meta */}
          <View style={styles.metaRow}>
            {author && <Text style={styles.author}>{author}</Text>}
            <Text style={styles.readingTime}>
              {devotion.reading_time_minutes} {contentLanguage === 'en' ? 'min read' : 'menit'}
            </Text>
          </View>

          {/* Main Verse */}
          <View style={styles.verseContainer}>
            <View style={styles.verseAccent} />
            <View style={styles.verseContent}>
              <Text style={styles.verseText}>"{devotion.main_verse.text}"</Text>
              <Text style={styles.verseReference}>
                {devotion.main_verse.book} {devotion.main_verse.chapter}:
                {devotion.main_verse.verse_start}
                {devotion.main_verse.verse_end &&
                devotion.main_verse.verse_end !== devotion.main_verse.verse_start
                  ? `-${devotion.main_verse.verse_end}`
                  : ''}
              </Text>
            </View>
          </View>

          {/* Devotion Content */}
          <Text style={styles.devotionContent}>{content}</Text>

          {/* Additional Verses */}
          {devotion.additional_verses && devotion.additional_verses.length > 0 && (
            <View style={styles.additionalVersesSection}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Related Verses' : 'Ayat Terkait'}
              </Text>
              {devotion.additional_verses.map((verse, index) => (
                <View key={index} style={styles.additionalVerse}>
                  <Text style={styles.additionalVerseText}>"{verse.text}"</Text>
                  <Text style={styles.additionalVerseReference}>
                    {verse.book} {verse.chapter}:{verse.verse_start}
                    {verse.verse_end && verse.verse_end !== verse.verse_start
                      ? `-${verse.verse_end}`
                      : ''}
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

          {/* Bottom spacing for button */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Complete Button */}
      {!isCompleted && (
        <View style={styles.bottomContainer}>
          <Pressable
            onPress={handleComplete}
            style={[styles.completeButton, trackComplete.isPending && styles.completeButtonDisabled]}
            disabled={trackComplete.isPending}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>
              {trackComplete.isPending
                ? contentLanguage === 'en'
                  ? 'Completing...'
                  : 'Menyelesaikan...'
                : contentLanguage === 'en'
                ? 'Mark as Complete'
                : 'Tandai Selesai'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Completed Badge */}
      {isCompleted && (
        <View style={styles.completedBadgeContainer}>
          <View style={styles.completedBadge}>
            <Check size={16} color={ExploreColors.success[600]} />
            <Text style={styles.completedText}>
              {contentLanguage === 'en' ? 'Completed' : 'Selesai'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
  headerActions: {
    flexDirection: 'row',
    gap: ExploreSpacing.sm,
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
  heroImage: {
    width: '100%',
    height: 280,
  },
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
  },
  title: {
    ...ExploreTypography.h1,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.xl,
  },
  author: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    fontStyle: 'italic',
  },
  readingTime: {
    ...ExploreTypography.body,
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
  devotionContent: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    marginBottom: ExploreSpacing.xl,
  },
  additionalVersesSection: {
    marginBottom: ExploreSpacing.xl,
  },
  sectionTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.lg,
  },
  tag: {
    backgroundColor: ExploreColors.primary[50],
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 16,
  },
  tagText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[700],
    fontWeight: '600',
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
    fontWeight: '600',
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
});
