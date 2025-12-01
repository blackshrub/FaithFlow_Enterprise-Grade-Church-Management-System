/**
 * Today Screen - Premium World-Class Redesign
 *
 * Design Philosophy: "Elegant simplicity, spiritual clarity"
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - React Native + PremiumMotion for animations
 * - Inline style only for: dynamic values, custom gradient colors, shadows
 */

import React, { useMemo, useCallback, memo } from 'react';
import {
  RefreshControl,
  StatusBar,
  View,
  Text,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { PMotion, shouldSkipEnteringAnimation } from '@/components/motion/premium-motion';
import {
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';
import { withPremiumMotionV10 } from '@/hoc';

// Track if this screen has been visited (for skipping animations on revisit)
const SCREEN_KEY = 'today-screen';
import {
  BookOpen,
  Calendar,
  Heart,
  Users,
  ChevronRight,
  Compass,
  Sun,
  Moon,
  CloudSun,
  Sunset,
  Quote,
  ArrowRight,
} from 'lucide-react-native';

import { ProfileButton } from '@/components/header';
import { useAuthStore } from '@/stores/auth';
import { useGivingSummary } from '@/hooks/useGiving';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { PremiumCard2 } from '@/components/ui/premium-card';
import { FaithAssistantCard } from '@/components/companion';

// Premium monochrome palette - custom colors not in tailwind
const Colors = {
  // Dark gradient for header
  gradient: {
    start: '#0f0f0f',
    mid: '#1a1a1a',
    end: '#252525',
  },
  // Accent - warm gold
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
    dark: '#9A7B3D',
  },
};

// Quick action definitions with i18n keys
const QUICK_ACTIONS = [
  {
    id: 'bible',
    icon: BookOpen,
    labelKey: 'today.quickActions.bible',
    defaultLabel: 'Bible',
    route: '/(tabs)/bible',
    descKey: 'today.quickActions.bibleDesc',
    defaultDesc: 'Read Scripture',
  },
  {
    id: 'explore',
    icon: Compass,
    labelKey: 'today.quickActions.explore',
    defaultLabel: 'Explore',
    route: '/(tabs)/explore',
    descKey: 'today.quickActions.exploreDesc',
    defaultDesc: 'Devotions & Studies',
  },
  {
    id: 'events',
    icon: Calendar,
    labelKey: 'today.quickActions.events',
    defaultLabel: 'Events',
    route: '/(tabs)/events',
    descKey: 'today.quickActions.eventsDesc',
    defaultDesc: 'Upcoming Activities',
  },
  {
    id: 'community',
    icon: Users,
    labelKey: 'today.quickActions.community',
    defaultLabel: 'Community',
    route: '/(tabs)/groups',
    descKey: 'today.quickActions.communityDesc',
    defaultDesc: 'Connect with Others',
  },
];

// Sample verse data (would come from API)
const DAILY_VERSE = {
  text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."',
  reference: 'Jeremiah 29:11',
  theme: 'Hope',
};

// Custom hook for time-based greeting - prevents mount layout stutter
const useGreeting = () => {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: 'Good Morning', icon: Sun, period: 'morning' };
    }
    if (hour >= 12 && hour < 17) {
      return { text: 'Good Afternoon', icon: CloudSun, period: 'afternoon' };
    }
    if (hour >= 17 && hour < 21) {
      return { text: 'Good Evening', icon: Sunset, period: 'evening' };
    }
    return { text: 'Good Night', icon: Moon, period: 'night' };
  }, []);
};

function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Check if this is first visit (to skip animations on revisit)
  const skipAnimations = React.useMemo(() => shouldSkipEnteringAnimation(SCREEN_KEY), []);

  // Data hooks
  const { data: givingSummary, refetch: refetchGiving } = useGivingSummary();
  const { data: prayerRequests, refetch: refetchPrayer } = usePrayerRequests();
  const { data: upcomingEvents, refetch: refetchEvents } = useUpcomingEvents();

  // Time-based greeting (extracted to hook to prevent mount layout stutter)
  const greeting = useGreeting();

  // Current date formatted
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Stats
  const activePrayers = useMemo(
    () => prayerRequests?.filter((r) => r.status === 'active').length || 0,
    [prayerRequests]
  );
  const upcomingCount = useMemo(
    () => upcomingEvents?.length || 0,
    [upcomingEvents]
  );

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGiving(), refetchPrayer(), refetchEvents()]);
    setRefreshing(false);
  }, [refetchGiving, refetchPrayer, refetchEvents]);

  // Get first name
  const firstName = useMemo(() => {
    if (!member?.full_name) return '';
    return member.full_name.split(' ')[0];
  }, [member]);

  // Collapsible header animation - using shared today-motion module
  const scrollY = useSharedValue(0);

  // Scroll handler - updates scrollY for collapsible header
  const handleScrollEvent = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

  // Shared header enter animation from today-motion
  const { headerEnterStyle } = useTodayHeaderMotion();

  // Shared collapsible header styles from today-motion
  const {
    statsRowAnimatedStyle,
    greetingAnimatedStyle,
    headerPaddingAnimatedStyle,
  } = useTodayCollapsibleHeader(scrollY);

  // Render header
  const renderHeader = () => {
    const GreetingIcon = greeting.icon;

    return (
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
        className="overflow-hidden"
        style={{ paddingTop: insets.top + 8 }}
      >
        {/* Animated content wrapper - using shared headerEnterStyle */}
        <Animated.View className="px-5" style={[headerPaddingAnimatedStyle, headerEnterStyle]}>
          {/* Top row: Date + Profile - Premium Motion v2 stagger */}
          <Animated.View
            entering={skipAnimations ? undefined : PMotion.sectionStagger(0)}
            className="flex-row justify-between items-center mb-4"
          >
            <View className="flex-row items-center gap-2">
              <GreetingIcon size={16} color={Colors.accent.primary} />
              <Text className="text-sm text-neutral-400 font-medium">{currentDate}</Text>
            </View>
            <ProfileButton size={44} />
          </Animated.View>

          {/* Greeting - staggered entry */}
          <Animated.View
            entering={skipAnimations ? undefined : PMotion.sectionStagger(1)}
            className="mb-6"
            style={greetingAnimatedStyle}
          >
            <Text className="text-base text-neutral-400 font-medium mb-1">{greeting.text}</Text>
            <Text
              className="text-[34px] font-bold text-white"
              style={{ letterSpacing: -0.5 }}
            >
              {firstName}
            </Text>
          </Animated.View>

          {/* Stats row - Collapsible with staggered entry */}
          <Animated.View
            entering={skipAnimations ? undefined : PMotion.sectionStagger(2)}
            className="flex-row items-center rounded-2xl py-4 px-6"
            style={[
              {
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              },
              statsRowAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={() => router.push('/prayer')}
              className="flex-1 flex-row items-center gap-2"
            >
              <Heart size={18} color={Colors.accent.primary} />
              <Text className="text-[22px] font-bold text-white">{activePrayers}</Text>
              <Text className="text-[13px] text-neutral-400 font-medium">{t('today.stats.prayers', 'Prayers')}</Text>
            </Pressable>

            <View
              className="h-8 mx-4"
              style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
            />

            <Pressable
              onPress={() => router.push('/(tabs)/events')}
              className="flex-1 flex-row items-center gap-2"
            >
              <Calendar size={18} color={Colors.accent.primary} />
              <Text className="text-[22px] font-bold text-white">{upcomingCount}</Text>
              <Text className="text-[13px] text-neutral-400 font-medium">{t('today.stats.events', 'Events')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    );
  };

  // Render verse card - Premium Motion v2: soft scale for featured content
  const renderVerseCard = () => (
    <Animated.View
      entering={skipAnimations ? undefined : PMotion.softScaleEnter}
      className="mb-6"
    >
      <View className="flex-row items-center gap-2 mb-3">
        <Quote size={16} color={Colors.accent.dark} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.verseOfTheDay', 'Verse of the Day')}
        </Text>
      </View>

      {/* Shadow wrapper - separate from overflow:hidden to prevent shadow clipping */}
      <View
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
          borderRadius: 20,
        }}
      >
        <View className="rounded-[20px] overflow-hidden">
          <LinearGradient
            colors={['#1a1a1a', '#252525']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, position: 'relative' }}
          >
            {/* Gold accent bar - all inline styles for absolute positioning */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 24,
                bottom: 24,
                width: 3,
                backgroundColor: Colors.accent.primary,
                borderRadius: 2,
              }}
            />

            <Text
              className="text-lg font-medium text-white italic mb-4 pl-4"
              style={{ lineHeight: 28 }}
            >
              {DAILY_VERSE.text}
            </Text>

            <View className="flex-row justify-between items-center pl-4">
              <Text
                className="text-sm font-semibold"
                style={{ color: Colors.accent.light }}
              >
                {DAILY_VERSE.reference}
              </Text>
              <View
                className="px-2.5 py-1 rounded-xl"
                style={{ backgroundColor: 'rgba(201,169,98,0.2)' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: Colors.accent.primary }}
                >
                  {DAILY_VERSE.theme}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Animated.View>
  );

  // Render quick actions - Premium Motion v2: card stagger for list items
  const renderQuickActions = () => (
    <Animated.View
      entering={skipAnimations ? undefined : PMotion.sectionStagger(4)}
      className="mb-6"
    >
      <Text
        className="text-xl font-bold text-typography-900 mb-4"
        style={{ letterSpacing: -0.3 }}
      >
        {t('today.quickAccess', 'Quick Access')}
      </Text>

      <View className="gap-3">
        {QUICK_ACTIONS.map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <Animated.View
              key={action.id}
              entering={skipAnimations ? undefined : todayListItemMotion(index)}
            >
              <PremiumCard2
                onPress={() => router.push(action.route as any)}
                innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View className="w-12 h-12 rounded-[14px] bg-background-100 items-center justify-center">
                  <ActionIcon size={24} color="#262626" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-typography-900">
                    {t(action.labelKey, action.defaultLabel)}
                  </Text>
                  <Text className="text-[13px] text-typography-500 mt-0.5">
                    {t(action.descKey, action.defaultDesc)}
                  </Text>
                </View>
                <ChevronRight size={18} color="#A3A3A3" />
              </PremiumCard2>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );

  // Render giving prompt - Premium Motion v2: section stagger
  const renderGivingPrompt = () => {
    if (!givingSummary) return null;

    return (
      <Animated.View
        entering={skipAnimations ? undefined : PMotion.sectionStagger(5)}
        className="mb-6"
      >
        <Pressable
          onPress={() => router.push('/(tabs)/give')}
          className="flex-row items-center justify-between rounded-2xl p-5 active:opacity-90"
          style={{
            backgroundColor: Colors.accent.dark,
            shadowColor: Colors.accent.dark,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center gap-3.5">
            <View
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View>
              <Text className="text-base font-semibold text-white">
                {t('today.giving.title', 'Continue Your Generosity')}
              </Text>
              <Text
                className="text-[13px] mt-0.5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {t('today.giving.subtitle', 'Your giving makes a difference')}
              </Text>
            </View>
          </View>
          <ArrowRight size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    );
  };

  // Render upcoming highlight
  const renderUpcomingHighlight = () => {
    if (!upcomingEvents || upcomingEvents.length === 0) return null;

    const nextEvent = upcomingEvents[0];
    const eventDate = new Date(nextEvent.event_date || nextEvent.sessions?.[0]?.date || new Date());

    return (
      <Animated.View
        entering={skipAnimations ? undefined : PMotion.sectionStagger(6)}
        className="mb-6"
      >
        <View className="flex-row justify-between items-center mb-4">
          <Text
            className="text-xl font-bold text-typography-900"
            style={{ letterSpacing: -0.3 }}
          >
            {t('today.comingUp', 'Coming Up')}
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/events')}>
            <Text
              className="text-sm font-semibold"
              style={{ color: Colors.accent.dark }}
            >
              {t('common.seeAll', 'See All')}
            </Text>
          </Pressable>
        </View>

        <PremiumCard2
          onPress={() => router.push(`/events/${nextEvent.id}` as any)}
          innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
        >
          <View className="w-14 h-[60px] rounded-xl bg-background-100 items-center justify-center">
            <Text className="text-2xl font-bold text-typography-900">
              {eventDate.getDate()}
            </Text>
            <Text
              className="text-[11px] font-semibold text-typography-500"
              style={{ letterSpacing: 0.5 }}
            >
              {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-typography-900" numberOfLines={1}>
              {nextEvent.name}
            </Text>
            <Text className="text-sm text-typography-500 mt-1">
              {eventDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
          <ChevronRight size={20} color="#A3A3A3" />
        </PremiumCard2>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-background-100">
      {/* StatusBar outside animated header to prevent iOS flicker */}
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScrollEvent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderVerseCard()}

        {/* Faith Assistant - Premium entry point */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(2)}
          className="mb-6"
        >
          <FaithAssistantCard variant="featured" />
        </Animated.View>

        {renderQuickActions()}
        {renderGivingPrompt()}
        {renderUpcomingHighlight()}

        {/* Bottom spacing for tab bar */}
        <View className="h-[120px]" />
      </Animated.ScrollView>
    </View>
  );
}

// Memoize screen component + Apply Premium Motion V10 HOC for zero-blink tab transitions
const MemoizedTodayScreen = memo(TodayScreen);
MemoizedTodayScreen.displayName = 'TodayScreen';
export default withPremiumMotionV10(MemoizedTodayScreen);
