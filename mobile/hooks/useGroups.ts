/**
 * Groups API Hooks
 *
 * React Query hooks for groups operations:
 * - Fetch groups (all, my groups)
 * - Join/leave groups with optimistic updates
 * - Group members
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type {
  GroupWithStatus,
  GroupMember,
  JoinGroupResponse,
  LeaveGroupResponse,
} from '@/types/groups';

/**
 * Fetch all groups
 */
export function useGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.GROUPS,
    queryFn: async () => {
      const response = await api.get<GroupWithStatus[]>('/api/groups');
      return response.data;
    },
    staleTime: CACHE_TIMES.GROUPS,
    gcTime: CACHE_TIMES.GROUPS,
  });
}

/**
 * Fetch my groups
 */
export function useMyGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_GROUPS,
    queryFn: async () => {
      const response = await api.get<GroupWithStatus[]>('/api/groups/my-groups');
      return response.data;
    },
    staleTime: CACHE_TIMES.GROUPS,
    gcTime: CACHE_TIMES.GROUPS,
  });
}

/**
 * Fetch single group
 */
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GROUP_DETAIL, groupId],
    queryFn: async () => {
      const response = await api.get<GroupWithStatus>(`/api/groups/${groupId}`);
      return response.data;
    },
    enabled: !!groupId,
    staleTime: CACHE_TIMES.GROUPS,
  });
}

/**
 * Fetch group members
 */
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GROUP_MEMBERS, groupId],
    queryFn: async () => {
      const response = await api.get<GroupMember[]>(`/api/groups/${groupId}/members`);
      return response.data;
    },
    enabled: !!groupId,
    staleTime: CACHE_TIMES.GROUPS,
  });
}

/**
 * Join group with optimistic updates
 */
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, message }: { groupId: string; message?: string }) => {
      const response = await api.post<JoinGroupResponse>(`/api/groups/${groupId}/join`, {
        message,
      });
      return { groupId, ...response.data };
    },

    // Optimistic update
    onMutate: async ({ groupId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.GROUPS });

      const previousGroups = queryClient.getQueryData(QUERY_KEYS.GROUPS);

      // Optimistically update groups list
      queryClient.setQueryData<GroupWithStatus[]>(QUERY_KEYS.GROUPS, (old) => {
        if (!old) return old;
        return old.map((group) =>
          group._id === groupId
            ? {
                ...group,
                is_member: true,
                join_request_status: 'pending' as const,
                member_count: group.member_count + 1,
              }
            : group
        );
      });

      return { previousGroups };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(QUERY_KEYS.GROUPS, context.previousGroups);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_GROUPS });
    },
  });
}

/**
 * Leave group with optimistic updates
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.post<LeaveGroupResponse>(`/api/groups/${groupId}/leave`);
      return { groupId, ...response.data };
    },

    // Optimistic update
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.GROUPS });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.MY_GROUPS });

      const previousGroups = queryClient.getQueryData(QUERY_KEYS.GROUPS);
      const previousMyGroups = queryClient.getQueryData(QUERY_KEYS.MY_GROUPS);

      // Optimistically update groups list
      queryClient.setQueryData<GroupWithStatus[]>(QUERY_KEYS.GROUPS, (old) => {
        if (!old) return old;
        return old.map((group) =>
          group._id === groupId
            ? {
                ...group,
                is_member: false,
                member_role: undefined,
                join_request_status: undefined,
                member_count: Math.max(0, group.member_count - 1),
              }
            : group
        );
      });

      // Remove from my groups
      queryClient.setQueryData<GroupWithStatus[]>(QUERY_KEYS.MY_GROUPS, (old) => {
        if (!old) return old;
        return old.filter((group) => group._id !== groupId);
      });

      return { previousGroups, previousMyGroups };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(QUERY_KEYS.GROUPS, context.previousGroups);
      }
      if (context?.previousMyGroups) {
        queryClient.setQueryData(QUERY_KEYS.MY_GROUPS, context.previousMyGroups);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_GROUPS });
    },
  });
}
