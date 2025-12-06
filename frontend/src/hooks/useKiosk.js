/**
 * Kiosk Hooks - TanStack Query wrappers for Kiosk API
 *
 * Provides caching, automatic refetching, and optimistic updates
 * for all kiosk-related data fetching operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import kioskApi from '../services/kioskApi';

// ==================== QUERY KEYS ====================
export const kioskKeys = {
  all: ['kiosk'],
  settings: (churchId) => [...kioskKeys.all, 'settings', churchId],
  events: (churchId, forRegistration) => [...kioskKeys.all, 'events', churchId, forRegistration],
  groups: (churchId, category) => [...kioskKeys.all, 'groups', churchId, category],
  counselors: (churchId) => [...kioskKeys.all, 'counselors', churchId],
  counselorSlots: (churchId, counselorId, dateFrom, dateTo) => [...kioskKeys.all, 'slots', churchId, counselorId, dateFrom, dateTo],
  availableDates: (churchId, dateFrom, dateTo) => [...kioskKeys.all, 'availableDates', churchId, dateFrom, dateTo],
  member: (phone, churchId) => [...kioskKeys.all, 'member', phone, churchId],
};

// ==================== SETTINGS ====================

/**
 * Hook to fetch public kiosk settings for a church
 * @param {string} churchId - The church ID
 * @param {object} options - Additional react-query options
 */
export function useKioskSettings(churchId, options = {}) {
  return useQuery({
    queryKey: kioskKeys.settings(churchId),
    queryFn: () => kioskApi.getPublicKioskSettings(churchId),
    enabled: !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    placeholderData: {
      enable_kiosk: true,
      enable_event_registration: true,
      enable_prayer: true,
      enable_counseling: true,
      enable_groups: true,
      enable_profile_update: true,
      timeout_minutes: 2
    },
    ...options,
  });
}

// ==================== EVENTS ====================

/**
 * Hook to fetch upcoming events for kiosk
 * @param {string} churchId - The church ID
 * @param {object} options - Additional react-query options
 * @param {boolean} options.forRegistration - If true, only fetch events that require RSVP (for member registration)
 */
export function useKioskEvents(churchId, options = {}) {
  const { forRegistration = false, ...queryOptions } = options;

  return useQuery({
    queryKey: kioskKeys.events(churchId, forRegistration),
    queryFn: () => kioskApi.getUpcomingEvents(churchId, forRegistration),
    enabled: !!churchId,
    staleTime: 2 * 60 * 1000, // 2 minutes - events may have capacity changes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    ...queryOptions,
  });
}

/**
 * Mutation hook for event registration
 */
export function useRegisterForEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, memberId }) => kioskApi.registerForEvent(eventId, memberId),
    onSuccess: (data, variables) => {
      // Invalidate events to refresh capacity
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

/**
 * Mutation hook for group event registration (primary + companions)
 * @returns Mutation with registerGroup function
 */
export function useRegisterGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => kioskApi.registerGroup(data),
    onSuccess: (data, variables) => {
      // Invalidate events to refresh capacity
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

// ==================== GROUPS ====================

/**
 * Hook to fetch public groups available for joining
 * @param {string} churchId - The church ID
 * @param {string} category - Optional category filter
 * @param {object} options - Additional react-query options
 */
export function useKioskGroups(churchId, category = null, options = {}) {
  return useQuery({
    queryKey: kioskKeys.groups(churchId, category),
    queryFn: () => kioskApi.getPublicGroups(category, churchId),
    enabled: !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
    ...options,
  });
}

/**
 * Mutation hook for group join request
 */
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, memberId, message }) =>
      kioskApi.createGroupJoinRequest(groupId, memberId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

// ==================== COUNSELING ====================

/**
 * Hook to fetch available counselors
 * @param {string} churchId - The church ID (for query key)
 * @param {object} options - Additional react-query options
 */
export function useKioskCounselors(churchId, options = {}) {
  return useQuery({
    queryKey: kioskKeys.counselors(churchId),
    queryFn: () => kioskApi.getAvailableCounselors(),
    enabled: !!churchId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    ...options,
  });
}

/**
 * Hook to fetch counselor available slots
 * @param {string} churchId - The church ID
 * @param {string} counselorId - The counselor ID (optional, null for all counselors)
 * @param {string} dateFrom - Start date
 * @param {string} dateTo - End date
 * @param {object} options - Additional react-query options
 */
export function useKioskCounselorSlots(churchId, counselorId, dateFrom, dateTo, options = {}) {
  return useQuery({
    queryKey: kioskKeys.counselorSlots(churchId, counselorId, dateFrom, dateTo),
    queryFn: () => kioskApi.getAvailableSlots(counselorId, dateFrom, dateTo, churchId),
    enabled: !!churchId && !!dateFrom && !!dateTo,
    staleTime: 2 * 60 * 1000, // 2 minutes - slots can be booked quickly
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch dates that have available counseling slots
 * @param {string} churchId - The church ID
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @param {object} options - Additional react-query options
 */
export function useKioskAvailableDates(churchId, dateFrom, dateTo, options = {}) {
  return useQuery({
    queryKey: kioskKeys.availableDates(churchId, dateFrom, dateTo),
    queryFn: () => kioskApi.getAvailableDates(dateFrom, dateTo, churchId),
    enabled: !!churchId && !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Mutation hook for counseling appointment request
 */
export function useCreateCounselingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => kioskApi.createCounselingRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

// ==================== PRAYER REQUESTS ====================

/**
 * Mutation hook for submitting prayer request
 */
export function useSubmitPrayerRequest() {
  return useMutation({
    mutationFn: (data) => kioskApi.submitPrayerRequest(data),
  });
}

// ==================== MEMBER LOOKUP & AUTH ====================

/**
 * Hook to lookup member by phone
 * @param {string} phone - Phone number to lookup
 * @param {string} churchId - Church ID
 * @param {object} options - Additional react-query options
 */
export function useKioskMemberLookup(phone, churchId, options = {}) {
  return useQuery({
    queryKey: kioskKeys.member(phone, churchId),
    queryFn: () => kioskApi.lookupMemberByPhone(phone, churchId),
    enabled: !!phone && !!churchId && phone.length >= 10,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    retry: false, // Don't retry member lookups
    ...options,
  });
}

/**
 * Mutation hook for sending OTP
 */
export function useSendOTP() {
  return useMutation({
    mutationFn: ({ phone, churchId }) => kioskApi.sendOTP(phone, churchId),
  });
}

/**
 * Mutation hook for verifying OTP
 */
export function useVerifyOTP() {
  return useMutation({
    mutationFn: ({ phone, code }) => kioskApi.verifyOTP(phone, code),
  });
}

/**
 * Mutation hook for verifying staff PIN
 */
export function useVerifyPIN() {
  return useMutation({
    mutationFn: ({ churchId, pin }) => kioskApi.verifyPIN(churchId, pin),
  });
}

/**
 * Mutation hook for creating pre-visitor
 */
export function useCreatePreVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => kioskApi.createPreVisitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

// ==================== PROFILE UPDATE ====================

/**
 * Mutation hook for updating member profile
 */
export function useUpdateMemberProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, data }) => kioskApi.updateMemberProfile(memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.all });
    },
  });
}

// ==================== UTILITY HOOKS ====================

/**
 * Hook to get kiosk church context from localStorage
 * Returns churchId and churchName with automatic updates
 */
export function useKioskChurch() {
  const churchId = localStorage.getItem('kiosk_church_id');
  const churchName = localStorage.getItem('kiosk_church_name');

  return {
    churchId,
    churchName,
    isValid: !!churchId,
  };
}
