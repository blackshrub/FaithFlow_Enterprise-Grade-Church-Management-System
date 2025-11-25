/**
 * Verse of the Day Detail Screen
 *
 * Design: Focused on the verse with reflection
 * - Large, readable verse text
 * - Spiritual blue accent
 * - Share functionality prominent
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Share } from 'react-native';
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
import type { VerseOfTheDay } from '@/types/explore';
import { ArrowLeft, BookmarkIcon, Check, Share2, Copy } from 'lucide-react-native';
import { VerseOfTheDaySkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

export default function VerseOfTheDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data queries
  const { data: verse, isLoading } = useContentById<VerseOfTheDay>('verse', id as string);
  const isBookmarked = useIsBookmarked(id as string);
  const isCompleted = useIsCompleted(id as string);

  // Mutations
  const trackStart = useTrackContentStart();
  const trackComplete = useTrackContentComplete();
  const bookmarkMutation = useBookmarkContent();

  // Track content start on mount
  useEffect(() => {
    if (id && !hasTrackedStart && !isCompleted) {
      trackStart.mutate({ contentId: id as string, contentType: 'verse' });
      setHasTrackedStart(true);
    }
  }, [id, hasTrackedStart, isCompleted]);

  const handleComplete = () => {
    if (id && !isCompleted) {
      trackComplete.mutate({ contentId: id as string, contentType: 'verse' });
    }
  };

  const handleBookmark = () => {
    if (id) {
      bookmarkMutation.mutate({ contentId: id as string, bookmarked: !isBookmarked });
    }
  };

  const handleCopy = async () => {
    if (!verse) return;

    const verseText = verse.verse_text[contentLanguage] || verse.verse_text.en;
    const reference = `${verse.reference.book} ${verse.reference.chapter}:${verse.reference.verse_start}${
      verse.reference.verse_end && verse.reference.verse_end !== verse.reference.verse_start
        ? `-${verse.reference.verse_end}`
        : ''
    }`;

    await Clipboard.setStringAsync(`"${verseText}"\n\n${reference}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!verse) return;

    const verseText = verse.verse_text[contentLanguage] || verse.verse_text.en;
    const reference = `${verse.reference.book} ${verse.reference.chapter}:${verse.reference.verse_start}${
      verse.reference.verse_end && verse.reference.verse_end !== verse.reference.verse_start
        ? `-${verse.reference.verse_end}`
        : ''
    }`;

    try {
      await Share.share({
        message: `"${verseText}"\n\n${reference}\n\nShared from FaithFlow`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading || !verse) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <VerseOfTheDaySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const verseText = verse.verse_text[contentLanguage] || verse.verse_text.en;
  const reflection = verse.reflection?.[contentLanguage] || verse.reflection?.en;
  const application = verse.application?.[contentLanguage] || verse.application?.en;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable onPress={handleCopy} style={styles.iconButton}>
            <Copy size={24} color={copied ? ExploreColors.success[500] : ExploreColors.neutral[400]} />
          </Pressable>

          <Pressable onPress={handleBookmark} style={styles.iconButton}>
            <BookmarkIcon
              size={24}
              color={isBookmarked ? ExploreColors.primary[500] : ExploreColors.neutral[400]}
              fill={isBookmarked ? ExploreColors.primary[500] : 'transparent'}
            />
          </Pressable>

          <Pressable onPress={handleShare} style={styles.iconButton}>
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
        <Animated.View entering={FadeInDown.duration(500)} style={styles.contentContainer}>
          {/* Verse Card */}
          <View style={styles.verseCard}>
            <View style={styles.verseAccent} />
            <View style={styles.verseContent}>
              <Text style={styles.verseText}>"{verseText}"</Text>
              <Text style={styles.verseReference}>
                {verse.reference.book} {verse.reference.chapter}:{verse.reference.verse_start}
                {verse.reference.verse_end &&
                verse.reference.verse_end !== verse.reference.verse_start
                  ? `-${verse.reference.verse_end}`
                  : ''}
              </Text>
            </View>
          </View>

          {/* Reflection */}
          {reflection && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Reflection' : 'Renungan'}
              </Text>
              <Text style={styles.sectionContent}>{reflection}</Text>
            </View>
          )}

          {/* Application */}
          {application && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Application' : 'Aplikasi'}
              </Text>
              <Text style={styles.sectionContent}>{application}</Text>
            </View>
          )}

          {/* Prayer Points */}
          {verse.prayer_points && verse.prayer_points[contentLanguage]?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {contentLanguage === 'en' ? 'Prayer Points' : 'Poin Doa'}
              </Text>
              {verse.prayer_points[contentLanguage].map((point, index) => (
                <View key={index} style={styles.prayerPoint}>
                  <View style={styles.bullet} />
                  <Text style={styles.prayerPointText}>{point}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          {verse.tags && verse.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {verse.tags.map((tag, index) => (
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
                ? 'Mark as Read'
                : 'Tandai Sudah Baca'}
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

      {/* Copy Toast */}
      {copied && (
        <View style={styles.copyToast}>
          <Text style={styles.copyToastText}>
            {contentLanguage === 'en' ? 'Verse copied!' : 'Ayat disalin!'}
          </Text>
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
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
  },
  verseCard: {
    flexDirection: 'row',
    backgroundColor: ExploreColors.spiritual[50],
    borderRadius: 16,
    padding: ExploreSpacing.xl,
    marginBottom: ExploreSpacing.xl,
  },
  verseAccent: {
    width: 6,
    backgroundColor: ExploreColors.spiritual[500],
    borderRadius: 3,
    marginRight: ExploreSpacing.lg,
  },
  verseContent: {
    flex: 1,
  },
  verseText: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    fontStyle: 'italic',
    lineHeight: 36,
    marginBottom: ExploreSpacing.md,
  },
  verseReference: {
    ...ExploreTypography.h4,
    color: ExploreColors.spiritual[700],
    fontWeight: '700',
  },
  section: {
    marginBottom: ExploreSpacing.xl,
  },
  sectionTitle: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  sectionContent: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
  },
  prayerPoint: {
    flexDirection: 'row',
    marginBottom: ExploreSpacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ExploreColors.spiritual[500],
    marginTop: 10,
    marginRight: ExploreSpacing.sm,
  },
  prayerPointText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    flex: 1,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.lg,
  },
  tag: {
    backgroundColor: ExploreColors.spiritual[50],
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 16,
  },
  tagText: {
    ...ExploreTypography.caption,
    color: ExploreColors.spiritual[700],
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
  copyToast: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: ExploreColors.neutral[900],
    paddingHorizontal: ExploreSpacing.lg,
    paddingVertical: ExploreSpacing.sm,
    borderRadius: 24,
  },
  copyToastText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
