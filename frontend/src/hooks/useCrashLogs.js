import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as crashLogsApi from '../services/crashLogsApi';
import { toast } from 'sonner';

/**
 * Hook to fetch crash logs with filters
 */
export const useCrashLogs = (params = {}) => {
  return useQuery({
    queryKey: ['crash-logs', params],
    queryFn: async () => {
      const response = await crashLogsApi.getCrashLogs(params);
      return response.data;
    },
    // Keep data fresh for monitoring
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * Hook to fetch a single crash log by ID
 */
export const useCrashLog = (id) => {
  return useQuery({
    queryKey: ['crash-log', id],
    queryFn: async () => {
      const response = await crashLogsApi.getCrashLogById(id);
      return response.data;
    },
    enabled: !!id
  });
};

/**
 * Hook to fetch crash log statistics
 */
export const useCrashLogStats = () => {
  return useQuery({
    queryKey: ['crash-log-stats'],
    queryFn: async () => {
      const response = await crashLogsApi.getCrashLogStats();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to update a crash log (change status, add notes)
 */
export const useUpdateCrashLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => crashLogsApi.updateCrashLog(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the single crash log cache
      queryClient.invalidateQueries({
        queryKey: ['crash-log', variables.id],
        refetchType: 'active'
      });
      // Invalidate the list
      queryClient.invalidateQueries({
        queryKey: ['crash-logs'],
        refetchType: 'active'
      });
      // Invalidate stats
      queryClient.invalidateQueries({
        queryKey: ['crash-log-stats'],
        refetchType: 'active'
      });
      toast.success('Crash log updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update crash log');
    }
  });
};

/**
 * Hook to delete a crash log
 */
export const useDeleteCrashLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: crashLogsApi.deleteCrashLog,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['crash-logs'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({
        queryKey: ['crash-log-stats'],
        refetchType: 'active'
      });
      toast.success('Crash log deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete crash log');
    }
  });
};
