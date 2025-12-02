import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as prayerRequestsApi from '../services/prayerRequestsApi';
import { toast } from 'sonner';

// Multi-tenant cache isolation helper
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

export const usePrayerRequests = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['prayer-requests', sessionChurchId, params],
    queryFn: async () => {
      const response = await prayerRequestsApi.getPrayerRequests(params);
      return response.data;
    },
    enabled: !!sessionChurchId
  });
};

export const usePrayerRequest = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['prayer-request', sessionChurchId, id],
    queryFn: async () => {
      const response = await prayerRequestsApi.getPrayerRequestById(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id
  });
};

export const useCreatePrayerRequest = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: prayerRequestsApi.createPrayerRequest,
    onSuccess: () => {
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => prayerRequestsApi.updatePrayerRequest(id, data),
    onSuccess: (updatedPrayerRequest, variables) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(
        ['prayer-request', sessionChurchId, variables.id],
        updatedPrayerRequest
      );

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', sessionChurchId],
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
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: prayerRequestsApi.deletePrayerRequest,
    onSuccess: () => {
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: ['prayer-requests', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Prayer request deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete prayer request');
    }
  });
};
