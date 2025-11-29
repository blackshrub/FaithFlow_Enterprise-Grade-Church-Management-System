/**
 * Today Screen - Premium World-Class Redesign
 *
 * Design Philosophy: "Elegant simplicity, spiritual clarity"
 *
 * Features:
 * - Full-bleed gradient header with time-based greeting
 * - Sophisticated monochrome color palette
 * - Premium card designs with subtle shadows
 * - Daily verse highlight card
 * - Contextual quick actions
 * - Refined, minimal aesthetic
 */

import React, { useMemo, useCallback, memo } from 'react';
import {
  RefreshControl,
  StatusBar,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { PMotion, PMotionV10, shouldSkipEnteringAnimation } from '@/components/motion/premium-motion';
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

// Premium monochrome palette
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
  // Neutral palette
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  black: '#000000',
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
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        {/* Animated content wrapper - using shared headerEnterStyle */}
        <Animated.View style={[styles.headerContent, headerPaddingAnimatedStyle, headerEnterStyle]}>
            {/* Top row: Date + Profile - Premium Motion v2 stagger */}
            <Animated.View
              entering={skipAnimations ? undefined : PMotion.sectionStagger(0)}
              style={styles.headerTop}
            >
              <View style={styles.dateWrap}>
                <GreetingIcon size={16} color={Colors.accent.primary} />
                <Text style={styles.dateText}>{currentDate}</Text>
              </View>
              <ProfileButton size={44} />
            </Animated.View>

            {/* Greeting - staggered entry */}
            <Animated.View
              entering={skipAnimations ? undefined : PMotion.sectionStagger(1)}
              style={[styles.greetingWrap, greetingAnimatedStyle]}
            >
              <Text style={styles.greetingText}>{greeting.text}</Text>
              <Text style={styles.nameText}>{firstName}</Text>
            </Animated.View>

            {/* Stats row - Collapsible with staggered entry */}
            <Animated.View
              entering={skipAnimations ? undefined : PMotion.sectionStagger(2)}
              style={[styles.statsRow, statsRowAnimatedStyle]}
            >
              <Pressable
                onPress={() => router.push('/prayer')}
                style={styles.statItem}
              >
                <Heart size={18} color={Colors.accent.primary} />
                <Text style={styles.statValue}>{activePrayers}</Text>
                <Text style={styles.statLabel}>{t('today.stats.prayers', 'Prayers')}</Text>
              </Pressable>

              <View style={styles.statDivider} />

              <Pressable
                onPress={() => router.push('/(tabs)/events')}
                style={styles.statItem}
              >
                <Calendar size={18} color={Colors.accent.primary} />
                <Text style={styles.statValue}>{upcomingCount}</Text>
                <Text style={styles.statLabel}>{t('today.stats.events', 'Events')}</Text>
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
      style={styles.verseSection}
    >
      <View style={styles.verseLabelRow}>
        <Quote size={16} color={Colors.accent.dark} />
        <Text style={styles.verseLabel}>{t('today.verseOfTheDay', 'Verse of the Day')}</Text>
      </View>

      <View style={styles.verseCard}>
        <LinearGradient
          colors={['#1a1a1a', '#252525']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.verseGradient}
        >
          <View style={styles.verseAccent} />

          <Text style={styles.verseText}>{DAILY_VERSE.text}</Text>

          <View style={styles.verseFooter}>
            <Text style={styles.verseRef}>{DAILY_VERSE.reference}</Text>
            <View style={styles.verseTheme}>
              <Text style={styles.verseThemeText}>{DAILY_VERSE.theme}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );

  // Render quick actions - Premium Motion v2: card stagger for list items
  const renderQuickActions = () => (
    <Animated.View
      entering={skipAnimations ? undefined : PMotion.sectionStagger(4)}
      style={styles.actionsSection}
    >
      <Text style={styles.sectionTitle}>{t('today.quickAccess', 'Quick Access')}</Text>

      <View style={styles.actionsGrid}>
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
                <View style={styles.actionIconWrap}>
                  <ActionIcon size={24} color={Colors.neutral[800]} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionLabel}>{t(action.labelKey, action.defaultLabel)}</Text>
                  <Text style={styles.actionDesc}>{t(action.descKey, action.defaultDesc)}</Text>
                </View>
                <ChevronRight size={18} color={Colors.neutral[400]} />
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
        style={styles.givingSection}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/give')}
          style={({ pressed }) => [
            styles.givingCard,
            pressed && styles.givingCardPressed,
          ]}
        >
          <View style={styles.givingLeft}>
            <View style={styles.givingIconWrap}>
              <Heart size={20} color={Colors.white} fill={Colors.white} />
            </View>
            <View>
              <Text style={styles.givingTitle}>{t('today.giving.title', 'Continue Your Generosity')}</Text>
              <Text style={styles.givingSubtitle}>
                {t('today.giving.subtitle', 'Your giving makes a difference')}
              </Text>
            </View>
          </View>
          <ArrowRight size={20} color={Colors.white} />
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
        style={styles.upcomingSection}
      >
        <View style={styles.upcomingHeader}>
          <Text style={styles.sectionTitle}>{t('today.comingUp', 'Coming Up')}</Text>
          <Pressable onPress={() => router.push('/(tabs)/events')}>
            <Text style={styles.seeAllText}>{t('common.seeAll', 'See All')}</Text>
          </Pressable>
        </View>

        <PremiumCard2
          onPress={() => router.push(`/events/${nextEvent.id}` as any)}
          innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
        >
          <View style={styles.upcomingDate}>
            <Text style={styles.upcomingDay}>
              {eventDate.getDate()}
            </Text>
            <Text style={styles.upcomingMonth}>
              {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingTitle} numberOfLines={1}>
              {nextEvent.name}
            </Text>
            <Text style={styles.upcomingTime}>
              {eventDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.neutral[400]} />
        </PremiumCard2>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* StatusBar outside animated header to prevent iOS flicker */}
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
          style={styles.faithAssistantSection}
        >
          <FaithAssistantCard variant="featured" />
        </Animated.View>

        {renderQuickActions()}
        {renderGivingPrompt()}
        {renderUpcomingHighlight()}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </View>
  );
}

// Memoize screen component + Apply Premium Motion V10 HOC for zero-blink tab transitions
const MemoizedTodayScreen = memo(TodayScreen);
MemoizedTodayScreen.displayName = 'TodayScreen';
export default withPremiumMotionV10(MemoizedTodayScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
  },
  // Header
  headerGradient: {
    // paddingTop is dynamic based on insets
    overflow: 'hidden', // Prevents layout flash from gradient rendering before content
  },
  headerContent: {
    paddingHorizontal: 20,
    // paddingBottom is animated (28 → 12 when collapsed)
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: Colors.neutral[400],
    fontWeight: '500',
  },
  greetingWrap: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 16,
    color: Colors.neutral[400],
    fontWeight: '500',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.neutral[400],
    fontWeight: '500',
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  // Verse section
  verseSection: {
    marginBottom: 24,
  },
  verseLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verseLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  verseGradient: {
    padding: 24,
    position: 'relative',
  },
  verseAccent: {
    position: 'absolute',
    left: 0,
    top: 24,
    bottom: 24,
    width: 3,
    backgroundColor: Colors.accent.primary,
    borderRadius: 2,
  },
  verseText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.white,
    lineHeight: 28,
    fontStyle: 'italic',
    marginBottom: 16,
    paddingLeft: 16,
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  verseRef: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent.light,
  },
  verseTheme: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(201,169,98,0.2)',
    borderRadius: 12,
  },
  verseThemeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent.primary,
  },
  // Faith Assistant section
  faithAssistantSection: {
    marginBottom: 24,
  },
  // Actions section
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actionsGrid: {
    gap: 12,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  // Giving section
  givingSection: {
    marginBottom: 24,
  },
  givingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent.dark,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.accent.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  givingCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  givingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  givingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  givingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  givingSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  // Upcoming section
  upcomingSection: {
    marginBottom: 24,
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent.dark,
  },
  upcomingDate: {
    width: 56,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingDay: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  upcomingMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[500],
    letterSpacing: 0.5,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  upcomingTime: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 4,
  },
});
