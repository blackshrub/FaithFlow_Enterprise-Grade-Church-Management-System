/**
 * Prayer Requests API Hooks - PERFORMANCE OPTIMIZED
 *
 * React Query hooks for prayer operations:
 * - Fetch prayer requests
 * - Create prayer request
 * - Pray for request
 * - Mark as answered
 *
 * Demo mode: Uses mock data with instant loading (no delays)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import { useAuthStore } from '@/stores/auth';
import type {
  PrayerRequestWithStatus,
  CreatePrayerRequest,
  UpdatePrayerRequest,
  MarkAsAnsweredRequest,
  PrayResponse,
  PrayerStatus,
} from '@/types/prayer';

// Mock data for demo mode - INSTANT access
const MOCK_PRAYER_REQUESTS: PrayerRequestWithStatus[] = [
  {
    _id: 'prayer_001',
    church_id: 'demo-church-123',
    member_id: 'demo-member-123',
    member_name: 'John Doe',
    title: 'Healing for my mother',
    description: 'Please pray for my mother who is undergoing surgery next week.',
    content: 'Please pray for my mother who is undergoing surgery next week.', // Alias
    category: 'health',
    is_anonymous: false,
    status: 'active',
    prayer_count: 15,
    is_answered: false,
    has_prayed: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'prayer_002',
    church_id: 'demo-church-123',
    member_id: 'member_002',
    member_name: 'Jane Smith',
    title: 'Job interview',
    description: 'I have an important job interview this Friday. Please pray for wisdom and confidence.',
    content: 'I have an important job interview this Friday. Please pray for wisdom and confidence.', // Alias
    category: 'work',
    is_anonymous: false,
    status: 'active',
    prayer_count: 8,
    is_answered: false,
    has_prayed: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'prayer_003',
    church_id: 'demo-church-123',
    member_id: 'member_003',
    member_name: 'Anonymous',
    title: 'Family reconciliation',
    description: 'Praying for restoration of broken family relationships.',
    content: 'Praying for restoration of broken family relationships.', // Alias
    category: 'family',
    is_anonymous: true,
    status: 'active',
    prayer_count: 22,
    is_answered: false,
    has_prayed: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Fetch all prayer requests - INSTANT in demo mode
 * IMPORTANT: Include churchId in query key for multi-tenant cache isolation
 */
export function usePrayerRequests(status?: PrayerStatus) {
  const { token, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    // DATA-M2 FIX: Use church-scoped query key function
    queryKey: status
      ? [...QUERY_KEYS.PRAYER_REQUESTS(churchId || ''), status]
      : QUERY_KEYS.PRAYER_REQUESTS(churchId || ''),
    queryFn: async () => {
      if (isDemoMode) {
        return status
          ? MOCK_PRAYER_REQUESTS.filter(r => r.status === status)
          : MOCK_PRAYER_REQUESTS;
      }
      const params = status ? { status } : {};
      const response = await api.get<PrayerRequestWithStatus[]>('/api/prayer-requests', {
        params,
      });
      return response.data;
    },
    initialData: isDemoMode ? MOCK_PRAYER_REQUESTS : undefined,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.PRAYER,
    gcTime: CACHE_TIMES.PRAYER,
  });
}

/**
 * Fetch my prayer requests - INSTANT in demo mode
 * IMPORTANT: Include churchId in query key for multi-tenant cache isolation
 */
export function useMyPrayerRequests() {
  const { token, member, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    // DATA-M2 FIX: Use church-scoped query key function
    queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || ''),
    queryFn: async () => {
      if (isDemoMode) {
        return MOCK_PRAYER_REQUESTS.filter(r => r.member_id === member?.id);
      }
      const response = await api.get<PrayerRequestWithStatus[]>(
        '/api/prayer-requests/my-requests'
      );
      return response.data;
    },
    initialData: isDemoMode ? MOCK_PRAYER_REQUESTS.filter(r => r.member_id === 'demo-member-123') : undefined,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.PRAYER,
    gcTime: CACHE_TIMES.PRAYER,
  });
}

/**
 * Fetch single prayer request - INSTANT in demo mode
 * IMPORTANT: Include churchId in query key for multi-tenant cache isolation
 */
export function usePrayerRequest(requestId: string) {
  const { token, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    // DATA-M2 FIX: Use church-scoped query key function
    queryKey: QUERY_KEYS.PRAYER_REQUEST_DETAIL(churchId || '', requestId),
    queryFn: async () => {
      if (isDemoMode) {
        const request = MOCK_PRAYER_REQUESTS.find(r => r._id === requestId);
        if (!request) throw new Error('Prayer request not found');
        return request;
      }
      const response = await api.get<PrayerRequestWithStatus>(
        `/api/prayer-requests/${requestId}`
      );
      return response.data;
    },
    initialData: () => {
      if (!isDemoMode || !requestId) return undefined;
      return MOCK_PRAYER_REQUESTS.find(r => r._id === requestId);
    },
    enabled: !!requestId,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.PRAYER,
  });
}

/**
 * Create prayer request
 * DATA-M2 FIX: Use church-scoped cache invalidation
 */
export function useCreatePrayerRequest() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreatePrayerRequest) => {
      const response = await api.post<PrayerRequestWithStatus>('/api/prayer-requests', data);
      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || '') });
    },
  });
}

/**
 * Update prayer request
 * DATA-M2 FIX: Use church-scoped cache invalidation
 */
export function useUpdatePrayerRequest() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async ({ requestId, data }: { requestId: string; data: UpdatePrayerRequest }) => {
      const response = await api.patch<PrayerRequestWithStatus>(
        `/api/prayer-requests/${requestId}`,
        data
      );
      return response.data;
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || '') });
      queryClient.setQueryData(QUERY_KEYS.PRAYER_REQUEST_DETAIL(churchId || '', data._id), data);
    },
  });
}

/**
 * Pray for request with optimistic updates
 * DATA-M2 FIX: Use church-scoped cache operations
 */
export function usePrayForRequest() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post<PrayResponse>(`/api/prayer-requests/${requestId}/pray`);
      return { requestId, ...response.data };
    },

    // Optimistic update
    onMutate: async (requestId) => {
      const queryKey = QUERY_KEYS.PRAYER_REQUESTS(churchId || '');
      await queryClient.cancelQueries({ queryKey });

      const previousRequests = queryClient.getQueryData(queryKey);

      // Optimistically update all prayer lists
      queryClient.setQueryData<PrayerRequestWithStatus[]>(
        queryKey,
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

      return { previousRequests, queryKey };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousRequests && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRequests);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || '') });
    },
  });
}

/**
 * Mark prayer request as answered
 * DATA-M2 FIX: Use church-scoped cache operations
 */
export function useMarkAsAnswered() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || '') });
      queryClient.setQueryData(QUERY_KEYS.PRAYER_REQUEST_DETAIL(churchId || '', data._id), data);
    },
  });
}

/**
 * Delete prayer request
 * DATA-M2 FIX: Use church-scoped cache operations
 */
export function useDeletePrayerRequest() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async (requestId: string) => {
      await api.delete(`/api/prayer-requests/${requestId}`);
      return requestId;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(churchId || '') });
    },
  });
}
