import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { statusRulesAPI, statusConflictsAPI, statusHistoryAPI } from '../services/api';
import { queryKeys } from '../lib/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

// ============= Status Rules Hooks =============

export const useStatusRules = () => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.statusRules.list(church?.id),
    queryFn: () => statusRulesAPI.list().then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useCreateStatusRule = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (ruleData) => statusRulesAPI.create(ruleData).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.statusRules.list(church?.id) 
      });
      toast.success('Status rule created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create status rule');
    },
  });
};

export const useUpdateStatusRule = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ id, data }) => statusRulesAPI.update(id, data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.statusRules.list(church?.id) 
      });
      toast.success('Status rule updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update status rule');
    },
  });
};

export const useDeleteStatusRule = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: (ruleId) => statusRulesAPI.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.statusRules.list(church?.id) 
      });
      toast.success('Status rule deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete status rule');
    },
  });
};

export const useTestStatusRule = () => {
  return useMutation({
    mutationFn: ({ ruleId, memberId }) => statusRulesAPI.test(ruleId, memberId).then(res => res.data),
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to test rule');
    },
  });
};

export const useSimulateRule = () => {
  return useMutation({
    mutationFn: (ruleData) => statusRulesAPI.simulate(ruleData).then(res => res.data),
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to simulate rule');
    },
  });
};

export const useEvaluateAllRules = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: () => statusRulesAPI.evaluateAll().then(res => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statusRules.list(church?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.statusConflicts.list(church?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      
      const stats = data.statistics;
      toast.success(
        `Automation complete: ${stats.updated} updated, ${stats.conflicts} conflicts, ${stats.no_match} no match`
      );
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to run automation');
    },
  });
};

// ============= Status Conflicts Hooks =============

export const useStatusConflicts = (statusFilter = 'open', memberId = null) => {
  const { church } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.statusConflicts.list(church?.id, statusFilter, memberId),
    queryFn: () => statusConflictsAPI.list(statusFilter, memberId).then(res => res.data),
    enabled: !!church?.id,
  });
};

export const useResolveConflict = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();
  
  return useMutation({
    mutationFn: ({ conflictId, statusId, comment }) => statusConflictsAPI.resolve(conflictId, statusId, comment).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.statusConflicts.list(church?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success('Conflict resolved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to resolve conflict');
    },
  });
};

// ============= Status History Hooks =============

export const useMemberStatusHistory = (memberId) => {
  return useQuery({
    queryKey: queryKeys.statusHistory.member(memberId),
    queryFn: () => statusHistoryAPI.getMemberHistory(memberId).then(res => res.data),
    enabled: !!memberId,
  });
};

