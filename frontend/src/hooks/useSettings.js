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
