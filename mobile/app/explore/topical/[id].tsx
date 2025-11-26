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
import { ScrollView, View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <TopicalVersesSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{categoryName}</Text>
          {categoryDescription && (
            <Text style={styles.categoryDescription}>{categoryDescription}</Text>
          )}
          <Text style={styles.verseCount}>
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
          <View style={styles.versesList}>
            {verses.map((verse, index) => (
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
            style={styles.relatedSection}
          >
            <Text style={styles.relatedTitle}>
              {contentLanguage === 'en' ? 'Related Topics' : 'Topik Terkait'}
            </Text>
            <View style={styles.relatedList}>
              {category.related_categories.map((relatedId, index) => (
                <Pressable
                  key={relatedId}
                  onPress={() => router.push(`/explore/topical/${relatedId}`)}
                  style={styles.relatedItem}
                >
                  <Text style={styles.relatedItemText}>
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

interface VerseCardProps {
  verse: TopicalVerse;
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
      <ExploreCard style={styles.verseCard}>
        {/* Verse Text */}
        <Text style={styles.verseText}>"{verseText}"</Text>
        <Text style={styles.verseReference}>{reference}</Text>

        {/* Actions */}
        <View style={styles.verseActions}>
          <Pressable onPress={handleCopy} style={styles.actionButton}>
            <Copy size={18} color={ExploreColors.neutral[600]} />
            <Text style={styles.actionText}>
              {contentLanguage === 'en' ? 'Copy' : 'Salin'}
            </Text>
          </Pressable>

          <Pressable onPress={handleBookmark} style={styles.actionButton}>
            <BookmarkIcon
              size={18}
              color={isBookmarked ? ExploreColors.primary[600] : ExploreColors.neutral[600]}
              fill={isBookmarked ? ExploreColors.primary[600] : 'transparent'}
            />
            <Text style={[styles.actionText, isBookmarked && styles.actionTextActive]}>
              {contentLanguage === 'en' ? 'Save' : 'Simpan'}
            </Text>
          </Pressable>

          <Pressable onPress={handleShare} style={styles.actionButton}>
            <Share2 size={18} color={ExploreColors.neutral[600]} />
            <Text style={styles.actionText}>
              {contentLanguage === 'en' ? 'Share' : 'Bagikan'}
            </Text>
          </Pressable>
        </View>

        {/* Application Note */}
        {applicationNote && (applicationNote[contentLanguage] || applicationNote.en || applicationNote) && (
          <View style={styles.applicationNote}>
            <Text style={styles.applicationNoteText}>
              {applicationNote[contentLanguage] || applicationNote.en || applicationNote}
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
    ...ExploreTypography.h4,
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
  categoryHeader: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
    paddingBottom: ExploreSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ExploreColors.neutral[100],
    marginBottom: ExploreSpacing.lg,
  },
  categoryTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.sm,
  },
  categoryDescription: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 24,
    marginBottom: ExploreSpacing.sm,
  },
  verseCount: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[600],
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  versesList: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    gap: ExploreSpacing.md,
  },
  verseCard: {
    gap: ExploreSpacing.sm,
  },
  verseText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[900],
    fontStyle: 'italic',
    lineHeight: 28,
    fontSize: 17,
  },
  verseReference: {
    ...ExploreTypography.body,
    color: ExploreColors.spiritual[700],
    fontWeight: '700',
  },
  verseActions: {
    flexDirection: 'row',
    gap: ExploreSpacing.lg,
    paddingTop: ExploreSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: ExploreColors.neutral[100],
    marginTop: ExploreSpacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    fontWeight: '600',
  },
  actionTextActive: {
    color: ExploreColors.primary[600],
  },
  applicationNote: {
    backgroundColor: ExploreColors.primary[50],
    borderRadius: 8,
    padding: ExploreSpacing.sm,
    marginTop: ExploreSpacing.xs,
  },
  applicationNoteText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[800],
    lineHeight: 18,
    fontStyle: 'italic',
  },
  relatedSection: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
    marginTop: ExploreSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: ExploreColors.neutral[100],
  },
  relatedTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  relatedList: {
    gap: ExploreSpacing.xs,
  },
  relatedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.sm,
  },
  relatedItemText: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[700],
    fontWeight: '600',
  },
});
