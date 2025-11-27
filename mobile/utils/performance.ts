/**
 * Performance Optimization Utilities for FaithFlow Mobile
 *
 * World-class performance optimizations including:
 * 1. FlatList optimization configurations
 * 2. Image caching strategies
 * 3. Memoization helpers
 * 4. React Query optimization configurations
 * 5. Navigation performance helpers
 */

import { Dimensions, Platform } from 'react-native';
import { useCallback, useMemo, useRef } from 'react';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// FLATLIST OPTIMIZATION CONFIGURATIONS
// ============================================================================

/**
 * Default FlatList performance props.
 * Apply these to any FlatList for optimal scrolling performance.
 */
export const FLATLIST_PERFORMANCE_PROPS = {
  // Remove items that are far off-screen to save memory
  removeClippedSubviews: Platform.OS === 'android',

  // Maximum items to render per batch (lower = smoother scroll, higher = faster initial)
  maxToRenderPerBatch: 10,

  // Time between batches (higher = smoother scroll)
  updateCellsBatchingPeriod: 50,

  // Initial number of items to render
  initialNumToRender: 10,

  // How far from the end to trigger onEndReached
  onEndReachedThreshold: 0.5,

  // Number of items to keep rendered outside visible area
  windowSize: 21, // 10 screens above + current + 10 screens below
} as const;

/**
 * FlatList props optimized for large lists (100+ items)
 */
export const LARGE_LIST_PROPS = {
  ...FLATLIST_PERFORMANCE_PROPS,
  maxToRenderPerBatch: 5,
  windowSize: 11, // Smaller window for memory
  initialNumToRender: 8,
} as const;

/**
 * FlatList props optimized for image-heavy lists
 */
export const IMAGE_LIST_PROPS = {
  ...FLATLIST_PERFORMANCE_PROPS,
  maxToRenderPerBatch: 3,
  windowSize: 7,
  initialNumToRender: 4,
} as const;

/**
 * Create getItemLayout function for fixed-height items.
 * This enables FlatList to skip measurement, dramatically improving scroll performance.
 *
 * @param itemHeight - Height of each item including separators
 */
export const createGetItemLayout = (itemHeight: number) => {
  return (_data: any, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });
};

/**
 * Create getItemLayout for items with headers/separators
 */
export const createGetItemLayoutWithSeparator = (
  itemHeight: number,
  separatorHeight: number = 0,
  headerHeight: number = 0
) => {
  const totalItemHeight = itemHeight + separatorHeight;
  return (_data: any, index: number) => ({
    length: totalItemHeight,
    offset: headerHeight + totalItemHeight * index,
    index,
  });
};

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

/**
 * Optimized image props for expo-image
 */
export const OPTIMIZED_IMAGE_PROPS = {
  // Cache to both memory and disk
  cachePolicy: 'memory-disk' as const,

  // How image fits its container
  contentFit: 'cover' as const,

  // Smooth transition when image loads
  transition: 200,

  // Placeholder while loading
  placeholderContentFit: 'cover' as const,
} as const;

/**
 * Calculate optimal image dimensions based on screen size
 * @param aspectRatio - Width/Height ratio
 * @param widthPercentage - Percentage of screen width to use
 */
export const calculateImageDimensions = (
  aspectRatio: number = 16 / 9,
  widthPercentage: number = 100
) => {
  const width = SCREEN_WIDTH * (widthPercentage / 100);
  const height = width / aspectRatio;
  return { width, height };
};

/**
 * Get responsive image size for different contexts
 */
export const getResponsiveImageSize = (
  context: 'thumbnail' | 'card' | 'hero' | 'avatar'
) => {
  switch (context) {
    case 'thumbnail':
      return { width: 80, height: 80 };
    case 'card':
      return calculateImageDimensions(16 / 9, 100);
    case 'hero':
      return { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.4 };
    case 'avatar':
      return { width: 48, height: 48 };
    default:
      return calculateImageDimensions();
  }
};

// ============================================================================
// REACT QUERY OPTIMIZATION
// ============================================================================

/**
 * React Query default options for optimal performance
 */
export const QUERY_DEFAULT_OPTIONS = {
  // Data considered fresh for 2 minutes
  staleTime: 1000 * 60 * 2,

  // Keep unused data for 10 minutes
  gcTime: 1000 * 60 * 10,

  // Don't refetch on window focus (mobile)
  refetchOnWindowFocus: false,

  // Don't refetch on reconnect unless stale
  refetchOnReconnect: 'always' as const,

  // Don't refetch on mount if data is fresh
  refetchOnMount: true,

  // Retry failed requests 2 times
  retry: 2,

  // Exponential backoff for retries
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Query options for frequently updated data (e.g., notifications)
 */
export const REALTIME_QUERY_OPTIONS = {
  ...QUERY_DEFAULT_OPTIONS,
  staleTime: 1000 * 30, // 30 seconds
  refetchInterval: 1000 * 60, // Refetch every minute
} as const;

/**
 * Query options for rarely changing data (e.g., bible content, categories)
 */
export const STATIC_QUERY_OPTIONS = {
  ...QUERY_DEFAULT_OPTIONS,
  staleTime: 1000 * 60 * 30, // 30 minutes
  gcTime: 1000 * 60 * 60, // 1 hour
  refetchOnMount: false,
} as const;

/**
 * Query options for user-specific data that shouldn't be shared
 */
export const USER_QUERY_OPTIONS = {
  ...QUERY_DEFAULT_OPTIONS,
  staleTime: 1000 * 60 * 5, // 5 minutes
} as const;

/**
 * Create query key with church context for multi-tenant isolation
 */
export const createQueryKey = (
  base: string,
  churchId: string | null,
  ...params: (string | number | undefined)[]
) => {
  const filteredParams = params.filter((p) => p !== undefined);
  return churchId
    ? [base, churchId, ...filteredParams]
    : [base, ...filteredParams];
};

// ============================================================================
// MEMOIZATION HELPERS
// ============================================================================

/**
 * Hook to create a stable callback that only changes when dependencies change.
 * Useful for event handlers passed to child components.
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps);
};

/**
 * Hook to create a stable value that only recalculates when dependencies change.
 */
export const useStableValue = <T>(factory: () => T, deps: React.DependencyList): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
};

/**
 * Hook to track if a value has changed (for debugging re-renders)
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);

  if (previousProps.current) {
    const allKeys = Object.keys({ ...previousProps.current, ...props });
    const changesObj: Record<string, { from: any; to: any }> = {};

    allKeys.forEach((key) => {
      if (previousProps.current![key] !== props[key]) {
        changesObj[key] = {
          from: previousProps.current![key],
          to: props[key],
        };
      }
    });

    if (Object.keys(changesObj).length) {
      console.log('[why-did-you-update]', name, changesObj);
    }
  }

  previousProps.current = props;
};

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

/**
 * Debounce a function - only call after delay with no new calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle a function - call at most once per interval
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Hook for debounced value
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

// Need to import these for the hook
import { useState, useEffect } from 'react';

// ============================================================================
// NAVIGATION PERFORMANCE
// ============================================================================

/**
 * Screen options for optimal navigation performance
 */
export const SCREEN_OPTIONS = {
  // Freeze inactive screens to prevent re-renders
  freezeOnBlur: true,

  // Enable native animations
  animation: 'slide_from_right' as const,

  // Faster animation duration
  animationDuration: 200,

  // Don't detach screens (keeps them in memory for instant back navigation)
  detachPreviousScreen: false,
} as const;

/**
 * Tab navigator options for performance
 */
export const TAB_OPTIONS = {
  // Lazy load tab screens
  lazy: true,

  // Freeze inactive tabs
  freezeOnBlur: true,

  // Keep tabs mounted after first visit
  unmountOnBlur: false,
} as const;

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

/**
 * Calculate estimated memory usage for a list
 * @param itemCount - Number of items
 * @param itemSizeKB - Estimated size per item in KB
 */
export const estimateListMemory = (itemCount: number, itemSizeKB: number = 5) => {
  const totalKB = itemCount * itemSizeKB;
  return {
    kb: totalKB,
    mb: totalKB / 1024,
    isLarge: totalKB > 5000, // > 5MB
    recommendation:
      totalKB > 10000
        ? 'Consider pagination'
        : totalKB > 5000
        ? 'Use virtualization'
        : 'Size is acceptable',
  };
};

/**
 * Check if device has low memory
 */
export const isLowMemoryDevice = () => {
  // Android devices with < 2GB RAM or older iOS devices
  return Platform.OS === 'android' && Platform.Version < 26;
};

// ============================================================================
// COMMUNITIES-SPECIFIC OPTIMIZATIONS
// ============================================================================

import type { CommunityMessage } from '@/types/communities';
import { InteractionManager } from 'react-native';

/**
 * Message key extractor - stable reference for FlashList
 */
export const messageKeyExtractor = (item: CommunityMessage) => item.id;

/**
 * Estimate message item height for FlashList virtualization
 */
export const getMessageItemHeight = (message: CommunityMessage): number => {
  if (message.is_deleted) return 50;
  if (message.message_type === 'poll') return 300;
  if (message.message_type === 'image' || message.message_type === 'video') {
    return 260 + (message.text ? 40 : 0);
  }
  if (message.message_type === 'document') return 100;
  if (message.message_type === 'audio') return 80;

  // Text message - estimate based on length
  const textLength = message.text?.length || 0;
  const lines = Math.ceil(textLength / 38);
  return 60 + lines * 22 + (message.reply_to ? 55 : 0);
};

/**
 * FlashList props optimized for chat messages
 */
export const CHAT_LIST_PROPS = {
  estimatedItemSize: 80,
  drawDistance: 500, // Pre-render items 500px outside viewport
  overrideItemLayout: undefined, // Enable when item heights are known
} as const;

/**
 * Create optimistic message for immediate display
 */
export const createOptimisticMessage = (
  text: string,
  memberId: string,
  memberName: string,
  memberAvatar: string | undefined,
  communityId: string,
  channelType: string,
  subgroupId?: string,
  replyTo?: CommunityMessage | null
): CommunityMessage => {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    church_id: '',
    community_id: communityId,
    channel_type: channelType as any,
    subgroup_id: subgroupId,
    sender_member_id: memberId,
    sender_name: memberName,
    sender_avatar_fid: memberAvatar,
    message_type: 'text',
    text,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    is_edited: false,
    read_by: [],
    reactions: {},
    reply_to: replyTo
      ? {
          message_id: replyTo.id,
          sender_name: replyTo.sender_name || 'Unknown',
          preview: replyTo.text?.substring(0, 60) || '[Media]',
        }
      : undefined,
    sender: {
      id: memberId,
      name: memberName,
      avatar_url: memberAvatar,
    },
    _optimistic: true,
  } as unknown as CommunityMessage & { _optimistic?: boolean };
};

/**
 * Add optimistic message to cache
 */
export const addOptimisticMessageToCache = (
  queryClient: any,
  queryKey: any[],
  message: CommunityMessage
): void => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages?.[0]) {
      return {
        pages: [{ messages: [message], has_more: false }],
        pageParams: [undefined],
      };
    }

    return {
      ...oldData,
      pages: [
        {
          ...oldData.pages[0],
          messages: [message, ...oldData.pages[0].messages],
        },
        ...oldData.pages.slice(1),
      ],
    };
  });
};

/**
 * Replace optimistic message with real message
 */
export const replaceOptimisticMessage = (
  queryClient: any,
  queryKey: any[],
  optimisticId: string,
  realMessage: CommunityMessage
): void => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        messages: page.messages.map((msg: CommunityMessage) =>
          msg.id === optimisticId ? realMessage : msg
        ),
      })),
    };
  });
};

/**
 * Remove optimistic message from cache (on error)
 */
export const removeOptimisticMessage = (
  queryClient: any,
  queryKey: any[],
  optimisticId: string
): void => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        messages: page.messages.filter(
          (msg: CommunityMessage) => msg.id !== optimisticId
        ),
      })),
    };
  });
};

/**
 * Optimistically update reaction in cache
 */
export const updateReactionInCache = (
  queryClient: any,
  queryKey: any[],
  messageId: string,
  emoji: string,
  memberId: string,
  action: 'add' | 'remove'
): { previousData: any } => {
  const previousData = queryClient.getQueryData(queryKey);

  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        messages: page.messages.map((msg: CommunityMessage) => {
          if (msg.id !== messageId) return msg;

          const reactions = { ...msg.reactions };
          const currentVoters = reactions[emoji] || [];

          if (action === 'add') {
            reactions[emoji] = [...currentVoters, memberId];
          } else {
            reactions[emoji] = currentVoters.filter((id: string) => id !== memberId);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          }

          return { ...msg, reactions };
        }),
      })),
    };
  });

  return { previousData };
};

/**
 * Optimistically update poll vote in cache
 */
export const updatePollVoteInCache = (
  queryClient: any,
  messageId: string,
  optionId: string,
  memberId: string,
  action: 'add' | 'remove'
): void => {
  // Update all message queries that might contain this poll
  queryClient.setQueriesData(
    { queryKey: ['community', 'messages'], exact: false },
    (oldData: any) => {
      if (!oldData?.pages) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: CommunityMessage) => {
            if (msg.id !== messageId || !msg.poll) return msg;

            const poll = { ...msg.poll };
            poll.options = poll.options.map((opt: any) => {
              if (opt.id !== optionId) return opt;

              const voters = opt.voters || [];
              const newVoters =
                action === 'add'
                  ? [...voters, memberId]
                  : voters.filter((id: string) => id !== memberId);

              return {
                ...opt,
                voters: newVoters,
                vote_count: newVoters.length,
              };
            });

            // Recalculate total votes
            poll.total_votes = poll.options.reduce(
              (sum: number, opt: any) => sum + (opt.vote_count || 0),
              0
            );

            return { ...msg, poll };
          }),
        })),
      };
    }
  );
};

/**
 * Prefetch community data when hovering/long-pressing
 */
export const prefetchCommunityData = (
  queryClient: any,
  communityId: string
): void => {
  InteractionManager.runAfterInteractions(() => {
    // Prefetch community detail
    queryClient.prefetchQuery({
      queryKey: ['community', 'detail', communityId],
      staleTime: 1000 * 60 * 5,
    });

    // Prefetch members
    queryClient.prefetchQuery({
      queryKey: ['community', 'members', communityId],
      staleTime: 1000 * 60 * 5,
    });
  });
};

/**
 * Trim old messages from cache to prevent memory bloat
 */
export const trimMessageCache = (
  queryClient: any,
  queryKey: any[],
  maxPages: number = 5
): void => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages || oldData.pages.length <= maxPages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.slice(0, maxPages),
      pageParams: oldData.pageParams.slice(0, maxPages),
    };
  });
};

/**
 * Query options for community messages (real-time)
 */
export const MESSAGE_QUERY_OPTIONS = {
  staleTime: 1000 * 30, // 30 seconds
  gcTime: 1000 * 60 * 60, // Keep for 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  retry: 2,
} as const;

/**
 * Query options for community list
 */
export const COMMUNITY_LIST_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 60, // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: 'always' as const,
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // FlatList
  FLATLIST_PERFORMANCE_PROPS,
  LARGE_LIST_PROPS,
  IMAGE_LIST_PROPS,
  createGetItemLayout,
  createGetItemLayoutWithSeparator,

  // Images
  OPTIMIZED_IMAGE_PROPS,
  calculateImageDimensions,
  getResponsiveImageSize,

  // React Query
  QUERY_DEFAULT_OPTIONS,
  REALTIME_QUERY_OPTIONS,
  STATIC_QUERY_OPTIONS,
  USER_QUERY_OPTIONS,
  createQueryKey,

  // Memoization
  useStableCallback,
  useStableValue,
  useWhyDidYouUpdate,

  // Utilities
  debounce,
  throttle,
  useDebouncedValue,

  // Navigation
  SCREEN_OPTIONS,
  TAB_OPTIONS,

  // Memory
  estimateListMemory,
  isLowMemoryDevice,
};
