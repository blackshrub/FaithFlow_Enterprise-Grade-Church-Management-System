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
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import {
  useContentById,
  useTrackContentStart,
  useTrackContentComplete,
  useIsCompleted,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { VerseOfTheDay } from '@/types/explore';
import { ArrowLeft, Check, Share2, Copy } from 'lucide-react-native';
import { VerseOfTheDaySkeleton } from '@/components/explore/LoadingSkeleton';
import { MarkdownText } from '@/components/explore/MarkdownText';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function VerseOfTheDayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data queries
  const { data: verse, isLoading } = useContentById<VerseOfTheDay>('verse', id as string);
  const isCompleted = useIsCompleted(id as string);

  // Mutations
  const trackStart = useTrackContentStart();
  const trackComplete = useTrackContentComplete();

  // Track content start on mount
  useEffect(() => {
    if (id && !hasTrackedStart && !isCompleted) {
      trackStart.mutate({ contentId: id as string, contentType: 'verse' });
      setHasTrackedStart(true);
    }
  }, [id, hasTrackedStart, isCompleted]);

  const handleComplete = () => {
    if (id && !isCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackComplete.mutate({ contentId: id as string, contentType: 'verse' });
    }
  };

  // Build full shareable content with verse, commentary, and reflection
  const buildShareContent = () => {
    if (!verse) return '';

    const verseText = verse.verse_text?.[contentLanguage] || verse.verse_text?.en || '';
    const reference = formatBibleReference(verse.verse, contentLanguage);
    const commentary = verse.commentary?.[contentLanguage] || verse.commentary?.en || '';
    const reflection = verse.reflection_prompt?.[contentLanguage] || verse.reflection_prompt?.en || '';

    const vodLabel = contentLanguage === 'en' ? 'Verse of the Day' : 'Ayat Hari Ini';
    const commentaryLabel = contentLanguage === 'en' ? 'Commentary' : 'Komentar';
    const reflectLabel = contentLanguage === 'en' ? 'Reflect' : 'Renungkan';

    let content = `📖 ${vodLabel}\n\n"${verseText}"\n— ${reference}`;
    if (commentary) {
      content += `\n\n💭 ${commentaryLabel}:\n${commentary}`;
    }
    if (reflection) {
      content += `\n\n🙏 ${reflectLabel}:\n${reflection}`;
    }
    content += '\n\n— Shared from FaithFlow';
    return content;
  };

  const handleCopy = async () => {
    if (!verse) return;

    await Clipboard.setStringAsync(buildShareContent());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!verse) return;

    try {
      await Share.share({
        message: buildShareContent(),
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

  const verseText = verse.verse_text?.[contentLanguage] || verse.verse_text?.en || '';
  const commentary = verse.commentary?.[contentLanguage] || verse.commentary?.en;
  const reflection = verse.reflection_prompt?.[contentLanguage] || verse.reflection_prompt?.en;

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

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleCopy}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? contentLanguage === 'en'
                  ? 'Verse copied'
                  : 'Ayat disalin'
                : contentLanguage === 'en'
                ? 'Copy verse'
                : 'Salin ayat'
            }
            accessibilityHint={
              contentLanguage === 'en'
                ? 'Double tap to copy verse text to clipboard'
                : 'Ketuk dua kali untuk menyalin teks ayat ke clipboard'
            }
            accessibilityState={{ selected: copied }}
          >
            <Copy size={24} color={copied ? ExploreColors.success[500] : ExploreColors.neutral[400]} />
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={contentLanguage === 'en' ? 'Share this verse' : 'Bagikan ayat ini'}
            accessibilityHint={
              contentLanguage === 'en'
                ? 'Double tap to share with others'
                : 'Ketuk dua kali untuk membagikan dengan orang lain'
            }
          >
            <Share2 size={24} color={ExploreColors.neutral[400]} />
          </Pressable>
        </View>
      </View>

      {/* Content - Animated */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)} style={styles.contentContainer}>
          {/* Verse Card */}
          <View
            style={styles.verseCard}
            accessible={true}
            accessibilityLabel={
              contentLanguage === 'en'
                ? `Verse of the day: ${verseText}. ${formatBibleReference(verse.verse, contentLanguage)}`
                : `Ayat hari ini: ${verseText}. ${formatBibleReference(verse.verse, contentLanguage)}`
            }
            accessibilityRole="text"
          >
            <View style={styles.verseAccent} />
            <View style={styles.verseContent}>
              <Text style={styles.verseText}>"{verseText}"</Text>
              <Text style={styles.verseReference}>
                {formatBibleReference(verse.verse, contentLanguage)}
              </Text>
            </View>
          </View>

          {/* Commentary */}
          {commentary && (
            <View style={styles.section}>
              <Text
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Commentary' : 'Komentar'}
              </Text>
              <MarkdownText style={styles.sectionContent}>{commentary}</MarkdownText>
            </View>
          )}

          {/* Reflection Prompt */}
          {reflection && (
            <View style={styles.section}>
              <Text
                style={styles.sectionTitle}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Reflect' : 'Renungkan'}
              </Text>
              <MarkdownText style={styles.sectionContent}>{reflection}</MarkdownText>
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
            accessibilityRole="button"
            accessibilityLabel={
              contentLanguage === 'en'
                ? 'Mark this verse as read'
                : 'Tandai ayat ini sebagai sudah dibaca'
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
                ? 'Mark as Read'
                : 'Tandai Sudah Baca'}
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
              ? 'This verse has been read'
              : 'Ayat ini telah dibaca'
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

      {/* Copy Toast */}
      {copied && (
        <View
          style={styles.copyToast}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={
            contentLanguage === 'en' ? 'Verse copied to clipboard!' : 'Ayat disalin ke clipboard!'
          }
          accessibilityLiveRegion="assertive"
        >
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
