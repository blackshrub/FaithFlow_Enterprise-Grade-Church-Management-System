import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as groupsApi from '../services/groupsApi';

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
      queryClient.invalidateQueries(['groups', churchId]);
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => groupsApi.updateGroup(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['groups', churchId]);
      queryClient.invalidateQueries(['group', churchId, variables.id]);
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
      queryClient.invalidateQueries(['groups', churchId]);
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
      queryClient.invalidateQueries(['group-members', churchId, groupId]);
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
      queryClient.invalidateQueries(['group-members', churchId, groupId]);
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
      queryClient.invalidateQueries(['group-join-requests', churchId]);
      queryClient.invalidateQueries(['groups', churchId]);
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
      queryClient.invalidateQueries(['group-join-requests', churchId]);
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
      queryClient.invalidateQueries(['group-leave-requests', churchId]);
      queryClient.invalidateQueries(['groups', churchId]);
    },
  });
};
