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

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
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
    <HStack space="sm" style={styles.filterTabs}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(tab.id);
          }}
          style={[
            styles.filterTab,
            selected === tab.id && styles.filterTabActive,
          ]}
        >
          <Text
            style={[
              styles.filterTabText,
              selected === tab.id && styles.filterTabTextActive,
            ]}
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

function CallItem({ item, onPress, onCallPress }: CallItemProps) {
  const isMissed = item.status === CallStatus.MISSED || item.status === CallStatus.REJECTED;
  const isOutgoing = !item.is_incoming;
  const isVideo = item.call_type === CallType.VIDEO;

  // Get the other participant name/avatar
  const otherName = item.is_incoming ? item.caller_name : (item.callee_names?.[0] || 'Unknown');
  const otherAvatar = item.is_incoming ? item.caller_avatar : null;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 200 }}
    >
      <Pressable onPress={onPress} style={styles.callItem}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {otherAvatar ? (
              <Image
                source={{ uri: otherAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {/* Call type badge */}
            <View style={styles.callTypeBadge}>
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
              style={[styles.name, isMissed && styles.missedText]}
              numberOfLines={1}
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
              <Text style={styles.callInfo}>
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
            <Text style={styles.time}>{formatCallTime(item.initiated_at)}</Text>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCallPress();
              }}
              style={styles.callButton}
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
    </MotiView>
  );
}

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
    <View style={styles.emptyContainer}>
      <Clock size={48} color={colors.gray[300]} />
      <Text style={styles.emptyText}>{getMessage()}</Text>
      <Text style={styles.emptySubtext}>
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
        <HStack key={i} space="md" style={{ alignItems: 'center' }}>
          <Skeleton height={50} width={50} style={{ borderRadius: 25 }} />
          <VStack style={{ flex: 1 }} space="xs">
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </VStack>
          <Skeleton height={32} width={32} style={{ borderRadius: 16 }} />
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
        router.push(`/call/${item.call_id}` as any);
      } catch (error) {
        console.error('Failed to initiate call:', error);
      }
    },
    [initiateCall, router]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <HStack space="md" style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
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
          <FlatList
            data={filteredCalls}
            keyExtractor={(item: CallHistoryItem) => item.call_id}
            renderItem={({ item }) => (
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
          />
        )}
      </SafeAreaView>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  filterTabs: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
  },
  filterTabTextActive: {
    color: colors.white,
  },
  callItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary[600],
  },
  callTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
  missedText: {
    color: colors.error[500],
  },
  callInfo: {
    fontSize: 13,
    color: colors.gray[500],
  },
  time: {
    fontSize: 12,
    color: colors.gray[400],
    marginBottom: 4,
  },
  callButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
