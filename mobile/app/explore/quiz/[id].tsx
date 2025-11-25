/**
 * Daily Quiz Challenge Screen
 *
 * Design: Gamified learning experience
 * - Progress bar at top
 * - Question with options
 * - Immediate feedback on answer selection
 * - Explanation after each question
 * - Navigate through questions sequentially
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import {
  useContentById,
  useTrackContentStart,
  useSubmitQuizAnswer,
} from '@/hooks/explore/useExplore';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DailyQuiz, QuizQuestion } from '@/types/explore';
import { ArrowLeft, Check, X, Lightbulb, ArrowRight } from 'lucide-react-native';
import { DailyQuizSkeleton } from '@/components/explore/LoadingSkeleton';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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

  const handleOptionSelect = (optionIndex: number) => {
    if (!isAnswerChecked) {
      setSelectedOption(optionIndex);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.correct_answer;
    setIsAnswerChecked(true);
    setShowExplanation(true);

    // Record answer
    setProgress((prev) => ({
      ...prev,
      answers: [
        ...prev.answers,
        {
          questionId: currentQuestion.id || `q${progress.currentQuestionIndex}`,
          selectedAnswer: selectedOption,
          isCorrect,
        },
      ],
    }));

    // Submit to backend
    if (id) {
      submitAnswer.mutate({
        quizId: id as string,
        questionId: currentQuestion.id || `q${progress.currentQuestionIndex}`,
        selectedAnswer: selectedOption,
        isCorrect,
      });
    }
  };

  const handleNextQuestion = () => {
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <DailyQuizSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const questionText = currentQuestion.question[contentLanguage] || currentQuestion.question.en;
  const options = currentQuestion.options[contentLanguage] || currentQuestion.options.en;
  const explanation =
    currentQuestion.explanation?.[contentLanguage] || currentQuestion.explanation?.en;

  const currentAnswer = progress.answers.find(
    (a) => a.questionId === (currentQuestion.id || `q${progress.currentQuestionIndex}`)
  );
  const isCorrect = currentAnswer?.isCorrect;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={ExploreColors.neutral[900]} />
        </Pressable>

        <View style={styles.questionCounter}>
          <Text style={styles.questionCounterText}>
            {progress.currentQuestionIndex + 1} / {totalQuestions}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercentage}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.contentContainer}>
          {/* Difficulty Badge */}
          <View style={styles.difficultyContainer}>
            <View
              style={[
                styles.difficultyBadge,
                quiz.difficulty === 'easy' && styles.difficultyEasy,
                quiz.difficulty === 'medium' && styles.difficultyMedium,
                quiz.difficulty === 'hard' && styles.difficultyHard,
              ]}
            >
              <Text
                style={[
                  styles.difficultyText,
                  quiz.difficulty === 'easy' && styles.difficultyTextEasy,
                  quiz.difficulty === 'medium' && styles.difficultyTextMedium,
                  quiz.difficulty === 'hard' && styles.difficultyTextHard,
                ]}
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
          <Text style={styles.questionText}>{questionText}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrectOption = index === currentQuestion.correct_answer;
              const showCorrect = isAnswerChecked && isCorrectOption;
              const showIncorrect = isAnswerChecked && isSelected && !isCorrectOption;

              return (
                <Pressable
                  key={index}
                  onPress={() => handleOptionSelect(index)}
                  disabled={isAnswerChecked}
                  style={[
                    styles.optionCard,
                    isSelected && !isAnswerChecked && styles.optionCardSelected,
                    showCorrect && styles.optionCardCorrect,
                    showIncorrect && styles.optionCardIncorrect,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionRadio,
                        isSelected && !isAnswerChecked && styles.optionRadioSelected,
                        showCorrect && styles.optionRadioCorrect,
                        showIncorrect && styles.optionRadioIncorrect,
                      ]}
                    >
                      {showCorrect && <Check size={16} color="#FFFFFF" />}
                      {showIncorrect && <X size={16} color="#FFFFFF" />}
                      {!showCorrect && !showIncorrect && isSelected && (
                        <View style={styles.optionRadioDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && !isAnswerChecked && styles.optionTextSelected,
                        showCorrect && styles.optionTextCorrect,
                        showIncorrect && styles.optionTextIncorrect,
                      ]}
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
            <Animated.View entering={FadeInDown.duration(400)} style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Lightbulb size={20} color={ExploreColors.secondary[600]} />
                <Text style={styles.explanationTitle}>
                  {contentLanguage === 'en' ? 'Explanation' : 'Penjelasan'}
                </Text>
              </View>
              <Text style={styles.explanationText}>{explanation}</Text>
            </Animated.View>
          )}

          {/* Scripture Reference */}
          {showExplanation && currentQuestion.scripture_reference && (
            <View style={styles.scriptureRefCard}>
              <Text style={styles.scriptureRefLabel}>
                {contentLanguage === 'en' ? 'Based on:' : 'Berdasarkan:'}
              </Text>
              <Text style={styles.scriptureRefText}>{currentQuestion.scripture_reference}</Text>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Action Button */}
      <View style={styles.bottomContainer}>
        {!isAnswerChecked ? (
          <Pressable
            onPress={handleCheckAnswer}
            style={[styles.actionButton, selectedOption === null && styles.actionButtonDisabled]}
            disabled={selectedOption === null}
          >
            <Text style={styles.actionButtonText}>
              {contentLanguage === 'en' ? 'Check Answer' : 'Periksa Jawaban'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleNextQuestion} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>
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
  },
  backButton: {
    padding: ExploreSpacing.xs,
  },
  questionCounter: {
    backgroundColor: ExploreColors.secondary[50],
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 16,
  },
  questionCounterText: {
    ...ExploreTypography.body,
    color: ExploreColors.secondary[700],
    fontWeight: '700',
  },
  progressBarContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingBottom: ExploreSpacing.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: ExploreColors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ExploreColors.secondary[500],
    borderRadius: 4,
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
  difficultyContainer: {
    marginBottom: ExploreSpacing.md,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: ExploreSpacing.md,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 12,
  },
  difficultyEasy: {
    backgroundColor: ExploreColors.success[50],
  },
  difficultyMedium: {
    backgroundColor: ExploreColors.warning[50],
  },
  difficultyHard: {
    backgroundColor: ExploreColors.error[50],
  },
  difficultyText: {
    ...ExploreTypography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  difficultyTextEasy: {
    color: ExploreColors.success[700],
  },
  difficultyTextMedium: {
    color: ExploreColors.warning[700],
  },
  difficultyTextHard: {
    color: ExploreColors.error[700],
  },
  questionText: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    lineHeight: 36,
    marginBottom: ExploreSpacing.xl,
  },
  optionsContainer: {
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.xl,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: ExploreColors.neutral[200],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
  },
  optionCardSelected: {
    borderColor: ExploreColors.primary[500],
    backgroundColor: ExploreColors.primary[50],
  },
  optionCardCorrect: {
    borderColor: ExploreColors.success[500],
    backgroundColor: ExploreColors.success[50],
  },
  optionCardIncorrect: {
    borderColor: ExploreColors.error[500],
    backgroundColor: ExploreColors.error[50],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ExploreColors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: ExploreColors.primary[500],
    backgroundColor: ExploreColors.primary[500],
  },
  optionRadioCorrect: {
    borderColor: ExploreColors.success[500],
    backgroundColor: ExploreColors.success[500],
  },
  optionRadioIncorrect: {
    borderColor: ExploreColors.error[500],
    backgroundColor: ExploreColors.error[500],
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    flex: 1,
    lineHeight: 24,
  },
  optionTextSelected: {
    color: ExploreColors.primary[900],
    fontWeight: '600',
  },
  optionTextCorrect: {
    color: ExploreColors.success[900],
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: ExploreColors.error[900],
    fontWeight: '600',
  },
  explanationCard: {
    backgroundColor: ExploreColors.secondary[50],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
    marginBottom: ExploreSpacing.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    marginBottom: ExploreSpacing.sm,
  },
  explanationTitle: {
    ...ExploreTypography.h4,
    color: ExploreColors.secondary[800],
  },
  explanationText: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[800],
    lineHeight: 24,
  },
  scriptureRefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
    marginBottom: ExploreSpacing.lg,
  },
  scriptureRefLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
  },
  scriptureRefText: {
    ...ExploreTypography.caption,
    color: ExploreColors.spiritual[700],
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.secondary[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
