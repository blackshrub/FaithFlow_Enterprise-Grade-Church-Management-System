/**
 * Bible Study Reader Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for ExploreColors and shadows
 * - React Native Reanimated for animations
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
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors } from '@/constants/explore/designSystem';
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
import { QuickAskInput } from '@/components/companion/QuickAskInput';
import { profileApi } from '@/services/api/explore';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedImage, sharedTags } from '@/utils/sharedTransitions';

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

  // Track content view for profile personalization
  useEffect(() => {
    if (id && study) {
      profileApi.trackContentView(
        id as string,
        'bible_study',
        study.topics || study.categories || [],
      ).catch(err => console.warn('[BibleStudy] Failed to track view:', err));
    }
  }, [id, study]);

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

  const handleGoBack = () => {
    router.replace('/explore/studies');
  };

  if (isLoading || !study) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row justify-between items-center px-3 py-2 border-b"
          style={{ borderBottomColor: ExploreColors.neutral[100] }}
        >
          <Pressable onPress={handleGoBack} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="p-5">
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ScrollView className="flex-1" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
          {/* Hero Section with shared element transition */}
          <View className="relative h-[280px]">
            {/* Background Image - Shared Element Transition */}
            <AnimatedImage
              source={{
                uri: study.cover_image_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800',
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
              sharedTransitionTag={sharedTags.studyImage(study.id)}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
              className="flex-1 p-4 justify-between"
            >
              {/* Back Button */}
              <Pressable
                onPress={handleGoBack}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </Pressable>

              {/* Course Info on Hero */}
              <View className="mt-auto">
                <View className="flex-row gap-3 mb-2">
                  <View className="flex-row items-center gap-1.5">
                    <GraduationCap size={14} color="#FFFFFF" />
                    <Text className="text-white text-[13px] font-semibold">
                      {totalLessons} {contentLanguage === 'en' ? 'Lessons' : 'Pelajaran'}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="#FFFFFF" />
                    <Text className="text-white text-[13px] font-semibold">
                      {study.estimated_duration_minutes || 30} {contentLanguage === 'en' ? 'min' : 'mnt'}
                    </Text>
                  </View>
                </View>
                <Animated.Text
                  className="text-[26px] font-extrabold text-white leading-8"
                  style={{
                    textShadowColor: 'rgba(0,0,0,0.5)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}
                >
                  {studyTitle}
                </Animated.Text>
              </View>
            </LinearGradient>
          </View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} className="px-5 pt-6">
            {/* Introduction */}
            <View className="mb-6">
              <Text
                className="text-lg font-semibold mb-3"
                style={{ color: ExploreColors.neutral[900] }}
              >
                {contentLanguage === 'en' ? 'About This Course' : 'Tentang Kursus Ini'}
              </Text>
              <MarkdownText
                className="text-base leading-[26px]"
                style={{ color: ExploreColors.neutral[700] }}
              >
                {studyIntroduction}
              </MarkdownText>
            </View>

            {/* Learning Objectives */}
            {learningObjectives.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center gap-2 mb-3">
                  <Target size={20} color={ExploreColors.primary[600]} />
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: ExploreColors.neutral[900] }}
                  >
                    {contentLanguage === 'en' ? 'What You Will Learn' : 'Yang Akan Anda Pelajari'}
                  </Text>
                </View>
                {learningObjectives.map((objective, index) => {
                  const text = objective[contentLanguage] || objective.en;
                  return (
                    <View key={index} className="flex-row items-start gap-2 mb-2">
                      <CheckCircle2 size={18} color={ExploreColors.success[500]} />
                      <Text
                        className="flex-1 text-base leading-6"
                        style={{ color: ExploreColors.neutral[700] }}
                      >
                        {text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Course Syllabus */}
            <View className="mb-6">
              <Text
                className="text-lg font-semibold mb-3"
                style={{ color: ExploreColors.neutral[900] }}
              >
                {contentLanguage === 'en' ? 'Course Syllabus' : 'Silabus Kursus'}
              </Text>
              <View className="gap-2">
                {study.lessons.map((lesson, index) => {
                  const lessonTitle = lesson.title[contentLanguage] || lesson.title.en;
                  const completed = isLessonCompleted(index);
                  return (
                    <View
                      key={index}
                      className="flex-row items-center rounded-xl p-3 gap-3"
                      style={{ backgroundColor: ExploreColors.neutral[50] }}
                    >
                      <View
                        className="w-8 h-8 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: completed
                            ? ExploreColors.success[500]
                            : ExploreColors.neutral[200],
                        }}
                      >
                        {completed ? (
                          <Check size={14} color="#FFFFFF" />
                        ) : (
                          <Text
                            className="text-sm font-bold"
                            style={{ color: ExploreColors.neutral[600] }}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold"
                          style={{ color: ExploreColors.neutral[800] }}
                          numberOfLines={2}
                        >
                          {lessonTitle}
                        </Text>
                        {lesson.duration_minutes && (
                          <Text
                            className="text-sm mt-0.5"
                            style={{ color: ExploreColors.neutral[500] }}
                          >
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
              <View
                className="rounded-2xl p-4 gap-2"
                style={{ backgroundColor: ExploreColors.primary[50] }}
              >
                <Text
                  className="text-base font-semibold"
                  style={{ color: ExploreColors.primary[800] }}
                >
                  {contentLanguage === 'en' ? 'Your Progress' : 'Progress Anda'}
                </Text>
                <View
                  className="h-2 rounded overflow-hidden"
                  style={{ backgroundColor: ExploreColors.primary[100] }}
                >
                  <View
                    className="h-full rounded"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: ExploreColors.primary[500],
                    }}
                  />
                </View>
                <Text
                  className="text-sm font-semibold text-right"
                  style={{ color: ExploreColors.primary[600] }}
                >
                  {progressPercentage}% {contentLanguage === 'en' ? 'Complete' : 'Selesai'}
                </Text>
              </View>
            )}

            {/* Bottom spacing */}
            <View className="h-[120px]" />
          </Animated.View>
        </ScrollView>

        {/* Start/Continue Button */}
        <View
          className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t"
          style={{ borderTopColor: ExploreColors.neutral[100] }}
        >
          <Pressable
            onPress={handleStartCourse}
            className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ backgroundColor: ExploreColors.primary[500] }}
          >
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
            <Text className="text-base font-bold text-white">
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
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View
          className="flex-row justify-between items-center px-3 py-2 border-b"
          style={{ borderBottomColor: ExploreColors.neutral[100] }}
        >
          <Pressable onPress={handleGoBack} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="p-5">
          <BibleStudySkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const lessonTitle = currentLesson.title[contentLanguage] || currentLesson.title.en;
  const lessonContent = currentLesson.content[contentLanguage] || currentLesson.content.en;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View
        className="flex-row justify-between items-center px-3 py-2 border-b"
        style={{ borderBottomColor: ExploreColors.neutral[100] }}
      >
        <Pressable onPress={handleGoBack} className="p-1">
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View className="flex-1 items-center">
          <Text
            className="text-base font-bold"
            style={{ color: ExploreColors.neutral[700] }}
          >
            {currentLessonIndex + 1} / {totalLessons}
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {/* Progress Bar */}
      <View
        className="px-5 py-2 border-b"
        style={{ borderBottomColor: ExploreColors.neutral[100] }}
      >
        <View
          className="h-1.5 rounded overflow-hidden mb-1"
          style={{ backgroundColor: ExploreColors.neutral[100] }}
        >
          <View
            className="h-full rounded"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: ExploreColors.primary[500],
            }}
          />
        </View>
        <Text
          className="text-sm text-center"
          style={{ color: ExploreColors.neutral[600] }}
        >
          {progressPercentage}% {contentLanguage === 'en' ? 'Complete' : 'Selesai'}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} className="px-5 pt-4">
          {/* Study Title */}
          <Text
            className="text-sm font-bold uppercase mb-1"
            style={{ color: ExploreColors.primary[600] }}
          >
            {studyTitle}
          </Text>

          {/* Lesson Title */}
          <Text
            className="text-2xl font-bold mb-4"
            style={{ color: ExploreColors.neutral[900] }}
          >
            {lessonTitle}
          </Text>

          {/* Lesson Content - with Markdown */}
          <MarkdownText
            className="text-base leading-7 mb-6"
            style={{ color: ExploreColors.neutral[800] }}
          >
            {lessonContent}
          </MarkdownText>

          {/* Scripture References */}
          {currentLesson.scripture_references && currentLesson.scripture_references.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center gap-1 mb-3">
                <BookOpen size={20} color={ExploreColors.spiritual[600]} />
                <Text
                  className="text-lg font-semibold"
                  style={{ color: ExploreColors.neutral[900] }}
                >
                  {contentLanguage === 'en' ? 'Scripture References' : 'Referensi Alkitab'}
                </Text>
              </View>

              {currentLesson.scripture_references.map((reference, index) => (
                <View
                  key={index}
                  className="rounded-xl p-4 mb-2 border-l-4"
                  style={{
                    backgroundColor: ExploreColors.spiritual[50],
                    borderLeftColor: ExploreColors.spiritual[500],
                  }}
                >
                  {reference.text && (
                    <MarkdownText
                      className="text-base italic leading-6 mb-2"
                      style={{ color: ExploreColors.neutral[900] }}
                    >
                      {`"${reference.text}"`}
                    </MarkdownText>
                  )}
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: ExploreColors.spiritual[700] }}
                  >
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
            (currentLesson.discussion_questions[contentLanguage]?.length ?? 0) > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center gap-1 mb-3">
                  <MessageCircle size={20} color={ExploreColors.secondary[600]} />
                  <Text
                    className="text-lg font-semibold"
                    style={{ color: ExploreColors.neutral[900] }}
                  >
                    {contentLanguage === 'en' ? 'Discussion Questions' : 'Pertanyaan Diskusi'}
                  </Text>
                </View>

                {(currentLesson.discussion_questions[contentLanguage] ?? []).map((question, index) => (
                  <View key={index} className="flex-row mb-3">
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
                      {question}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          {/* Application */}
          {currentLesson.application && currentLesson.application[contentLanguage] && (
            <View
              className="rounded-2xl p-4 mb-4"
              style={{ backgroundColor: ExploreColors.primary[50] }}
            >
              <Text
                className="text-lg font-semibold mb-2"
                style={{ color: ExploreColors.primary[800] }}
              >
                {contentLanguage === 'en' ? 'Application' : 'Aplikasi'}
              </Text>
              <MarkdownText
                className="text-base leading-6"
                style={{ color: ExploreColors.neutral[800] }}
              >
                {currentLesson.application[contentLanguage]}
              </MarkdownText>
            </View>
          )}

          {/* Ask Faith Assistant about this lesson */}
          <View className="mb-4">
            <QuickAskInput
              context="bible_study_lesson"
              contentId={id as string}
              lessonNumber={currentLessonIndex + 1}
              contextData={{
                studyId: id as string,
                studyTitle: studyTitle,
                lessonNumber: currentLessonIndex + 1,
                lessonTitle: lessonTitle,
              }}
              title={contentLanguage === 'en' ? 'Questions about this lesson?' : 'Pertanyaan tentang pelajaran ini?'}
              language={contentLanguage}
            />
          </View>

          {/* Bottom spacing for buttons */}
          <View className="h-[140px]" />
        </Animated.View>
      </ScrollView>

      {/* Navigation & Complete */}
      <View
        className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t gap-2"
        style={{ borderTopColor: ExploreColors.neutral[100] }}
      >
        {/* Navigation Buttons */}
        <View className="flex-row justify-between gap-2">
          <Pressable
            onPress={handlePreviousLesson}
            disabled={currentLessonIndex === 0}
            className="flex-row items-center gap-1 px-4 py-2 rounded-xl border"
            style={{
              borderColor: currentLessonIndex === 0
                ? ExploreColors.neutral[200]
                : ExploreColors.primary[200],
            }}
          >
            <ChevronLeft
              size={20}
              color={currentLessonIndex === 0 ? ExploreColors.neutral[300] : ExploreColors.primary[600]}
            />
            <Text
              className="text-base font-semibold"
              style={{
                color: currentLessonIndex === 0
                  ? ExploreColors.neutral[400]
                  : ExploreColors.primary[600],
              }}
            >
              {contentLanguage === 'en' ? 'Previous' : 'Sebelumnya'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextLesson}
            disabled={currentLessonIndex === totalLessons - 1}
            className="flex-row items-center gap-1 px-4 py-2 rounded-xl border"
            style={{
              borderColor: currentLessonIndex === totalLessons - 1
                ? ExploreColors.neutral[200]
                : ExploreColors.primary[200],
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{
                color: currentLessonIndex === totalLessons - 1
                  ? ExploreColors.neutral[400]
                  : ExploreColors.primary[600],
              }}
            >
              {contentLanguage === 'en' ? 'Next' : 'Berikutnya'}
            </Text>
            <ChevronRight
              size={20}
              color={currentLessonIndex === totalLessons - 1 ? ExploreColors.neutral[300] : ExploreColors.primary[600]}
            />
          </Pressable>
        </View>

        {/* Complete Button */}
        {!currentLessonCompleted && (
          <Pressable
            onPress={handleCompleteLesson}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl ${
              trackLessonComplete.isPending ? 'opacity-60' : ''
            }`}
            style={{ backgroundColor: ExploreColors.success[500] }}
            disabled={trackLessonComplete.isPending}
          >
            <Check size={20} color="#FFFFFF" />
            <Text className="text-base font-semibold text-white">
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
          <View
            className="flex-row items-center justify-center gap-1 py-2 rounded-xl"
            style={{ backgroundColor: ExploreColors.success[50] }}
          >
            <Check size={16} color={ExploreColors.success[600]} />
            <Text
              className="text-base font-semibold"
              style={{ color: ExploreColors.success[700] }}
            >
              {contentLanguage === 'en' ? 'Lesson Completed' : 'Pelajaran Selesai'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
