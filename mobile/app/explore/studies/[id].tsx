/**
 * Bible Study Reader Screen
 *
 * Design: Multi-lesson study with progress tracking
 * - Lesson navigation (prev/next)
 * - Progress indicator
 * - Scripture references with quick view
 * - Discussion questions
 * - Notes capability
 * - Completion tracking per lesson
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useContentById,
  useTrackLessonStart,
  useTrackLessonComplete,
  useBookmarkContent,
  useIsBookmarked,
  useLessonProgress,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleStudy, StudyLesson } from '@/types/explore';
import {
  ArrowLeft,
  BookmarkIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MessageCircle,
  Share2,
} from 'lucide-react-native';
import { BibleStudySkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function BibleStudyReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  // Data queries
  const { data: study, isLoading } = useContentById<BibleStudy>('bible_study', id as string);
  const isBookmarked = useIsBookmarked(id as string);
  const lessonProgress = useLessonProgress(id as string);

  // Mutations
  const trackLessonStart = useTrackLessonStart();
  const trackLessonComplete = useTrackLessonComplete();
  const bookmarkMutation = useBookmarkContent();

  const currentLesson = study?.lessons[currentLessonIndex] as StudyLesson | undefined;
  const totalLessons = study?.lessons.length || 0;
  const completedLessons = lessonProgress?.lessons_completed || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Track lesson start
  useEffect(() => {
    if (id && currentLesson && !hasTrackedStart) {
      const lessonId = currentLesson.id || `lesson-${currentLessonIndex}`;
      const isLessonCompleted = lessonProgress?.completed_lesson_ids?.includes(lessonId);

      if (!isLessonCompleted) {
        trackLessonStart.mutate({
          studyId: id as string,
          lessonId,
          lessonIndex: currentLessonIndex,
        });
      }
      setHasTrackedStart(true);
    }
  }, [id, currentLesson, currentLessonIndex, hasTrackedStart]);

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      setHasTrackedStart(false);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setHasTrackedStart(false);
    }
  };

  const handleCompleteLesson = () => {
    if (!currentLesson || !id) return;

    const lessonId = currentLesson.id || `lesson-${currentLessonIndex}`;
    trackLessonComplete.mutate({
      studyId: id as string,
      lessonId,
      lessonIndex: currentLessonIndex,
    });

    // Auto-advance to next lesson
    if (currentLessonIndex < totalLessons - 1) {
      setTimeout(() => {
        handleNextLesson();
      }, 1000);
    }
  };

  const handleBookmark = () => {
    if (id) {
      bookmarkMutation.mutate({ contentId: id as string, bookmarked: !isBookmarked });
    }
  };

  const isLessonCompleted = (lessonIndex: number): boolean => {
    if (!currentLesson) return false;
    const lessonId = study?.lessons[lessonIndex]?.id || `lesson-${lessonIndex}`;
    return lessonProgress?.completed_lesson_ids?.includes(lessonId) || false;
  };

  const currentLessonCompleted = isLessonCompleted(currentLessonIndex);

  if (isLoading || !study || !currentLesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <BibleStudySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const studyTitle = study.title[contentLanguage] || study.title.en;
  const lessonTitle = currentLesson.title[contentLanguage] || currentLesson.title.en;
  const lessonContent = currentLesson.content[contentLanguage] || currentLesson.content.en;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.lessonCounter}>
            {currentLessonIndex + 1} / {totalLessons}
          </Text>
        </View>

        <Pressable onPress={handleBookmark} style={styles.iconButton}>
          <BookmarkIcon
            size={24}
            color={isBookmarked ? ExploreColors.primary[500] : ExploreColors.neutral[400]}
            fill={isBookmarked ? ExploreColors.primary[500] : 'transparent'}
          />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {progressPercentage}% {contentLanguage === 'en' ? 'Complete' : 'Selesai'}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.contentContainer}>
          {/* Study Title */}
          <Text style={styles.studyTitle}>{studyTitle}</Text>

          {/* Lesson Title */}
          <Text style={styles.lessonTitle}>{lessonTitle}</Text>

          {/* Lesson Content */}
          <Text style={styles.lessonContent}>{lessonContent}</Text>

          {/* Scripture References */}
          {currentLesson.scripture_references && currentLesson.scripture_references.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BookOpen size={20} color={ExploreColors.spiritual[600]} />
                <Text style={styles.sectionTitle}>
                  {contentLanguage === 'en' ? 'Scripture References' : 'Referensi Alkitab'}
                </Text>
              </View>

              {currentLesson.scripture_references.map((reference, index) => (
                <View key={index} style={styles.scriptureCard}>
                  <Text style={styles.scriptureText}>"{reference.text}"</Text>
                  <Text style={styles.scriptureReference}>
                    {reference.book} {reference.chapter}:{reference.verse_start}
                    {reference.verse_end && reference.verse_end !== reference.verse_start
                      ? `-${reference.verse_end}`
                      : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Discussion Questions */}
          {currentLesson.discussion_questions &&
            currentLesson.discussion_questions[contentLanguage]?.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MessageCircle size={20} color={ExploreColors.secondary[600]} />
                  <Text style={styles.sectionTitle}>
                    {contentLanguage === 'en' ? 'Discussion Questions' : 'Pertanyaan Diskusi'}
                  </Text>
                </View>

                {currentLesson.discussion_questions[contentLanguage].map((question, index) => (
                  <View key={index} style={styles.questionItem}>
                    <View style={styles.questionNumber}>
                      <Text style={styles.questionNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.questionText}>{question}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* Application */}
          {currentLesson.application && currentLesson.application[contentLanguage] && (
            <View style={styles.applicationCard}>
              <Text style={styles.applicationTitle}>
                {contentLanguage === 'en' ? 'Application' : 'Aplikasi'}
              </Text>
              <Text style={styles.applicationText}>
                {currentLesson.application[contentLanguage]}
              </Text>
            </View>
          )}

          {/* Bottom spacing for buttons */}
          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* Navigation & Complete */}
      <View style={styles.bottomContainer}>
        {/* Navigation Buttons */}
        <View style={styles.navigationRow}>
          <Pressable
            onPress={handlePreviousLesson}
            disabled={currentLessonIndex === 0}
            style={[
              styles.navButton,
              currentLessonIndex === 0 && styles.navButtonDisabled,
            ]}
          >
            <ChevronLeft size={20} color={currentLessonIndex === 0 ? ExploreColors.neutral[300] : ExploreColors.primary[600]} />
            <Text style={[
              styles.navButtonText,
              currentLessonIndex === 0 && styles.navButtonTextDisabled,
            ]}>
              {contentLanguage === 'en' ? 'Previous' : 'Sebelumnya'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextLesson}
            disabled={currentLessonIndex === totalLessons - 1}
            style={[
              styles.navButton,
              currentLessonIndex === totalLessons - 1 && styles.navButtonDisabled,
            ]}
          >
            <Text style={[
              styles.navButtonText,
              currentLessonIndex === totalLessons - 1 && styles.navButtonTextDisabled,
            ]}>
              {contentLanguage === 'en' ? 'Next' : 'Berikutnya'}
            </Text>
            <ChevronRight size={20} color={currentLessonIndex === totalLessons - 1 ? ExploreColors.neutral[300] : ExploreColors.primary[600]} />
          </Pressable>
        </View>

        {/* Complete Button */}
        {!currentLessonCompleted && (
          <Pressable
            onPress={handleCompleteLesson}
            style={[
              styles.completeButton,
              trackLessonComplete.isPending && styles.completeButtonDisabled,
            ]}
            disabled={trackLessonComplete.isPending}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>
              {trackLessonComplete.isPending
                ? contentLanguage === 'en'
                  ? 'Completing...'
                  : 'Menyelesaikan...'
                : contentLanguage === 'en'
                ? 'Mark Lesson Complete'
                : 'Tandai Pelajaran Selesai'}
            </Text>
          </Pressable>
        )}

        {/* Completed Badge */}
        {currentLessonCompleted && (
          <View style={styles.completedBadge}>
            <Check size={16} color={ExploreColors.success[600]} />
            <Text style={styles.completedText}>
              {contentLanguage === 'en' ? 'Lesson Completed' : 'Pelajaran Selesai'}
            </Text>
          </View>
        )}
      </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  lessonCounter: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    fontWeight: '700',
  },
  iconButton: {
    padding: ExploreSpacing.xs,
  },
  progressBarContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingVertical: ExploreSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ExploreColors.neutral[100],
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: ExploreColors.neutral[100],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: ExploreSpacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 3,
  },
  progressText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
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
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.lg,
  },
  studyTitle: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[600],
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: ExploreSpacing.xs,
  },
  lessonTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.lg,
  },
  lessonContent: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 28,
    marginBottom: ExploreSpacing.xl,
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
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
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
  questionItem: {
    flexDirection: 'row',
    marginBottom: ExploreSpacing.md,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ExploreColors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ExploreSpacing.md,
  },
  questionNumberText: {
    ...ExploreTypography.body,
    color: ExploreColors.secondary[700],
    fontWeight: '700',
    fontSize: 14,
  },
  questionText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 24,
    flex: 1,
  },
  applicationCard: {
    backgroundColor: ExploreColors.primary[50],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
    marginBottom: ExploreSpacing.lg,
  },
  applicationTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.primary[800],
    marginBottom: ExploreSpacing.sm,
  },
  applicationText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 24,
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
    gap: ExploreSpacing.sm,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ExploreSpacing.sm,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    paddingHorizontal: ExploreSpacing.lg,
    paddingVertical: ExploreSpacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ExploreColors.primary[200],
  },
  navButtonDisabled: {
    borderColor: ExploreColors.neutral[200],
  },
  navButtonText: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[600],
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: ExploreColors.neutral[400],
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.xs,
    backgroundColor: ExploreColors.success[50],
    paddingVertical: ExploreSpacing.sm,
    borderRadius: 12,
  },
  completedText: {
    ...ExploreTypography.body,
    color: ExploreColors.success[700],
    fontWeight: '600',
  },
});
