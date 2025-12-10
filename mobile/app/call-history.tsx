/**
 * Call History Screen
 *
 * Shows call history with voice/video call logs.
 * Features:
 * - Filterable by call type (all, voice, video, missed)
 * - Pull-to-refresh
 * - Tap to call back
 * - Call duration and timestamp display
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Filter,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Skeleton } from '@/components/ui/skeleton';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { callApi } from '@/services/api/call';
import { useCallStore } from '@/stores/call';
import { CallType, CallHistoryItem, CallStatus } from '@/types/call';
import { goBack, navigateTo } from '@/utils/navigation';

// =============================================================================
// TYPES
// =============================================================================

type FilterType = 'all' | 'voice' | 'video' | 'missed';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatCallTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// =============================================================================
// FILTER TABS
// =============================================================================

interface FilterTabsProps {
  selected: FilterType;
  onSelect: (filter: FilterType) => void;
}

function FilterTabs({ selected, onSelect }: FilterTabsProps) {
  const tabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'voice', label: 'Voice' },
    { id: 'video', label: 'Video' },
    { id: 'missed', label: 'Missed' },
  ];

  return (
    <HStack space="sm" style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(tab.id);
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${tab.label} calls`}
          accessibilityState={{ selected: selected === tab.id }}
          className="rounded-full"
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            backgroundColor: selected === tab.id ? colors.primary[500] : colors.gray[100],
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{
              color: selected === tab.id ? colors.white : colors.gray[600],
            }}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}

// =============================================================================
// CALL HISTORY ITEM
// =============================================================================

interface CallItemProps {
  item: CallHistoryItem;
  onPress: () => void;
  onCallPress: () => void;
}

const CallItem = memo(function CallItem({ item, onPress, onCallPress }: CallItemProps) {
  const isMissed = item.status === CallStatus.MISSED || item.status === CallStatus.REJECTED;
  const isOutgoing = !item.is_incoming;
  const isVideo = item.call_type === CallType.VIDEO;

  // Get the other participant name/avatar
  const otherName = item.is_incoming ? item.caller_name : (item.callee_names?.[0] || 'Unknown');
  const otherAvatar = item.is_incoming ? item.caller_avatar : null;

  return (
    <Animated.View entering={FadeInLeft.duration(200)}>
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${isMissed ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'} ${isVideo ? 'video' : 'voice'} call ${isOutgoing ? 'to' : 'from'} ${otherName}, ${formatCallTime(item.initiated_at)}`}
        className="border-b"
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomColor: colors.gray[100],
        }}
      >
        <HStack space="md" style={{ alignItems: 'center' }}>
          {/* Avatar */}
          <View className="relative">
            {otherAvatar ? (
              <Image
                source={{ uri: otherAvatar }}
                style={{ width: 50, height: 50, borderRadius: 25 }}
              />
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: colors.primary[100],
                }}
              >
                <Text className="text-xl font-semibold" style={{ color: colors.primary[600] }}>
                  {otherName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {/* Call type badge */}
            <View
              className="absolute items-center justify-center border-2"
              style={{
                bottom: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.gray[600],
                borderColor: colors.white,
              }}
            >
              {isVideo ? (
                <Video size={10} color={colors.white} />
              ) : (
                <Phone size={10} color={colors.white} />
              )}
            </View>
          </View>

          {/* Info */}
          <VStack style={{ flex: 1 }}>
            <Text
              className="text-base font-medium"
              numberOfLines={1}
              style={{ color: isMissed ? colors.error[500] : colors.gray[900] }}
            >
              {otherName}
            </Text>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              {/* Direction icon */}
              {isMissed ? (
                <PhoneMissed size={14} color={colors.error[500]} />
              ) : isOutgoing ? (
                <PhoneOutgoing size={14} color={colors.gray[500]} />
              ) : (
                <PhoneIncoming size={14} color={colors.success[500]} />
              )}
              <Text className="text-[13px]" style={{ color: colors.gray[500] }}>
                {isMissed
                  ? 'Missed call'
                  : item.duration_seconds
                  ? formatDuration(item.duration_seconds)
                  : 'No answer'}
              </Text>
            </HStack>
          </VStack>

          {/* Time & Action */}
          <VStack style={{ alignItems: 'flex-end' }}>
            <Text className="text-xs mb-1" style={{ color: colors.gray[400] }}>
              {formatCallTime(item.initiated_at)}
            </Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCallPress();
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Call back ${otherName}`}
              style={{ padding: spacing.xs }}
            >
              {isVideo ? (
                <Video size={18} color={colors.primary[500]} />
              ) : (
                <Phone size={18} color={colors.primary[500]} />
              )}
            </Pressable>
          </VStack>
        </HStack>
      </Pressable>
    </Animated.View>
  );
});

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ filter }: { filter: FilterType }) {
  const getMessage = () => {
    switch (filter) {
      case 'missed':
        return 'No missed calls';
      case 'voice':
        return 'No voice calls yet';
      case 'video':
        return 'No video calls yet';
      default:
        return 'No calls yet';
    }
  };

  return (
    <View className="flex-1 items-center justify-center" style={{ padding: spacing.xl }}>
      <Clock size={48} color={colors.gray[300]} />
      <Text className="text-lg font-semibold" style={{ color: colors.gray[700], marginTop: spacing.md }}>
        {getMessage()}
      </Text>
      <Text className="text-sm text-center" style={{ color: colors.gray[500], marginTop: spacing.xs }}>
        Your call history will appear here
      </Text>
    </View>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LoadingSkeleton() {
  return (
    <VStack space="md" style={{ padding: spacing.md }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <HStack key={i} space="md" className="items-center">
          <Skeleton height={50} width={50} className="rounded-full" />
          <VStack className="flex-1" space="xs">
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </VStack>
          <Skeleton height={32} width={32} className="rounded-full" />
        </HStack>
      ))}
    </VStack>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CallHistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const { initiateCall } = useCallStore();

  // Fetch call history
  const {
    data: callHistory,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['call-history', filter],
    queryFn: () => callApi.getCallHistory(1, 50, filter === 'all' ? undefined : filter === 'voice' ? CallType.VOICE : filter === 'video' ? CallType.VIDEO : undefined),
  });

  // Filter calls based on selected filter
  const filteredCalls = useMemo(() => {
    if (!callHistory?.calls) return [];

    if (filter === 'missed') {
      return callHistory.calls.filter(
        (item: CallHistoryItem) => item.status === 'missed' || item.status === 'rejected'
      );
    }

    return callHistory.calls;
  }, [callHistory, filter]);

  // Handle call back
  const handleCallBack = useCallback(
    async (item: CallHistoryItem) => {
      // Get the other party's ID based on whether this was incoming or outgoing
      const calleeId = item.is_incoming ? item.caller_id : item.callee_ids[0];
      if (!calleeId) return;

      try {
        await initiateCall(
          [calleeId],
          item.call_type
        );
        navigateTo(`/call/${item.call_id}`);
      } catch (error) {
        console.error('Failed to initiate call:', error);
      }
    },
    [initiateCall]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header */}
        <HStack
          space="md"
          className="items-center"
          style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
        >
          <Pressable
            onPress={() => goBack()}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ padding: spacing.xs }}
          >
            <ArrowLeft size={24} color={colors.gray[900]} />
          </Pressable>
          <Heading size="xl" style={{ flex: 1 }}>
            Call History
          </Heading>
        </HStack>

        {/* Filter Tabs */}
        <FilterTabs selected={filter} onSelect={setFilter} />

        {/* Call List */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <FlashList
            data={filteredCalls}
            keyExtractor={(item: CallHistoryItem) => item.call_id}
            renderItem={({ item }: { item: CallHistoryItem }) => (
              <CallItem
                item={item}
                onPress={() => {
                  // Show call details (could expand inline or navigate)
                }}
                onCallPress={() => handleCallBack(item)}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            ListEmptyComponent={<EmptyState filter={filter} />}
            contentContainerStyle={
              filteredCalls.length === 0 ? { flex: 1 } : { paddingBottom: 100 }
            }
            showsVerticalScrollIndicator={false}
            estimatedItemSize={80}
          />
        )}
      </SafeAreaView>
    </>
  );
}
