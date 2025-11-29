/**
 * Grow Panel Component
 *
 * Animated overlay panel containing Bible and Explore cards.
 * Features:
 * - Glassmorphism backdrop blur
 * - Staggered card animations
 * - Tap outside to close
 * - Smooth spring animations
 */

import React from 'react';
import { Pressable, StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideOutDown,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { GrowCard } from './GrowCard';
import { FaithAssistantCard } from '@/components/companion';
import { useGrowStore } from '@/stores/growStore';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

// Tab bar height + FAB overhang for proper positioning
// FAB is 56px with marginTop -20, so extends 36px above tab bar content
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;

export function GrowPanel() {
  const { t } = useTranslation();
  const { isOpen, close } = useGrowStore();
  const insets = useSafeAreaInsets();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
        pointerEvents="auto"
      >
        <Pressable style={styles.backdrop} onPress={close}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
          )}
        </Pressable>
      </Animated.View>

      {/* Panel Content - Slides up from bottom (smooth, no bounce) */}
      <Animated.View
        entering={FadeIn.duration(200).withInitialValues({
          opacity: 0,
          transform: [{ translateY: 100 }],
        })}
        exiting={SlideOutDown.duration(180)}
        style={[
          styles.panel,
          {
            bottom: TAB_BAR_HEIGHT + insets.bottom + 16,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Panel Header - No separate entering animation to avoid opacity conflict */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('grow.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('grow.subtitle')}</Text>
        </View>

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          <GrowCard
            type="bible"
            title={t('grow.bible.title')}
            subtitle={t('grow.bible.subtitle')}
            delay={100}
          />
          <GrowCard
            type="explore"
            title={t('grow.explore.title')}
            subtitle={t('grow.explore.subtitle')}
            delay={150}
          />
        </View>

        {/* Faith Assistant Button - Full width with flowing glow */}
        <View style={styles.faithAssistantContainer}>
          <FaithAssistantCard variant="button" onBeforeNavigate={close} />
        </View>

        {/* Tip - No separate entering animation to avoid opacity conflict */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>{t('grow.tip')}</Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  androidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 101,
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(255, 255, 255, 0.95)'
      : colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 160,
    marginBottom: 12,
  },
  faithAssistantContainer: {
    marginBottom: 16,
  },
  tipContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tipText: {
    fontSize: 12,
    color: colors.gray[400],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
