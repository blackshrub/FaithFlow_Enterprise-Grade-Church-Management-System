/**
 * Grow Panel Component
 *
 * Animated overlay panel containing Bible and Explore cards.
 * Features:
 * - Glassmorphism backdrop blur
 * - Staggered card animations
 * - Tap outside to close
 * - Smooth spring animations
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React from 'react';
import { Pressable, View, Dimensions, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideOutDown,
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

// Tab bar visual height (content area only, safe area handled separately)
const TAB_BAR_CONTENT_HEIGHT = 56;
// Extra padding in tab bar content
const TAB_BAR_PADDING = 16;

export function GrowPanel() {
  const { t } = useTranslation();
  // Selective subscriptions to prevent re-renders
  const isOpen = useGrowStore((s) => s.isOpen);
  const close = useGrowStore((s) => s.close);
  const insets = useSafeAreaInsets();

  if (!isOpen) return null;

  // Calculate total tab bar height including safe area
  const tabBarTotalHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING + (insets.bottom > 0 ? insets.bottom - 8 : 4);

  return (
    <>
      {/* Backdrop - excludes tab bar at bottom */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: tabBarTotalHeight,
          zIndex: 100,
        }}
        pointerEvents="auto"
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={close}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close grow panel"
        >
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
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
        className="absolute left-4 right-4 z-[101] rounded-3xl p-5"
        style={{
          bottom: tabBarTotalHeight + 16,
          backgroundColor: Platform.OS === 'ios'
            ? 'rgba(255, 255, 255, 0.95)'
            : colors.white,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 16,
        }}
        pointerEvents="box-none"
      >
        {/* Panel Header - No separate entering animation to avoid opacity conflict */}
        <View className="mb-4 items-center">
          <Text
            className="text-[22px] font-bold mb-1"
            style={{ color: colors.gray[900] }}
          >
            {t('grow.title')}
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: colors.gray[500] }}
          >
            {t('grow.subtitle')}
          </Text>
        </View>

        {/* Cards Container */}
        <View className="flex-row gap-4 min-h-[140px] mb-4">
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
        <View className="mb-3">
          <FaithAssistantCard variant="button" onBeforeNavigate={close} />
        </View>

        {/* Tip - No separate entering animation to avoid opacity conflict */}
        <View className="items-center px-2">
          <Text
            className="text-xs text-center italic"
            style={{ color: colors.gray[400] }}
          >
            {t('grow.tip')}
          </Text>
        </View>
      </Animated.View>
    </>
  );
}
