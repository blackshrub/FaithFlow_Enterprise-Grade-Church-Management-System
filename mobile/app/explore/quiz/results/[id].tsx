/**
 * Quiz Results Screen
 *
 * Design: Celebration & encouragement
 * - Hero section with score circle
 * - Performance message (encouraging, not judgmental)
 * - Score breakdown
 * - Share achievement option
 * - Continue button
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import { useTrackContentComplete } from '@/hooks/explore/useExplore';
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
import { CelebrationModal } from '@/components/explore/CelebrationModal';

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

  const [showCelebration, setShowCelebration] = useState(false);
  const trackComplete = useTrackContentComplete();

  // Animations
  const scaleValue = useSharedValue(0);
  const starScale1 = useSharedValue(0);
  const starScale2 = useSharedValue(0);
  const starScale3 = useSharedValue(0);

  useEffect(() => {
    // Track completion
    if (id) {
      trackComplete.mutate({
        contentId: id as string,
        contentType: 'quiz',
        metadata: { score, total, percentage },
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

    // Show celebration for perfect score
    if (percentage === 100) {
      setTimeout(() => setShowCelebration(true), 1000);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.contentContainer}>
          {/* Decorative Stars */}
          <View style={styles.starsContainer}>
            <Animated.View style={[styles.star, styles.star1, star1Style]}>
              <Star size={24} color={ExploreColors.secondary[400]} fill={ExploreColors.secondary[400]} />
            </Animated.View>
            <Animated.View style={[styles.star, styles.star2, star2Style]}>
              <Star size={32} color={ExploreColors.secondary[500]} fill={ExploreColors.secondary[500]} />
            </Animated.View>
            <Animated.View style={[styles.star, styles.star3, star3Style]}>
              <Star size={20} color={ExploreColors.secondary[300]} fill={ExploreColors.secondary[300]} />
            </Animated.View>
          </View>

          {/* Score Circle */}
          <Animated.View style={[styles.scoreCircleContainer, circleStyle]}>
            <View
              style={[styles.scoreCircle, { borderColor: performance.color }]}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `Quiz completed. Your score: ${percentage} percent. You answered ${score} out of ${total} questions correctly.`
                  : `Kuis selesai. Nilai Anda: ${percentage} persen. Anda menjawab ${score} dari ${total} pertanyaan dengan benar.`
              }
              accessibilityLiveRegion="polite"
            >
              <View style={styles.iconContainer}>{performance.icon}</View>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
              <Text style={styles.scoreDetail}>
                {score} / {total}
              </Text>
            </View>
          </Animated.View>

          {/* Performance Message */}
          <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.messageContainer}>
            <Text style={styles.performanceTitle}>{performance.title[contentLanguage]}</Text>
            <Text style={styles.performanceMessage}>{performance.message[contentLanguage]}</Text>
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.statsGrid}>
            <View
              style={styles.statCard}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${score} correct answers`
                  : `${score} jawaban benar`
              }
            >
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>
                {contentLanguage === 'en' ? 'Correct' : 'Benar'}
              </Text>
            </View>

            <View
              style={styles.statCard}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${total - score} incorrect answers`
                  : `${total - score} jawaban salah`
              }
            >
              <Text style={[styles.statValue, { color: ExploreColors.error[500] }]}>
                {total - score}
              </Text>
              <Text style={styles.statLabel}>
                {contentLanguage === 'en' ? 'Incorrect' : 'Salah'}
              </Text>
            </View>

            <View
              style={styles.statCard}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={
                contentLanguage === 'en'
                  ? `${percentage} percent accuracy`
                  : `${percentage} persen akurasi`
              }
            >
              <Text style={[styles.statValue, { color: ExploreColors.secondary[600] }]}>
                {percentage}%
              </Text>
              <Text style={styles.statLabel}>
                {contentLanguage === 'en' ? 'Accuracy' : 'Akurasi'}
              </Text>
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.duration(500).delay(800)} style={styles.actionsContainer}>
            {/* Share Button */}
            <Pressable
              onPress={handleShare}
              style={styles.shareButton}
              accessibilityRole="button"
              accessibilityLabel={contentLanguage === 'en' ? 'Share your quiz results' : 'Bagikan hasil kuis Anda'}
              accessibilityHint={
                contentLanguage === 'en'
                  ? 'Double tap to share your score with others'
                  : 'Ketuk dua kali untuk membagikan nilai Anda dengan orang lain'
              }
            >
              <Share2 size={20} color={ExploreColors.primary[600]} />
              <Text style={styles.shareButtonText}>
                {contentLanguage === 'en' ? 'Share Result' : 'Bagikan Hasil'}
              </Text>
            </Pressable>

            {/* Continue Button */}
            <Pressable
              onPress={handleContinue}
              style={styles.continueButton}
              accessibilityRole="button"
              accessibilityLabel={contentLanguage === 'en' ? 'Continue exploring' : 'Lanjutkan menjelajah'}
              accessibilityHint={
                contentLanguage === 'en'
                  ? 'Double tap to return to Explore home'
                  : 'Ketuk dua kali untuk kembali ke halaman Jelajahi'
              }
            >
              <Text style={styles.continueButtonText}>
                {contentLanguage === 'en' ? 'Continue Exploring' : 'Lanjutkan Menjelajah'}
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          {/* Encouragement */}
          <Animated.View entering={FadeInDown.duration(500).delay(1000)} style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>
              {contentLanguage === 'en'
                ? 'Come back tomorrow for a new quiz challenge!'
                : 'Kembali besok untuk tantangan kuis baru!'}
            </Text>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* Celebration Modal */}
      {showCelebration && (
        <CelebrationModal
          visible={showCelebration}
          onClose={() => setShowCelebration(false)}
          type="quiz_perfect"
          message={
            contentLanguage === 'en'
              ? 'Perfect Score! Amazing!'
              : 'Nilai Sempurna! Luar Biasa!'
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ExploreSpacing.xl,
  },
  contentContainer: {
    paddingHorizontal: ExploreSpacing.screenMargin,
    paddingTop: ExploreSpacing['2xl'],
    alignItems: 'center',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  star: {
    position: 'absolute',
  },
  star1: {
    top: 20,
    left: 40,
  },
  star2: {
    top: 60,
    right: 30,
  },
  star3: {
    top: 120,
    left: '50%',
  },
  scoreCircleContainer: {
    marginBottom: ExploreSpacing.xl,
    zIndex: 1,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: ExploreSpacing.xs,
  },
  scorePercentage: {
    ...ExploreTypography.h1,
    fontSize: 48,
    lineHeight: 56,
    color: ExploreColors.neutral[900],
    fontWeight: '800',
  },
  scoreDetail: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    marginTop: ExploreSpacing.xs,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: ExploreSpacing.xl,
    paddingHorizontal: ExploreSpacing.lg,
  },
  performanceTitle: {
    ...ExploreTypography.h2,
    color: ExploreColors.neutral[900],
    marginBottom: ExploreSpacing.sm,
    textAlign: 'center',
  },
  performanceMessage: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[700],
    textAlign: 'center',
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.xl,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: ExploreColors.neutral[50],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...ExploreTypography.h2,
    color: ExploreColors.success[600],
    marginBottom: ExploreSpacing.xs,
  },
  statLabel: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[600],
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: ExploreSpacing.md,
    marginBottom: ExploreSpacing.xl,
    width: '100%',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[50],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ExploreColors.primary[200],
  },
  shareButtonText: {
    ...ExploreTypography.body,
    color: ExploreColors.primary[700],
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ExploreSpacing.sm,
    backgroundColor: ExploreColors.primary[500],
    paddingVertical: ExploreSpacing.md,
    borderRadius: 16,
  },
  continueButtonText: {
    ...ExploreTypography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  encouragementCard: {
    backgroundColor: ExploreColors.secondary[50],
    borderRadius: 16,
    padding: ExploreSpacing.lg,
    width: '100%',
  },
  encouragementText: {
    ...ExploreTypography.body,
    color: ExploreColors.secondary[800],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
