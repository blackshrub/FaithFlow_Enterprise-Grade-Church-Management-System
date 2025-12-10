/**
 * Today Screen - Premium World-Class Redesign v2
 *
 * Design Philosophy: "Elegant simplicity, spiritual clarity"
 * Following world-class UX principles with conditional visibility.
 *
 * Structure:
 * 1. Header with greeting and QR button
 * 2. Latest Sermon (YouTube) - HIDDEN if no sermon URL
 * 3. Start Your Day carousel (Devotion + Verse)
 * 4. Faith Assistant
 * 5. Coming Up carousel - HIDDEN if no events
 * 6. Church News carousel - HIDDEN if no articles
 * 7. Instagram section - HIDDEN if no instagram_handle
 * 8. How Can We Help grid
 * 9. Grow in Faith section
 *
 * NOTE: This file is named today.tsx (not index.tsx) to work around
 * Expo Router navigation lag with index routes.
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
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { PMotion } from '@/components/motion/premium-motion';
import {
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
} from '@/components/motion/today-motion';
import { useFocusKey } from '@/hooks/useFocusAnimation';
import {
  Heart,
  Calendar,
  Sun,
  Moon,
  CloudSun,
  Sunset,
  QrCode,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { ProfileButton, NotificationBell } from '@/components/header';
import { useAuthStore } from '@/stores/auth';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useUpcomingEvents, useRSVP } from '@/hooks/useEvents';
import { FaithAssistantCard } from '@/components/companion';

// New Today screen components
import { LatestSermonCard } from '@/components/today/LatestSermonCard';
import { StartYourDayCarousel } from '@/components/today/StartYourDayCarousel';
import { ComingUpCarousel } from '@/components/today/ComingUpCarousel';
import { ChurchNewsSection } from '@/components/today/ChurchNewsSection';
import { InstagramSection } from '@/components/today/InstagramSection';
import { HowCanWeHelpGrid } from '@/components/today/HowCanWeHelpGrid';
import { GrowInFaithSection } from '@/components/today/GrowInFaithSection';

// Data hooks
import { useLatestSermon, useInstagramPosts, shouldShowSermonSection } from '@/hooks/useStaticMedia';
import { useFeaturedArticles, shouldShowArticlesSection } from '@/hooks/useArticles';
import { useExploreHomeMock } from '@/hooks/explore/useExploreMock';
import { useMemberQRStore } from '@/stores/memberQR';

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
  const memberQRStore = useMemberQRStore();

  // Focus key - triggers child animation replay on tab focus (no container opacity flash)
  const focusKey = useFocusKey();

  // Data hooks
  const { data: prayerRequests, refetch: refetchPrayer } = usePrayerRequests();
  const { data: upcomingEvents = [], refetch: refetchEvents } = useUpcomingEvents();
  const { data: latestSermon, refetch: refetchSermon } = useLatestSermon();
  const { data: instagramData, refetch: refetchInstagram } = useInstagramPosts(3);
  const { data: articles = [], refetch: refetchArticles } = useFeaturedArticles(5);
  const { data: exploreHome, refetch: refetchExplore } = useExploreHomeMock();
  const rsvpMutation = useRSVP();

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

  // Visibility flags for conditional sections
  const showSermonSection = shouldShowSermonSection(latestSermon);
  const showEventsSection = upcomingEvents.length > 0;
  const showNewsSection = shouldShowArticlesSection(articles);
  const showInstagramSection = !!(instagramData?.church?.handle);

  // Member profile context for HowCanWeHelpGrid
  const memberContext = useMemo(() => ({
    isBaptized: !!member?.baptism_date,
    maritalStatus: member?.marital_status || null,
    hasUpcomingEvents: upcomingEvents.length > 0,
  }), [member?.baptism_date, member?.marital_status, upcomingEvents.length]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchPrayer(),
      refetchEvents(),
      refetchSermon(),
      refetchInstagram(),
      refetchArticles(),
      refetchExplore(),
    ]);
    setRefreshing(false);
  }, [refetchPrayer, refetchEvents, refetchSermon, refetchInstagram, refetchArticles, refetchExplore]);

  // RSVP handler
  const handleRSVP = useCallback(async (eventId: string) => {
    if (!member?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await rsvpMutation.mutateAsync({
        eventId,
        member_id: member.id,
      });
    } catch (error) {
      console.error('RSVP failed:', error);
    }
  }, [member?.id, rsvpMutation]);

  // QR button handler
  const handleQRPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    memberQRStore.open();
  }, [memberQRStore]);

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
        {/* Animated content wrapper - using shared headerEnterStyle for container opacity */}
        <Animated.View className="px-5" style={[headerPaddingAnimatedStyle, headerEnterStyle]}>
          {/* Top row: Date + QR + Profile
              NOTE: Children use View instead of Animated.View with entering= to avoid
              "opacity may be overwritten by layout animation" warning.
              Parent headerEnterStyle already handles enter animation. */}
          <View
            key={`header-top-${focusKey}`}
            className="flex-row justify-between items-center mb-4"
          >
            <View className="flex-row items-center gap-2">
              <GreetingIcon size={16} color={Colors.accent.primary} />
              <Text className="text-sm text-neutral-400 font-medium">{currentDate}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell
                size={44}
                color={Colors.accent.primary}
                backgroundColor="rgba(255,255,255,0.08)"
              />
              {/* QR Button */}
              <Pressable
                onPress={handleQRPress}
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('today.showQR', 'Show member QR code')}
              >
                <QrCode size={20} color={Colors.accent.primary} />
              </Pressable>
              <ProfileButton size={44} />
            </View>
          </View>

          {/* Greeting - uses greetingAnimatedStyle for collapsible margin only (no opacity) */}
          <Animated.View
            key={`greeting-${focusKey}`}
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

          {/* Stats row - Collapsible (statsRowAnimatedStyle handles opacity for collapse) */}
          <Animated.View
            key={`stats-${focusKey}`}
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
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('today.stats.viewPrayers', `View ${activePrayers} prayers`)}
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
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('today.stats.viewEvents', `View ${upcomingCount} upcoming events`)}
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

  return (
    <View className="flex-1 bg-background-100">
      {/* StatusBar at top level - no container animation prevents flicker */}
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScrollEvent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 1. Latest Sermon (YouTube) - HIDDEN if no sermon URL */}
        {showSermonSection && latestSermon && (
          <LatestSermonCard sermon={latestSermon} focusKey={focusKey} />
        )}

        {/* 2. Start Your Day carousel (Devotion + Verse) */}
        <StartYourDayCarousel
          devotion={exploreHome?.daily_devotion || null}
          verse={exploreHome?.verse_of_the_day || null}
          focusKey={focusKey}
        />

        {/* 3. Faith Assistant - Premium entry point */}
        <Animated.View
          key={`faith-assistant-${focusKey}`}
          entering={PMotion.sectionStagger(3)}
          className="mb-6 px-5"
        >
          <FaithAssistantCard variant="featured" />
        </Animated.View>

        {/* 4. Coming Up carousel - HIDDEN if no events */}
        {showEventsSection && (
          <ComingUpCarousel
            events={upcomingEvents}
            onRSVP={handleRSVP}
            focusKey={focusKey}
          />
        )}

        {/* 5. Church News carousel - HIDDEN if no articles */}
        {showNewsSection && (
          <ChurchNewsSection articles={articles} focusKey={focusKey} />
        )}

        {/* 6. Instagram section - HIDDEN if no instagram_handle */}
        {showInstagramSection && instagramData && (
          <InstagramSection
            posts={instagramData.posts}
            church={instagramData.church}
            focusKey={focusKey}
          />
        )}

        {/* 7. How Can We Help grid */}
        <HowCanWeHelpGrid
          isBaptized={memberContext.isBaptized}
          maritalStatus={memberContext.maritalStatus}
          hasUpcomingEvents={memberContext.hasUpcomingEvents}
          focusKey={focusKey}
        />

        {/* 8. Grow in Faith section */}
        <GrowInFaithSection focusKey={focusKey} />

        {/* Bottom spacing for tab bar */}
        <View className="h-[120px]" />
      </Animated.ScrollView>
    </View>
  );
}

// Memoize screen component for performance
const MemoizedTodayScreen = memo(TodayScreen);
MemoizedTodayScreen.displayName = 'TodayScreen';
export default MemoizedTodayScreen;
