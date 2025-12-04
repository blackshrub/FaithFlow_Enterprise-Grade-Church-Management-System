/**
 * Verse of the Day Detail Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for: custom colors from ExploreColors
 *
 * Design: Focused on the verse with reflection
 * - Large, readable verse text
 * - Spiritual blue accent
 * - Share functionality prominent
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors } from '@/constants/explore/designSystem';
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
import { AudioPlayButton } from '@/components/explore/AudioPlayButton';
import { QuickAskInput } from '@/components/companion/QuickAskInput';
import Animated, { SlideInRight } from 'react-native-reanimated';
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <VerseOfTheDaySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const verseText = verse.verse_text?.[contentLanguage] || verse.verse_text?.en || '';
  const commentary = verse.commentary?.[contentLanguage] || verse.commentary?.en;
  const reflection = verse.reflection_prompt?.[contentLanguage] || verse.reflection_prompt?.en;

  // Build TTS text: verse + reference + commentary + reflection
  const ttsText = [
    verseText,
    formatBibleReference(verse.verse, contentLanguage),
    commentary,
    reflection,
  ].filter(Boolean).join('. ');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Static, not animated */}
      <View className="flex-row justify-between items-center px-3 py-2 border-b border-neutral-100">
        <Pressable
          onPress={() => router.back()}
          className="p-1"
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

        <View className="flex-row gap-2">
          <Pressable
            onPress={handleCopy}
            className="p-1"
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
            className="p-1"
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
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)} className="px-5 pt-6">
          {/* Verse Card with Audio Button */}
          <View
            className="flex-row rounded-2xl p-6 mb-6"
            style={{ backgroundColor: ExploreColors.spiritual[50] }}
            accessible={true}
            accessibilityLabel={
              contentLanguage === 'en'
                ? `Verse of the day: ${verseText}. ${formatBibleReference(verse.verse, contentLanguage)}`
                : `Ayat hari ini: ${verseText}. ${formatBibleReference(verse.verse, contentLanguage)}`
            }
            accessibilityRole="text"
          >
            <View
              className="w-1.5 rounded-full mr-4"
              style={{ backgroundColor: ExploreColors.spiritual[500] }}
            />
            <View className="flex-1">
              <Text
                className="text-[28px] font-bold italic mb-4"
                style={{ color: ExploreColors.neutral[900], lineHeight: 36, letterSpacing: -0.3 }}
              >
                "{verseText}"
              </Text>
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-bold"
                  style={{ color: ExploreColors.spiritual[700] }}
                >
                  {formatBibleReference(verse.verse, contentLanguage)}
                </Text>
                {/* Audio Play Button (cached for 24h, preloads when page opens) */}
                {ttsText && id && (
                  <AudioPlayButton
                    text={ttsText}
                    variant="icon"
                    size={48}
                    color={ExploreColors.spiritual[600]}
                    backgroundColor={ExploreColors.spiritual[100]}
                    cacheConfig={{
                      contentType: 'verse',
                      contentId: id as string,
                    }}
                    autoPreload
                  />
                )}
              </View>
            </View>
          </View>

          {/* Commentary */}
          {commentary && (
            <View className="mb-6">
              <Text
                className="text-[22px] font-semibold mb-3"
                style={{ color: ExploreColors.neutral[900], lineHeight: 28 }}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Commentary' : 'Komentar'}
              </Text>
              <MarkdownText
                style={{ fontSize: 16, color: ExploreColors.neutral[800], lineHeight: 28 }}
              >
                {commentary}
              </MarkdownText>
            </View>
          )}

          {/* Reflection Prompt */}
          {reflection && (
            <View className="mb-6">
              <Text
                className="text-[22px] font-semibold mb-3"
                style={{ color: ExploreColors.neutral[900], lineHeight: 28 }}
                accessibilityRole="header"
              >
                {contentLanguage === 'en' ? 'Reflect' : 'Renungkan'}
              </Text>
              <MarkdownText
                style={{ fontSize: 16, color: ExploreColors.neutral[800], lineHeight: 28 }}
              >
                {reflection}
              </MarkdownText>
            </View>
          )}

          {/* Ask Faith Assistant about this verse */}
          <View className="mb-6">
            <QuickAskInput
              context="verse_meditation"
              contentId={id as string}
              contextData={{
                verseReference: formatBibleReference(verse.verse, contentLanguage),
                verseText: verseText,
              }}
              title={contentLanguage === 'en' ? 'Questions about this verse?' : 'Pertanyaan tentang ayat ini?'}
              language={contentLanguage}
            />
          </View>

          {/* Bottom spacing for button */}
          <View className="h-[100px]" />
        </Animated.View>
      </ScrollView>

      {/* Complete Button */}
      {!isCompleted && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-neutral-100">
          <Pressable
            onPress={handleComplete}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl ${
              trackComplete.isPending ? 'opacity-60' : ''
            }`}
            style={{ backgroundColor: ExploreColors.success[500] }}
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
            <Text className="text-base font-semibold text-white">
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
          className="absolute bottom-5 left-0 right-0 items-center"
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            contentLanguage === 'en'
              ? 'This verse has been read'
              : 'Ayat ini telah dibaca'
          }
          accessibilityLiveRegion="polite"
        >
          <View
            className="flex-row items-center gap-1 px-4 py-2 rounded-3xl"
            style={{ backgroundColor: ExploreColors.success[50] }}
          >
            <Check size={16} color={ExploreColors.success[600]} />
            <Text
              className="text-base font-semibold"
              style={{ color: ExploreColors.success[700] }}
            >
              {contentLanguage === 'en' ? 'Completed' : 'Selesai'}
            </Text>
          </View>
        </View>
      )}

      {/* Copy Toast */}
      {copied && (
        <View
          className="absolute top-20 self-center px-4 py-2 rounded-3xl"
          style={{ backgroundColor: ExploreColors.neutral[900] }}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={
            contentLanguage === 'en' ? 'Verse copied to clipboard!' : 'Ayat disalin ke clipboard!'
          }
          accessibilityLiveRegion="assertive"
        >
          <Text className="text-base font-semibold text-white">
            {contentLanguage === 'en' ? 'Verse copied!' : 'Ayat disalin!'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
