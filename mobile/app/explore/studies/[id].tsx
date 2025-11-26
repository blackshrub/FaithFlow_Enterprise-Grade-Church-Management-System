/**
 * Bible Study Reader Screen
 *
 * Design: E-learning style multi-lesson study with progress tracking
 * - Introduction page with course overview (must confirm before starting)
 * - Lesson navigation (prev/next)
 * - Progress indicator
 * - Scripture references with quick view
 * - Discussion questions
 * - Markdown content rendering
 * - Completion tracking per lesson
 */

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useContentById,
  useTrackLessonStart,
  useTrackLessonComplete,
  useLessonProgress,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { BibleStudy, StudyLesson } from '@/types/explore';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MessageCircle,
  Play,
  Clock,
  GraduationCap,
  Target,
  CheckCircle2,
} from 'lucide-react-native';
import { BibleStudySkeleton } from '@/components/explore/LoadingSkeleton';
import { MarkdownText } from '@/components/explore/MarkdownText';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function BibleStudyReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // View state: 'intro' | 'lessons'
  const [viewMode, setViewMode] = useState<'intro' | 'lessons'>('intro');
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Data queries
  const { data: study, isLoading } = useContentById<BibleStudy>('bible_study', id as string);
  const lessonProgress = useLessonProgress(id as string);

  // Mutations
  const trackLessonStart = useTrackLessonStart();
  const trackLessonComplete = useTrackLessonComplete();

  const currentLesson = study?.lessons[currentLessonIndex] as StudyLesson | undefined;
  const totalLessons = study?.lessons.length || 0;
  const completedLessons = lessonProgress?.lessons_completed || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check if user has started this study before - only run ONCE on initial load
  useEffect(() => {
    if (!hasInitialized && lessonProgress && lessonProgress.lessons_completed > 0) {
      setViewMode('lessons');
      setHasInitialized(true);
    } else if (lessonProgress !== undefined) {
      // Mark as initialized even if no progress
      setHasInitialized(true);
    }
  }, [lessonProgress, hasInitialized]);

  // Track lesson start
  useEffect(() => {
    if (id && currentLesson && !hasTrackedStart && viewMode === 'lessons') {
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
  }, [id, currentLesson, currentLessonIndex, hasTrackedStart, viewMode]);

  const handleStartCourse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewMode('lessons');
    setCurrentLessonIndex(0);
  };

  const handlePreviousLesson = () => {
    if (currentLessonIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentLessonIndex(currentLessonIndex - 1);
      setHasTrackedStart(false);
    }
  };

  const handleNextLesson = () => {
    if (currentLessonIndex < totalLessons - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentLessonIndex(currentLessonIndex + 1);
      setHasTrackedStart(false);
    }
  };

  const handleCompleteLesson = () => {
    if (!currentLesson || !id) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const isLessonCompleted = (lessonIndex: number): boolean => {
    const lessonId = study?.lessons[lessonIndex]?.id || `lesson-${lessonIndex}`;
    return lessonProgress?.completed_lesson_ids?.includes(lessonId) || false;
  };

  const currentLessonCompleted = isLessonCompleted(currentLessonIndex);

  // Navigate back to Bible Studies list
  const handleGoBack = () => {
    router.replace('/explore/studies');
  };

  // Navigate back to course introduction (from lesson view)
  const handleBackToIntro = () => {
    setViewMode('intro');
  };

  if (isLoading || !study) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
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
  const studyDescription = study.description?.[contentLanguage] || study.description?.en || '';
  const studyIntroduction = study.introduction?.[contentLanguage] || study.introduction?.en || studyDescription;
  const learningObjectives = study.learning_objectives || [];

  // ==================== INTRODUCTION VIEW ====================
  if (viewMode === 'intro') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.introScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View entering={FadeIn.duration(400)}>
            <ImageBackground
              source={{
                uri: study.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
              }}
              style={styles.introHero}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
                style={styles.introHeroGradient}
              >
                {/* Back Button */}
                <Pressable
                  onPress={handleGoBack}
                  style={styles.introBackButton}
                >
                  <ArrowLeft size={24} color="#FFFFFF" />
                </Pressable>

                {/* Course Info on Hero */}
                <View style={styles.introHeroContent}>
                  <View style={styles.introMetaRow}>
                    <View style={styles.introMetaItem}>
                      <GraduationCap size={14} color="#FFFFFF" />
                      <Text style={styles.introMetaText}>
                        {totalLessons} {contentLanguage === 'en' ? 'Lessons' : 'Pelajaran'}
                      </Text>
                    </View>
                    <View style={styles.introMetaItem}>
                      <Clock size={14} color="#FFFFFF" />
                      <Text style={styles.introMetaText}>
                        {study.estimated_duration_minutes || 30} {contentLanguage === 'en' ? 'min' : 'mnt'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.introHeroTitle}>{studyTitle}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.introContent}>
            {/* Introduction */}
            <View style={styles.introSection}>
              <Text style={styles.introSectionTitle}>
                {contentLanguage === 'en' ? 'About This Course' : 'Tentang Kursus Ini'}
              </Text>
              <MarkdownText style={styles.introText}>{studyIntroduction}</MarkdownText>
            </View>

            {/* Learning Objectives */}
            {learningObjectives.length > 0 && (
              <View style={styles.introSection}>
                <View style={styles.objectivesHeader}>
                  <Target size={20} color={ExploreColors.primary[600]} />
                  <Text style={styles.introSectionTitle}>
                    {contentLanguage === 'en' ? 'What You Will Learn' : 'Yang Akan Anda Pelajari'}
                  </Text>
                </View>
                {learningObjectives.map((objective, index) => {
                  const text = objective[contentLanguage] || objective.en;
                  return (
                    <View key={index} style={styles.objectiveItem}>
                      <CheckCircle2 size={18} color={ExploreColors.success[500]} />
                      <Text style={styles.objectiveText}>{text}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Course Syllabus */}
            <View style={styles.introSection}>
              <Text style={styles.introSectionTitle}>
                {contentLanguage === 'en' ? 'Course Syllabus' : 'Silabus Kursus'}
              </Text>
              <View style={styles.syllabusList}>
                {study.lessons.map((lesson, index) => {
                  const lessonTitle = lesson.title[contentLanguage] || lesson.title.en;
                  const completed = isLessonCompleted(index);
                  return (
                    <View key={index} style={styles.syllabusItem}>
                      <View style={[
                        styles.syllabusNumber,
                        completed && styles.syllabusNumberCompleted,
                      ]}>
                        {completed ? (
                          <Check size={14} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.syllabusNumberText}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.syllabusContent}>
                        <Text style={styles.syllabusTitle} numberOfLines={2}>
                          {lessonTitle}
                        </Text>
                        {lesson.duration_minutes && (
                          <Text style={styles.syllabusDuration}>
                            {lesson.duration_minutes} {contentLanguage === 'en' ? 'min' : 'mnt'}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Progress if already started */}
            {progressPercentage > 0 && (
              <View style={styles.introProgressSection}>
                <Text style={styles.introProgressLabel}>
                  {contentLanguage === 'en' ? 'Your Progress' : 'Progress Anda'}
                </Text>
                <View style={styles.introProgressBarBg}>
                  <View style={[styles.introProgressBarFill, { width: `${progressPercentage}%` }]} />
                </View>
                <Text style={styles.introProgressText}>
                  {progressPercentage}% {contentLanguage === 'en' ? 'Complete' : 'Selesai'}
                </Text>
              </View>
            )}

            {/* Bottom spacing */}
            <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>

        {/* Start/Continue Button */}
        <View style={styles.introBottomContainer}>
          <Pressable onPress={handleStartCourse} style={styles.startCourseButton}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startCourseButtonText}>
              {progressPercentage > 0
                ? (contentLanguage === 'en' ? 'Continue Course' : 'Lanjutkan Kursus')
                : (contentLanguage === 'en' ? 'Start Course' : 'Mulai Kursus')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== LESSON VIEW ====================
  if (!currentLesson) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <BibleStudySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lessonTitle = currentLesson.title[contentLanguage] || currentLesson.title.en;
  const lessonContent = currentLesson.content[contentLanguage] || currentLesson.content.en;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.lessonCounter}>
            {currentLessonIndex + 1} / {totalLessons}
          </Text>
        </View>

        <View style={{ width: 40 }} />
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

          {/* Lesson Content - with Markdown */}
          <MarkdownText style={styles.lessonContent}>{lessonContent}</MarkdownText>

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
                  {reference.text && (
                    <MarkdownText style={styles.scriptureText}>
                      {`"${reference.text}"`}
                    </MarkdownText>
                  )}
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
              <MarkdownText style={styles.applicationText}>
                {currentLesson.application[contentLanguage]}
              </MarkdownText>
            </View>
          )}

          {/* Bottom spacing for buttons */}
          <View style={{ height: 140 }} />
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
  // Introduction View Styles
  introScrollContent: {
    paddingBottom: ExploreSpacing.xl,
  },
  introHero: {
    height: 280,
  },
  introHeroGradient: {
    flex: 1,
    padding: ExploreSpacing.lg,
    justifyContent: 'space-between',
  },
  introBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introHeroContent: {
    marginTop: 'auto',
  },
  introMetaRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.sm,
  },
  introMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  introMetaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  introHeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  introContent: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing.xl,
  },
  introSection: {
    marginBottom: ExploreSpacing.xl,
  },
  introSectionTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.md,
  },
  introText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    lineHeight: 26,
  },
  objectivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.md,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ExploreSpacing.sm,
    marginBottom: ExploreSpacing.sm,
  },
  objectiveText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    flex: 1,
    lineHeight: 24,
  },
  syllabusList: {
    gap: ExploreSpacing.sm,
  },
  syllabusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 12,
    padding: ExploreSpacing.md,
    gap: ExploreSpacing.md,
  },
  syllabusNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ExploreColors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  syllabusNumberCompleted: {
    backgroundColor: ExploreColors.success[500],
  },
  syllabusNumberText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    fontWeight: '700',
    fontSize: 14,
  },
  syllabusContent: {
    flex: 1,
  },
  syllabusTitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    fontWeight: '600',
  },
  syllabusDuration: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
    marginTop: 2,
  },
  introProgressSection: {
    backgroundColor: ExploreColors.primary[50],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
    gap: ExploreSpacing.sm,
  },
  introProgressLabel: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[800],
    fontWeight: '600',
  },
  introProgressBarBg: {
    height: 8,
    backgroundColor: ExploreColors.primary[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  introProgressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.primary[500],
    borderRadius: 4,
  },
  introProgressText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[600],
    fontWeight: '600',
    textAlign: 'right',
  },
  introBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: ExploreSpacing.screenMargin,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: ExploreColors.neutral[100],
  },
  startCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  startCourseButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // Lesson View Styles
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
