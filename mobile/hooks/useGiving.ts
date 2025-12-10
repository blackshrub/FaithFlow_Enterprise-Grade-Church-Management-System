/**
 * Giving API Hooks - PERFORMANCE OPTIMIZED
 *
 * React Query hooks for giving operations:
 * - Fetch funds
 * - Submit giving
 * - Fetch giving history
 * - Check payment status
 *
 * Demo mode: Uses mock data with instant loading (no delays)
 */

import { useOptimistic, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import { useAuthStore } from '@/stores/auth';
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

// Mock data for demo mode - INSTANT access
const MOCK_GIVING_SUMMARY: GivingSummary = {
  total_given: 5750000,
  total_transactions: 15,
  total_by_fund: [
    { fund_id: 'fund_tithe', fund_name: 'Tithe', amount: 3500000 },
    { fund_id: 'fund_building', fund_name: 'Building Fund', amount: 1500000 },
    { fund_id: 'fund_missions', fund_name: 'Missions', amount: 750000 },
  ],
  recent_transactions: [],
};

const MOCK_FUNDS: Fund[] = [
  { _id: 'fund_tithe', church_id: 'demo', name: 'Tithe', description: 'Monthly tithe offering', category: 'tithe', current_amount: 15000000, is_active: true, display_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { _id: 'fund_building', church_id: 'demo', name: 'Building Fund', description: 'Church building project', category: 'building', goal_amount: 500000000, current_amount: 125000000, is_active: true, display_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { _id: 'fund_missions', church_id: 'demo', name: 'Missions', description: 'Support missionaries worldwide', category: 'mission', goal_amount: 100000000, current_amount: 45000000, is_active: true, display_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const MOCK_GIVING_HISTORY: GivingHistoryItem[] = [
  {
    _id: 'giving_001',
    church_id: 'demo-church-123',
    member_id: 'demo-member-123',
    fund_id: 'fund_tithe',
    fund_name: 'Tithe',
    amount: 500000,
    payment_method: 'bank_transfer',
    payment_status: 'success',
    status: 'success', // Alias
    is_anonymous: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'giving_002',
    church_id: 'demo-church-123',
    member_id: 'demo-member-123',
    fund_id: 'fund_building',
    fund_name: 'Building Fund',
    amount: 250000,
    payment_method: 'e_wallet',
    payment_status: 'success',
    status: 'success', // Alias
    is_anonymous: false,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Fetch active funds - INSTANT in demo mode
 * DATA-C2 FIX: Uses church-scoped query keys
 */
export function useFunds() {
  const { token, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    queryKey: QUERY_KEYS.FUNDS(churchId || ''),
    queryFn: async () => {
      if (isDemoMode) return MOCK_FUNDS;
      const response = await api.get<Fund[]>('/api/giving/funds');
      return response.data;
    },
    initialData: isDemoMode ? MOCK_FUNDS : undefined,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch payment configuration
 * DATA-C2 FIX: Uses church-scoped query keys
 */
export function usePaymentConfig() {
  const { churchId } = useAuthStore();

  return useQuery({
    queryKey: QUERY_KEYS.PAYMENT_CONFIG(churchId || ''),
    queryFn: async () => {
      const response = await api.get<PaymentConfig>('/api/giving/config');
      return response.data;
    },
    staleTime: CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Submit giving transaction with optimistic updates
 *
 * React 19 Pattern: Combines React Query optimistic updates with
 * useOptimistic for instant UI feedback while API processes payment
 *
 * SECURITY FIX: Uses church-scoped query keys for cache operations
 */
export function useCreateGiving() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateGivingRequest) => {
      // Fixed: Backend uses /api/giving/submit not /api/giving/create
      const response = await api.post<CreateGivingResponse>('/api/giving/submit', data);
      return response.data;
    },

    // Optimistic update: Add pending transaction to history cache immediately
    onMutate: async (newGiving) => {
      // Cancel outgoing refetches - use church-scoped keys
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.GIVING_HISTORY(churchId || '') });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.GIVING_SUMMARY(churchId || '') });

      // Snapshot previous values for rollback - use church-scoped keys
      const previousHistory = queryClient.getQueryData<GivingHistoryItem[]>(QUERY_KEYS.GIVING_HISTORY(churchId || ''));
      const previousSummary = queryClient.getQueryData<GivingSummary>(QUERY_KEYS.GIVING_SUMMARY(churchId || ''));

      // Create optimistic transaction
      const optimisticTransaction: GivingHistoryItem = {
        _id: `optimistic_${Date.now()}`,
        church_id: 'pending',
        member_id: 'pending',
        fund_id: newGiving.fund_id,
        fund_name: getFundNameFromId(newGiving.fund_id),
        amount: newGiving.amount,
        payment_method: newGiving.payment_method,
        payment_status: 'pending',
        status: 'pending',
        is_anonymous: newGiving.is_anonymous ?? false,
        notes: newGiving.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistically update history - use church-scoped keys
      queryClient.setQueryData<GivingHistoryItem[]>(
        QUERY_KEYS.GIVING_HISTORY(churchId || ''),
        (old) => old ? [optimisticTransaction, ...old] : [optimisticTransaction]
      );

      // Optimistically update summary - use church-scoped keys
      if (previousSummary) {
        queryClient.setQueryData<GivingSummary>(QUERY_KEYS.GIVING_SUMMARY(churchId || ''), {
          ...previousSummary,
          total_given: previousSummary.total_given + newGiving.amount,
          total_transactions: previousSummary.total_transactions + 1,
        });
      }

      // Return context for rollback
      return { previousHistory, previousSummary };
    },

    // Rollback on error - use church-scoped keys
    onError: (_error, _newGiving, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData(QUERY_KEYS.GIVING_HISTORY(churchId || ''), context.previousHistory);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(QUERY_KEYS.GIVING_SUMMARY(churchId || ''), context.previousSummary);
      }
    },

    // Refetch after success or error to ensure consistency
    // SECURITY: Scope invalidation to current church only
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_HISTORY(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_SUMMARY(churchId || '') });
    },
  });
}

// Helper to get fund name from ID for optimistic display
function getFundNameFromId(fundId: string): string {
  const fundNames: Record<string, string> = {
    tithe: 'Tithe',
    weekly: 'Weekly Offering',
    mission: 'Mission',
    other: 'Other',
    fund_tithe: 'Tithe',
    fund_building: 'Building Fund',
    fund_missions: 'Missions',
  };
  return fundNames[fundId] || fundId;
}

/**
 * Fetch giving history - INSTANT in demo mode
 *
 * SECURITY FIX: Uses church-scoped query keys to prevent cross-tenant cache collision
 */
export function useGivingHistory(status?: PaymentStatus) {
  const { token, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    // SECURITY: Use church-scoped query key function
    queryKey: status ? [...QUERY_KEYS.GIVING_HISTORY(churchId || ''), status] : QUERY_KEYS.GIVING_HISTORY(churchId || ''),
    queryFn: async () => {
      if (isDemoMode) {
        return status
          ? MOCK_GIVING_HISTORY.filter(h => h.status === status)
          : MOCK_GIVING_HISTORY;
      }
      const params = status ? { status } : {};
      const response = await api.get<GivingHistoryItem[]>('/api/giving/history', { params });
      return response.data;
    },
    initialData: isDemoMode ? MOCK_GIVING_HISTORY : undefined,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch giving summary - INSTANT in demo mode
 *
 * SECURITY FIX: Uses church-scoped query keys to prevent cross-tenant cache collision
 */
export function useGivingSummary() {
  const { token, churchId } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    // SECURITY: Use church-scoped query key function
    queryKey: QUERY_KEYS.GIVING_SUMMARY(churchId || ''),
    queryFn: async () => {
      if (isDemoMode) return MOCK_GIVING_SUMMARY;
      const response = await api.get<GivingSummary>('/api/giving/summary');
      return response.data;
    },
    initialData: isDemoMode ? MOCK_GIVING_SUMMARY : undefined,
    staleTime: isDemoMode ? Infinity : CACHE_TIMES.GIVING,
    gcTime: CACHE_TIMES.GIVING,
  });
}

/**
 * Fetch single transaction
 * DATA-C2 FIX: Uses church-scoped query keys
 */
export function useTransaction(transactionId: string) {
  const { churchId } = useAuthStore();

  return useQuery({
    queryKey: QUERY_KEYS.TRANSACTION_DETAIL(churchId || '', transactionId),
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
 * DATA-C2 FIX: Uses church-scoped query keys
 */
export function useCheckPaymentStatus() {
  const queryClient = useQueryClient();
  const { churchId } = useAuthStore();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await api.get<GivingTransaction>(`/api/giving/status/${transactionId}`);
      return response.data;
    },

    onSuccess: (data) => {
      // Update transaction in cache - use church-scoped key
      queryClient.setQueryData(QUERY_KEYS.TRANSACTION_DETAIL(churchId || '', data._id), data);

      // Invalidate history to show updated status - use church-scoped keys
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_HISTORY(churchId || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GIVING_SUMMARY(churchId || '') });
    },
  });
}

// ============================================================================
// REACT 19: useOptimistic Hook for Instant UI Feedback
// ============================================================================

export interface OptimisticGivingState {
  pendingTransaction: GivingHistoryItem | null;
  isSubmitting: boolean;
}

/**
 * React 19 useOptimistic hook for giving transactions
 *
 * Provides instant UI feedback while payment is processing.
 * Shows optimistic "pending" state immediately on submit.
 *
 * Usage in component:
 * ```tsx
 * const { optimisticState, addOptimisticGiving, clearOptimistic } = useOptimisticGiving();
 *
 * const handleSubmit = () => {
 *   addOptimisticGiving({ amount: 100000, fund_id: 'tithe', ... });
 *   createGiving({ ... });
 * };
 * ```
 */
export function useOptimisticGiving() {
  const initialState: OptimisticGivingState = {
    pendingTransaction: null,
    isSubmitting: false,
  };

  const [optimisticState, setOptimisticState] = useOptimistic(
    initialState,
    (currentState, newTransaction: Partial<CreateGivingRequest> | null) => {
      if (newTransaction === null) {
        return { pendingTransaction: null, isSubmitting: false };
      }

      return {
        pendingTransaction: {
          _id: `optimistic_${Date.now()}`,
          church_id: 'pending',
          member_id: 'pending',
          fund_id: newTransaction.fund_id || '',
          fund_name: getFundNameFromId(newTransaction.fund_id || ''),
          amount: newTransaction.amount || 0,
          payment_method: newTransaction.payment_method || 'bank_transfer',
          payment_status: 'pending' as const,
          status: 'pending' as const,
          is_anonymous: newTransaction.is_anonymous ?? false,
          notes: newTransaction.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isSubmitting: true,
      };
    }
  );

  const addOptimisticGiving = useCallback(
    (transaction: Partial<CreateGivingRequest>) => {
      setOptimisticState(transaction);
    },
    [setOptimisticState]
  );

  const clearOptimistic = useCallback(() => {
    setOptimisticState(null);
  }, [setOptimisticState]);

  return {
    optimisticState,
    addOptimisticGiving,
    clearOptimistic,
    pendingTransaction: optimisticState.pendingTransaction,
    isOptimisticSubmitting: optimisticState.isSubmitting,
  };
}
