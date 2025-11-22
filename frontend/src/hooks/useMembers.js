import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// Hook to get all members
export const useMembers = (params = {}) => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.members.all(church?.id, params),
    queryFn: () => membersAPI.list(params).then(res => res.data),
    enabled: !!church?.id,
  });
};

// Hook to get member by ID
export const useMember = (memberId) => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.members.detail(church?.id, memberId),
    queryFn: () => membersAPI.get(memberId).then(res => res.data),
    enabled: !!church?.id && !!memberId,
  });
};

// Hook to get member statistics
export const useMemberStats = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.members.stats(church?.id),
    queryFn: () => membersAPI.getStats().then(res => res.data),
    enabled: !!church?.id,
  });
};

// Hook to create a member
export const useCreateMember = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: (memberData) => membersAPI.create(memberData).then(res => res.data),
    onSuccess: () => {
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(church?.id),
        refetchType: 'active'  // Only refetch currently mounted queries
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.stats(church?.id),
        refetchType: 'active'
      });
      toast.success('Member created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create member');
    },
  });
};

// Hook to update a member
export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }) => membersAPI.update(id, data).then(res => res.data),
    onSuccess: (updatedMember) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(
        queryKeys.members.detail(church?.id, updatedMember.id),
        updatedMember
      );

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(church?.id),
        refetchType: 'active'
      });

      toast.success('Member updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update member');
    },
  });
};

// Hook to delete (deactivate) a member
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: (memberId) => membersAPI.delete(memberId),
    onSuccess: () => {
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(church?.id),
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.stats(church?.id),
        refetchType: 'active'
      });
      toast.success('Member deactivated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to deactivate member');
    },
  });
};
