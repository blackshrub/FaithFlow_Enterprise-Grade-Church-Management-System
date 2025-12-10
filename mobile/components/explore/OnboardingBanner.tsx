/**
 * Onboarding Banner - Premium welcome prompt for Explore screen
 *
 * Shows when user hasn't completed spiritual profile onboarding
 * Features:
 * - Premium gradient design
 * - Animated entry
 * - Two CTAs: Start setup, Skip
 *
 * Styling: NativeWind-first
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  ChevronRight,
  X,
  Heart,
  Target,
  BookOpen,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button, ButtonText } from '@/components/ui/button';
import { useOnboardingStatus, useOnboardingActions } from '@/stores/onboarding';

const Colors = {
  gradientStart: '#4338CA',
  gradientMid: '#6366F1',
  gradientEnd: '#8B5CF6',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.8)',
  accentGold: '#d4af37',
};

interface OnboardingBannerProps {
  variant?: 'full' | 'compact';
}

export function OnboardingBanner({ variant = 'full' }: OnboardingBannerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { hasCompletedOnboarding, hasSkippedOnboarding } = useOnboardingStatus();
  const { markSkipped } = useOnboardingActions();

  // Don't show if already completed or skipped
  if (hasCompletedOnboarding || hasSkippedOnboarding) {
    return null;
  }

  const handleStartSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/explore/onboarding');
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markSkipped();
  };

  if (variant === 'compact') {
    return (
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        exiting={FadeOutUp.duration(200)}
        className="mb-6"
      >
        <Pressable
          onPress={handleStartSetup}
          className="overflow-hidden rounded-2xl active:scale-[0.98]"
          style={{
            shadowColor: '#4338CA',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Personalize Your Journey. Tap to get started with onboarding."
        >
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-4"
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Sparkles size={24} color={Colors.textWhite} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white mb-0.5">
                  {t('onboarding.banner.compactTitle', 'Personalize Your Journey')}
                </Text>
                <Text className="text-sm text-white/70">
                  {t('onboarding.banner.compactSubtitle', 'Tap to get started')}
                </Text>
              </View>
              <ChevronRight size={24} color={Colors.textWhiteMuted} />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // Full variant
  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      exiting={FadeOutUp.duration(300)}
      className="mb-8"
    >
      <View
        className="overflow-hidden rounded-3xl"
        style={{
          shadowColor: '#4338CA',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="relative p-6"
        >
          {/* Decorative circles */}
          <View
            className="absolute rounded-full"
            style={{
              width: 120,
              height: 120,
              top: -40,
              right: -20,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              bottom: -30,
              left: 20,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />

          {/* Dismiss button */}
          <Pressable
            onPress={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full items-center justify-center bg-white/20 active:scale-95 z-10"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Dismiss onboarding banner"
          >
            <X size={18} color={Colors.textWhite} />
          </Pressable>

          {/* Content */}
          <View className="items-center">
            {/* Icon row */}
            <View className="flex-row items-center justify-center mb-4 gap-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Heart size={18} color={Colors.textWhite} />
              </View>
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                <Sparkles size={28} color={Colors.accentGold} />
              </View>
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Target size={18} color={Colors.textWhite} />
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-2xl font-bold text-white text-center mb-2"
              style={{ letterSpacing: -0.5 }}
            >
              {t('onboarding.banner.title', 'Personalize Your Experience')}
            </Text>

            {/* Description */}
            <Text className="text-base text-center text-white/80 mb-6 px-2">
              {t(
                'onboarding.banner.description',
                'Answer a few quick questions to receive content tailored to your spiritual journey'
              )}
            </Text>

            {/* Benefits */}
            <View className="flex-row flex-wrap justify-center gap-2 mb-6">
              {[
                t('onboarding.banner.benefit1', 'Personalized Devotions'),
                t('onboarding.banner.benefit2', 'Tailored Studies'),
                t('onboarding.banner.benefit3', 'Smart Recommendations'),
              ].map((benefit, index) => (
                <View
                  key={index}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text className="text-xs font-semibold text-white">{benefit}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <Button
              size="lg"
              onPress={handleStartSetup}
              className="w-full bg-white rounded-2xl"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Sparkles size={18} color={Colors.gradientMid} />
                <ButtonText style={{ color: Colors.gradientMid, fontWeight: '700' }}>
                  {t('onboarding.banner.cta', "Let's Get Started")}
                </ButtonText>
              </View>
            </Button>

            {/* Skip text */}
            <Pressable
              onPress={handleDismiss}
              className="mt-3 py-2 active:opacity-70"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding, I'll do this later"
            >
              <Text className="text-sm text-white/60">
                {t('onboarding.banner.skipText', "I'll do this later")}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

export default OnboardingBanner;
