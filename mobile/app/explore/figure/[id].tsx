/**
 * Bible Figure of the Day Detail Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for ExploreColors and shadows
 * - React Native Reanimated for animations
 *
 * Design: Biographical narrative with timeline
 * - Hero image with name overlay
 * - Key events timeline
 * - Related scriptures
 * - Engaging biography
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors } from '@/constants/explore/designSystem';
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
import Animated, { SlideInRight } from 'react-native-reanimated';
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row justify-between items-center px-3 py-2 border-b"
          style={{ borderBottomColor: ExploreColors.neutral[100] }}
        >
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="p-5">
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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Static, not animated */}
      <View
        className="flex-row justify-between items-center px-3 py-2 border-b"
        style={{ borderBottomColor: ExploreColors.neutral[100] }}
      >
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

        <Pressable
          className="p-1"
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
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={SlideInRight.duration(250)}>
          {/* Hero Image with Name Overlay */}
          {figure.image_url && (
            <View className="relative w-full h-[320px]">
              <Image
                source={{ uri: figure.image_url }}
                className="w-full h-full"
                resizeMode="cover"
                accessibilityLabel={
                  contentLanguage === 'en'
                    ? `Portrait image of ${name}`
                    : `Gambar potret ${name}`
                }
                accessibilityIgnoresInvertColors={true}
              />
              <View
                className="absolute bottom-0 left-0 right-0 p-6 pt-8"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              >
                <Text
                  className="text-[32px] leading-[40px] font-bold text-white mb-1"
                  accessibilityRole="header"
                >
                  {name}
                </Text>
                {title && (
                  <Text
                    className="text-lg font-semibold italic"
                    style={{ color: ExploreColors.neutral[200] }}
                  >
                    {title}
                  </Text>
                )}
              </View>
              {/* Audio Play Button - Overlay at bottom right */}
              {ttsText && id && (
                <View
                  className="absolute bottom-4 right-4"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
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

          <View className="px-5 pt-6">
            {/* Summary */}
            <Text
              className="text-lg font-semibold leading-7 mb-6 italic"
              style={{ color: ExploreColors.neutral[800] }}
            >
              {summary}
            </Text>

            {/* Key Events Timeline */}
            {figure.key_events && figure.key_events.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center gap-1 mb-3">
                  <Calendar size={20} color={ExploreColors.primary[600]} />
                  <Text
                    className="text-xl font-bold"
                    style={{ color: ExploreColors.neutral[900] }}
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
                      className="flex-row mb-4"
                      accessible={true}
                      accessibilityLabel={
                        contentLanguage === 'en'
                          ? `Key event ${index + 1}: ${eventTitle}${eventDescription ? `. ${eventDescription}` : ''}${event.scripture_reference ? `. From ${event.scripture_reference}` : ''}`
                          : `Peristiwa penting ${index + 1}: ${eventTitle}${eventDescription ? `. ${eventDescription}` : ''}${event.scripture_reference ? `. Dari ${event.scripture_reference}` : ''}`
                      }
                      accessibilityRole="text"
                    >
                      {/* Timeline indicator */}
                      <View className="w-6 items-center mr-3">
                        <View
                          className="w-3 h-3 rounded-full border-[3px]"
                          style={{
                            backgroundColor: ExploreColors.primary[500],
                            borderColor: ExploreColors.primary[100],
                          }}
                        />
                        {!isLast && (
                          <View
                            className="flex-1 w-0.5 mt-1"
                            style={{ backgroundColor: ExploreColors.primary[200] }}
                          />
                        )}
                      </View>

                      {/* Event content */}
                      <View className="flex-1 pb-1">
                        <Text
                          className="text-lg font-semibold mb-1"
                          style={{ color: ExploreColors.neutral[900] }}
                        >
                          {eventTitle}
                        </Text>
                        {eventDescription && (
                          <Text
                            className="text-base leading-6 mb-1"
                            style={{ color: ExploreColors.neutral[700] }}
                          >
                            {eventDescription}
                          </Text>
                        )}
                        {event.scripture_reference && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <BookOpen size={14} color={ExploreColors.spiritual[600]} />
                            <Text
                              className="text-sm font-semibold"
                              style={{ color: ExploreColors.spiritual[600] }}
                            >
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
              <View className="mb-6">
                <Text
                  className="text-xl font-bold mb-3"
                  style={{ color: ExploreColors.neutral[900] }}
                  accessibilityRole="header"
                >
                  {contentLanguage === 'en' ? 'Biography' : 'Biografi'}
                </Text>
                <Text
                  className="text-base leading-7"
                  style={{ color: ExploreColors.neutral[800] }}
                >
                  {biography}
                </Text>
              </View>
            )}

            {/* Related Scriptures */}
            {figure.related_scriptures && figure.related_scriptures.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center gap-1 mb-3">
                  <BookOpen size={20} color={ExploreColors.spiritual[600]} />
                  <Text
                    className="text-xl font-bold"
                    style={{ color: ExploreColors.neutral[900] }}
                    accessibilityRole="header"
                  >
                    {contentLanguage === 'en' ? 'Related Scriptures' : 'Ayat Terkait'}
                  </Text>
                </View>

                {figure.related_scriptures.map((scripture, index) => (
                  <View
                    key={index}
                    className="rounded-xl p-4 mb-2 border-l-4"
                    style={{
                      backgroundColor: ExploreColors.spiritual[50],
                      borderLeftColor: ExploreColors.spiritual[500],
                    }}
                    accessible={true}
                    accessibilityLabel={
                      contentLanguage === 'en'
                        ? `Related scripture ${index + 1}: ${typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.en || ''}. From ${scripture.book} chapter ${scripture.chapter}, verse ${scripture.verse_start}`
                        : `Ayat terkait ${index + 1}: ${typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.id || ''}. Dari ${scripture.book} pasal ${scripture.chapter}, ayat ${scripture.verse_start}`
                    }
                    accessibilityRole="text"
                  >
                    <Text
                      className="text-base leading-6 mb-2 italic"
                      style={{ color: ExploreColors.neutral[900] }}
                    >
                      "{typeof scripture.text === 'string' ? scripture.text : scripture.text?.[contentLanguage] || scripture.text?.en || ''}"
                    </Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: ExploreColors.spiritual[700] }}
                    >
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
              <View className="mb-6">
                <Text
                  className="text-xl font-bold mb-3"
                  style={{ color: ExploreColors.neutral[900] }}
                  accessibilityRole="header"
                >
                  {contentLanguage === 'en' ? 'Life Lessons' : 'Pelajaran Hidup'}
                </Text>
                {figure.life_lessons.map((lesson, index: number) => {
                  const lessonText = lesson[contentLanguage] || lesson.en || '';
                  return (
                    <View
                      key={index}
                      className="flex-row mb-3"
                      accessible={true}
                      accessibilityLabel={
                        contentLanguage === 'en'
                          ? `Lesson ${index + 1}: ${lessonText}`
                          : `Pelajaran ${index + 1}: ${lessonText}`
                      }
                      accessibilityRole="text"
                    >
                      <View
                        className="w-7 h-7 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: ExploreColors.secondary[100] }}
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{ color: ExploreColors.secondary[700] }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        className="flex-1 text-base leading-6"
                        style={{ color: ExploreColors.neutral[800] }}
                      >
                        {lessonText}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Tags */}
            {figure.tags && figure.tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {figure.tags.map((tag, index) => (
                  <View
                    key={index}
                    className="px-3 py-1 rounded-2xl"
                    style={{ backgroundColor: ExploreColors.primary[50] }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: ExploreColors.primary[700] }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Bottom spacing for button */}
            <View className="h-[100px]" />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Complete Button */}
      {!isCompleted && (
        <View
          className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t"
          style={{ borderTopColor: ExploreColors.neutral[100] }}
        >
          <Pressable
            onPress={handleComplete}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl ${trackComplete.isPending ? 'opacity-60' : ''}`}
            style={{ backgroundColor: ExploreColors.success[500] }}
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
            <Text className="text-base font-semibold text-white">
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
          className="absolute bottom-5 left-0 right-0 items-center"
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            contentLanguage === 'en'
              ? 'This Bible figure has been completed'
              : 'Tokoh Alkitab ini telah diselesaikan'
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
    </SafeAreaView>
  );
}
