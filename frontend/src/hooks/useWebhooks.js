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
      if (data.success) {
        toast.success('Test webhook sent successfully');
      } else {
        toast.error(data.message || 'Test webhook failed');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send test webhook');
    },
  });
};

export const useWebhookLogs = (webhookId) => {
  return useQuery({
    queryKey: ['webhook-logs', webhookId],
    queryFn: () => webhooksAPI.getLogs(webhookId).then(res => res.data),
    enabled: !!webhookId,
  });
};

export const useQueueStatus = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: ['webhook-queue-status', church?.id],
    queryFn: () => webhooksAPI.getQueueStatus().then(res => res.data),
    enabled: !!church?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
