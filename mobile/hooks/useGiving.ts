/**
 * Giving API Hooks
 *
 * React Query hooks for giving operations:
 * - Fetch funds
 * - Submit giving
 * - Fetch giving history
 * - Check payment status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type {
  Fund,
  GivingTransaction,
  GivingHistoryItem,
  GivingSummary,
  PaymentConfig,
  CreateGivingRequest,
  CreateGivingResponse,
  PaymentStatus,
} from '@/types/giving';

/**
 * Fetch active funds
 */
export function useFunds() {
  return useQuery({
    queryKey: QUERY_KEYS.FUNDS,
    queryFn: async () => {
      const response = await api.get<Fund[]>('/api/giving/funds');
      return response.data;
    },
    staleTime: CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch payment configuration
 */
export function usePaymentConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.PAYMENT_CONFIG,
    queryFn: async () => {
      const response = await api.get<PaymentConfig>('/api/giving/config');
      return response.data;
    },
    staleTime: CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Submit giving transaction
 */
export function useCreateGiving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGivingRequest) => {
      const response = await api.post<CreateGivingResponse>('/api/giving/create', data);
      return response.data;
    },

    onSuccess: () => {
      // Invalidate giving history to show new transaction
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_HISTORY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_SUMMARY });
    },
  });
}

/**
 * Fetch giving history
 */
export function useGivingHistory(status?: PaymentStatus) {
  return useQuery({
    queryKey: status ? [...QUERY_KEYS.GIVING_HISTORY, status] : QUERY_KEYS.GIVING_HISTORY,
    queryFn: async () => {
      const params = status ? { status } : {};
      const response = await api.get<GivingHistoryItem[]>('/api/giving/history', { params });
      return response.data;
    },
    staleTime: CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch giving summary
 */
export function useGivingSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.GIVING_SUMMARY,
    queryFn: async () => {
      const response = await api.get<GivingSummary>('/api/giving/summary');
      return response.data;
    },
    staleTime: CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch single transaction
 */
export function useTransaction(transactionId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TRANSACTION_DETAIL, transactionId],
    queryFn: async () => {
      const response = await api.get<GivingTransaction>(`/api/giving/transaction/${transactionId}`);
      return response.data;
    },
    enabled: !!transactionId,
    staleTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Check payment status
 */
export function useCheckPaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await api.get<GivingTransaction>(`/api/giving/status/${transactionId}`);
      return response.data;
    },

    onSuccess: (data) => {
      // Update transaction in cache
      queryClient.setQueryData([...QUERY_KEYS.TRANSACTION_DETAIL, data._id], data);

      // Invalidate history to show updated status
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_HISTORY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_SUMMARY });
    },
  });
}
