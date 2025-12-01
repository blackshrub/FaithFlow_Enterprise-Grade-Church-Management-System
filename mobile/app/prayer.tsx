/**
 * Prayer Requests Screen - Premium World-Class Redesign
 *
 * Design Philosophy: "Sacred space for community prayer"
 *
 * Features:
 * - Full-bleed gradient header (using PrayerHeader component)
 * - Premium prayer request cards
 * - Elegant tab navigation
 * - Beautiful filter interactions
 * - "I Prayed" animation feedback
 * - Sophisticated empty states
 *
 * Styling: NativeWind-first with Gluestack Button
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import { Plus, HandHeart } from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import {
  usePrayerRequests,
  useMyPrayerRequests,
  usePrayForRequest,
  useMarkAsAnswered,
} from '@/hooks/usePrayer';
import { useOverlay } from '@/stores/overlayStore';
import { CreatePrayerSheet } from '@/components/overlay/sheets/CreatePrayerSheet';
import { PrayerCard } from '@/components/prayer/PrayerCard';
import { PrayerHeader, type PrayerTab } from '@/components/prayer/PrayerHeader';
import type { PrayerRequestWithStatus } from '@/types/prayer';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';

// Premium color palette - for icon colors only
const Colors = {
  gradient: {
    start: '#1e3a5f',
  },
  white: '#FFFFFF',
};

type Filter = 'all' | 'active' | 'answered';

function PrayerScreen() {
  const { t: _t } = useTranslation();
  const insets = useSafeAreaInsets();

  // State
  const [activeTab, setActiveTab] = useState<PrayerTab>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Tab direction tracking
  const prevTabRef = React.useRef<PrayerTab>('all');

  // Overlay for bottom sheet
  const overlay = useOverlay();

  // Scroll value for collapsible header (using shared today-motion)
  const scrollY = useSharedValue(0);

  // Handle opening create prayer bottom sheet
  const handleAddPrayer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    overlay.showBottomSheet(CreatePrayerSheet);
  }, [overlay]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: PrayerTab) => {
    prevTabRef.current = activeTab;
    setActiveTab(tab);
  }, [activeTab]);

  // Compute direction: 'all' is index 0, 'my' is index 1
  const getTabDirection = () => {
    const tabOrder: PrayerTab[] = ['all', 'my'];
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex > prevIndex ? 'right' : 'left';
  };

  // Scroll handler - updates scrollY for collapsible header
  const handleScrollEvent = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, [scrollY]);

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

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Render filters
  const renderFilters = () => {
    if (activeTab !== 'all') return null;

    const filterItems: { key: Filter; label: string; count: number }[] = [
      { key: 'all', label: 'All', count: stats.total },
      { key: 'active', label: 'Active', count: stats.active },
      { key: 'answered', label: 'Answered', count: stats.answered },
    ];

    return (
      <View className="flex-row mb-4 gap-2">
        {filterItems.map((f) => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f.key);
              }}
              className={`flex-row items-center px-3.5 py-2 rounded-[20px] border ${
                isActive
                  ? 'bg-[#1e3a5f] border-[#1e3a5f]'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <Text
                className={`text-sm font-semibold mr-1.5 ${
                  isActive ? 'text-white' : 'text-neutral-700'
                }`}
              >
                {f.label}
              </Text>
              <View
                className={`min-w-[20px] h-5 px-1.5 rounded-[10px] items-center justify-center ${
                  isActive ? 'bg-white/25' : 'bg-neutral-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  {f.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  // Render prayer card
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
      className="items-center py-16 px-10"
    >
      <View className="w-[100px] h-[100px] rounded-full bg-neutral-200 items-center justify-center mb-6">
        <HandHeart size={48} color="#D4D4D4" />
      </View>
      <Text className="text-xl font-bold text-neutral-800 mb-2">
        {activeTab === 'my' ? 'No Prayer Requests Yet' : 'No Prayers Found'}
      </Text>
      <Text className="text-[15px] text-neutral-500 text-center mb-6 leading-[22px]">
        {activeTab === 'my'
          ? 'Share your prayer needs with the community'
          : 'Be the first to share a prayer request'}
      </Text>
      <Button size="lg" onPress={handleAddPrayer} className="rounded-xl">
        <Plus size={18} color={Colors.white} />
        <ButtonText className="ml-2 font-semibold">New Request</ButtonText>
      </Button>
    </Animated.View>
  );

  // Render loading
  const renderLoading = () => (
    <View>
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-[20px] p-5 mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-[20px] bg-neutral-200 mr-3" />
            <View>
              <View className="w-24 h-3 rounded-md bg-neutral-200" />
              <View className="w-16 h-3 rounded-md bg-neutral-200 mt-1.5" />
            </View>
          </View>
          <View className="w-3/4 h-4 rounded-md bg-neutral-200 mt-4" />
          <View className="w-full h-3 rounded-md bg-neutral-200 mt-3" />
          <View className="w-4/5 h-3 rounded-md bg-neutral-200 mt-2" />
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.gradient.start }}>
      {/* Header component - matching EventsHeader structure */}
      <PrayerHeader
        topInset={insets.top}
        activeCount={stats.active}
        answeredCount={stats.answered}
        totalCount={stats.total}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPressAdd={handleAddPrayer}
        onPressBack={handleBack}
        scrollY={scrollY}
      />

      {/* Tab content with Shared Axis X transitions */}
      <Animated.View
        key={activeTab}
        entering={getTabDirection() === 'right' ? PMotionV10.sharedAxisXForward : PMotionV10.sharedAxisXBackward}
        exiting={PMotionV10.sharedAxisXExit}
        className="flex-1"
      >
        <Animated.ScrollView
          entering={PMotionV10.screenFadeIn}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
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
            <View>
              {requests.map((request, index) => renderPrayerCard(request, index))}
            </View>
          )}

          {/* Bottom spacing */}
          <View className="h-32" />
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}

export default withPremiumMotionV10(PrayerScreen);
