/**
 * Bible Figure of the Day Detail Screen
 *
 * Design: Biographical narrative with timeline
 * - Hero image with name overlay
 * - Key events timeline
 * - Related scriptures
 * - Engaging biography
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
  useIsCompleted,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleFigure } from '@/types/explore';
import { ArrowLeft, Check, Share2, Calendar, BookOpen } from 'lucide-react-native';
import { BibleFigureSkeleton } from '@/components/explore/LoadingSkeleton';
import { AudioPlayButton } from '@/components/explore/AudioPlayButton';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function BibleFigureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  // Data queries
  const { data: figure, isLoading } = useContentById<BibleFigure>('figure', id as string);
  const isCompleted = useIsCompleted(id as string);

  // Mutations
  const trackStart = useTrackContentStart();
  const trackComplete = useTrackContentComplete();

  // Track content start on mount
  useEffect(() => {
    if (id && !hasTrackedStart && !isCompleted) {
      trackStart.mutate({ contentId: id as string, contentType: 'figure' });
      setHasTrackedStart(true);
    }
  }, [id, hasTrackedStart, isCompleted]);

  const handleComplete = () => {
    if (id && !isCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackComplete.mutate({ contentId: id as string, contentType: 'figure' });
    }
  };

  if (isLoading || !figure) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <BibleFigureSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const name = figure.name[contentLanguage] || figure.name.en;
  const title = figure.title?.[contentLanguage] || figure.title?.en;
  const summary = figure.summary[contentLanguage] || figure.summary.en;
  const biography = figure.biography?.[contentLanguage] || figure.biography?.en;

  // Build TTS text: name + title + summary + biography + life lessons
  const lifeLessonsText = figure.life_lessons
    ?.map((lesson, i) => `${i + 1}. ${lesson[contentLanguage] || lesson.en}`)
    .join('. ') || '';
  const ttsText = [
    name,
    title,
    summary,
    biography,
    lifeLessonsText ? `${contentLanguage === 'en' ? 'Life Lessons' : 'Pelajaran Hidup'}: ${lifeLessonsText}` : '',
  ].filter(Boolean).join('. ');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Static, not animated */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Go back' : 'Kembali'}
          accessibilityHint={
            contentLanguage === 'en'
              ? 'Return to Explore home'
              : 'Kembali ke halaman Jelajahi'
          }
        >
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={contentLanguage === 'en' ? 'Share this Bible figure' : 'Bagikan tokoh Alkitab ini'}
          accessibilityHint={
            contentLanguage === 'en'
              ? 'Double tap to share with others'
              : 'Ketuk dua kali untuk membagikan dengan orang lain'
          }
        >
          <Share2 size={24} color={ExploreColors.neutral[400]} />
        </Pressable>
      </View>

      {/* Content - Animated */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)}>
          {/* Hero Image with Name Overlay */}
          {figure.image_url && (
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: figure.image_url }}
                style={styles.heroImage}
                resizeMode="cover"
                accessibilityLabel={
                  contentLanguage === 'en'
                    ? `Portrait image of ${name}`
                    : `Gambar potret ${name}`
                }
                accessibilityIgnoresInvertColors={true}
              />
              <View style={styles.heroOverlay}>
                <Text
                  style={styles.heroName}
                  accessibilityRole="header"
                >
                  {name}
                </Text>
                {title && <Text style={styles.heroTitle}>{title}</Text>}
              </View>
              {/* Audio Play Button - Overlay at bottom right (cached for 7 days, preloads when page opens) */}
              {ttsText && id && (
                <View style={styles.audioButtonOverlay}>
                  <AudioPlayButton
                    text={ttsText}
                    variant="icon"
                    size={56}
                    color={ExploreColors.primary[600]}
                    backgroundColor="rgba(255, 255, 255, 0.95)"
                    cacheConfig={{
                      contentType: 'figure',
                      contentId: id as string,
                    }}
                    autoPreload
                  />
                </View>
              )}
            </View>
          )}

        <View style={styles.contentContainer}>
          {/* Summary */}
          <Text style={styles.summary}>{summary}</Text>

          {/* Key Events Timeline */}
          {figure.key_events && figure.key_events.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color={ExploreColors.primary[600]} />
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  >
                  {contentLanguage === 'en' ? 'Key Events' : 'Peristiwa Penting'}
                </Text>
              </View>

              {figure.key_events.map((event, index) => {
                const eventTitle = typeof event.title === 'string'
                  ? event.title
                  : ((event.title as any)?.[contentLanguage] || (event.title as any)?.en || '');
                const eventDescription = typeof event.description === 'string'
                  ? event.description
                  : ((event.description as any)?.[contentLanguage] || (event.description as any)?.en || '');
                const isLast = index === (figure.key_events?.length ?? 0) - 1;

                return (
                  <View
                    key={index}
                    style={styles.timelineItem}
                    accessible={true}
                    accessibilityLabel={
                      contentLanguage === 'en'
                        ? `Key event ${index + 1}: ${eventTitle}${eventDescription ? `. ${eventDescription}` : ''}${event.scripture_reference ? `. From ${event.scripture_reference}` : ''}`
                        : `Peristiwa penting ${index + 1}: ${eventTitle}${eventDescription ? `. ${eventDescription}` : ''}${event.scripture_reference ? `. Dari ${event.scripture_reference}` : ''}`
                    }
                    accessibilityRole="text"
                  >
                    {/* Timeline indicator */}
                    <View style={styles.timelineIndicator}>
                      <View style={styles.timelineDot} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Event content */}
                    <View style={styles.timelineContent}>
                      <Text style={styles.eventTitle}>{eventTitle}</Text>
                      {eventDescription && (
                        <Text style={styles.eventDescription}>{eventDescription}</Text>
                      )}
                      {event.scripture_reference && (
                        <View style={styles.scriptureRefContainer}>
                          <BookOpen size={14} color={ExploreColors.spiritual[600]} />
                          <Text style={styles.scriptureRef}>
                            {typeof event.scripture_reference === 'string'
                              ? event.scripture_reference
                              : `${event.scripture_reference.book} ${event.scripture_reference.chapter}:${event.scripture_reference.verse_start}${event.scripture_reference.verse_end ? `-${event.scripture_reference.verse_end}` : ''}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Biography */}
          {biography && (
            <View style={styles.section}>
              <Text
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Biography' : 'Biografi'}
              </Text>
              <Text style={styles.biographyText}>{biography}</Text>
            </View>
          )}

          {/* Related Scriptures */}
          {figure.related_scriptures && figure.related_scriptures.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BookOpen size={20} color={ExploreColors.spiritual[600]} />
                <Text
                  style={styles.sectionTitle}
                  accessibilityRole="header"
                  >
                  {contentLanguage === 'en' ? 'Related Scriptures' : 'Ayat Terkait'}
                </Text>
              </View>

              {figure.related_scriptures.map((scripture, index) => (
                <View
                  key={index}
                  style={styles.scriptureCard}
                  accessible={true}
                  accessibilityLabel={
                    contentLanguage === 'en'
                      ? `Related scripture ${index + 1}: ${typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.en || ''}. From ${scripture.book} chapter ${scripture.chapter}, verse ${scripture.verse_start}`
                      : `Ayat terkait ${index + 1}: ${typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.id || ''}. Dari ${scripture.book} pasal ${scripture.chapter}, ayat ${scripture.verse_start}`
                  }
                  accessibilityRole="text"
                >
                  <Text style={styles.scriptureText}>
                    "{typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.en || ''}"
                  </Text>
                  <Text style={styles.scriptureReference}>
                    {scripture.book} {scripture.chapter}:{scripture.verse_start}
                    {scripture.verse_end && scripture.verse_end !== scripture.verse_start
                      ? `-${scripture.verse_end}`
                      : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Life Lessons */}
          {figure.life_lessons && figure.life_lessons.length > 0 && (
            <View style={styles.section}>
              <Text
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Life Lessons' : 'Pelajaran Hidup'}
              </Text>
              {figure.life_lessons.map((lesson, index: number) => {
                const lessonText = lesson[contentLanguage] || lesson.en || '';
                return (
                  <View
                    key={index}
                    style={styles.lessonItem}
                    accessible={true}
                    accessibilityLabel={
                      contentLanguage === 'en'
                        ? `Lesson ${index + 1}: ${lessonText}`
                        : `Pelajaran ${index + 1}: ${lessonText}`
                    }
                    accessibilityRole="text"
                  >
                    <View style={styles.lessonNumber}>
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.lessonText}>{lessonText}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tags */}
          {figure.tags && figure.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {figure.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bottom spacing for button */}
          <View style={{ height: 100 }} />
        </View>
        </Animated.View>
      </ScrollView>

      {/* Complete Button */}
      {!isCompleted && (
        <View style={styles.bottomContainer}>
          <Pressable
            onPress={handleComplete}
            style={[styles.completeButton, trackComplete.isPending && styles.completeButtonDisabled]}
            disabled={trackComplete.isPending}
            accessibilityRole="button"
            accessibilityLabel={
              contentLanguage === 'en'
                ? 'Mark this Bible figure as complete'
                : 'Tandai tokoh Alkitab ini sebagai selesai'
            }
            accessibilityHint={
              contentLanguage === 'en'
                ? 'Double tap to complete and maintain your streak'
                : 'Ketuk dua kali untuk menyelesaikan dan mempertahankan rangkaian Anda'
            }
            accessibilityState={{
              disabled: trackComplete.isPending,
              busy: trackComplete.isPending,
            }}
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
        <View
          style={styles.completedBadgeContainer}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            contentLanguage === 'en'
              ? 'This Bible figure has been completed'
              : 'Tokoh Alkitab ini telah diselesaikan'
          }
          accessibilityLiveRegion="polite"
        >
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
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 320,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: ExploreSpacing.xl,
    paddingTop: ExploreSpacing['2xl'],
    // Note: React Native doesn't support linear gradient natively
    // Using solid dark overlay for now - can enhance with expo-linear-gradient
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  audioButtonOverlay: {
    position: 'absolute',
    bottom: ExploreSpacing.lg,
    right: ExploreSpacing.lg,
    // Add shadow for visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  heroName: {
    ...ExploreTypography.h1,
    color: '#FFFFFF',
    marginBottom: ExploreSpacing.xs,
    fontSize: 32,
    lineHeight: 40,
  },
  heroTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[200],
    fontStyle: 'italic',
  },
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
  },
  summary: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    marginBottom: ExploreSpacing.xl,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: ExploreSpacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    marginBottom: ExploreSpacing.md,
  },
  sectionTitle: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: ExploreSpacing.lg,
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
    marginRight: ExploreSpacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ExploreColors.primary[500],
    borderWidth: 3,
    borderColor: ExploreColors.primary[100],
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: ExploreColors.primary[200],
    marginTop: ExploreSpacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: ExploreSpacing.xs,
  },
  eventTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.xs,
  },
  eventDescription: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 24,
    marginBottom: ExploreSpacing.xs,
  },
  scriptureRefContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    marginTop: ExploreSpacing.xs,
  },
  scriptureRef: {
    ...ExploreTypography.caption,
    color: ExploreColors.spiritual[600],
    fontWeight: '600',
  },
  biographyText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
  },
  scriptureCard: {
    backgroundColor: ExploreColors.spiritual[50],
    borderRadius: 12,
    padding: ExploreSpacing.lg,
    marginBottom: ExploreSpacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: ExploreColors.spiritual[500],
  },
  scriptureText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[900],
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: ExploreSpacing.sm,
  },
  scriptureReference: {
    ...ExploreTypography.caption,
    color: ExploreColors.spiritual[700],
    fontWeight: '600',
  },
  lessonItem: {
    flexDirection: 'row',
    marginBottom: ExploreSpacing.md,
  },
  lessonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ExploreColors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ExploreSpacing.md,
  },
  lessonNumberText: {
    ...ExploreTypography.body,
    color: ExploreColors.secondary[700],
    fontWeight: '700',
    fontSize: 14,
  },
  lessonText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 24,
    flex: 1,
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
