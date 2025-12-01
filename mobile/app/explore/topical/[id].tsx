/**
 * Topical Verses List Screen
 *
 * Design: Verses for a specific topic
 * - Category header with description
 * - Verse cards with copy/share
 * - Bookmark functionality
 * - Related categories suggestions
 */

import React from 'react';
import { ScrollView, View, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import {
  useTopicalCategory,
  useTopicalVerses,
  useBookmarkVerse,
  useIsVerseBookmarked,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { TopicalVerse } from '@/types/explore';
import {
  ArrowLeft,
  BookmarkIcon,
  Share2,
  Copy,
  ChevronRight,
} from 'lucide-react-native';
import { ExploreCard } from '@/components/explore/ExploreCard';
import { EmptyState } from '@/components/explore/EmptyState';
import { TopicalVersesSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

export default function TopicalVersesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // Data queries
  const { data: category, isLoading: categoryLoading } = useTopicalCategory(id as string);
  const { data: verses, isLoading: versesLoading } = useTopicalVerses(id as string);

  const isLoading = categoryLoading || versesLoading;

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
        </View>
        <ScrollView contentContainerStyle={{ padding: ExploreSpacing.screenMargin }}>
          <TopicalVersesSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!category) {
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
        </View>
        <EmptyState
          type="no_content"
          message={contentLanguage === 'en' ? 'Category not found' : 'Kategori tidak ditemukan'}
        />
      </SafeAreaView>
    );
  }

  const categoryName = category.name[contentLanguage] || category.name.en;
  const categoryDescription = category.description?.[contentLanguage] || category.description?.en;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
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
          numberOfLines={1}
          style={{
            ...ExploreTypography.h4,
            color: ExploreColors.neutral[900],
          }}
        >
          {categoryName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: ExploreSpacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="border-b"
          style={{
            paddingHorizontal: ExploreSpacing.screenMargin,
            paddingTop: ExploreSpacing.xl,
            paddingBottom: ExploreSpacing.lg,
            borderBottomColor: ExploreColors.neutral[100],
            marginBottom: ExploreSpacing.lg,
          }}
        >
          <Text
            style={{
              ...ExploreTypography.h2,
              color: ExploreColors.neutral[900],
              marginBottom: ExploreSpacing.sm,
            }}
          >
            {categoryName}
          </Text>
          {categoryDescription && (
            <Text
              style={{
                ...ExploreTypography.body,
                color: ExploreColors.neutral[700],
                lineHeight: 24,
                marginBottom: ExploreSpacing.sm,
              }}
            >
              {categoryDescription}
            </Text>
          )}
          <Text
            className="font-bold uppercase"
            style={{
              ...ExploreTypography.caption,
              color: ExploreColors.primary[600],
            }}
          >
            {verses?.length || 0} {contentLanguage === 'en' ? 'verses' : 'ayat'}
          </Text>
        </Animated.View>

        {/* Verses List */}
        {!verses || verses.length === 0 ? (
          <EmptyState
            type="no_content"
            message={
              contentLanguage === 'en'
                ? 'No verses available for this topic'
                : 'Belum ada ayat tersedia untuk topik ini'
            }
          />
        ) : (
          <View style={{ paddingHorizontal: ExploreSpacing.screenMargin }}>
            {verses.map((verse: Partial<TopicalVerse> & { id: string }, index: number) => (
              <VerseCard
                key={verse.id}
                verse={verse}
                contentLanguage={contentLanguage}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Related Categories */}
        {category.related_categories && category.related_categories.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            className="border-t"
            style={{
              paddingHorizontal: ExploreSpacing.screenMargin,
              paddingTop: ExploreSpacing.xl,
              marginTop: ExploreSpacing.lg,
              borderTopColor: ExploreColors.neutral[100],
            }}
          >
            <Text
              style={{
                ...ExploreTypography.h4,
                color: ExploreColors.neutral[900],
                marginBottom: ExploreSpacing.md,
              }}
            >
              {contentLanguage === 'en' ? 'Related Topics' : 'Topik Terkait'}
            </Text>
            <View>
              {category.related_categories.map((relatedId, index) => (
                <Pressable
                  key={relatedId}
                  onPress={() => router.push(`/explore/topical/${relatedId}`)}
                  className="flex-row justify-between items-center"
                  style={{
                    backgroundColor: ExploreColors.neutral[50],
                    borderRadius: 12,
                    paddingHorizontal: ExploreSpacing.md,
                    paddingVertical: ExploreSpacing.sm,
                    marginBottom: ExploreSpacing.xs,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{
                      ...ExploreTypography.body,
                      color: ExploreColors.primary[700],
                    }}
                  >
                    {/* In real app, fetch category name by ID */}
                    {contentLanguage === 'en' ? 'Related Topic' : 'Topik Terkait'} {index + 1}
                  </Text>
                  <ChevronRight size={16} color={ExploreColors.primary[600]} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Use partial type since mock data may not have all fields
interface VerseCardProps {
  verse: Partial<TopicalVerse> & { id: string };
  contentLanguage: string;
  index: number;
}

function VerseCard({ verse, contentLanguage, index }: VerseCardProps) {
  const isBookmarked = useIsVerseBookmarked(verse.id);
  const bookmarkMutation = useBookmarkVerse();

  // Format the reference with localized book name and translation
  const lang = contentLanguage as 'en' | 'id';

  // Support both backend model (verse.verse, commentary, application)
  // and transformed mock data (text, reference, application_note)
  const verseRef = (verse as any).verse || (verse as any).reference;
  const verseText = (verse as any).text?.[lang] ||
                    (verse as any).text?.en ||
                    (verse as any).commentary?.[lang] ||
                    (verse as any).commentary?.en ||
                    '';
  const applicationNote = (verse as any).application_note ||
                          (verse as any).application;
  const reference = formatBibleReference(verseRef as any, lang);

  const handleBookmark = () => {
    bookmarkMutation.mutate({ verseId: verse.id, bookmarked: !isBookmarked });
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(`"${verseText}"\n\n${reference}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${verseText}"\n\n${reference}\n\nShared from FaithFlow`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <ExploreCard style={{ marginBottom: ExploreSpacing.md }}>
        {/* Verse Text */}
        <Text
          className="italic"
          style={{
            ...ExploreTypography.body,
            color: ExploreColors.neutral[900],
            lineHeight: 28,
            fontSize: 17,
          }}
        >
          "{verseText}"
        </Text>
        <Text
          className="font-bold"
          style={{
            ...ExploreTypography.body,
            color: ExploreColors.spiritual[700],
          }}
        >
          {reference}
        </Text>

        {/* Actions */}
        <View
          className="flex-row border-t"
          style={{
            paddingTop: ExploreSpacing.sm,
            borderTopColor: ExploreColors.neutral[100],
            marginTop: ExploreSpacing.sm,
          }}
        >
          <Pressable
            onPress={handleCopy}
            className="flex-row items-center"
            style={{ marginRight: ExploreSpacing.lg }}
          >
            <Copy size={18} color={ExploreColors.neutral[600]} />
            <Text
              className="font-semibold"
              style={{
                ...ExploreTypography.caption,
                color: ExploreColors.neutral[600],
              }}
            >
              {contentLanguage === 'en' ? 'Copy' : 'Salin'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleBookmark}
            className="flex-row items-center"
            style={{ marginRight: ExploreSpacing.lg }}
          >
            <BookmarkIcon
              size={18}
              color={isBookmarked ? ExploreColors.primary[600] : ExploreColors.neutral[600]}
              fill={isBookmarked ? ExploreColors.primary[600] : 'transparent'}
            />
            <Text
              className="font-semibold"
              style={{
                ...ExploreTypography.caption,
                color: isBookmarked ? ExploreColors.primary[600] : ExploreColors.neutral[600],
              }}
            >
              {contentLanguage === 'en' ? 'Save' : 'Simpan'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="flex-row items-center"
            style={{ marginRight: ExploreSpacing.lg }}
          >
            <Share2 size={18} color={ExploreColors.neutral[600]} />
            <Text
              className="font-semibold"
              style={{
                ...ExploreTypography.caption,
                color: ExploreColors.neutral[600],
              }}
            >
              {contentLanguage === 'en' ? 'Share' : 'Bagikan'}
            </Text>
          </Pressable>
        </View>

        {/* Application Note */}
        {applicationNote && (applicationNote[contentLanguage] || applicationNote.en || applicationNote) && (
          <View
            className="italic"
            style={{
              backgroundColor: ExploreColors.primary[50],
              borderRadius: 8,
              padding: ExploreSpacing.sm,
              marginTop: ExploreSpacing.xs,
            }}
          >
            <Text
              style={{
                ...ExploreTypography.caption,
                color: ExploreColors.neutral[800],
                lineHeight: 18,
                fontStyle: 'italic',
              }}
            >
              {applicationNote[contentLanguage] || applicationNote.en || applicationNote}
            </Text>
          </View>
        )}
      </ExploreCard>
    </Animated.View>
  );
}

