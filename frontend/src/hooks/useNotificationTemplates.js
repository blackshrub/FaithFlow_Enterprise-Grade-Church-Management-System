/**
 * React Query Hooks for Notification Templates
 *
 * Provides hooks for managing reusable notification templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import * as templatesApi from '../services/notificationTemplatesApi';

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
 * Fetch list of templates with filters
 * @param {Object} params - Query parameters
 */
export const useTemplates = (params = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['notification-templates', sessionChurchId, params],
    queryFn: async () => {
      const response = await templatesApi.getTemplates(params);
      return response.data;
    },
    enabled: !!sessionChurchId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Fetch a single template by ID
 * @param {string} id - Template ID
 */
export const useTemplate = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['notification-template', sessionChurchId, id],
    queryFn: async () => {
      const response = await templatesApi.getTemplate(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
};

/**
 * Fetch all categories
 */
export const useTemplateCategories = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['notification-template-categories', sessionChurchId],
    queryFn: async () => {
      const response = await templatesApi.getCategories();
      return response.data;
    },
    enabled: !!sessionChurchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch all tags
 */
export const useTemplateTags = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['notification-template-tags', sessionChurchId],
    queryFn: async () => {
      const response = await templatesApi.getTags();
      return response.data;
    },
    enabled: !!sessionChurchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch system variables
 */
export const useSystemVariables = () => {
  return useQuery({
    queryKey: ['notification-template-system-variables'],
    queryFn: async () => {
      const response = await templatesApi.getSystemVariables();
      return response.data;
    },
    staleTime: Infinity, // System variables don't change
  });
};

/**
 * Fetch template variables
 * @param {string} id - Template ID
 */
export const useTemplateVariables = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: ['notification-template-variables', sessionChurchId, id],
    queryFn: async () => {
      const response = await templatesApi.getTemplateVariables(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
};

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Create a new template
 */
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: templatesApi.createTemplate,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-template-categories', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-template-tags', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Template created successfully');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create template');
    },
  });
};

/**
 * Update a template
 */
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => templatesApi.updateTemplate(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-template', sessionChurchId, id],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-template-categories', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-template-tags', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update template');
    },
  });
};

/**
 * Delete a template
 */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete template');
    },
  });
};

/**
 * Duplicate a template
 */
export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: templatesApi.duplicateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Template duplicated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to duplicate template');
    },
  });
};

/**
 * Preview a template
 */
export const usePreviewTemplate = () => {
  return useMutation({
    mutationFn: ({ id, variables }) => templatesApi.previewTemplate(id, variables),
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to preview template');
    },
  });
};

/**
 * Create campaign from template
 */
export const useCreateCampaignFromTemplate = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => templatesApi.createCampaignFromTemplate(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcast-campaigns', sessionChurchId],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-templates', sessionChurchId],
        refetchType: 'active',
      });
      toast.success('Campaign created from template');
      return response.data;
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create campaign from template');
    },
  });
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const useNotificationTemplates = {
  useTemplates,
  useTemplate,
  useTemplateCategories,
  useTemplateTags,
  useSystemVariables,
  useTemplateVariables,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  usePreviewTemplate,
  useCreateCampaignFromTemplate,
};

export default useNotificationTemplates;
