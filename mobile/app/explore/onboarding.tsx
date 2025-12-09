/**
 * Onboarding Screen - Spiritual Profile Setup
 *
 * Premium multi-step onboarding flow featuring:
 * - Beautiful gradient backgrounds
 * - Smooth card transitions between questions
 * - Support for single_choice, multiple_choice, slider question types
 * - Progress indicator
 * - Skip option
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  FadeInLeft,
  FadeOutRight,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Heart,
  BookOpen,
  Target,
  Clock,
  X,
  Check,
} from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import {
  useOnboardingFlow,
} from '@/hooks/explore/useOnboarding';
import {
  useCurrentQuestion,
  useOnboardingActions,
  useOnboardingResponses,
} from '@/stores/onboarding';
import type { OnboardingQuestion } from '@/services/api/explore';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium color palette
const Colors = {
  // Primary gradient - Deep indigo to violet
  gradientStart: '#4338CA',
  gradientMid: '#6366F1',
  gradientEnd: '#8B5CF6',

  // Accent
  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentGold: '#d4af37',

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.15)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.8)',

  // Surface
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',

  // States
  selected: '#4338CA',
  selectedBg: '#EEF2FF',
};

// Question icons mapping
const QuestionIcons: Record<string, typeof Heart> = {
  faith_journey: Heart,
  reading_depth: BookOpen,
  life_challenges: Target,
  interest_topics: Sparkles,
  devotion_time: Clock,
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Floating Orb for background ambiance
 */
function FloatingOrb({ top, left, size = 200, opacity = 0.1 }: {
  top?: number;
  left?: number;
  size?: number;
  opacity?: number;
}) {
  return (
    <View
      className="absolute"
      style={{
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      }}
    />
  );
}

/**
 * Progress Bar
 */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = total > 0 ? (current + 1) / total : 0;
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(progress, { damping: 15, stiffness: 100 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View className="h-1.5 bg-white/20 rounded-full overflow-hidden">
      <Animated.View
        className="h-full rounded-full"
        style={[{ backgroundColor: Colors.accentGold }, animatedStyle]}
      />
    </View>
  );
}

/**
 * Single Choice Option
 */
function SingleChoiceOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(value);
      }}
      className={`mb-3 p-4 rounded-2xl border-2 active:scale-[0.98] ${
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 bg-white'
      }`}
      style={{
        shadowColor: selected ? Colors.selected : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: selected ? 0.2 : 0.05,
        shadowRadius: 8,
        elevation: selected ? 4 : 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-base font-medium flex-1 ${
            selected ? 'text-indigo-700' : 'text-gray-700'
          }`}
        >
          {label}
        </Text>
        <View
          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            selected
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-gray-300 bg-white'
          }`}
        >
          {selected && <Check size={14} color={Colors.textWhite} strokeWidth={3} />}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Multiple Choice Option (Checkbox style)
 */
function MultipleChoiceOption({
  label,
  value,
  selected,
  onToggle,
}: {
  label: string;
  value: string;
  selected: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(value);
      }}
      className={`mb-3 p-4 rounded-2xl border-2 active:scale-[0.98] ${
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 bg-white'
      }`}
      style={{
        shadowColor: selected ? Colors.selected : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: selected ? 0.2 : 0.05,
        shadowRadius: 8,
        elevation: selected ? 4 : 2,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className={`text-base font-medium flex-1 ${
            selected ? 'text-indigo-700' : 'text-gray-700'
          }`}
        >
          {label}
        </Text>
        <View
          className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
            selected
              ? 'border-indigo-500 bg-indigo-500'
              : 'border-gray-300 bg-white'
          }`}
        >
          {selected && <Check size={14} color={Colors.textWhite} strokeWidth={3} />}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Slider Question
 */
function SliderQuestion({
  question,
  value,
  onChange,
  language,
}: {
  question: OnboardingQuestion;
  value: number;
  onChange: (value: number) => void;
  language: string;
}) {
  const min = question.min_value ?? 1;
  const max = question.max_value ?? 5;
  const steps = max - min + 1;

  const minLabel = question.slider_labels?.min?.[language as 'en' | 'id'] || 'Low';
  const maxLabel = question.slider_labels?.max?.[language as 'en' | 'id'] || 'High';

  return (
    <View className="mt-2">
      {/* Labels */}
      <View className="flex-row justify-between mb-4 px-1">
        <Text className="text-sm text-gray-500">{minLabel}</Text>
        <Text className="text-sm text-gray-500">{maxLabel}</Text>
      </View>

      {/* Slider dots */}
      <View className="flex-row justify-between px-2">
        {Array.from({ length: steps }, (_, i) => {
          const stepValue = min + i;
          const isSelected = stepValue <= value;
          const isActive = stepValue === value;

          return (
            <Pressable
              key={stepValue}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(stepValue);
              }}
              className="items-center"
            >
              <View
                className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-500'
                    : isSelected
                    ? 'border-indigo-300 bg-indigo-100'
                    : 'border-gray-300 bg-white'
                }`}
                style={{
                  shadowColor: isActive ? Colors.selected : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isActive ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: isActive ? 4 : 1,
                }}
              >
                <Text
                  className={`text-base font-bold ${
                    isActive ? 'text-white' : isSelected ? 'text-indigo-600' : 'text-gray-500'
                  }`}
                >
                  {stepValue}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Question Card - Main content container
 */
function QuestionCard({
  question,
  response,
  onResponse,
  language,
  animationDirection,
}: {
  question: OnboardingQuestion;
  response: string | string[] | number | undefined;
  onResponse: (value: string | string[] | number) => void;
  language: string;
  animationDirection: 'forward' | 'back';
}) {
  const Icon = QuestionIcons[question.id] || Sparkles;
  const questionText = question.question[language as 'en' | 'id'] || question.question.en;
  const descriptionText = question.description?.[language as 'en' | 'id'] || question.description?.en;

  // Animation based on direction
  const entering = animationDirection === 'forward' ? SlideInRight : SlideInLeft;
  const exiting = animationDirection === 'forward' ? SlideOutLeft : SlideOutRight;

  const renderQuestionContent = () => {
    switch (question.question_type) {
      case 'single_choice':
        return (
          <View className="mt-4">
            {question.options?.map((option, index) => {
              const optionLabel = option[language as 'en' | 'id'] || option.en;
              const optionValue = question.option_values?.[index] || optionLabel;
              return (
                <SingleChoiceOption
                  key={optionValue}
                  label={optionLabel}
                  value={optionValue}
                  selected={response === optionValue}
                  onSelect={(val) => onResponse(val)}
                />
              );
            })}
          </View>
        );

      case 'multiple_choice':
        const selectedValues = Array.isArray(response) ? response : [];
        return (
          <View className="mt-4">
            {question.options?.map((option, index) => {
              const optionLabel = option[language as 'en' | 'id'] || option.en;
              const optionValue = question.option_values?.[index] || optionLabel;
              return (
                <MultipleChoiceOption
                  key={optionValue}
                  label={optionLabel}
                  value={optionValue}
                  selected={selectedValues.includes(optionValue)}
                  onToggle={(val) => {
                    const newValues = selectedValues.includes(val)
                      ? selectedValues.filter((v) => v !== val)
                      : [...selectedValues, val];
                    onResponse(newValues);
                  }}
                />
              );
            })}
          </View>
        );

      case 'slider':
        const sliderValue = typeof response === 'number' ? response : question.min_value ?? 1;
        return (
          <SliderQuestion
            question={question}
            value={sliderValue}
            onChange={(val) => onResponse(val)}
            language={language}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      key={question.id}
      entering={entering.duration(300).springify()}
      exiting={exiting.duration(200)}
      className="flex-1"
    >
      {/* Question header */}
      <View className="items-center mb-6">
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
          style={{ backgroundColor: Colors.selectedBg }}
        >
          <Icon size={28} color={Colors.selected} strokeWidth={1.5} />
        </View>
        <Text
          className="text-2xl font-bold text-center text-gray-900 mb-2"
          style={{ letterSpacing: -0.5 }}
        >
          {questionText}
        </Text>
        {descriptionText && (
          <Text className="text-base text-center text-gray-500 px-4">
            {descriptionText}
          </Text>
        )}
      </View>

      {/* Question content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {renderQuestionContent()}
      </ScrollView>
    </Animated.View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function OnboardingScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';

  // Hooks
  const {
    isLoading,
    isSubmitting,
    isSkipping,
    questions,
    submit,
    skip,
  } = useOnboardingFlow();

  const { question, index, total, response, isFirst, isLast } = useCurrentQuestion();
  const { setResponse, nextQuestion, previousQuestion } = useOnboardingActions();
  const responses = useOnboardingResponses();

  // Track animation direction
  const animationDirectionRef = useRef<'forward' | 'back'>('forward');

  // Check if current question is answered
  const isAnswered = useMemo(() => {
    if (!question) return false;
    const currentResponse = responses[question.id];
    if (currentResponse === undefined) return false;
    if (Array.isArray(currentResponse) && currentResponse.length === 0) return false;
    return true;
  }, [question, responses]);

  // Handlers
  const handleNext = useCallback(() => {
    animationDirectionRef.current = 'forward';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextQuestion();
  }, [nextQuestion]);

  const handlePrevious = useCallback(() => {
    animationDirectionRef.current = 'back';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    previousQuestion();
  }, [previousQuestion]);

  const handleSubmit = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await submit();
    router.back();
  }, [submit, router]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await skip();
    router.back();
  }, [skip, router]);

  const handleResponse = useCallback((value: string | string[] | number) => {
    if (question) {
      setResponse(question.id, value);
    }
  }, [question, setResponse]);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-indigo-600">
        <ButtonSpinner color={Colors.textWhite} />
        <Text className="text-white mt-4 text-base">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Gradient Background */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Orbs */}
      <FloatingOrb top={-60} left={SCREEN_WIDTH * 0.6} size={220} opacity={0.08} />
      <FloatingOrb top={SCREEN_HEIGHT * 0.4} left={-40} size={160} opacity={0.1} />

      <StatusBar barStyle="light-content" />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className="px-6 pt-4 pb-6"
        >
          {/* Top row: Skip + Progress */}
          <View className="flex-row items-center justify-between mb-4">
            {/* Back button or spacer */}
            {!isFirst ? (
              <Pressable
                onPress={handlePrevious}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/20 active:scale-95"
              >
                <ChevronLeft size={24} color={Colors.textWhite} />
              </Pressable>
            ) : (
              <View className="w-10" />
            )}

            {/* Progress text */}
            <Text className="text-base font-semibold text-white">
              {index + 1} / {total}
            </Text>

            {/* Skip button */}
            <Pressable
              onPress={handleSkip}
              disabled={isSkipping}
              className="px-4 py-2 rounded-full bg-white/20 active:scale-95"
            >
              <Text className="text-sm font-semibold text-white">
                {isSkipping ? '...' : t('onboarding.skip', 'Skip')}
              </Text>
            </Pressable>
          </View>

          {/* Progress bar */}
          <ProgressBar current={index} total={total} />
        </Animated.View>

        {/* Main Content Card */}
        <Animated.View
          entering={FadeIn.delay(200).duration(500)}
          className="flex-1 mx-5 mb-5 bg-white rounded-3xl p-6 overflow-hidden"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.15,
            shadowRadius: 40,
            elevation: 20,
          }}
        >
          {/* Question Content */}
          {question && (
            <QuestionCard
              question={question}
              response={response}
              onResponse={handleResponse}
              language={language}
              animationDirection={animationDirectionRef.current}
            />
          )}

          {/* Bottom Action */}
          <View className="mt-4">
            {isLast ? (
              <View className="rounded-2xl overflow-hidden">
                <Button
                  size="lg"
                  onPress={handleSubmit}
                  isDisabled={!isAnswered || isSubmitting}
                  className="w-full bg-transparent relative overflow-hidden"
                >
                  <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View className="flex-row items-center justify-center gap-2.5 z-[1]">
                    {isSubmitting ? (
                      <ButtonSpinner color={Colors.textWhite} />
                    ) : (
                      <Sparkles size={20} color={Colors.textWhite} />
                    )}
                    <ButtonText className="text-white font-semibold">
                      {isSubmitting
                        ? t('onboarding.saving', 'Saving...')
                        : t('onboarding.complete', 'Complete Setup')}
                    </ButtonText>
                  </View>
                </Button>
              </View>
            ) : (
              <View className="rounded-2xl overflow-hidden">
                <Button
                  size="lg"
                  onPress={handleNext}
                  isDisabled={!isAnswered}
                  className="w-full bg-transparent relative overflow-hidden"
                >
                  <LinearGradient
                    colors={
                      isAnswered
                        ? [Colors.gradientStart, Colors.gradientMid]
                        : ['#9CA3AF', '#9CA3AF']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View className="flex-row items-center justify-center gap-2 z-[1]">
                    <ButtonText className="text-white font-semibold">
                      {t('onboarding.next', 'Continue')}
                    </ButtonText>
                    <ChevronRight size={20} color={Colors.textWhite} strokeWidth={2.5} />
                  </View>
                </Button>
              </View>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
