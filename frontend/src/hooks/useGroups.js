import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as groupsApi from '../services/groupsApi';
import { toast } from 'sonner';

// Multi-tenant cache isolation helper
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

export const useGroups = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['groups', sessionChurchId, params],
    queryFn: async () => {
      const response = await groupsApi.getGroups(params);
      return response.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useGroup = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['group', sessionChurchId, id],
    queryFn: async () => {
      const response = await groupsApi.getGroupById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['groups', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => groupsApi.updateGroup(id, data),
    onSuccess: (updatedGroup, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        ['group', sessionChurchId, variables.id],
        updatedGroup
      );

      queryClient.invalidateQueries({
        queryKey: ['groups', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: groupsApi.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['groups', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['group-members', sessionChurchId, groupId, params],
    queryFn: async () => {
      const response = await groupsApi.getGroupMembers(groupId, params);
      return response.data;
    },
    enabled: !!sessionChurchId && !!groupId,
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ groupId, memberId }) =>
      groupsApi.addGroupMember(groupId, memberId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ['group-members', sessionChurchId, groupId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ groupId, memberId }) =>
      groupsApi.removeGroupMember(groupId, memberId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({
        queryKey: ['group-members', sessionChurchId, groupId],
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
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['group-join-requests', sessionChurchId, params],
    queryFn: async () => {
      const response = await groupsApi.getJoinRequests(params);
      return response.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useApproveJoinRequest = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: groupsApi.approveJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-join-requests', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: groupsApi.rejectJoinRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-join-requests', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['group-leave-requests', sessionChurchId, params],
    queryFn: async () => {
      const response = await groupsApi.getLeaveRequests(params);
      return response.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: groupsApi.approveLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group-leave-requests', sessionChurchId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Leave request approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to approve leave request');
    },
  });
};
