/**
 * MQTT Hook for FaithFlow Mobile App
 *
 * Provides:
 * - Auto-connect on mount (when authenticated)
 * - Auto-disconnect on unmount
 * - Community subscription management
 * - React Query cache integration for real-time updates
 * - Typing indicator publishing
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppState, AppStateStatus } from 'react-native';

import { mqttService, MQTTPayload } from '@/services/mqtt';
import { useMQTTStore, TypingUser } from '@/stores/mqtt';
import { useAuthStore } from '@/stores/auth';
import type { CommunityMessage, CommunityWithStatus } from '@/types/communities';
import { QUERY_KEYS } from '@/constants/api';
import { logError } from '@/utils/errorHelpers';

// Stable empty array reference to prevent infinite re-renders
const EMPTY_TYPING_USERS: TypingUser[] = [];

// =============================================================================
// MAIN HOOK - useMQTT
// =============================================================================

/**
 * Main MQTT hook - manages connection lifecycle
 * Should be used once at app root level
 */
export function useMQTT() {
  const queryClient = useQueryClient();
  const { token, member } = useAuthStore();
  const { setConnected, setConnecting, setConnectionError, reset } = useMQTTStore();
  const appStateRef = useRef(AppState.currentState);

  // Connect to MQTT when authenticated
  useEffect(() => {
    if (!token || !member) {
      mqttService.disconnect();
      reset();
      return;
    }

    // In development, MQTT is DISABLED by default (no broker running locally)
    // Set EXPO_PUBLIC_ENABLE_MQTT=true to enable MQTT in development
    if (__DEV__) {
      const mqttEnabled = process.env.EXPO_PUBLIC_ENABLE_MQTT === 'true';
      if (!mqttEnabled) {
        // Silently skip MQTT in development - it's optional
        return;
      }
    }

    const connect = async () => {
      setConnecting(true);
      try {
        await mqttService.connect({
          churchId: member.church_id,
          memberId: member.id,
          memberName: member.full_name,
          token,
        });
      } catch (error) {
        // Log error but don't crash - MQTT is optional
        logError('MQTT', 'connect', error, 'warning');
        setConnectionError((error as Error).message);
      } finally {
        setConnecting(false);
      }
    };

    connect();

    // Listen for connection changes
    const unsubConnection = mqttService.onConnectionChange((connected) => {
      setConnected(connected);
    });

    // Listen for errors
    const unsubError = mqttService.onError((error) => {
      setConnectionError(error.message);
    });

    return () => {
      unsubConnection();
      unsubError();
      mqttService.disconnect();
      reset();
    };
  }, [token, member?.id]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - reconnect if needed
        if (!mqttService.isConnected() && token && member) {
          mqttService.connect({
            churchId: member.church_id,
            memberId: member.id,
            memberName: member.full_name,
            token,
          });
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [token, member]);

  // Listen for all messages and update React Query cache
  useEffect(() => {
    const unsubscribe = mqttService.onMessage('*', (topic, payload) => {
      handleGlobalMessage(queryClient, topic, payload, member?.id);
    });

    return unsubscribe;
  }, [queryClient, member?.id]);

  return {
    isConnected: useMQTTStore((s) => s.isConnected),
    isConnecting: useMQTTStore((s) => s.isConnecting),
    connectionError: useMQTTStore((s) => s.connectionError),
  };
}

// =============================================================================
// COMMUNITY SUBSCRIPTION HOOK
// =============================================================================

/**
 * Subscribe to a specific community's messages
 * Use in community chat screen
 */
export function useCommunitySubscription(
  communityId: string,
  channelType: 'general' | 'announcement' | 'subgroup' = 'general',
  subgroupId?: string
) {
  const queryClient = useQueryClient();
  const { member } = useAuthStore();
  const {
    addTypingUser,
    removeTypingUser,
    setMemberOnline,
    setMemberOffline,
    clearUnread,
  } = useMQTTStore();

  // Subscribe to community on mount
  useEffect(() => {
    if (!member || !communityId) return;

    mqttService.subscribeToCommunity(
      member.church_id,
      communityId,
      channelType,
      subgroupId
    );

    // Build topic for callbacks
    let topic = `faithflow/${member.church_id}/community/${communityId}/${channelType}`;
    if (channelType === 'subgroup' && subgroupId) {
      topic = `faithflow/${member.church_id}/community/${communityId}/subgroup/${subgroupId}`;
    }

    // Handle messages for this specific community
    const unsubscribe = mqttService.onMessage(topic, (_, payload) => {
      handleCommunityMessage(
        queryClient,
        communityId,
        channelType,
        subgroupId,
        payload,
        member.id,
        { addTypingUser, removeTypingUser, setMemberOnline, setMemberOffline }
      );
    });

    // Clear unread when viewing
    clearUnread(communityId);

    return () => {
      unsubscribe();
      mqttService.unsubscribeFromCommunity(
        member.church_id,
        communityId,
        channelType,
        subgroupId
      );
    };
  }, [communityId, channelType, subgroupId, member?.id, member?.church_id]);

  // Typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!member) return;
      mqttService.publishTyping(
        member.church_id,
        communityId,
        isTyping,
        channelType,
        subgroupId
      );
    },
    [member?.church_id, communityId, channelType, subgroupId]
  );

  // Get typing users with stable reference (prevents infinite loop)
  const typingUsers = useMQTTStore(
    useCallback((s) => s.typingUsers[communityId] ?? EMPTY_TYPING_USERS, [communityId])
  );

  return {
    sendTyping,
    typingUsers,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Handle messages from any topic (for updating community list)
 */
function handleGlobalMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  topic: string,
  payload: MQTTPayload,
  currentMemberId?: string
) {
  // Extract community ID from topic
  // Topic format: faithflow/{church_id}/community/{community_id}/{channel}
  const topicParts = topic.split('/');
  if (topicParts.length < 5 || topicParts[2] !== 'community') {
    return;
  }

  const churchId = topicParts[1];
  const communityId = topicParts[3];

  // Handle new messages - update community list
  if (payload.type === 'new_message') {
    const message = payload.data as CommunityMessage;

    // Update my communities list with new last message
    queryClient.setQueryData<CommunityWithStatus[]>(
      QUERY_KEYS.MY_COMMUNITIES(churchId),
      (oldData) => {
        if (!oldData) return oldData;

        return oldData.map((community: CommunityWithStatus) => {
          if (community.id !== communityId) return community;

          // Update last message and increment unread (if not from self)
          const isOwnMessage = message.sender?.id === currentMemberId;

          return {
            ...community,
            last_message: {
              id: message.id,
              text_preview: message.text?.substring(0, 50) || '',
              message_type: message.message_type,
              sender_name: message.sender?.name || 'Unknown',
              created_at: message.created_at,
            },
            unread_count: isOwnMessage
              ? community.unread_count
              : (community.unread_count || 0) + 1,
          };
        });
      }
    );

    // Update MQTT store unread count (if not own message)
    if (payload.data?.sender?.id !== currentMemberId) {
      useMQTTStore.getState().incrementUnread(communityId);
    }
  }
}

/**
 * Handle messages for a specific community chat
 */
function handleCommunityMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  communityId: string,
  channelType: string,
  subgroupId: string | undefined,
  payload: MQTTPayload,
  currentMemberId: string,
  actions: {
    addTypingUser: (communityId: string, memberId: string, memberName: string) => void;
    removeTypingUser: (communityId: string, memberId: string) => void;
    setMemberOnline: (communityId: string, memberId: string, memberName: string) => void;
    setMemberOffline: (communityId: string, memberId: string) => void;
  }
) {
  const queryKey = ['community', 'messages', communityId, channelType, subgroupId];

  switch (payload.type) {
    case 'new_message': {
      const message = payload.data as CommunityMessage;
      // Skip if own message (already added optimistically)
      if (message.sender?.id === currentMemberId) return;

      // Add to message list
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages?.[0]) return oldData;

        // Check if message already exists
        const exists = oldData.pages.some((page: any) =>
          page.messages.some((m: CommunityMessage) => m.id === message.id)
        );
        if (exists) return oldData;

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

      // Remove typing indicator for sender
      if (message.sender?.id) {
        actions.removeTypingUser(communityId, message.sender.id);
      }
      break;
    }

    case 'edit_message': {
      const { message_id, text, edited_at } = payload.data;

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: CommunityMessage) =>
              m.id === message_id ? { ...m, text, is_edited: true, edited_at } : m
            ),
          })),
        };
      });
      break;
    }

    case 'delete_message': {
      const { message_id, for_everyone } = payload.data;

      if (for_everyone) {
        queryClient.setQueryData(queryKey, (oldData: any) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages: page.messages.map((m: CommunityMessage) =>
                m.id === message_id ? { ...m, is_deleted: true, text: null } : m
              ),
            })),
          };
        });
      }
      break;
    }

    case 'typing': {
      const { member_id, member_name, is_typing } = payload.data;
      if (member_id === currentMemberId) return;

      if (is_typing) {
        actions.addTypingUser(communityId, member_id, member_name);
      } else {
        actions.removeTypingUser(communityId, member_id);
      }
      break;
    }

    case 'read_receipt': {
      const { message_id, member_id, read_at } = payload.data;

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: CommunityMessage) => {
              if (m.id !== message_id) return m;

              // Add read receipt if not already exists
              const readBy = m.read_by || [];
              if (readBy.some((r) => r.member_id === member_id)) return m;

              return {
                ...m,
                read_by: [...readBy, { member_id, read_at }],
              };
            }),
          })),
        };
      });
      break;
    }

    case 'reaction': {
      const { message_id, emoji, member_id, action } = payload.data;

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: CommunityMessage) => {
              if (m.id !== message_id) return m;

              const reactions = { ...m.reactions };
              const memberIds = reactions[emoji] || [];

              if (action === 'add' && !memberIds.includes(member_id)) {
                reactions[emoji] = [...memberIds, member_id];
              } else if (action === 'remove') {
                reactions[emoji] = memberIds.filter((id) => id !== member_id);
                if (reactions[emoji].length === 0) {
                  delete reactions[emoji];
                }
              }

              return { ...m, reactions };
            }),
          })),
        };
      });
      break;
    }

    case 'presence': {
      const { member_id, member_name, status } = payload.data;

      if (status === 'online') {
        actions.setMemberOnline(communityId, member_id, member_name);
      } else {
        actions.setMemberOffline(communityId, member_id);
      }
      break;
    }
  }
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Get MQTT connection status
 */
export function useMQTTStatus() {
  return {
    isConnected: useMQTTStore((s) => s.isConnected),
    isConnecting: useMQTTStore((s) => s.isConnecting),
    connectionError: useMQTTStore((s) => s.connectionError),
  };
}

/**
 * Get typing indicator text for a community
 * Uses stable reference and useMemo to prevent infinite loops
 */
export function useTypingIndicator(communityId: string): string | null {
  // Use stable empty array reference
  const typingUsers = useMQTTStore(
    useCallback((s) => s.typingUsers[communityId] ?? EMPTY_TYPING_USERS, [communityId])
  );

  // Memoize the text computation
  return useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) {
      return `${typingUsers[0].memberName} is typing...`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].memberName} and ${typingUsers[1].memberName} are typing...`;
    }
    return `${typingUsers.length} people are typing...`;
  }, [typingUsers]);
}

export default useMQTT;
