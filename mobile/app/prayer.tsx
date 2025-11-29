/**
 * Prayer Requests Screen - Premium World-Class Redesign
 *
 * Design Philosophy: "Sacred space for community prayer"
 *
 * Features:
 * - Full-bleed gradient header
 * - Premium prayer request cards
 * - Elegant tab navigation
 * - Beautiful filter interactions
 * - "I Prayed" animation feedback
 * - Sophisticated empty states
 * - Mobile-first, touch-friendly design
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10, MOTION_EASING } from '@/components/motion/premium-motion';
import { spacing } from '@/constants/theme';
import {
  Heart,
  ArrowLeft,
  Plus,
  Users,
  Sparkles,
  User,
  MessageCircle,
  HandHeart,
  Flame,
} from 'lucide-react-native';

import {
  usePrayerRequests,
  useMyPrayerRequests,
  usePrayForRequest,
  useMarkAsAnswered,
} from '@/hooks/usePrayer';
import { useOverlay } from '@/stores/overlayStore';
import { CreatePrayerSheet } from '@/components/overlay/sheets/CreatePrayerSheet';
import { PrayerCard } from '@/components/prayer/PrayerCard';
import type { PrayerRequestWithStatus } from '@/types/prayer';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';

// Premium color palette - spiritual, calming
const Colors = {
  gradient: {
    start: '#1e3a5f',
    mid: '#2d4a6f',
    end: '#3d5a7f',
  },
  accent: {
    primary: '#E8B86D',
    light: '#F5D9A8',
    rose: '#E8A0BF',
    sage: '#7FB685',
  },
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
  success: '#10B981',
  white: '#FFFFFF',
};

type Tab = 'all' | 'my';
type Filter = 'all' | 'active' | 'answered';

function PrayerScreen() {
  const { t: _t } = useTranslation();
  const insets = useSafeAreaInsets();

  // State
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Tab direction tracking - compute based on previous tab
  const prevTabRef = React.useRef<Tab>('all');

  // Overlay for bottom sheet
  const overlay = useOverlay();

  // Handle opening create prayer bottom sheet
  const handleAddPrayer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    overlay.showBottomSheet(CreatePrayerSheet);
  }, [overlay]);

  // Compute direction: 'all' is index 0, 'my' is index 1
  const getTabDirection = () => {
    const tabOrder: Tab[] = ['all', 'my'];
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex > prevIndex ? 'right' : 'left';
  };

  // Collapsible header animation - gradual fade based on scroll position
  const isCollapsed = useSharedValue(0); // 0 = expanded, 1 = collapsed

  // Scroll handler - V10 Ultra smooth collapse physics
  const handleScrollEvent = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    // Gradually collapse/expand based on scroll position
    // Starts fading at 20px, fully collapsed at 120px
    const targetCollapse = Math.min(1, Math.max(0, (currentScrollY - 20) / 100));
    isCollapsed.value = withTiming(targetCollapse, {
      duration: 240,
      easing: MOTION_EASING.standard,
    });
  }, [isCollapsed]);

  // Animated styles for collapsible header - stats row fades out
  const statsRowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(isCollapsed.value, [0, 0.5, 1], [1, 0.3, 0]),
      height: interpolate(isCollapsed.value, [0, 1], [72, 0]),
      marginBottom: interpolate(isCollapsed.value, [0, 1], [16, 0]),
      overflow: 'hidden' as const,
    };
  });

  // Title container animated style - controls overall spacing
  const titleContainerAnimatedStyle = useAnimatedStyle(() => {
    return {
      marginBottom: interpolate(isCollapsed.value, [0, 1], [20, 0]),
      height: interpolate(isCollapsed.value, [0, 1], [70, 0]),
      opacity: interpolate(isCollapsed.value, [0, 0.6, 1], [1, 0.3, 0]),
      overflow: 'hidden' as const,
    };
  });

  // Collapsed title animated style - appears in header bar when scrolled
  const collapsedTitleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(isCollapsed.value, [0.3, 0.7], [0, 1]),
      transform: [
        { scale: interpolate(isCollapsed.value, [0.3, 0.7], [0.9, 1]) },
      ],
    };
  });

  // Header padding animated style
  const headerPaddingAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: interpolate(isCollapsed.value, [0, 1], [20, 8]),
    };
  });

  // Header top row animated style - reduce marginBottom when collapsed
  const headerTopAnimatedStyle = useAnimatedStyle(() => {
    return {
      marginBottom: interpolate(isCollapsed.value, [0, 1], [20, 0]),
    };
  });

  // Tabs row animated style - reduce paddingBottom when collapsed
  const tabsRowAnimatedStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: interpolate(isCollapsed.value, [0, 1], [20, 12]),
    };
  });

  // Queries
  const {
    data: allRequests,
    isLoading: allLoading,
    refetch: refetchAll,
  } = usePrayerRequests(filter === 'all' ? undefined : filter);

  const {
    data: myRequests,
    isLoading: myLoading,
    refetch: refetchMy,
  } = useMyPrayerRequests();

  const { mutate: prayForRequest, isPending: isPraying } = usePrayForRequest();
  const { mutate: markAsAnswered, isPending: isMarking } = useMarkAsAnswered();

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchAll(), refetchMy()]);
    setRefreshing(false);
  }, [refetchAll, refetchMy]);

  // Handle pray
  const handlePray = useCallback(
    (requestId: string, title: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      prayForRequest(requestId, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessToast('Prayer Sent', `Praying for "${title}"`);
        },
        onError: () => {
          showErrorToast('Error', 'Unable to record your prayer');
        },
      });
    },
    [prayForRequest]
  );

  // Handle mark answered
  const handleMarkAnswered = useCallback(
    (requestId: string, title: string) => {
      Alert.alert(
        'Mark as Answered',
        'Has God answered this prayer? Mark it as answered to share your testimony.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Answered!',
            onPress: () => {
              markAsAnswered(
                { requestId },
                {
                  onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showSuccessToast('Praise God!', 'Your prayer has been marked as answered');
                  },
                  onError: () => {
                    showErrorToast('Error', 'Something went wrong');
                  },
                }
              );
            },
          },
        ]
      );
    },
    [markAsAnswered]
  );

  // Format date
  const formatDate = useCallback((date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Current data
  const requests = activeTab === 'all' ? allRequests : myRequests;
  const isLoading = activeTab === 'all' ? allLoading : myLoading;

  // Stats
  const stats = useMemo(() => {
    const all = allRequests || [];
    return {
      total: all.length,
      active: all.filter((r) => r.status === 'active').length,
      answered: all.filter((r) => r.is_answered).length,
    };
  }, [allRequests]);

  // Render header
  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
      style={[styles.header, { paddingTop: insets.top + 8 }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Animated content wrapper for collapsible padding */}
      <Animated.View style={headerPaddingAnimatedStyle}>
        {/* Top bar - back button, collapsed title (fades in), add button */}
        <Animated.View
          entering={PMotionV10.headerFade}
          style={[styles.headerTop, headerTopAnimatedStyle]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.pressedMicro,
            ]}
          >
            <ArrowLeft size={24} color={Colors.white} />
          </Pressable>

          {/* Collapsed title - appears when scrolled */}
          <Animated.View style={[styles.collapsedTitleWrap, collapsedTitleAnimatedStyle]}>
            <HandHeart size={20} color={Colors.accent.primary} />
            <Text style={styles.collapsedTitle}>Prayer Wall</Text>
          </Animated.View>

          <Pressable
            onPress={handleAddPrayer}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && styles.pressedMicro,
            ]}
          >
            <Plus size={22} color={Colors.white} strokeWidth={2.5} />
          </Pressable>
        </Animated.View>

        {/* Title - fades out when scrolling (full size version) */}
        <Animated.View
          entering={PMotionV10.sharedAxisYEnter}
          style={[styles.titleWrap, titleContainerAnimatedStyle]}
        >
          <View style={styles.titleRow}>
            <HandHeart size={28} color={Colors.accent.primary} />
            <Text style={styles.headerTitle}>Prayer Wall</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Lift each other up in prayer
          </Text>
        </Animated.View>

        {/* Stats - Collapsible */}
        <Animated.View
          entering={PMotionV10.sharedAxisYEnter}
          style={[styles.statsRow, statsRowAnimatedStyle]}
        >
          <View style={styles.statItem}>
            <Flame size={16} color={Colors.accent.primary} />
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Sparkles size={16} color={Colors.accent.sage} />
            <Text style={styles.statValue}>{stats.answered}</Text>
            <Text style={styles.statLabel}>Answered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users size={16} color={Colors.accent.rose} />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </Animated.View>

        {/* Tabs - remain visible */}
        <Animated.View
          entering={PMotionV10.sharedAxisYEnter}
          style={[styles.tabsRow, tabsRowAnimatedStyle]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              prevTabRef.current = activeTab;
              setActiveTab('all');
            }}
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          >
            <MessageCircle
              size={16}
              color={activeTab === 'all' ? Colors.gradient.start : 'rgba(255,255,255,0.8)'}
            />
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Community
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              prevTabRef.current = activeTab;
              setActiveTab('my');
            }}
            style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          >
            <User
              size={16}
              color={activeTab === 'my' ? Colors.gradient.start : 'rgba(255,255,255,0.8)'}
            />
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Prayers
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );

  // Render filters (only for "all" tab) - Simple pill buttons
  const renderFilters = () => {
    if (activeTab !== 'all') return null;

    const filterItems: { key: Filter; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: stats.total },
      { key: 'active', label: 'Active', count: stats.active },
      { key: 'answered', label: 'Answered', count: stats.answered },
    ];

    return (
      <View style={{
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
      }}>
        {filterItems.map((f) => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f.key);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isActive ? Colors.gradient.start : Colors.white,
                borderWidth: 1,
                borderColor: isActive ? Colors.gradient.start : Colors.neutral[200],
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: isActive ? Colors.white : Colors.neutral[700],
                marginRight: 6,
              }}>
                {f.label}
              </Text>
              <View style={{
                minWidth: 20,
                height: 20,
                paddingHorizontal: 6,
                borderRadius: 10,
                backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : Colors.neutral[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: isActive ? Colors.white : Colors.neutral[600],
                }}>
                  {f.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // Render prayer card - uses memoized PrayerCard component
  const renderPrayerCard = useCallback(
    (request: PrayerRequestWithStatus, index: number) => (
      <PrayerCard
        key={request._id}
        request={request}
        index={index}
        isOwner={activeTab === 'my'}
        isPraying={isPraying}
        isMarking={isMarking}
        onPray={handlePray}
        onMarkAnswered={handleMarkAnswered}
        formatDate={formatDate}
      />
    ),
    [activeTab, isPraying, isMarking, handlePray, handleMarkAnswered, formatDate]
  );

  // Render empty state
  const renderEmpty = () => (
    <Animated.View
      entering={PMotionV10.sharedAxisYEnter}
      exiting={PMotionV10.sharedAxisYExit}
      style={styles.emptyWrap}
    >
      <View style={styles.emptyIcon}>
        <HandHeart size={48} color={Colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'my' ? 'No Prayer Requests Yet' : 'No Prayers Found'}
      </Text>
      <Text style={styles.emptyDesc}>
        {activeTab === 'my'
          ? 'Share your prayer needs with the community'
          : 'Be the first to share a prayer request'}
      </Text>
      <Pressable
        onPress={handleAddPrayer}
        style={({ pressed }) => [
          styles.emptyBtn,
          pressed && styles.pressedMicro,
        ]}
      >
        <Plus size={18} color={Colors.white} />
        <Text style={styles.emptyBtnText}>New Request</Text>
      </Pressable>
    </Animated.View>
  );

  // Render loading
  const renderLoading = () => (
    <View style={styles.loadingWrap}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonLine, { width: '40%' }]} />
              <View style={[styles.skeletonLine, { width: '25%', marginTop: 6 }]} />
            </View>
          </View>
          <View style={[styles.skeletonLine, { width: '70%', height: 16, marginTop: 16 }]} />
          <View style={[styles.skeletonLine, { width: '100%', marginTop: 12 }]} />
          <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {/* Tab content with Shared Axis X transitions */}
      <Animated.View
        key={activeTab}
        entering={getTabDirection() === 'right' ? PMotionV10.sharedAxisXForward : PMotionV10.sharedAxisXBackward}
        exiting={PMotionV10.sharedAxisXExit}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          entering={PMotionV10.screenFadeIn}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScrollEvent}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderFilters()}

          {isLoading ? (
            renderLoading()
          ) : !requests || requests.length === 0 ? (
            renderEmpty()
          ) : (
            <View style={styles.cardsList}>
              {requests.map((request, index) => renderPrayerCard(request, index))}
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      </Animated.View>

    </View>
  );
}

// Apply Premium Motion V10 Ultra HOC for production-grade transitions
export default withPremiumMotionV10(PrayerScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gradient.start, // Match header gradient start to prevent white flash
  },
  // Micro-interaction for pressed state (scale 0.97, opacity 0.9)
  pressedMicro: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  // Header
  header: {
    paddingBottom: 0,
    paddingHorizontal: spacing.md + spacing.xs, // 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md + spacing.xs, // 20
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Collapsed title (appears in header bar when scrolled)
  collapsedTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  collapsedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  titleWrap: {
    // Height and opacity are animated via titleContainerAnimatedStyle
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs, // 12
    marginBottom: spacing.xs,
  },
  titleIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 40,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: spacing.md,
    paddingVertical: spacing.md - 2, // 14
    paddingHorizontal: spacing.md + spacing.xs, // 20
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2, // 6
  },
  statIcon: {
    marginRight: 8,
  },
  statDivider: {
    width: 1,
    height: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  // Tabs
  tabsRow: {
    flexDirection: 'row',
    paddingBottom: spacing.md + spacing.xs, // 20
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md, // Increased height
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  tabTextActive: {
    color: Colors.gradient.start,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md + spacing.xs, // 20
    paddingTop: spacing.md + spacing.xs, // 20
  },
  // Filters - now using inline styles for reliability
  // Cards list
  cardsList: {
  },
  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'] - spacing.xs, // 60
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2, // 14
    borderRadius: spacing.lg,
  },
  emptyBtnIcon: {
    marginRight: 8,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  // Loading
  loadingWrap: {
  },
  skeletonCard: {
    backgroundColor: Colors.white,
    borderRadius: spacing.md + spacing.xs, // 20
    padding: spacing.md + spacing.xs, // 20
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: spacing.md + spacing.xs, // 20
    backgroundColor: Colors.neutral[200],
    marginRight: spacing.sm + spacing.xs, // 12
  },
  skeletonLines: {},
  skeletonLine: {
    height: spacing.sm + spacing.xs, // 12
    borderRadius: spacing.xs + 2, // 6
    backgroundColor: Colors.neutral[200],
  },
});
