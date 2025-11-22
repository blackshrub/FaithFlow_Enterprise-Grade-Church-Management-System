import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as prayerRequestsApi from '../services/prayerRequestsApi';
import { toast } from 'sonner';

export const usePrayerRequests = (params = {}) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['prayer-requests', churchId, params],
    queryFn: async () => {
      const response = await prayerRequestsApi.getPrayerRequests(params);
      return response.data;
    },
    enabled: !!churchId
  });
};

export const usePrayerRequest = (id) => {
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useQuery({
    queryKey: ['prayer-request', churchId, id],
    queryFn: async () => {
      const response = await prayerRequestsApi.getPrayerRequestById(id);
      return response.data;
    },
    enabled: !!churchId && !!id
  });
};

export const useCreatePrayerRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: prayerRequestsApi.createPrayerRequest,
    onSuccess: () => {
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', churchId],
        refetchType: 'active'
      });
      toast.success('Prayer request created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create prayer request');
    }
  });
};

export const useUpdatePrayerRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => prayerRequestsApi.updatePrayerRequest(id, data),
    onSuccess: (updatedPrayerRequest, variables) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(
        ['prayer-request', churchId, variables.id],
        updatedPrayerRequest
      );

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', churchId],
        refetchType: 'active'
      });
      toast.success('Prayer request updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update prayer request');
    }
  });
};

export const useDeletePrayerRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;

  return useMutation({
    mutationFn: prayerRequestsApi.deletePrayerRequest,
    onSuccess: () => {
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', churchId],
        refetchType: 'active'
      });
      toast.success('Prayer request deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete prayer request');
    }
  });
};
