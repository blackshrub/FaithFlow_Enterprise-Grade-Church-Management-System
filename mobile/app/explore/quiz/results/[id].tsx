/**
 * Quiz Results Screen
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for ExploreColors and shadows
 * - React Native Reanimated for animations
 *
 * Design: Celebration & encouragement
 * - Hero section with score circle
 * - Performance message (encouraging, not judgmental)
 * - Score breakdown
 * - Share achievement option
 * - Continue button
 */

import React, { useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors } from '@/constants/explore/designSystem';
import { useTrackContentComplete } from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { Trophy, Star, Share2, ArrowRight, Sparkles } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import {
  useOverlay,
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/overlay';

interface PerformanceLevel {
  title: { en: string; id: string };
  message: { en: string; id: string };
  icon: React.ReactNode;
  color: string;
}

export default function QuizResultsScreen() {
  const { id, score: scoreParam, total: totalParam } = useLocalSearchParams<{
    id: string;
    score: string;
    total: string;
  }>();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const score = parseInt(scoreParam as string, 10);
  const total = parseInt(totalParam as string, 10);
  const percentage = Math.round((score / total) * 100);

  const trackComplete = useTrackContentComplete();

  // Animations
  const scaleValue = useSharedValue(0);
  const starScale1 = useSharedValue(0);
  const starScale2 = useSharedValue(0);
  const starScale3 = useSharedValue(0);

  const overlay = useOverlay();

  useEffect(() => {
    // Track completion
    if (id) {
      trackComplete.mutate({
        contentId: id as string,
        contentType: 'quiz',
      });
    }

    // Trigger animations
    scaleValue.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 100 }));
    starScale1.value = withDelay(
      600,
      withSequence(withSpring(1.2), withSpring(1))
    );
    starScale2.value = withDelay(
      700,
      withSequence(withSpring(1.2), withSpring(1))
    );
    starScale3.value = withDelay(
      800,
      withSequence(withSpring(1.2), withSpring(1))
    );

    // Show celebration for perfect score via unified overlay
    if (percentage === 100) {
      const payload: CelebrationPayload = {
        type: 'quiz_perfect',
        data: { score, total, percentage },
        language: contentLanguage,
      };
      // Small delay to let entrance animations finish first
      setTimeout(() => {
        overlay.showCenterModal(
          (props) => <CelebrationModal {...props} />,
          payload
        );
      }, 1000);
    }
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const star1Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale1.value }],
  }));

  const star2Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale2.value }],
  }));

  const star3Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale3.value }],
  }));

  // Determine performance level
  const getPerformanceLevel = (): PerformanceLevel => {
    if (percentage === 100) {
      return {
        title: { en: 'Perfect!', id: 'Sempurna!' },
        message: {
          en: 'You answered every question correctly! Your knowledge is truly impressive.',
          id: 'Anda menjawab semua pertanyaan dengan benar! Pengetahuan Anda sungguh mengesankan.',
        },
        icon: <Trophy size={32} color={ExploreColors.secondary[600]} />,
        color: ExploreColors.secondary[500],
      };
    } else if (percentage >= 80) {
      return {
        title: { en: 'Excellent!', id: 'Luar Biasa!' },
        message: {
          en: 'Great job! You have a strong understanding of the material.',
          id: 'Kerja bagus! Anda memiliki pemahaman yang kuat tentang materi.',
        },
        icon: <Star size={32} color={ExploreColors.success[600]} />,
        color: ExploreColors.success[500],
      };
    } else if (percentage >= 60) {
      return {
        title: { en: 'Good Work!', id: 'Kerja Bagus!' },
        message: {
          en: 'You did well! Keep learning and growing in your faith journey.',
          id: 'Anda melakukannya dengan baik! Terus belajar dan bertumbuh dalam perjalanan iman Anda.',
        },
        icon: <Sparkles size={32} color={ExploreColors.primary[600]} />,
        color: ExploreColors.primary[500],
      };
    } else {
      return {
        title: { en: 'Keep Going!', id: 'Terus Maju!' },
        message: {
          en: "Every attempt is a step forward. Don't give up—you're learning!",
          id: 'Setiap usaha adalah langkah maju. Jangan menyerah—Anda sedang belajar!',
        },
        icon: <Sparkles size={32} color={ExploreColors.info[600]} />,
        color: ExploreColors.info[500],
      };
    }
  };

  const performance = getPerformanceLevel();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${
          contentLanguage === 'en'
            ? `I scored ${score}/${total} (${percentage}%) on today's Bible quiz in FaithFlow!`
            : `Saya mendapat nilai ${score}/${total} (${percentage}%) pada kuis Alkitab hari ini di FaithFlow!`
        }`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContinue = () => {
    router.push('/(tabs)/explore');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow pb-6 justify-center"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} className="px-5 py-8 items-center">
          {/* Decorative Stars */}
          <View className="absolute top-0 left-0 right-0 h-[200px]">
            <Animated.View className="absolute top-5 left-10" style={star1Style}>
              <Star size={24} color={ExploreColors.secondary[400]} fill={ExploreColors.secondary[400]} />
            </Animated.View>
            <Animated.View className="absolute top-[60px] right-[30px]" style={star2Style}>
              <Star size={32} color={ExploreColors.secondary[500]} fill={ExploreColors.secondary[500]} />
            </Animated.View>
            <Animated.View className="absolute top-[120px] left-1/2" style={star3Style}>
              <Star size={20} color={ExploreColors.secondary[300]} fill={ExploreColors.secondary[300]} />
            </Animated.View>
          </View>

          {/* Score Circle */}
          <Animated.View className="mb-6 z-[1]" style={circleStyle}>
            <View
              className="w-[200px] h-[200px] rounded-full border-[8px] bg-white items-center justify-center"
              style={{
                borderColor: performance.color,
                shadowColor: 'rgba(0, 0, 0, 0.1)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 4,
              }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `Quiz completed. Your score: ${percentage} percent. You answered ${score} out of ${total} questions correctly.`
                  : `Kuis selesai. Nilai Anda: ${percentage} persen. Anda menjawab ${score} dari ${total} pertanyaan dengan benar.`
              }
              accessibilityLiveRegion="polite"
            >
              <View className="mb-1">{performance.icon}</View>
              <Text
                className="text-5xl leading-[56px] font-extrabold"
                style={{ color: ExploreColors.neutral[900] }}
              >
                {percentage}%
              </Text>
              <Text
                className="text-base mt-1"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {score} / {total}
              </Text>
            </View>
          </Animated.View>

          {/* Performance Message */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)} className="items-center mb-6 px-4">
            <Text
              className="text-2xl font-bold mb-2 text-center"
              style={{ color: ExploreColors.neutral[900] }}
            >
              {performance.title[contentLanguage]}
            </Text>
            <Text
              className="text-base leading-6 text-center"
              style={{ color: ExploreColors.neutral[700] }}
            >
              {performance.message[contentLanguage]}
            </Text>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)} className="flex-row gap-3 mb-6 w-full">
            <View
              className="flex-1 rounded-2xl p-4 items-center"
              style={{ backgroundColor: ExploreColors.neutral[50] }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${score} correct answers`
                  : `${score} jawaban benar`
              }
            >
              <Text
                className="text-2xl font-bold mb-1"
                style={{ color: ExploreColors.success[600] }}
              >
                {score}
              </Text>
              <Text
                className="text-sm font-semibold uppercase"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {contentLanguage === 'en' ? 'Correct' : 'Benar'}
              </Text>
            </View>

            <View
              className="flex-1 rounded-2xl p-4 items-center"
              style={{ backgroundColor: ExploreColors.neutral[50] }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${total - score} incorrect answers`
                  : `${total - score} jawaban salah`
              }
            >
              <Text
                className="text-2xl font-bold mb-1"
                style={{ color: ExploreColors.error[500] }}
              >
                {total - score}
              </Text>
              <Text
                className="text-sm font-semibold uppercase"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {contentLanguage === 'en' ? 'Incorrect' : 'Salah'}
              </Text>
            </View>

            <View
              className="flex-1 rounded-2xl p-4 items-center"
              style={{ backgroundColor: ExploreColors.neutral[50] }}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${percentage} percent accuracy`
                  : `${percentage} persen akurasi`
              }
            >
              <Text
                className="text-2xl font-bold mb-1"
                style={{ color: ExploreColors.secondary[600] }}
              >
                {percentage}%
              </Text>
              <Text
                className="text-sm font-semibold uppercase"
                style={{ color: ExploreColors.neutral[600] }}
              >
                {contentLanguage === 'en' ? 'Accuracy' : 'Akurasi'}
              </Text>
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.duration(500).delay(800)} className="gap-3 mb-6 w-full">
            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border-2"
              style={{
                backgroundColor: ExploreColors.primary[50],
                borderColor: ExploreColors.primary[200],
              }}
              accessibilityRole="button"
              accessibilityLabel={contentLanguage === 'en' ? 'Share your quiz results' : 'Bagikan hasil kuis Anda'}
              accessibilityHint={
                contentLanguage === 'en'
                  ? 'Double tap to share your score with others'
                  : 'Ketuk dua kali untuk membagikan nilai Anda dengan orang lain'
              }
            >
              <Share2 size={20} color={ExploreColors.primary[600]} />
              <Text
                className="text-base font-semibold"
                style={{ color: ExploreColors.primary[700] }}
              >
                {contentLanguage === 'en' ? 'Share Result' : 'Bagikan Hasil'}
              </Text>
            </Pressable>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
              style={{ backgroundColor: ExploreColors.primary[500] }}
              accessibilityRole="button"
              accessibilityLabel={contentLanguage === 'en' ? 'Continue exploring' : 'Lanjutkan menjelajah'}
              accessibilityHint={
                contentLanguage === 'en'
                  ? 'Double tap to return to Explore home'
                  : 'Ketuk dua kali untuk kembali ke halaman Jelajahi'
              }
            >
              <Text className="text-base font-semibold text-white">
                {contentLanguage === 'en' ? 'Continue Exploring' : 'Lanjutkan Menjelajah'}
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {/* Encouragement */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(1000)}
            className="rounded-2xl p-4 w-full"
            style={{ backgroundColor: ExploreColors.secondary[50] }}
          >
            <Text
              className="text-base text-center italic"
              style={{ color: ExploreColors.secondary[800] }}
            >
              {contentLanguage === 'en'
                ? 'Come back tomorrow for a new quiz challenge!'
                : 'Kembali besok untuk tantangan kuis baru!'}
            </Text>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
