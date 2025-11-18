import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import * as prayerRequestsApi from '../services/prayerRequestsApi';

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
      queryClient.invalidateQueries(['prayer-requests', churchId]);
    }
  });
};

export const useUpdatePrayerRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const churchId = user?.church_id;
  
  return useMutation({
    mutationFn: ({ id, data }) => prayerRequestsApi.updatePrayerRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['prayer-requests', churchId]);
      queryClient.invalidateQueries(['prayer-request', churchId, variables.id]);
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
      queryClient.invalidateQueries(['prayer-requests', churchId]);
    }
  });
};
