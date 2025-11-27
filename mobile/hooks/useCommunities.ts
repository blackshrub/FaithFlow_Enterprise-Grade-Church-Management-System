/**
 * Communities API Hooks
 *
 * React Query hooks for communities operations:
 * - Fetch communities (all, my communities)
 * - Join/leave communities
 * - Messages (send, edit, delete)
 * - Reactions and read receipts
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { API_ENDPOINTS, QUERY_KEYS, CACHE_TIMES, PAGINATION } from '@/constants/api';
import { useAuthStore } from '@/stores/auth';
import type {
  CommunityWithStatus,
  CommunityMember,
  CommunityMessage,
  MessageListResponse,
  SendMessageRequest,
  JoinCommunityResponse,
  LeaveCommunityResponse,
  CommunitySubgroup,
} from '@/types/communities';

// ============================================================================
// Communities
// ============================================================================

/**
 * Fetch my communities (member authenticated)
 */
export function useMyCommunities() {
  const { member } = useAuthStore();

  return useQuery({
    queryKey: QUERY_KEYS.MY_COMMUNITIES,
    queryFn: async () => {
      const response = await api.get<{ communities: CommunityWithStatus[]; total: number }>(
        API_ENDPOINTS.MY_COMMUNITIES
      );
      return response.data.communities;
    },
    enabled: !!member?.id,
    staleTime: CACHE_TIMES.COMMUNITIES,
    gcTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Fetch public communities for discovery
 */
export function usePublicCommunities(churchId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.COMMUNITIES, churchId],
    queryFn: async () => {
      const response = await api.get<{ communities: CommunityWithStatus[]; total: number }>(
        API_ENDPOINTS.COMMUNITIES_PUBLIC(churchId)
      );
      return response.data.communities;
    },
    enabled: !!churchId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Fetch single community
 */
export function useCommunity(communityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId),
    queryFn: async () => {
      const response = await api.get<CommunityWithStatus>(
        API_ENDPOINTS.COMMUNITY_DETAIL(communityId)
      );
      return response.data;
    },
    enabled: !!communityId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Fetch community members
 */
export function useCommunityMembers(churchId: string, communityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.COMMUNITY_MEMBERS(communityId),
    queryFn: async () => {
      const response = await api.get<{ members: CommunityMember[]; total: number }>(
        API_ENDPOINTS.COMMUNITY_MEMBERS(churchId, communityId)
      );
      return response.data.members;
    },
    enabled: !!communityId && !!churchId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Join community
 */
export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      message,
    }: {
      communityId: string;
      message?: string;
    }) => {
      const response = await api.post<JoinCommunityResponse>(
        API_ENDPOINTS.COMMUNITY_JOIN(communityId),
        { message }
      );
      return { communityId, ...response.data };
    },

    onSuccess: (data, { communityId }) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId) });
    },
  });
}

/**
 * Leave community
 */
export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const response = await api.post<LeaveCommunityResponse>(
        API_ENDPOINTS.COMMUNITY_LEAVE(communityId)
      );
      return { communityId, ...response.data };
    },

    onMutate: async (communityId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });

      // Snapshot the previous value
      const previousCommunities = queryClient.getQueryData<CommunityWithStatus[]>(
        QUERY_KEYS.MY_COMMUNITIES
      );

      // Optimistically remove from my communities
      queryClient.setQueryData<CommunityWithStatus[]>(
        QUERY_KEYS.MY_COMMUNITIES,
        (old) => old?.filter((c) => c.id !== communityId) ?? []
      );

      return { previousCommunities };
    },

    onError: (_error, _communityId, context) => {
      // Rollback on error
      if (context?.previousCommunities) {
        queryClient.setQueryData(QUERY_KEYS.MY_COMMUNITIES, context.previousCommunities);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
    },
  });
}

/**
 * Delete community (admin only)
 */
export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      await api.delete(`/api/communities/${communityId}`);
      return { communityId };
    },

    onMutate: async (communityId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.COMMUNITIES });

      // Snapshot the previous value
      const previousCommunities = queryClient.getQueryData<CommunityWithStatus[]>(
        QUERY_KEYS.MY_COMMUNITIES
      );

      // Optimistically remove from communities
      queryClient.setQueryData<CommunityWithStatus[]>(
        QUERY_KEYS.MY_COMMUNITIES,
        (old) => old?.filter((c) => c.id !== communityId) ?? []
      );

      return { previousCommunities };
    },

    onError: (_error, _communityId, context) => {
      // Rollback on error
      if (context?.previousCommunities) {
        queryClient.setQueryData(QUERY_KEYS.MY_COMMUNITIES, context.previousCommunities);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
    },
  });
}

/**
 * Archive community (admin only) - sets is_active to false
 */
export function useArchiveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const response = await api.patch(`/api/communities/${communityId}`, {
        is_active: false,
      });
      return response.data;
    },

    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId) });
    },
  });
}

// ============================================================================
// Messages
// ============================================================================

/**
 * Fetch messages with infinite scroll (cursor pagination)
 */
export function useCommunityMessages(
  communityId: string,
  channelType: 'general' | 'announcement' | 'subgroup' = 'general',
  subgroupId?: string
) {
  return useInfiniteQuery({
    queryKey: ['community', 'messages', communityId, channelType, subgroupId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('channel_type', channelType);
      params.set('limit', '50');
      if (subgroupId) params.set('subgroup_id', subgroupId);
      if (pageParam) params.set('before', pageParam);

      const response = await api.get<MessageListResponse>(
        `/api/mobile/communities/${communityId}/messages?${params.toString()}`
      );
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.oldest_message_id : undefined,
    enabled: !!communityId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

import {
  createOptimisticMessage,
  addOptimisticMessageToCache,
  replaceOptimisticMessage,
  removeOptimisticMessage,
  updateReactionInCache,
  updatePollVoteInCache,
} from '@/utils/performance';

/**
 * Send message with optimistic updates
 * Message appears instantly, then syncs with server
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      communityId,
      channelType,
      subgroupId,
      message,
      optimisticId,
    }: {
      communityId: string;
      channelType: 'general' | 'announcement' | 'subgroup';
      subgroupId?: string;
      message: SendMessageRequest;
      optimisticId?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('channel_type', channelType);
      if (subgroupId) params.set('subgroup_id', subgroupId);

      const response = await api.post<{ message: CommunityMessage; mqtt_published: boolean }>(
        `/api/mobile/communities/${communityId}/messages?${params.toString()}`,
        message
      );
      return { ...response.data, optimisticId };
    },

    // Optimistic update - add message immediately
    onMutate: async ({ communityId, channelType, subgroupId, message }) => {
      const queryKey = ['community', 'messages', communityId, channelType, subgroupId];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Create optimistic message
      const optimisticMessage = createOptimisticMessage(
        message.text || '',
        member?.id || '',
        member?.full_name || member?.first_name || 'You',
        member?.avatar_url,
        communityId,
        channelType,
        subgroupId,
        null // reply_to handled separately
      );

      // Snapshot previous state
      const previousMessages = queryClient.getQueryData(queryKey);

      // Add optimistic message to cache
      addOptimisticMessageToCache(queryClient, queryKey, optimisticMessage);

      return { previousMessages, optimisticId: optimisticMessage.id, queryKey };
    },

    // On success, replace optimistic with real message
    onSuccess: (data, variables, context) => {
      if (context?.optimisticId && context?.queryKey) {
        replaceOptimisticMessage(
          queryClient,
          context.queryKey,
          context.optimisticId,
          data.message
        );
      }
    },

    // On error, remove optimistic message
    onError: (error, variables, context) => {
      if (context?.optimisticId && context?.queryKey) {
        removeOptimisticMessage(queryClient, context.queryKey, context.optimisticId);
      }
    },
  });
}

/**
 * Edit message
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, text }: { messageId: string; text: string }) => {
      const response = await api.put<CommunityMessage>(
        `/api/mobile/messages/${messageId}`,
        { text }
      );
      return response.data;
    },

    onSuccess: () => {
      // Invalidate all message queries
      queryClient.invalidateQueries({ queryKey: ['community', 'messages'] });
    },
  });
}

/**
 * Delete message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      forEveryone,
    }: {
      messageId: string;
      forEveryone?: boolean;
    }) => {
      const response = await api.delete<{ success: boolean }>(
        `/api/mobile/messages/${messageId}?for_everyone=${forEveryone ?? false}`
      );
      return { messageId, ...response.data };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'messages'] });
    },
  });
}

/**
 * React to message with optimistic updates
 */
export function useReactToMessage() {
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      action,
      communityId,
      channelType,
      subgroupId,
    }: {
      messageId: string;
      emoji: string;
      action: 'add' | 'remove';
      communityId: string;
      channelType: string;
      subgroupId?: string;
    }) => {
      const response = await api.post<{ success: boolean }>(
        `/api/mobile/messages/${messageId}/react?emoji=${encodeURIComponent(emoji)}&action=${action}`
      );
      return response.data;
    },

    // Optimistic update
    onMutate: async ({ messageId, emoji, action, communityId, channelType, subgroupId }) => {
      const queryKey = ['community', 'messages', communityId, channelType, subgroupId];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Update cache optimistically
      const context = updateReactionInCache(
        queryClient,
        queryKey,
        messageId,
        emoji,
        member?.id || '',
        action
      );

      return { ...context, queryKey };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
  });
}

/**
 * Mark message as read
 */
export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/api/mobile/messages/${messageId}/read`
      );
      return response.data;
    },
  });
}

/**
 * Send typing indicator
 */
export function useSendTyping() {
  return useMutation({
    mutationFn: async ({
      communityId,
      isTyping,
      subgroupId,
    }: {
      communityId: string;
      isTyping: boolean;
      subgroupId?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('is_typing', String(isTyping));
      if (subgroupId) params.set('subgroup_id', subgroupId);

      const response = await api.post<{ success: boolean }>(
        `/api/mobile/communities/${communityId}/typing?${params.toString()}`
      );
      return response.data;
    },
  });
}

// ============================================================================
// Sub-groups
// ============================================================================

/**
 * Fetch community sub-groups
 */
export function useCommunitySubgroups(communityId: string) {
  return useQuery({
    queryKey: ['community', 'subgroups', communityId],
    queryFn: async () => {
      const response = await api.get<{ subgroups: CommunitySubgroup[]; total: number }>(
        `/api/mobile/communities/${communityId}/subgroups`
      );
      return response.data.subgroups;
    },
    enabled: !!communityId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Create sub-group
 */
export function useCreateSubgroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      name,
      description,
    }: {
      communityId: string;
      name: string;
      description?: string;
    }) => {
      const response = await api.post<{ subgroup: CommunitySubgroup; message: string }>(
        `/api/mobile/communities/${communityId}/subgroups`,
        { name, description }
      );
      return response.data.subgroup;
    },

    onSuccess: (data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'subgroups', communityId] });
    },
  });
}

/**
 * Get sub-group details
 */
export function useSubgroupDetails(subgroupId: string) {
  return useQuery({
    queryKey: ['subgroup', subgroupId],
    queryFn: async () => {
      const response = await api.get<CommunitySubgroup>(
        `/api/mobile/subgroups/${subgroupId}`
      );
      return response.data;
    },
    enabled: !!subgroupId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Join sub-group
 */
export function useJoinSubgroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subgroupId,
      communityId,
    }: {
      subgroupId: string;
      communityId: string;
    }) => {
      const response = await api.post<{ success: boolean; message: string }>(
        `/api/mobile/subgroups/${subgroupId}/join`
      );
      return response.data;
    },

    onSuccess: (data, { communityId, subgroupId }) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'subgroups', communityId] });
      queryClient.invalidateQueries({ queryKey: ['subgroup', subgroupId] });
    },
  });
}

/**
 * Leave sub-group
 */
export function useLeaveSubgroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subgroupId,
      communityId,
    }: {
      subgroupId: string;
      communityId: string;
    }) => {
      const response = await api.post<{ success: boolean; message: string }>(
        `/api/mobile/subgroups/${subgroupId}/leave`
      );
      return response.data;
    },

    onSuccess: (data, { communityId, subgroupId }) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'subgroups', communityId] });
      queryClient.invalidateQueries({ queryKey: ['subgroup', subgroupId] });
    },
  });
}

/**
 * Get sub-group members
 */
export function useSubgroupMembers(subgroupId: string) {
  return useQuery({
    queryKey: ['subgroup', 'members', subgroupId],
    queryFn: async () => {
      const response = await api.get<{ members: CommunityMember[]; total: number }>(
        `/api/mobile/subgroups/${subgroupId}/members`
      );
      return response.data;
    },
    enabled: !!subgroupId,
    staleTime: CACHE_TIMES.MEMBERS,
  });
}

// ============================================================================
// Media Messages
// ============================================================================

/**
 * Send media message (image, video, document, audio)
 */
export function useSendMediaMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      channelType,
      subgroupId,
      messageType,
      media,
      text,
      replyToMessageId,
    }: {
      communityId: string;
      channelType: 'general' | 'announcement' | 'subgroup';
      subgroupId?: string;
      messageType: 'image' | 'video' | 'audio' | 'document';
      media: {
        seaweedfs_fid: string;
        mime_type: string;
        file_name?: string;
        file_size: number;
        thumbnail_fid?: string;
        duration?: number;
        width?: number;
        height?: number;
      };
      text?: string;
      replyToMessageId?: string;
    }) => {
      const params = new URLSearchParams();
      params.set('channel_type', channelType);
      if (subgroupId) params.set('subgroup_id', subgroupId);

      const response = await api.post<{ message: CommunityMessage; mqtt_published: boolean }>(
        `/api/mobile/communities/${communityId}/messages?${params.toString()}`,
        {
          message_type: messageType,
          text,
          media,
          reply_to_message_id: replyToMessageId,
        }
      );
      return response.data;
    },

    onSuccess: (data, { communityId, channelType, subgroupId }) => {
      // Add message to cache
      queryClient.setQueryData(
        ['community', 'messages', communityId, channelType, subgroupId],
        (oldData: any) => {
          if (!oldData?.pages?.[0]) return oldData;

          return {
            ...oldData,
            pages: [
              {
                ...oldData.pages[0],
                messages: [data.message, ...oldData.pages[0].messages],
              },
              ...oldData.pages.slice(1),
            ],
          };
        }
      );
    },
  });
}

// ============================================================================
// Polls
// ============================================================================

import type { CommunityPoll, PollOption } from '@/types/communities';

/**
 * Create poll in community
 */
export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      channelType,
      subgroupId,
      question,
      options,
      allowMultiple,
      isAnonymous,
      durationHours,
    }: {
      communityId: string;
      channelType: 'general' | 'announcement' | 'subgroup';
      subgroupId?: string;
      question: string;
      options: string[];
      allowMultiple?: boolean;
      isAnonymous?: boolean;
      durationHours?: number;
    }) => {
      const params = new URLSearchParams();
      params.set('channel_type', channelType);
      if (subgroupId) params.set('subgroup_id', subgroupId);

      // Backend expects FormData
      const formData = new FormData();
      formData.append('question', question);
      formData.append('options', JSON.stringify(options));
      formData.append('allow_multiple', String(allowMultiple ?? false));
      formData.append('is_anonymous', String(isAnonymous ?? false));
      if (durationHours) {
        formData.append('duration_hours', String(durationHours));
      }

      const response = await api.post<{ message: CommunityMessage; poll_id: string; mqtt_published: boolean }>(
        `/api/mobile/communities/${communityId}/polls?${params.toString()}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },

    onSuccess: (data, { communityId, channelType, subgroupId }) => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'messages', communityId, channelType, subgroupId],
      });
    },
  });
}

/**
 * Vote on poll with optimistic updates
 */
export function useVotePoll() {
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      messageId,
      pollId,
      optionId,
      action = 'add',
    }: {
      messageId: string;
      pollId: string;
      optionId: string;
      action?: 'add' | 'remove';
    }) => {
      const params = new URLSearchParams();
      params.set('option_id', optionId);
      params.set('action', action);

      const response = await api.post<{ success: boolean; poll: CommunityPoll }>(
        `/api/mobile/polls/${messageId}/vote?${params.toString()}`
      );
      return response.data;
    },

    // Optimistic update - vote appears immediately
    onMutate: async ({ messageId, optionId, action }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['community', 'messages'] });

      // Snapshot all message queries
      const previousData = queryClient.getQueriesData({
        queryKey: ['community', 'messages'],
      });

      // Update cache optimistically
      updatePollVoteInCache(
        queryClient,
        messageId,
        optionId,
        member?.id || '',
        action || 'add'
      );

      return { previousData };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Refetch to sync with server on success (backup)
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['community', 'messages'],
        refetchType: 'none', // Don't refetch immediately, MQTT will update
      });
    },
  });
}

// ============================================================================
// Community Settings (for leaders)
// ============================================================================

import type { CommunitySettings } from '@/types/communities';

/**
 * Update community settings
 */
export function useUpdateCommunitySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      settings,
    }: {
      communityId: string;
      settings: Partial<CommunitySettings>;
    }) => {
      const response = await api.patch<{ success: boolean; settings: CommunitySettings }>(
        `/api/mobile/communities/${communityId}/settings`,
        settings
      );
      return response.data;
    },

    onSuccess: (data, { communityId }) => {
      // Invalidate community detail to refresh settings
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
    },
  });
}

/**
 * Update member's notification preference for a community
 */
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      enabled,
    }: {
      communityId: string;
      enabled: boolean;
    }) => {
      const response = await api.patch<{ success: boolean }>(
        `/api/mobile/communities/${communityId}/notifications`,
        { enabled }
      );
      return response.data;
    },

    onSuccess: (_, { communityId }) => {
      // Invalidate community detail to refresh settings
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_COMMUNITIES });
    },
  });
}

// ============================================================================
// Message Search
// ============================================================================

/**
 * Search messages in community with optimized caching
 */
export function useSearchMessages(
  communityId: string,
  query: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['community', 'search', communityId, query],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('query', query);
      params.set('limit', String(PAGINATION.SEARCH_PAGE_SIZE));

      const response = await api.get<{ messages: CommunityMessage[]; total: number }>(
        `/api/mobile/communities/${communityId}/messages/search?${params.toString()}`
      );
      return response.data.messages;
    },
    enabled: enabled && !!communityId && query.length >= 2,
    staleTime: CACHE_TIMES.SEARCH,
    gcTime: 1000 * 60 * 10, // Keep for 10 minutes
    placeholderData: (previousData) => previousData, // Show previous results while loading
  });
}

// ============================================================================
// Prefetching
// ============================================================================

/**
 * Prefetch community data for instant navigation
 * Call this when user hovers or is likely to tap on a community
 */
export function usePrefetchCommunity() {
  const queryClient = useQueryClient();

  return useCallback(
    (communityId: string, churchId?: string) => {
      // Prefetch community detail
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.COMMUNITY_DETAIL(communityId),
        queryFn: async () => {
          const response = await api.get<CommunityWithStatus>(
            API_ENDPOINTS.COMMUNITY_DETAIL(communityId)
          );
          return response.data;
        },
        staleTime: CACHE_TIMES.COMMUNITIES,
      });

      // Prefetch initial messages
      queryClient.prefetchInfiniteQuery({
        queryKey: ['community', 'messages', communityId, 'general', undefined],
        queryFn: async () => {
          const response = await api.get<MessageListResponse>(
            `/api/mobile/communities/${communityId}/messages?channel_type=general&limit=50`
          );
          return response.data;
        },
        initialPageParam: undefined,
        staleTime: CACHE_TIMES.COMMUNITY_MESSAGES,
      });

      // Prefetch subgroups
      queryClient.prefetchQuery({
        queryKey: ['community', 'subgroups', communityId],
        queryFn: async () => {
          const response = await api.get<{ subgroups: CommunitySubgroup[]; total: number }>(
            `/api/mobile/communities/${communityId}/subgroups`
          );
          return response.data.subgroups;
        },
        staleTime: CACHE_TIMES.SUBGROUPS,
      });
    },
    [queryClient]
  );
}

/**
 * Hook to prefetch next page of messages
 * Call this when user scrolls near the bottom
 */
export function usePrefetchNextMessages(
  communityId: string,
  channelType: string,
  oldestMessageId?: string
) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (!oldestMessageId) return;

    queryClient.prefetchInfiniteQuery({
      queryKey: ['community', 'messages', communityId, channelType, undefined],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('channel_type', channelType);
        params.set('limit', '50');
        if (pageParam) params.set('before', pageParam);

        const response = await api.get<MessageListResponse>(
          `/api/mobile/communities/${communityId}/messages?${params.toString()}`
        );
        return response.data;
      },
      initialPageParam: oldestMessageId,
      staleTime: CACHE_TIMES.COMMUNITY_MESSAGES,
    });
  }, [queryClient, communityId, channelType, oldestMessageId]);
}

import { useCallback } from 'react';

// ============================================================================
// Message Starring
// ============================================================================

/**
 * Star or unstar a message
 */
export function useStarMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      action,
    }: {
      messageId: string;
      action: 'add' | 'remove';
    }) => {
      const response = await api.post<{ success: boolean }>(
        `/api/mobile/messages/${messageId}/star?action=${action}`
      );
      return response.data;
    },

    onSuccess: () => {
      // Invalidate starred messages query
      queryClient.invalidateQueries({ queryKey: ['starred-messages'] });
    },
  });
}

/**
 * Get starred messages
 */
export function useStarredMessages(communityId?: string) {
  const { member } = useAuthStore();

  return useQuery({
    queryKey: ['starred-messages', communityId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (communityId) params.set('community_id', communityId);

      const response = await api.get<{ messages: CommunityMessage[]; total: number }>(
        `/api/mobile/starred-messages?${params.toString()}`
      );
      return response.data.messages;
    },
    enabled: !!member?.id,
    staleTime: CACHE_TIMES.COMMUNITY_MESSAGES,
  });
}

// ============================================================================
// Message Forwarding
// ============================================================================

/**
 * Forward a message to one or more communities
 */
export function useForwardMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      targetCommunityIds,
    }: {
      messageId: string;
      targetCommunityIds: string[];
    }) => {
      const params = new URLSearchParams();
      targetCommunityIds.forEach((id) => params.append('target_community_ids', id));

      const response = await api.post<{
        success: boolean;
        forwarded_count: number;
        messages: CommunityMessage[];
      }>(`/api/mobile/messages/${messageId}/forward?${params.toString()}`);
      return response.data;
    },

    onSuccess: (data) => {
      // Invalidate message queries for target communities
      queryClient.invalidateQueries({ queryKey: ['community', 'messages'] });
    },
  });
}

// ============================================================================
// Disappearing Messages
// ============================================================================

/**
 * Get disappearing messages setting for a community
 */
export function useDisappearingMessagesSetting(communityId: string) {
  const { member } = useAuthStore();

  return useQuery({
    queryKey: ['disappearing-messages', communityId],
    queryFn: async () => {
      const response = await api.get<{
        community_id: string;
        disappearing_messages: string;
        disappearing_messages_seconds: number | null;
      }>(`/api/mobile/communities/${communityId}/disappearing-messages`);
      return response.data;
    },
    enabled: !!member?.id && !!communityId,
    staleTime: CACHE_TIMES.COMMUNITIES,
  });
}

/**
 * Set disappearing messages setting for a community
 */
export function useSetDisappearingMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      communityId,
      duration,
    }: {
      communityId: string;
      duration: 'off' | '24h' | '7d' | '90d';
    }) => {
      const response = await api.patch<{
        success: boolean;
        community_id: string;
        disappearing_messages: string;
      }>(`/api/mobile/communities/${communityId}/disappearing-messages?duration=${duration}`);
      return response.data;
    },

    onSuccess: (data, { communityId }) => {
      // Invalidate setting query
      queryClient.invalidateQueries({ queryKey: ['disappearing-messages', communityId] });
    },
  });
}
