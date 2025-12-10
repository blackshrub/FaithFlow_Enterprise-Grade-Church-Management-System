/**
 * Daily Quiz Challenge Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for ExploreColors
 * - React Native Reanimated for animations
 *
 * Design: Gamified learning experience
 * - Progress bar at top
 * - Question with options
 * - Immediate feedback on answer selection
 * - Explanation after each question
 * - Navigate through questions sequentially
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors } from '@/constants/explore/designSystem';
import {
  useContentById,
  useTrackContentStart,
  useSubmitQuizAnswer,
} from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DailyQuiz, QuizQuestion } from '@/types/explore';
import { ArrowLeft, Check, X, Lightbulb, ArrowRight } from 'lucide-react-native';
import { DailyQuizSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface QuizProgress {
  currentQuestionIndex: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }>;
}

export default function DailyQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [progress, setProgress] = useState<QuizProgress>({
    currentQuestionIndex: 0,
    answers: [],
  });
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Data queries
  const { data: quiz, isLoading } = useContentById<DailyQuiz>('quiz', id as string);
  const trackStart = useTrackContentStart();
  const submitAnswer = useSubmitQuizAnswer();

  // Track content start on mount
  useEffect(() => {
    if (id && !hasTrackedStart) {
      trackStart.mutate({ contentId: id as string, contentType: 'quiz' });
      setHasTrackedStart(true);
    }
  }, [id, hasTrackedStart]);

  const currentQuestion =
    quiz?.questions[progress.currentQuestionIndex] as QuizQuestion | undefined;
  const totalQuestions = quiz?.questions.length || 0;
  const progressPercentage = ((progress.currentQuestionIndex + 1) / totalQuestions) * 100;

  // Auto-check answer when option is selected
  const handleOptionSelect = (optionIndex: number) => {
    if (isAnswerChecked || !currentQuestion) return;

    // Set selected option first
    setSelectedOption(optionIndex);

    // Immediately check the answer
    const correctIndex = currentQuestion.correct_answer_index ?? currentQuestion.correct_answer;
    const isCorrect = optionIndex === (typeof correctIndex === 'number' ? correctIndex : 0);

    // Provide haptic feedback based on correctness
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    setIsAnswerChecked(true);
    setShowExplanation(true);

    // Record answer
    setProgress((prev) => ({
      ...prev,
      answers: [
        ...prev.answers,
        {
          questionId: currentQuestion.id || `q${progress.currentQuestionIndex}`,
          selectedAnswer: optionIndex,
          isCorrect,
        },
      ],
    }));

    // Submit to backend
    if (id) {
      submitAnswer.mutate({
        quizId: id as string,
        questionId: currentQuestion.id || `q${progress.currentQuestionIndex}`,
        selectedAnswer: optionIndex,
        isCorrect,
      });
    }
  };

  const handleNextQuestion = () => {
    Haptics.selectionAsync();

    if (progress.currentQuestionIndex < totalQuestions - 1) {
      // Move to next question
      setProgress((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
      setSelectedOption(null);
      setShowExplanation(false);
      setIsAnswerChecked(false);
    } else {
      // Quiz complete - navigate to results
      const correctCount = progress.answers.filter((a) => a.isCorrect).length;
      router.push({
        pathname: '/explore/quiz/results/[id]',
        params: {
          id: id as string,
          score: correctCount,
          total: totalQuestions,
        },
      });
    }
  };

  if (isLoading || !quiz || !currentQuestion) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row justify-between items-center px-3 py-2">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="p-5">
          <DailyQuizSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const questionText = currentQuestion.question[contentLanguage as keyof typeof currentQuestion.question] || currentQuestion.question.en;

  // Options can be either array of MultilingualText objects OR array of strings
  const rawOptions = currentQuestion.options;
  const options: string[] = Array.isArray(rawOptions) && rawOptions.length > 0
    ? (typeof rawOptions[0] === 'object' && rawOptions[0] !== null && 'en' in rawOptions[0]
        ? rawOptions.map((opt) =>
            typeof opt === 'object' && opt !== null
              ? (opt[contentLanguage as keyof typeof opt] || opt.en || '') as string
              : String(opt)
          )
        : rawOptions.map(opt => String(opt)))
    : [];

  const explanation =
    currentQuestion.explanation?.[contentLanguage as keyof typeof currentQuestion.explanation] || currentQuestion.explanation?.en;
  const correctAnswerIndex = currentQuestion.correct_answer_index ?? currentQuestion.correct_answer;
  const correctAnswerIndexNum = typeof correctAnswerIndex === 'number' ? correctAnswerIndex : 0;

  const currentAnswer = progress.answers.find(
    (a) => a.questionId === (currentQuestion.id || `q${progress.currentQuestionIndex}`)
  );
  const isCorrect = currentAnswer?.isCorrect;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-3 py-2">
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

        <View
          className="px-3 py-1 rounded-2xl"
          style={{ backgroundColor: ExploreColors.secondary[50] }}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            contentLanguage === 'en'
              ? `Question ${progress.currentQuestionIndex + 1} of ${totalQuestions}`
              : `Pertanyaan ${progress.currentQuestionIndex + 1} dari ${totalQuestions}`
          }
        >
          <Text
            className="text-base font-bold"
            style={{ color: ExploreColors.secondary[700] }}
          >
            {progress.currentQuestionIndex + 1} / {totalQuestions}
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {/* Progress Bar */}
      <View
        className="px-5 pb-3"
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityLabel={
          contentLanguage === 'en'
            ? `Quiz progress: ${Math.round(progressPercentage)}% complete`
            : `Progres kuis: ${Math.round(progressPercentage)}% selesai`
        }
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(progressPercentage),
        }}
      >
        <View
          className="h-2 rounded overflow-hidden"
          style={{ backgroundColor: ExploreColors.neutral[100] }}
        >
          <Animated.View
            className="h-full rounded"
            style={{
              width: `${progressPercentage}%`,
              backgroundColor: ExploreColors.secondary[500],
            }}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} className="px-5 pt-4">
          {/* Difficulty Badge */}
          <View className="mb-3">
            <View
              className="self-start px-3 py-1 rounded-xl"
              style={{
                backgroundColor:
                  quiz.difficulty === 'easy'
                    ? ExploreColors.success[50]
                    : quiz.difficulty === 'medium'
                    ? ExploreColors.warning[50]
                    : ExploreColors.error[50],
              }}
            >
              <Text
                className="text-sm font-bold uppercase"
                style={{
                  color:
                    quiz.difficulty === 'easy'
                      ? ExploreColors.success[700]
                      : quiz.difficulty === 'medium'
                      ? ExploreColors.warning[700]
                      : ExploreColors.error[700],
                }}
              >
                {quiz.difficulty === 'easy'
                  ? contentLanguage === 'en'
                    ? 'Easy'
                    : 'Mudah'
                  : quiz.difficulty === 'medium'
                  ? contentLanguage === 'en'
                    ? 'Medium'
                    : 'Sedang'
                  : contentLanguage === 'en'
                  ? 'Hard'
                  : 'Sulit'}
              </Text>
            </View>
          </View>

          {/* Question */}
          <Text
            className="text-2xl font-bold leading-9 mb-6"
            style={{ color: ExploreColors.neutral[900] }}
            accessibilityRole="header"
          >
            {questionText}
          </Text>

          {/* Options */}
          <View className="mb-6">
            {options.map((option: string, index: number) => {
              const isSelected = selectedOption === index;
              const isCorrectOption = index === correctAnswerIndexNum;
              const showCorrect = isAnswerChecked && isCorrectOption;
              const showIncorrect = isAnswerChecked && isSelected && !isCorrectOption;

              return (
                <Pressable
                  key={index}
                  onPress={() => handleOptionSelect(index)}
                  disabled={isAnswerChecked}
                  className="rounded-2xl p-4 mb-3 border-2"
                  style={{
                    backgroundColor: showCorrect
                      ? ExploreColors.success[50]
                      : showIncorrect
                      ? ExploreColors.error[50]
                      : isSelected && !isAnswerChecked
                      ? ExploreColors.primary[50]
                      : '#FFFFFF',
                    borderColor: showCorrect
                      ? ExploreColors.success[500]
                      : showIncorrect
                      ? ExploreColors.error[500]
                      : isSelected && !isAnswerChecked
                      ? ExploreColors.primary[500]
                      : ExploreColors.neutral[200],
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    contentLanguage === 'en'
                      ? `Answer option ${index + 1}: ${option}`
                      : `Opsi jawaban ${index + 1}: ${option}`
                  }
                  accessibilityHint={
                    isAnswerChecked
                      ? showCorrect
                        ? contentLanguage === 'en'
                          ? 'This is the correct answer'
                          : 'Ini adalah jawaban yang benar'
                        : showIncorrect
                        ? contentLanguage === 'en'
                          ? 'This answer was incorrect'
                          : 'Jawaban ini salah'
                        : ''
                      : contentLanguage === 'en'
                      ? 'Double tap to select this answer'
                      : 'Ketuk dua kali untuk memilih jawaban ini'
                  }
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isAnswerChecked,
                    checked: showCorrect,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-6 h-6 rounded-full border-2 items-center justify-center mr-3"
                      style={{
                        backgroundColor: showCorrect
                          ? ExploreColors.success[500]
                          : showIncorrect
                          ? ExploreColors.error[500]
                          : isSelected && !isAnswerChecked
                          ? ExploreColors.primary[500]
                          : 'transparent',
                        borderColor: showCorrect
                          ? ExploreColors.success[500]
                          : showIncorrect
                          ? ExploreColors.error[500]
                          : isSelected && !isAnswerChecked
                          ? ExploreColors.primary[500]
                          : ExploreColors.neutral[300],
                      }}
                    >
                      {showCorrect && <Check size={16} color="#FFFFFF" />}
                      {showIncorrect && <X size={16} color="#FFFFFF" />}
                      {!showCorrect && !showIncorrect && isSelected && (
                        <View className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </View>
                    <Text
                      className={`flex-1 text-base leading-6 ${
                        showCorrect || showIncorrect || (isSelected && !isAnswerChecked)
                          ? 'font-semibold'
                          : ''
                      }`}
                      style={{
                        color: showCorrect
                          ? ExploreColors.success[900]
                          : showIncorrect
                          ? ExploreColors.error[900]
                          : isSelected && !isAnswerChecked
                          ? ExploreColors.primary[900]
                          : ExploreColors.neutral[800],
                      }}
                    >
                      {option}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Explanation */}
          {showExplanation && explanation && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="rounded-2xl p-4 mb-3"
              style={{ backgroundColor: ExploreColors.secondary[50] }}
            >
              <View className="flex-row items-center mb-2">
                <Lightbulb size={20} color={ExploreColors.secondary[600]} />
                <Text
                  className="text-lg font-semibold ml-1"
                  style={{ color: ExploreColors.secondary[800] }}
                >
                  {contentLanguage === 'en' ? 'Explanation' : 'Penjelasan'}
                </Text>
              </View>
              <Text
                className="text-base leading-6"
                style={{ color: ExploreColors.neutral[800] }}
              >
                {explanation}
              </Text>
            </Animated.View>
          )}

          {/* Scripture Reference */}
          {showExplanation && currentQuestion.scripture_reference && (
            <View className="flex-row items-center mb-4">
              <Text
                className="text-sm mr-1"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {contentLanguage === 'en' ? 'Based on:' : 'Berdasarkan:'}
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: ExploreColors.spiritual[700] }}
              >
                {typeof currentQuestion.scripture_reference === 'string'
                  ? currentQuestion.scripture_reference
                  : `${currentQuestion.scripture_reference.book} ${currentQuestion.scripture_reference.chapter}:${currentQuestion.scripture_reference.verse_start}${currentQuestion.scripture_reference.verse_end ? `-${currentQuestion.scripture_reference.verse_end}` : ''}`}
              </Text>
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-[100px]" />
        </Animated.View>
      </ScrollView>

      {/* Action Button - Only shows after answer is checked */}
      {isAnswerChecked && (
        <View
          className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t"
          style={{ borderTopColor: ExploreColors.neutral[100] }}
        >
          <Pressable
            onPress={handleNextQuestion}
            className="flex-row items-center justify-center py-3 rounded-2xl"
            style={{ backgroundColor: ExploreColors.secondary[500] }}
            accessibilityRole="button"
            accessibilityLabel={
              progress.currentQuestionIndex < totalQuestions - 1
                ? contentLanguage === 'en'
                  ? 'Go to next question'
                  : 'Lanjut ke pertanyaan berikutnya'
                : contentLanguage === 'en'
                ? 'See quiz results'
                : 'Lihat hasil kuis'
            }
            accessibilityHint={
              progress.currentQuestionIndex < totalQuestions - 1
                ? contentLanguage === 'en'
                  ? 'Double tap to continue to the next question'
                  : 'Ketuk dua kali untuk melanjutkan ke pertanyaan berikutnya'
                : contentLanguage === 'en'
                ? 'Double tap to view your final score'
                : 'Ketuk dua kali untuk melihat nilai akhir Anda'
            }
          >
            <Text className="text-base font-semibold text-white mr-2">
              {progress.currentQuestionIndex < totalQuestions - 1
                ? contentLanguage === 'en'
                  ? 'Next Question'
                  : 'Pertanyaan Berikutnya'
                : contentLanguage === 'en'
                ? 'See Results'
                : 'Lihat Hasil'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
