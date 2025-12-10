/**
 * React Query Hooks for Broadcast Campaigns
 *
 * Provides hooks for managing push notification broadcast campaigns.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import * as broadcastsApi from '../services/broadcastsApi';

// =============================================================================
// HELPER
// =============================================================================

const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch list of campaigns with filters
 * @param {Object} params - Query parameters
 */
export const useCampaigns = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['broadcast-campaigns', sessionChurchId, params],
    queryFn: async () => {
      const response = await broadcastsApi.getCampaigns(params);
      return response.data;
    },
    enabled: !!sessionChurchId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetch a single campaign by ID
 * @param {string} id - Campaign ID
 */
export const useCampaign = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['broadcast-campaign', sessionChurchId, id],
    queryFn: async () => {
      const response = await broadcastsApi.getCampaign(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
};

/**
 * Fetch analytics summary
 * @param {number} days - Number of days to analyze
 */
export const useBroadcastAnalytics = (days = 30) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['broadcast-analytics', sessionChurchId, days],
    queryFn: async () => {
      const response = await broadcastsApi.getAnalyticsSummary(days);
      return response.data;
    },
    enabled: !!sessionChurchId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Fetch analytics for a specific campaign
 * @param {string} id - Campaign ID
 */
export const useCampaignAnalytics = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['broadcast-campaign-analytics', sessionChurchId, id],
    queryFn: async () => {
      const response = await broadcastsApi.getCampaignAnalytics(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
};

/**
 * Fetch available timezones for scheduling
 */
export const useTimezones = () => {
  return useQuery({
    queryKey: ['broadcast-timezones'],
    queryFn: async () => {
      const response = await broadcastsApi.getTimezones();
      return response.data;
    },
    staleTime: Infinity, // Timezones don't change often
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new campaign
 */
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.createCampaign,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Campaign created successfully');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    },
  });
};

/**
 * Update a campaign
 */
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => broadcastsApi.updateCampaign(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaign', sessionChurchId, id],
        refetchType: 'active',
      });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update campaign');
    },
  });
};

/**
 * Delete a campaign
 */
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    },
  });
};

/**
 * Send a campaign immediately
 */
export const useSendCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.sendCampaign,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcast-analytics', sessionChurchId],
        refetchType: 'active',
      });
      toast.success(response.data?.message || 'Campaign sent successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send campaign');
    },
  });
};

/**
 * Cancel a scheduled campaign
 */
export const useCancelCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.cancelCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Campaign cancelled successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to cancel campaign');
    },
  });
};

/**
 * Duplicate a campaign
 */
export const useDuplicateCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.duplicateCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Campaign duplicated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to duplicate campaign');
    },
  });
};

/**
 * Send test notification
 */
export const useTestSendCampaign = () => {
  return useMutation({
    mutationFn: broadcastsApi.testSendCampaign,
    onSuccess: () => {
      toast.success('Test notification sent to your device');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send test notification');
    },
  });
};

/**
 * Upload campaign image
 */
export const useUploadCampaignImage = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, file }) => broadcastsApi.uploadCampaignImage(id, file),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaign', sessionChurchId, id],
        refetchType: 'active',
      });
      toast.success('Image uploaded successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    },
  });
};

/**
 * Delete campaign image
 */
export const useDeleteCampaignImage = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.deleteCampaignImage,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaign', sessionChurchId, id],
        refetchType: 'active',
      });
      toast.success('Image removed successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to remove image');
    },
  });
};

/**
 * Estimate audience size
 */
export const useEstimateAudience = () => {
  return useMutation({
    mutationFn: broadcastsApi.estimateAudience,
  });
};

/**
 * Retry failed notifications for a campaign
 */
export const useRetryCampaign = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.retryCampaign,
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaign-analytics', sessionChurchId, id],
        refetchType: 'active',
      });
      const { retried, successful } = response.data;
      toast.success(`Retry complete: ${successful}/${retried} succeeded`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to retry campaign');
    },
  });
};

/**
 * Bulk delete draft campaigns
 */
export const useBulkDeleteCampaigns = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.bulkDeleteCampaigns,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success(response.data?.message || 'Campaigns deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete campaigns');
    },
  });
};

/**
 * Bulk archive sent/cancelled campaigns
 */
export const useBulkArchiveCampaigns = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: broadcastsApi.bulkArchiveCampaigns,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      toast.success(response.data?.message || 'Campaigns archived');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to archive campaigns');
    },
  });
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const useBroadcasts = {
  useCampaigns,
  useCampaign,
  useBroadcastAnalytics,
  useCampaignAnalytics,
  useTimezones,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSendCampaign,
  useCancelCampaign,
  useDuplicateCampaign,
  useTestSendCampaign,
  useUploadCampaignImage,
  useDeleteCampaignImage,
  useEstimateAudience,
  useRetryCampaign,
  useBulkDeleteCampaigns,
  useBulkArchiveCampaigns,
};

export default useBroadcasts;
