/**
 * PrayerHeader - Gradient Header with Stats & Tabs
 *
 * Premium gradient header extracted from Prayer screen.
 * Features:
 * - Collapsible stats row on scroll (using shared today-motion)
 * - Tab navigation (Community, My Prayers)
 * - Add prayer button
 * - Shared motion architecture with TodayScreen
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type SharedValue } from 'react-native-reanimated';
import {
  ArrowLeft,
  Plus,
  Flame,
  Sparkles,
  Users,
  MessageCircle,
  User,
  HandHeart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import {
  useTodayHeaderMotion,
  useEventsCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';
import { spacing } from '@/constants/spacing';

// Local palette - for icon colors only
const Colors = {
  gradient: {
    start: '#1e3a5f',
  },
  accent: {
    primary: '#E8B86D',
    sage: '#7FB685',
    rose: '#E8A0BF',
  },
  white: '#ffffff',
};

export type PrayerTab = 'all' | 'my';

interface PrayerHeaderProps {
  topInset: number;
  activeCount: number;
  answeredCount: number;
  totalCount: number;
  activeTab: PrayerTab;
  onTabChange: (tab: PrayerTab) => void;
  onPressAdd: () => void;
  onPressBack: () => void;
  scrollY: SharedValue<number>;
  /** Focus key - increment to replay enter animations on tab focus */
  focusKey?: number;
}

export const PrayerHeader: React.FC<PrayerHeaderProps> = React.memo(
  ({
    topInset,
    activeCount,
    answeredCount,
    totalCount,
    activeTab,
    onTabChange,
    onPressAdd,
    onPressBack,
    scrollY,
    focusKey = 0,
  }) => {
    // 1) Shared header enter animation from today-motion
    const { headerEnterStyle } = useTodayHeaderMotion();

    // 2) Shared collapsible header from today-motion (Events-specific variant)
    const {
      statsRowAnimatedStyle,
      headerTopAnimatedStyle,
      headerPaddingAnimatedStyle,
    } = useEventsCollapsibleHeader(scrollY, spacing);

    const handleTabPress = (tab: PrayerTab) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    };

    return (
      <>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1e3a5f', '#2d4a6f', '#3d5a7f']}
          className="overflow-hidden"
          style={{ paddingTop: topInset + 16 }}
        >
          {/* Animated inner content */}
          <Animated.View
            className="px-5"
            style={[headerPaddingAnimatedStyle, headerEnterStyle]}
          >
            {/* Title + Buttons - stagger index 0 */}
            <Animated.View
              key={`header-top-${focusKey}`}
              entering={todayListItemMotion(0)}
              className="flex-row justify-between items-start"
              style={headerTopAnimatedStyle}
            >
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={onPressBack}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  className="w-11 h-11 rounded-full bg-white/10 items-center justify-center active:scale-95 active:opacity-90"
                >
                  <ArrowLeft size={24} color={Colors.white} />
                </Pressable>
                <View>
                  <Text
                    className="text-[28px] font-bold text-white"
                    style={{ letterSpacing: -0.5 }}
                  >
                    Prayer Wall
                  </Text>
                  <Text className="text-[15px] text-white/70 mt-1">
                    Lift each other up in prayer
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onPressAdd}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Add new prayer request"
                className="w-11 h-11 rounded-full items-center justify-center active:scale-95 active:opacity-90"
                style={{
                  backgroundColor: Colors.accent.primary,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Plus size={22} color={Colors.white} strokeWidth={2.5} />
              </Pressable>
            </Animated.View>

            {/* Stats Row - collapsible - stagger index 1 */}
            <Animated.View
              key={`stats-row-${focusKey}`}
              entering={todayListItemMotion(1)}
              className="flex-row items-center rounded-2xl py-3 px-4 mb-4 border border-white/[0.08]"
              style={[{ backgroundColor: 'rgba(255,255,255,0.08)' }, statsRowAnimatedStyle]}
            >
              <View className="flex-1 flex-row items-center gap-2">
                <View
                  className="w-9 h-9 rounded-[10px] items-center justify-center"
                  style={{ backgroundColor: 'rgba(232,184,109,0.2)' }}
                >
                  <Flame size={18} color={Colors.accent.primary} />
                </View>
                <View>
                  <Text className="text-[18px] font-bold text-white">{activeCount}</Text>
                  <Text className="text-[11px] text-white/60 font-medium">Active</Text>
                </View>
              </View>

              <View className="w-px h-7 bg-white/15 mx-2" />

              <View className="flex-1 flex-row items-center gap-2">
                <View
                  className="w-9 h-9 rounded-[10px] items-center justify-center"
                  style={{ backgroundColor: 'rgba(127,182,133,0.2)' }}
                >
                  <Sparkles size={18} color={Colors.accent.sage} />
                </View>
                <View>
                  <Text className="text-[18px] font-bold text-white">{answeredCount}</Text>
                  <Text className="text-[11px] text-white/60 font-medium">Answered</Text>
                </View>
              </View>

              <View className="w-px h-7 bg-white/15 mx-2" />

              <View className="flex-1 flex-row items-center gap-2">
                <View
                  className="w-9 h-9 rounded-[10px] items-center justify-center"
                  style={{ backgroundColor: 'rgba(232,160,191,0.2)' }}
                >
                  <Users size={18} color={Colors.accent.rose} />
                </View>
                <View>
                  <Text className="text-[18px] font-bold text-white">{totalCount}</Text>
                  <Text className="text-[11px] text-white/60 font-medium">Total</Text>
                </View>
              </View>
            </Animated.View>

            {/* Tabs - stagger index 2 */}
            <Animated.View
              key={`tabs-row-${focusKey}`}
              entering={todayListItemMotion(2)}
              className="flex-row gap-2"
            >
              <Pressable
                onPress={() => handleTabPress('all')}
                accessible
                accessibilityRole="button"
                accessibilityLabel="View community prayer requests"
                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
                  activeTab === 'all' ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <MessageCircle
                  size={16}
                  color={activeTab === 'all' ? Colors.gradient.start : 'rgba(255,255,255,0.8)'}
                />
                <Text
                  className={`text-[13px] font-semibold ${
                    activeTab === 'all' ? 'text-[#1e3a5f]' : 'text-white/80'
                  }`}
                >
                  Community
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleTabPress('my')}
                accessible
                accessibilityRole="button"
                accessibilityLabel="View my prayer requests"
                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${
                  activeTab === 'my' ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <User
                  size={16}
                  color={activeTab === 'my' ? Colors.gradient.start : 'rgba(255,255,255,0.8)'}
                />
                <Text
                  className={`text-[13px] font-semibold ${
                    activeTab === 'my' ? 'text-[#1e3a5f]' : 'text-white/80'
                  }`}
                >
                  My Prayers
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </LinearGradient>
      </>
    );
  }
);

PrayerHeader.displayName = 'PrayerHeader';
