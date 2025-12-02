import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ============= Member Statuses Hooks =============

export const useMemberStatuses = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.settings.memberStatuses(church?.id),
    queryFn: () => settingsAPI.listMemberStatuses().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useCreateMemberStatus = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (statusData) => settingsAPI.createMemberStatus(statusData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.memberStatuses(church?.id) 
      });
      toast.success('Member status created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create member status');
    },
  });
};

export const useUpdateMemberStatus = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ id, data }) => settingsAPI.updateMemberStatus(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.memberStatuses(church?.id) 
      });
      toast.success('Member status updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update member status');
    },
  });
};

export const useDeleteMemberStatus = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: (statusId) => settingsAPI.deleteMemberStatus(statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.memberStatuses(church?.id)
      });
      toast.success('Member status deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete member status');
    },
  });
};

export const useReorderMemberStatuses = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: (statusIds) => settingsAPI.reorderMemberStatuses(statusIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.memberStatuses(church?.id)
      });
      toast.success('Status order updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to reorder statuses');
    },
  });
};

// ============= Demographics Hooks =============

export const useDemographics = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.settings.demographics(church?.id),
    queryFn: () => settingsAPI.listDemographics().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useCreateDemographic = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (demographicData) => settingsAPI.createDemographic(demographicData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.demographics(church?.id) 
      });
      toast.success('Demographic preset created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create demographic preset');
    },
  });
};

export const useUpdateDemographic = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ id, data }) => settingsAPI.updateDemographic(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.demographics(church?.id) 
      });
      toast.success('Demographic preset updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update demographic preset');
    },
  });
};

export const useDeleteDemographic = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (demographicId) => settingsAPI.deleteDemographic(demographicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.settings.demographics(church?.id) 
      });
      toast.success('Demographic preset deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete demographic preset');
    },
  });
};

// ============= Church Settings Hooks =============

export const useChurchSettings = () => {
  const { user } = useAuth();

  // Extract session_church_id from JWT (via user context)
  // For super admin: The church they selected at login
  // For regular user: Their assigned church_id
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useQuery({
    queryKey: ['church-settings', sessionChurchId],  // Cache per church
    queryFn: () => settingsAPI.getChurchSettings().then(res => res.data),
    enabled: !!sessionChurchId,  // Only run when we have a church context
    // Performance optimization: Church settings rarely change during a session
    // Removed aggressive refetch that was causing excessive API calls
    refetchOnWindowFocus: false,  // Don't refetch on every tab switch
    staleTime: 5 * 60 * 1000,  // 5 minutes - reasonable for settings data
  });
};

export const useUpdateChurchSettings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;
  
  return useMutation({
    mutationFn: (settingsData) => {
      console.log('💾 PATCH payload being sent:', settingsData);
      return settingsAPI.updateChurchSettings(settingsData).then(res => res.data);
    },
    onSuccess: (data) => {
      console.log('✅ PATCH response from server:', data);
      
      // Overwrite cache with exact server response
      queryClient.setQueryData(['church-settings', sessionChurchId], data);
      
      console.log('✅ Cache updated with server response');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update church settings');
    },
  });
};

// Event Categories hooks - scoped by church for proper multi-tenant cache isolation
export function useEventCategories() {
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useQuery({
    queryKey: ['eventCategories', sessionChurchId],
    queryFn: async () => {
      const response = await settingsAPI.listEventCategories();
      return response.data;
    },
    enabled: !!sessionChurchId,
  });
}

export function useCreateEventCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: (data) => settingsAPI.createEventCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventCategories', sessionChurchId] });
      toast.success('Category created successfully');
    },
    onError: () => {
      toast.error('Failed to create category');
    },
  });
}

export function useUpdateEventCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => settingsAPI.updateEventCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventCategories', sessionChurchId] });
      toast.success('Category updated successfully');
    },
    onError: () => {
      toast.error('Failed to update category');
    },
  });
}

export function useDeleteEventCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: (id) => settingsAPI.deleteEventCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventCategories', sessionChurchId] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.detail || 'Failed to delete category';
      toast.error(message);
    },
  });
}
