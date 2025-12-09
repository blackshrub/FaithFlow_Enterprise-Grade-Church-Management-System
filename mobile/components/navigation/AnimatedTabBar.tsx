/**
 * Animated Bottom Tab Bar - New Design
 *
 * Modern tab bar with center GROW FAB button.
 *
 * Tabs:
 * - Today (Sunrise icon)
 * - Events (Calendar icon)
 * - [GROW FAB center]
 * - Community (MessageCircle icon)
 * - Give (HeartHandshake icon)
 *
 * Features:
 * - Instant tab switching (0ms latency)
 * - Outlined to filled icon transition
 * - Compact design with icons + labels
 * - Center FAB for GROW feature
 * - Glassmorphism style (iOS)
 * - Auto-hide in Bible focus mode (scroll down hides, scroll up shows)
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { colors, touchTargets } from '@/constants/theme';
import { useBibleUIStore } from '@/stores/bibleUIStore';
import { useGrowStore } from '@/stores/growStore';
import { GrowFab } from '@/components/grow';
import {
  SunriseIcon,
  CalendarIcon,
  MessageCircleIcon,
  HeartHandshakeIcon,
} from './TabIcons';

interface Tab {
  name: string;
  screenName: string; // React Navigation screen name
  icon: React.ComponentType<{ size?: number; color?: string; isActive?: boolean }>;
  label: string;
}

// Left tabs (before FAB)
const LEFT_TABS: Tab[] = [
  {
    name: 'today',
    screenName: 'today', // Changed from 'index' - redirect workaround for Expo Router lag
    icon: SunriseIcon,
    label: 'tabs.today',
  },
  {
    name: 'events',
    screenName: 'events',
    icon: CalendarIcon,
    label: 'tabs.events',
  },
];

// Right tabs (after FAB)
const RIGHT_TABS: Tab[] = [
  {
    name: 'groups',
    screenName: 'groups',
    icon: MessageCircleIcon,
    label: 'tabs.community',
  },
  {
    name: 'give',
    screenName: 'give',
    icon: HeartHandshakeIcon,
    label: 'tabs.give',
  },
];

export function AnimatedTabBar({ navigation, state }: BottomTabBarProps) {
  const { t } = useTranslation();
  // Selective subscriptions to prevent unnecessary re-renders
  const focusModeActive = useBibleUIStore((s) => s.focusModeActive);
  const tabBarVisible = useBibleUIStore((s) => s.tabBarVisible);
  const closeGrowPanel = useGrowStore((s) => s.close);
  const insets = useSafeAreaInsets();

  // Animation value for tab bar visibility (focus mode)
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  // Get current active screen name from React Navigation state
  const currentRoute = state?.routes?.[state.index]?.name || 'index';

  // Check if we're on the Bible screen
  const isBibleScreen = currentRoute === 'bible';

  // Animate tab bar visibility based on focus mode and scroll direction
  useEffect(() => {
    if (isBibleScreen && focusModeActive) {
      // In focus mode on Bible screen - animate based on tabBarVisible
      Animated.timing(tabBarTranslateY, {
        toValue: tabBarVisible ? 0 : 120, // Slide down to hide
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      // Not in focus mode or not on Bible screen - always show
      Animated.timing(tabBarTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isBibleScreen, focusModeActive, tabBarVisible, tabBarTranslateY]);

  const handleTabPress = (tab: Tab) => {
    // Haptic feedback on every tap
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Close grow panel when navigating
    closeGrowPanel();

    // Don't navigate if already on this tab
    if (tab.screenName !== currentRoute) {
      // Use jumpTo for instant tab switching (recommended for bottom tabs)
      navigation.jumpTo(tab.screenName);
    }
  };

  const renderTab = (tab: Tab) => {
    const isActive = tab.screenName === currentRoute;
    const IconComponent = tab.icon;

    return (
      <Pressable
        key={tab.name}
        onPressIn={() => handleTabPress(tab)}
        className="items-center justify-center py-2 px-3 relative"
        style={{ minWidth: touchTargets.comfortable }}
      >
        {/* Active indicator at top */}
        {isActive && (
          <View
            className="absolute -top-2 left-1/4 right-1/4 h-[3px] rounded-[1.5px]"
            style={{ backgroundColor: colors.primary[500] }}
          />
        )}

        {/* Icon */}
        <IconComponent
          size={24}
          color={isActive ? colors.primary[500] : colors.gray[400]}
          isActive={isActive}
        />

        {/* Label */}
        <Text
          size="xs"
          className="mt-0.5 text-[10px] font-medium"
          style={{ color: isActive ? colors.primary[500] : colors.gray[500] }}
        >
          {t(tab.label as any)}
        </Text>
      </Pressable>
    );
  };

  const TabBarContent = () => (
    <View
      className="flex-row items-end justify-between pt-4"
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom - 8 : 4 }}
    >
      {/* Left tabs */}
      <View className="flex-row flex-1 justify-evenly">
        {LEFT_TABS.map(renderTab)}
      </View>

      {/* Center FAB */}
      <View className="items-center justify-center w-[70px] mx-1">
        <GrowFab size={56} />
      </View>

      {/* Right tabs */}
      <View className="flex-row flex-1 justify-evenly">
        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  );

  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 z-[200]"
      style={{ transform: [{ translateY: tabBarTranslateY }] }}
    >
      <View
        className="bg-white"
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.gray[200],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <TabBarContent />
      </View>
    </Animated.View>
  );
}
