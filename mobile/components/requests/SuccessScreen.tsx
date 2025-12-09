/**
 * SuccessScreen - Celebration screen with optional confetti
 *
 * Design:
 * - Animated checkmark/heart icon
 * - Gradient header
 * - "Next steps" info card
 * - Optional confetti animation
 * - Configurable colors per request type
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check, Heart, LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, ButtonText } from '@/components/ui/button';

interface NextStep {
  text: string;
}

interface SuccessScreenProps {
  type: 'accept-jesus' | 'baptism' | 'child-dedication' | 'holy-matrimony';
  title: string;
  subtitle: string;
  nextSteps: NextStep[];
  showConfetti?: boolean;
  customIcon?: LucideIcon;
}

// Theme configurations per request type
const THEMES: Record<string, {
  gradient: [string, string];
  iconBg: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
}> = {
  'accept-jesus': {
    gradient: ['#F59E0B', '#D97706'],
    iconBg: '#FEF3C7',
    infoBg: '#FFFBEB',
    infoBorder: '#FCD34D',
    infoText: '#92400E',
  },
  'baptism': {
    gradient: ['#3B82F6', '#2563EB'],
    iconBg: '#DBEAFE',
    infoBg: '#EFF6FF',
    infoBorder: '#93C5FD',
    infoText: '#1E40AF',
  },
  'child-dedication': {
    gradient: ['#EC4899', '#DB2777'],
    iconBg: '#FCE7F3',
    infoBg: '#FDF2F8',
    infoBorder: '#F9A8D4',
    infoText: '#9D174D',
  },
  'holy-matrimony': {
    gradient: ['#D4AF37', '#B8860B'],
    iconBg: '#FEF9E7',
    infoBg: '#FFFDF7',
    infoBorder: '#E9D5A1',
    infoText: '#8B6914',
  },
};

export function SuccessScreen({
  type,
  title,
  subtitle,
  nextSteps,
  showConfetti = false,
  customIcon,
}: SuccessScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = THEMES[type] || THEMES['baptism'];

  // Animation values
  const iconScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // Determine icon
  const IconComponent = customIcon || (type === 'accept-jesus' ? Heart : Check);

  // Trigger haptic feedback
  const triggerHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    // Icon bounce animation
    iconScale.value = withSequence(
      withDelay(200, withSpring(1.2, { damping: 8, stiffness: 200 })),
      withSpring(1, { damping: 12, stiffness: 150 }, () => {
        runOnJS(triggerHaptic)();
      })
    );

    // Content fade in
    contentOpacity.value = withDelay(500, withSpring(1));
    contentTranslateY.value = withDelay(500, withSpring(0, { damping: 15 }));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleGoHome = () => {
    router.replace('/(tabs)/today');
  };

  return (
    <View style={styles.container}>
      {/* Icon with gradient background */}
      <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <IconComponent size={48} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Next Steps Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.infoBg,
              borderColor: theme.infoBorder,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: theme.infoText }]}>
            {t('requests.success.whatNext', "What happens next?")}
          </Text>
          {nextSteps.map((step, index) => (
            <Text
              key={index}
              style={[styles.infoItem, { color: theme.infoText }]}
            >
              {'\u2022'} {step.text}
            </Text>
          ))}
        </View>

        {/* Home Button */}
        <Button
          size="lg"
          onPress={handleGoHome}
          className="w-full mt-6"
        >
          <ButtonText>{t('requests.success.backToHome', 'Back to Home')}</ButtonText>
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  iconWrapper: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
});

export default SuccessScreen;
