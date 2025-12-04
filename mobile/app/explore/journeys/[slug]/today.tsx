/**
 * Journey Today Content Screen - Daily journey content consumption
 *
 * Features:
 * - Scripture reading
 * - Devotional content
 * - Reflection questions
 * - Prayer prompt
 * - Mark as complete with tracking
 * - Contextual companion integration
 *
 * Styling: NativeWind-first
 */

import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  BookOpen,
  PenLine,
  Heart,
  MessageCircle,
  Check,
  Clock,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { withPremiumMotionV10 } from '@/hoc';
import { QuickAskInput } from '@/components/companion/QuickAskInput';
import {
  useTodayContent,
  useCompleteDay,
} from '@/hooks/explore/useJourney';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors
const Colors = {
  gradient: {
    start: '#4338CA',
    mid: '#6366F1',
    end: '#8B5CF6',
  },
  accent: {
    gold: '#d4af37',
    indigo: '#6366F1',
    indigoLight: '#EEF2FF',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  success: '#10B981',
};

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Section Card with collapsible content
 */
function SectionCard({
  icon: Icon,
  title,
  children,
  completed,
  onComplete,
  defaultExpanded = true,
  accentColor = Colors.accent.indigo,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
  completed: boolean;
  onComplete: () => void;
  defaultExpanded?: boolean;
  accentColor?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <View
      className="mb-4 rounded-2xl overflow-hidden bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center p-4"
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: completed ? Colors.success + '20' : accentColor + '15' }}
        >
          {completed ? (
            <Check size={20} color={Colors.success} strokeWidth={2.5} />
          ) : (
            <Icon size={20} color={accentColor} />
          )}
        </View>
        <Text className="flex-1 text-base font-bold text-gray-900">{title}</Text>

        {/* Complete checkbox */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onComplete();
          }}
          className={`w-6 h-6 rounded-lg border-2 items-center justify-center mr-3 ${
            completed
              ? 'bg-green-500 border-green-500'
              : 'bg-white border-gray-300'
          }`}
        >
          {completed && <Check size={14} color={Colors.white} strokeWidth={3} />}
        </Pressable>

        {/* Expand toggle */}
        {isExpanded ? (
          <ChevronUp size={20} color={Colors.neutral[400]} />
        ) : (
          <ChevronDown size={20} color={Colors.neutral[400]} />
        )}
      </Pressable>

      {/* Content */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} className="px-4 pb-4">
          {children}
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Reflection Question Input
 */
function ReflectionInput({
  question,
  value,
  onChange,
  index,
}: {
  question: string;
  value: string;
  onChange: (text: string) => void;
  index: number;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 mb-2">
        {index + 1}. {question}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Write your reflection..."
        placeholderTextColor={Colors.neutral[400]}
        multiline
        numberOfLines={3}
        className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 min-h-[80px]"
        style={{ textAlignVertical: 'top' }}
      />
    </View>
  );
}

/**
 * Completion Celebration Modal
 */
function CompletionCelebration({
  visible,
  onClose,
  streak,
}: {
  visible: boolean;
  onClose: () => void;
  streak: number;
}) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/60">
      <Animated.View
        entering={ZoomIn.springify()}
        className="bg-white rounded-3xl p-8 mx-6 items-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.25,
          shadowRadius: 40,
          elevation: 20,
        }}
      >
        {/* Celebration icon */}
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
          <Check size={40} color={Colors.success} strokeWidth={3} />
        </View>

        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Day Completed! 🎉
        </Text>
        <Text className="text-base text-gray-500 text-center mb-4">
          You're making great progress on your spiritual journey.
        </Text>

        {/* Streak display */}
        <View className="flex-row items-center gap-2 bg-amber-50 px-4 py-2 rounded-full mb-6">
          <Flame size={18} color="#F59E0B" fill="#F59E0B" />
          <Text className="text-base font-bold text-amber-700">
            {streak} Day Streak!
          </Text>
        </View>

        <Button
          size="lg"
          onPress={onClose}
          className="w-full bg-green-500 rounded-xl"
        >
          <ButtonText className="text-white font-bold">Continue</ButtonText>
        </Button>
      </Animated.View>
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

function JourneyTodayScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'en';
  const insets = useSafeAreaInsets();

  // State for tracking completion
  const [scriptureRead, setScriptureRead] = useState(false);
  const [devotionRead, setDevotionRead] = useState(false);
  const [reflectionAnswered, setReflectionAnswered] = useState(false);
  const [prayerCompleted, setPrayerCompleted] = useState(false);
  const [reflectionResponses, setReflectionResponses] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Timer for time tracking
  const startTimeRef = useRef(Date.now());

  // Data
  const { data: todayContent, isLoading } = useTodayContent(slug || '');
  const completeDayMutation = useCompleteDay(slug || '');

  // Initialize reflection responses array
  useEffect(() => {
    if (todayContent?.content.reflection_questions) {
      const questions = todayContent.content.reflection_questions[language as 'en' | 'id'] ||
        todayContent.content.reflection_questions.en || [];
      setReflectionResponses(new Array(questions.length).fill(''));
    }
  }, [todayContent, language]);

  const allCompleted = scriptureRead && devotionRead && reflectionAnswered && prayerCompleted;

  const handleComplete = useCallback(async () => {
    if (!allCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const result = await completeDayMutation.mutateAsync({
        time_spent_seconds: timeSpent,
        scripture_read: scriptureRead,
        devotion_read: devotionRead,
        reflection_answered: reflectionAnswered,
        prayer_completed: prayerCompleted,
        notes: notes || undefined,
        reflection_responses: reflectionResponses.filter(Boolean),
      });

      setShowCelebration(true);
    } catch (error) {
      console.error('Failed to complete day:', error);
    }
  }, [
    allCompleted,
    completeDayMutation,
    scriptureRead,
    devotionRead,
    reflectionAnswered,
    prayerCompleted,
    notes,
    reflectionResponses,
  ]);

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ButtonSpinner color={Colors.accent.indigo} />
      </View>
    );
  }

  if (!todayContent) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-gray-500">Content not available</Text>
      </View>
    );
  }

  const content = todayContent.content;
  const dayTitle = content.title[language as 'en' | 'id'] || content.title.en;
  const dayFocus = content.focus[language as 'en' | 'id'] || content.focus.en;
  const devotion = content.devotion_content[language as 'en' | 'id'] || content.devotion_content.en;
  const reflectionQuestions = content.reflection_questions[language as 'en' | 'id'] ||
    content.reflection_questions.en || [];
  const application = content.application[language as 'en' | 'id'] || content.application.en;
  const prayerPrompt = content.prayer_prompt[language as 'en' | 'id'] || content.prayer_prompt.en;

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid]}
        className="pb-6"
      >
        <SafeAreaView edges={['top']}>
          <View className="px-4 pt-2 pb-4">
            {/* Back button + meta */}
            <View className="flex-row items-center mb-4">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center bg-white/20 active:scale-95 mr-3"
              >
                <ChevronLeft size={24} color={Colors.white} />
              </Pressable>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  {todayContent.journey_title[language as 'en' | 'id'] || todayContent.journey_title.en}
                </Text>
                <Text className="text-sm text-white/80">
                  Week {todayContent.week_number} · Day {todayContent.day_number}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                <Clock size={14} color={Colors.white} />
                <Text className="text-sm font-medium text-white">
                  {content.estimated_minutes}min
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-white mb-1" style={{ letterSpacing: -0.5 }}>
              {dayTitle}
            </Text>
            <Text className="text-base text-white/70">{dayFocus}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Scripture Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <SectionCard
              icon={BookOpen}
              title="Scripture Reading"
              completed={scriptureRead}
              onComplete={() => setScriptureRead(!scriptureRead)}
            >
              <View className="bg-indigo-50 rounded-xl p-4 mb-3">
                <Text className="text-lg font-bold text-indigo-700 mb-1">
                  {content.main_scripture.book} {content.main_scripture.chapter}:
                  {content.main_scripture.verses}
                </Text>
                {content.scripture_text && (
                  <Text className="text-base text-gray-700 leading-relaxed italic">
                    "{content.scripture_text[language as 'en' | 'id'] || content.scripture_text.en}"
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // TODO: Navigate to Bible reader
                }}
                className="flex-row items-center justify-center gap-2 bg-indigo-100 py-3 rounded-xl active:scale-[0.98]"
              >
                <BookOpen size={18} color={Colors.accent.indigo} />
                <Text className="text-sm font-semibold text-indigo-700">
                  Open in Bible Reader
                </Text>
              </Pressable>
            </SectionCard>
          </Animated.View>

          {/* Devotion Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <SectionCard
              icon={Heart}
              title="Today's Devotion"
              completed={devotionRead}
              onComplete={() => setDevotionRead(!devotionRead)}
              accentColor="#EC4899"
            >
              <Text className="text-base text-gray-700 leading-relaxed mb-4">
                {devotion}
              </Text>
              {application && (
                <View className="bg-pink-50 rounded-xl p-4">
                  <Text className="text-sm font-bold text-pink-700 mb-1">
                    Application
                  </Text>
                  <Text className="text-sm text-gray-700">{application}</Text>
                </View>
              )}
            </SectionCard>
          </Animated.View>

          {/* Reflection Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <SectionCard
              icon={PenLine}
              title="Reflection"
              completed={reflectionAnswered}
              onComplete={() => setReflectionAnswered(!reflectionAnswered)}
              accentColor="#F59E0B"
              defaultExpanded={false}
            >
              {reflectionQuestions.map((question: string, index: number) => (
                <ReflectionInput
                  key={index}
                  question={question}
                  value={reflectionResponses[index] || ''}
                  onChange={(text) => {
                    const updated = [...reflectionResponses];
                    updated[index] = text;
                    setReflectionResponses(updated);
                  }}
                  index={index}
                />
              ))}
            </SectionCard>
          </Animated.View>

          {/* Prayer Section */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <SectionCard
              icon={Sparkles}
              title="Prayer"
              completed={prayerCompleted}
              onComplete={() => setPrayerCompleted(!prayerCompleted)}
              accentColor="#10B981"
              defaultExpanded={false}
            >
              <View className="bg-green-50 rounded-xl p-4 mb-4">
                <Text className="text-base text-gray-700 leading-relaxed italic">
                  {prayerPrompt}
                </Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add personal notes or prayer requests..."
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={3}
                className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 min-h-[80px]"
                style={{ textAlignVertical: 'top' }}
              />
            </SectionCard>
          </Animated.View>

          {/* Ask Faith Assistant about today's journey */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <QuickAskInput
              context="journey_day"
              contentId={slug}
              weekNumber={todayContent.week_number}
              dayNumber={todayContent.day_number}
              contextData={{
                journeySlug: slug,
                journeyTitle: todayContent.journey_title[language as 'en' | 'id'] || todayContent.journey_title.en,
                weekNumber: todayContent.week_number,
                dayNumber: todayContent.day_number,
                verseReference: `${content.main_scripture.book} ${content.main_scripture.chapter}:${content.main_scripture.verses}`,
              }}
              title={language === 'en' ? 'Questions about today\'s content?' : 'Pertanyaan tentang konten hari ini?'}
              language={language as 'en' | 'id'}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Complete Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6"
        style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
      >
        {/* Progress indicators */}
        <View className="flex-row items-center justify-center gap-2 mb-3">
          {[
            { done: scriptureRead, label: 'Scripture' },
            { done: devotionRead, label: 'Devotion' },
            { done: reflectionAnswered, label: 'Reflection' },
            { done: prayerCompleted, label: 'Prayer' },
          ].map((item, index) => (
            <View
              key={index}
              className={`w-3 h-3 rounded-full ${
                item.done ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>

        {/* Complete button */}
        <View className="rounded-2xl overflow-hidden">
          <Button
            size="lg"
            onPress={handleComplete}
            isDisabled={!allCompleted || completeDayMutation.isPending}
            className="w-full bg-transparent relative overflow-hidden"
          >
            <LinearGradient
              colors={
                allCompleted
                  ? [Colors.success, '#059669']
                  : [Colors.neutral[300], Colors.neutral[300]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="flex-row items-center justify-center gap-2 z-[1]">
              {completeDayMutation.isPending ? (
                <ButtonSpinner color={Colors.white} />
              ) : (
                <Check size={20} color={Colors.white} strokeWidth={2.5} />
              )}
              <ButtonText className="text-white font-bold text-base">
                {completeDayMutation.isPending
                  ? 'Saving...'
                  : allCompleted
                  ? t('journey.today.markComplete', 'Mark as Complete')
                  : 'Complete all sections'}
              </ButtonText>
            </View>
          </Button>
        </View>
      </View>

      {/* Celebration Modal */}
      <CompletionCelebration
        visible={showCelebration}
        onClose={handleCelebrationClose}
        streak={todayContent.progress.days_completed + 1}
      />
    </View>
  );
}

// Memoize + Premium Motion HOC
const MemoizedScreen = memo(JourneyTodayScreen);
MemoizedScreen.displayName = 'JourneyTodayScreen';
export default withPremiumMotionV10(MemoizedScreen);
