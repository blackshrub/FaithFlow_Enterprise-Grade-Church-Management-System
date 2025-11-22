import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as groupsApi from '../services/groupsApi';
import { toast } from 'sonner';

export const useGroups = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['groups', churchId, params],
    queryFn: async () => {
      const response = await groupsApi.getGroups(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useGroup = (id) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['group', churchId, id],
    queryFn: async () => {
      const response = await groupsApi.getGroupById(id);
      return response.data;
    },
    enabled: !!churchId && !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['groups', churchId],
        refetchType: 'active'
      });
      toast.success('Group created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create group');
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => groupsApi.updateGroup(id, data),
    onSuccess: (updatedGroup, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        ['group', churchId, variables.id],
        updatedGroup
      );

      queryClient.invalidateQueries({
        queryKey: ['groups', churchId],
        refetchType: 'active'
      });
      toast.success('Group updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update group');
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: groupsApi.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['groups', churchId],
        refetchType: 'active'
      });
      toast.success('Group deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete group');
    },
  });
};

export const useGroupMembers = (groupId, params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['group-members', churchId, groupId, params],
    queryFn: async () => {
      const response = await groupsApi.getGroupMembers(groupId, params);
      return response.data;
    },
    enabled: !!churchId && !!groupId,
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ groupId, memberId }) =>
      groupsApi.addGroupMember(groupId, memberId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ['group-members', churchId, groupId],
        refetchType: 'active'
      });
      toast.success('Member added to group successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add member to group');
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ groupId, memberId }) =>
      groupsApi.removeGroupMember(groupId, memberId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ['group-members', churchId, groupId],
        refetchType: 'active'
      });
      toast.success('Member removed from group successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove member from group');
    },
  });
};

export const useJoinRequests = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['group-join-requests', churchId, params],
    queryFn: async () => {
      const response = await groupsApi.getJoinRequests(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: groupsApi.approveJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-join-requests', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', churchId],
        refetchType: 'active'
      });
      toast.success('Join request approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve join request');
    },
  });
};

export const useRejectJoinRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: groupsApi.rejectJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-join-requests', churchId],
        refetchType: 'active'
      });
      toast.success('Join request rejected successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reject join request');
    },
  });
};

export const useLeaveRequests = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['group-leave-requests', churchId, params],
    queryFn: async () => {
      const response = await groupsApi.getLeaveRequests(params);
      return response.data;
    },
    enabled: !!churchId,
  });
};

export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: groupsApi.approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-leave-requests', churchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', churchId],
        refetchType: 'active'
      });
      toast.success('Leave request approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve leave request');
    },
  });
};
