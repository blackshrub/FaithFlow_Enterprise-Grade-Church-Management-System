import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webhooksAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const useWebhooks = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.webhooks.all(church?.id),
    queryFn: () => webhooksAPI.list().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useWebhook = (webhookId) => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.webhooks.detail(webhookId),
    queryFn: () => webhooksAPI.get(webhookId).then(res => res.data),
    enabled: !!church?.id && !!webhookId,
  });
};

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (webhookData) => webhooksAPI.create(webhookData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(church?.id) });
      toast.success('Webhook created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create webhook');
    },
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ id, data }) => webhooksAPI.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(church?.id) });
      toast.success('Webhook updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update webhook');
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (webhookId) => webhooksAPI.delete(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all(church?.id) });
      toast.success('Webhook deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete webhook');
    },
  });
};

export const useTestWebhook = () => {
  return useMutation({
    mutationFn: (webhookId) => webhooksAPI.test(webhookId).then(res => res.data),
    onSuccess: (data) => {
      // Don't show toast here - let component handle it with full details
    },
    onError: (error) => {
      // Don't show toast here - let component handle it with full details
    },
  });
};

export const useWebhookLogs = (webhookId) => {
  const { church } = useAuth();

  return useQuery({
    // Include church_id for multi-tenant cache isolation
    queryKey: ['webhook-logs', church?.id, webhookId],
    queryFn: () => webhooksAPI.getLogs(webhookId).then(res => res.data),
    enabled: !!church?.id && !!webhookId,
    staleTime: 30 * 1000, // 30 seconds - logs don't change frequently
  });
};

export const useQueueStatus = () => {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['webhook-queue-status', church?.id],
    queryFn: () => webhooksAPI.getQueueStatus().then(res => res.data),
    enabled: !!church?.id,
    // Adaptive polling - faster when processing, slower when idle
    refetchInterval: (query) => {
      const data = query.state.data;
      const isProcessing = data?.is_processing || (data?.pending_count > 0);
      return isProcessing ? 10000 : 60000; // 10s when active, 60s when idle
    },
    refetchIntervalInBackground: false, // Stop polling when tab not visible
    staleTime: 5000, // 5 seconds
  });
};
