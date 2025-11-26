/**
 * React Query Hooks for Communities
 *
 * Replaces useGroups.js - use these hooks for all community-related queries and mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as communitiesApi from '../services/communitiesApi';
import { toast } from 'sonner';

// =====================================================
// Community Queries
// =====================================================

export const useCommunities = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['communities', churchId, params],
    queryFn: async () => {
      const response = await communitiesApi.getCommunities(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useCommunity = (id) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['community', churchId, id],
    queryFn: async () => {
      const response = await communitiesApi.getCommunityById(id);
      return response.data;
    },
    enabled: !!churchId && !!id,
  });
};

// =====================================================
// Community Mutations
// =====================================================

export const useCreateCommunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: communitiesApi.createCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['communities', churchId],
        refetchType: 'active'
      });
      toast.success('Community created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create community');
    },
  });
};

export const useUpdateCommunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => communitiesApi.updateCommunity(id, data),
    onSuccess: (updatedCommunity, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        ['community', churchId, variables.id],
        updatedCommunity
      );

      queryClient.invalidateQueries({
        queryKey: ['communities', churchId],
        refetchType: 'active'
      });
      toast.success('Community updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update community');
    },
  });
};

export const useDeleteCommunity = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: communitiesApi.deleteCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['communities', churchId],
        refetchType: 'active'
      });
      toast.success('Community deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete community');
    },
  });
};

// =====================================================
// Community Members
// =====================================================

export const useCommunityMembers = (communityId, params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['community-members', churchId, communityId, params],
    queryFn: async () => {
      const response = await communitiesApi.getCommunityMembers(communityId, params);
      return response.data;
    },
    enabled: !!churchId && !!communityId,
  });
};

export const useAddCommunityMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ communityId, memberId, role = 'member' }) =>
      communitiesApi.addCommunityMember(communityId, memberId, role),
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-members', churchId, communityId],
        refetchType: 'active'
      });
      toast.success('Member added to community successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add member to community');
    },
  });
};

export const useRemoveCommunityMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ communityId, memberId }) =>
      communitiesApi.removeCommunityMember(communityId, memberId),
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-members', churchId, communityId],
        refetchType: 'active'
      });
      toast.success('Member removed from community successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove member from community');
    },
  });
};

export const useUpdateCommunityMemberRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ communityId, memberId, role }) =>
      communitiesApi.updateCommunityMemberRole(communityId, memberId, role),
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({
        queryKey: ['community-members', churchId, communityId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['community', churchId, communityId],
        refetchType: 'active'
      });
      toast.success('Member role updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update member role');
    },
  });
};

// =====================================================
// Join Requests
// =====================================================

export const useCommunityJoinRequests = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['community-join-requests', churchId, params],
    queryFn: async () => {
      const response = await communitiesApi.getJoinRequests(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useApproveCommunityJoinRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: communitiesApi.approveJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community-join-requests', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['communities', churchId],
        refetchType: 'active'
      });
      toast.success('Join request approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve join request');
    },
  });
};

export const useRejectCommunityJoinRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: communitiesApi.rejectJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community-join-requests', churchId],
        refetchType: 'active'
      });
      toast.success('Join request rejected successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reject join request');
    },
  });
};

// =====================================================
// Leave Requests
// =====================================================

export const useCommunityLeaveRequests = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['community-leave-requests', churchId, params],
    queryFn: async () => {
      const response = await communitiesApi.getLeaveRequests(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useApproveCommunityLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: communitiesApi.approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['community-leave-requests', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['communities', churchId],
        refetchType: 'active'
      });
      toast.success('Leave request approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve leave request');
    },
  });
};

// =====================================================
// Legacy Aliases (for backward compatibility)
// Use these when migrating from useGroups.js
// =====================================================
export const useGroups = useCommunities;
export const useGroup = useCommunity;
export const useCreateGroup = useCreateCommunity;
export const useUpdateGroup = useUpdateCommunity;
export const useDeleteGroup = useDeleteCommunity;
export const useGroupMembers = useCommunityMembers;
export const useAddGroupMember = useAddCommunityMember;
export const useRemoveGroupMember = useRemoveCommunityMember;
export const useJoinRequests = useCommunityJoinRequests;
export const useApproveJoinRequest = useApproveCommunityJoinRequest;
export const useRejectJoinRequest = useRejectCommunityJoinRequest;
export const useLeaveRequests = useCommunityLeaveRequests;
export const useApproveLeaveRequest = useApproveCommunityLeaveRequest;
