/**
 * Prayer Requests API Hooks
 *
 * React Query hooks for prayer operations:
 * - Fetch prayer requests
 * - Create prayer request
 * - Pray for request
 * - Mark as answered
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type {
  PrayerRequestWithStatus,
  CreatePrayerRequest,
  UpdatePrayerRequest,
  MarkAsAnsweredRequest,
  PrayResponse,
  PrayerStatus,
} from '@/types/prayer';

/**
 * Fetch all prayer requests
 */
export function usePrayerRequests(status?: PrayerStatus) {
  return useQuery({
    queryKey: status ? [...QUERY_KEYS.PRAYER_REQUESTS, status] : QUERY_KEYS.PRAYER_REQUESTS,
    queryFn: async () => {
      const params = status ? { status } : {};
      const response = await api.get<PrayerRequestWithStatus[]>('/api/prayer-requests', {
        params,
      });
      return response.data;
    },
    staleTime: CACHE_TIMES.PRAYER,
    gcTime: CACHE_TIMES.PRAYER,
  });
}

/**
 * Fetch my prayer requests
 */
export function useMyPrayerRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS,
    queryFn: async () => {
      const response = await api.get<PrayerRequestWithStatus[]>(
        '/api/prayer-requests/my-requests'
      );
      return response.data;
    },
    staleTime: CACHE_TIMES.PRAYER,
    gcTime: CACHE_TIMES.PRAYER,
  });
}

/**
 * Fetch single prayer request
 */
export function usePrayerRequest(requestId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.PRAYER_REQUEST_DETAIL, requestId],
    queryFn: async () => {
      const response = await api.get<PrayerRequestWithStatus>(
        `/api/prayer-requests/${requestId}`
      );
      return response.data;
    },
    enabled: !!requestId,
    staleTime: CACHE_TIMES.PRAYER,
  });
}

/**
 * Create prayer request
 */
export function useCreatePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePrayerRequest) => {
      const response = await api.post<PrayerRequestWithStatus>('/api/prayer-requests', data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
    },
  });
}

/**
 * Update prayer request
 */
export function useUpdatePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, data }: { requestId: string; data: UpdatePrayerRequest }) => {
      const response = await api.patch<PrayerRequestWithStatus>(
        `/api/prayer-requests/${requestId}`,
        data
      );
      return response.data;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
      queryClient.setQueryData([...QUERY_KEYS.PRAYER_REQUEST_DETAIL, data._id], data);
    },
  });
}

/**
 * Pray for request with optimistic updates
 */
export function usePrayForRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post<PrayResponse>(`/api/prayer-requests/${requestId}/pray`);
      return { requestId, ...response.data };
    },

    // Optimistic update
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });

      const previousRequests = queryClient.getQueryData(QUERY_KEYS.PRAYER_REQUESTS);

      // Optimistically update all prayer lists
      queryClient.setQueryData<PrayerRequestWithStatus[]>(
        QUERY_KEYS.PRAYER_REQUESTS,
        (old) => {
          if (!old) return old;
          return old.map((request) =>
            request._id === requestId
              ? {
                  ...request,
                  has_prayed: true,
                  prayer_count: request.prayer_count + 1,
                }
              : request
          );
        }
      );

      return { previousRequests };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(QUERY_KEYS.PRAYER_REQUESTS, context.previousRequests);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
    },
  });
}

/**
 * Mark prayer request as answered
 */
export function useMarkAsAnswered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: string;
      data?: MarkAsAnsweredRequest;
    }) => {
      const response = await api.post<PrayerRequestWithStatus>(
        `/api/prayer-requests/${requestId}/answer`,
        data
      );
      return response.data;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
      queryClient.setQueryData([...QUERY_KEYS.PRAYER_REQUEST_DETAIL, data._id], data);
    },
  });
}

/**
 * Delete prayer request
 */
export function useDeletePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      await api.delete(`/api/prayer-requests/${requestId}`);
      return requestId;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
    },
  });
}
