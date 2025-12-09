/**
 * React Query hooks for Request Forms module
 *
 * Provides data fetching and mutations for member care requests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import requestFormsApi from '../services/requestFormsApi';

// =============================================
// QUERY KEYS
// =============================================

export const REQUEST_FORMS_KEYS = {
  all: ['request-forms'],
  unreadCounts: (churchId) => ['request-forms', 'unread-counts', churchId],
  dashboard: (churchId) => ['request-forms', 'dashboard', churchId],
  list: (churchId, filters) => ['request-forms', 'list', churchId, filters],
  listByType: (churchId, type, filters) => ['request-forms', 'list', churchId, type, filters],
  detail: (churchId, id) => ['request-forms', 'detail', churchId, id],
  settings: (churchId) => ['request-forms', 'settings', churchId],
};

// =============================================
// HELPER HOOKS
// =============================================

/**
 * Get session church ID from auth context
 */
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// =============================================
// UNREAD COUNTS (for navigation badges)
// =============================================

/**
 * Get unread counts for navigation badges
 * Refetches every 60 seconds
 */
export const useUnreadCounts = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId),
    queryFn: () => requestFormsApi.getUnreadCounts(),
    enabled: !!sessionChurchId,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
};

// =============================================
// DASHBOARD
// =============================================

/**
 * Get dashboard statistics
 */
export const useDashboardStats = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId),
    queryFn: () => requestFormsApi.getDashboardStats(),
    enabled: !!sessionChurchId,
    staleTime: 30000,
  });
};

// =============================================
// LIST QUERIES
// =============================================

/**
 * List all requests with filters
 */
export const useRequestsList = (filters = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId, filters),
    queryFn: () => requestFormsApi.getRequests(filters),
    enabled: !!sessionChurchId,
    keepPreviousData: true,
  });
};

/**
 * List requests by type
 * @param {string} type - Request type (accept_jesus, baptism, child_dedication, holy_matrimony)
 * @param {Object} filters - Additional filters
 */
export const useRequestsListByType = (type, filters = {}) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.listByType(sessionChurchId, type, filters),
    queryFn: () => requestFormsApi.getRequestsByType(type, filters),
    enabled: !!sessionChurchId && !!type,
    keepPreviousData: true,
  });
};

// =============================================
// SINGLE REQUEST
// =============================================

/**
 * Get a single request by ID
 */
export const useRequest = (id) => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, id),
    queryFn: () => requestFormsApi.getRequest(id),
    enabled: !!id && !!sessionChurchId,
  });
};

// =============================================
// MUTATIONS
// =============================================

/**
 * Update a request
 */
export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, data }) => requestFormsApi.updateRequest(id, data),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, variables.id) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId) });
    },
  });
};

/**
 * Assign staff to a request
 */
export const useAssignStaff = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, staffId }) => requestFormsApi.assignStaff(id, staffId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, variables.id) });
    },
  });
};

/**
 * Mark request as contacted
 */
export const useMarkContacted = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, notes }) => requestFormsApi.markContacted(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, variables.id) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId) });
    },
  });
};

/**
 * Mark request as scheduled
 */
export const useMarkScheduled = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, scheduledDate, location, notes }) =>
      requestFormsApi.markScheduled(id, scheduledDate, location, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, variables.id) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId) });
    },
  });
};

/**
 * Mark request as completed
 */
export const useMarkCompleted = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, notes }) => requestFormsApi.markCompleted(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.detail(sessionChurchId, variables.id) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId) });
    },
  });
};

/**
 * Delete a request
 */
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ id, hardDelete }) => requestFormsApi.deleteRequest(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.list(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.unreadCounts(sessionChurchId) });
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.dashboard(sessionChurchId) });
    },
  });
};

// =============================================
// SETTINGS
// =============================================

/**
 * Get guided prayer settings
 */
export const useGuidedPrayerSettings = () => {
  const sessionChurchId = useSessionChurchId();

  return useQuery({
    queryKey: REQUEST_FORMS_KEYS.settings(sessionChurchId),
    queryFn: () => requestFormsApi.getGuidedPrayerSettings(),
    enabled: !!sessionChurchId,
  });
};

/**
 * Update guided prayer settings
 */
export const useUpdateGuidedPrayerSettings = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: ({ prayerEn, prayerId }) =>
      requestFormsApi.updateGuidedPrayerSettings(prayerEn, prayerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUEST_FORMS_KEYS.settings(sessionChurchId) });
    },
  });
};
