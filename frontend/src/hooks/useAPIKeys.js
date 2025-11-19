import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeysAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const useAPIKeys = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.apiKeys.all(church?.id),
    queryFn: () => apiKeysAPI.list().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useCreateAPIKey = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (data) => apiKeysAPI.create(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all(church?.id) });
      // Don't show toast here - parent will show the key
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create API key');
    },
  });
};

export const useUpdateAPIKey = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiKeysAPI.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all(church?.id) });
      toast.success('API key updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update API key');
    },
  });
};

export const useDeleteAPIKey = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (id) => apiKeysAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all(church?.id) });
      toast.success('API key deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete API key');
    },
  });
};

export const useRegenerateAPIKey = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (id) => apiKeysAPI.regenerate(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all(church?.id) });
      // Don't show toast here - parent will show the new key
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to regenerate API key');
    },
  });
};
