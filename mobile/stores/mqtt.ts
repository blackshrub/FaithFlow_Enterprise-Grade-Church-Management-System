/**
 * MQTT Store - Zustand state management for MQTT connection
 *
 * Manages:
 * - Connection state
 * - Typing indicators per community
 * - Online members per community
 * - Unread counts
 */

import { create } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export interface TypingUser {
  memberId: string;
  memberName: string;
  timestamp: number;
}

export interface OnlineMember {
  memberId: string;
  memberName: string;
  lastSeen: number;
}

interface MQTTState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Typing indicators: communityId -> Set of typing users
  typingUsers: Record<string, TypingUser[]>;

  // Online members: communityId -> Set of online members
  onlineMembers: Record<string, OnlineMember[]>;

  // Unread counts: communityId -> count
  unreadCounts: Record<string, number>;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Typing
  addTypingUser: (communityId: string, memberId: string, memberName: string) => void;
  removeTypingUser: (communityId: string, memberId: string) => void;
  clearTypingUsers: (communityId: string) => void;

  // Online members
  setMemberOnline: (communityId: string, memberId: string, memberName: string) => void;
  setMemberOffline: (communityId: string, memberId: string) => void;
  clearOnlineMembers: (communityId: string) => void;

  // Unread counts
  incrementUnread: (communityId: string) => void;
  clearUnread: (communityId: string) => void;
  setUnreadCount: (communityId: string, count: number) => void;

  // Reset
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Typing indicator timeout (5 seconds)
const TYPING_TIMEOUT = 5000;

// Online member timeout (2 minutes)
const ONLINE_TIMEOUT = 120000;

// =============================================================================
// STORE
// =============================================================================

export const useMQTTStore = create<MQTTState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  typingUsers: {},
  onlineMembers: {},
  unreadCounts: {},

  // Connection actions
  setConnected: (connected) => set({ isConnected: connected, connectionError: null }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnectionError: (error) => set({ connectionError: error, isConnected: false }),

  // Typing actions
  addTypingUser: (communityId, memberId, memberName) => {
    set((state) => {
      const existing = state.typingUsers[communityId] || [];
      // Remove if already exists (to update timestamp)
      const filtered = existing.filter((u) => u.memberId !== memberId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [communityId]: [
            ...filtered,
            { memberId, memberName, timestamp: Date.now() },
          ],
        },
      };
    });

    // Auto-remove after timeout
    setTimeout(() => {
      get().removeTypingUser(communityId, memberId);
    }, TYPING_TIMEOUT);
  },

  removeTypingUser: (communityId, memberId) => {
    set((state) => {
      const existing = state.typingUsers[communityId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [communityId]: existing.filter((u) => u.memberId !== memberId),
        },
      };
    });
  },

  clearTypingUsers: (communityId) => {
    set((state) => {
      const { [communityId]: _, ...rest } = state.typingUsers;
      return { typingUsers: rest };
    });
  },

  // Online members actions
  setMemberOnline: (communityId, memberId, memberName) => {
    set((state) => {
      const existing = state.onlineMembers[communityId] || [];
      const filtered = existing.filter((m) => m.memberId !== memberId);
      return {
        onlineMembers: {
          ...state.onlineMembers,
          [communityId]: [
            ...filtered,
            { memberId, memberName, lastSeen: Date.now() },
          ],
        },
      };
    });

    // Auto-remove after timeout (if no heartbeat)
    setTimeout(() => {
      const state = get();
      const members = state.onlineMembers[communityId] || [];
      const member = members.find((m) => m.memberId === memberId);
      if (member && Date.now() - member.lastSeen >= ONLINE_TIMEOUT) {
        get().setMemberOffline(communityId, memberId);
      }
    }, ONLINE_TIMEOUT + 1000);
  },

  setMemberOffline: (communityId, memberId) => {
    set((state) => {
      const existing = state.onlineMembers[communityId] || [];
      return {
        onlineMembers: {
          ...state.onlineMembers,
          [communityId]: existing.filter((m) => m.memberId !== memberId),
        },
      };
    });
  },

  clearOnlineMembers: (communityId) => {
    set((state) => {
      const { [communityId]: _, ...rest } = state.onlineMembers;
      return { onlineMembers: rest };
    });
  },

  // Unread count actions
  incrementUnread: (communityId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [communityId]: (state.unreadCounts[communityId] || 0) + 1,
      },
    }));
  },

  clearUnread: (communityId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [communityId]: 0,
      },
    }));
  },

  setUnreadCount: (communityId, count) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [communityId]: count,
      },
    }));
  },

  // Reset all state
  reset: () => {
    set({
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      typingUsers: {},
      onlineMembers: {},
      unreadCounts: {},
    });
  },
}));

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Get typing users for a community (filters out stale entries)
 */
export const useTypingUsers = (communityId: string) => {
  return useMQTTStore((state) => {
    const users = state.typingUsers[communityId] || [];
    const now = Date.now();
    return users.filter((u) => now - u.timestamp < TYPING_TIMEOUT);
  });
};

/**
 * Get online members count for a community
 */
export const useOnlineMembersCount = (communityId: string) => {
  return useMQTTStore((state) => {
    const members = state.onlineMembers[communityId] || [];
    const now = Date.now();
    return members.filter((m) => now - m.lastSeen < ONLINE_TIMEOUT).length;
  });
};

/**
 * Get unread count for a community
 */
export const useUnreadCount = (communityId: string) => {
  return useMQTTStore((state) => state.unreadCounts[communityId] || 0);
};

/**
 * Get total unread count across all communities
 */
export const useTotalUnreadCount = () => {
  return useMQTTStore((state) =>
    Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0)
  );
};

export default useMQTTStore;
