/**
 * Events API Hooks - Matching Backend Structure
 *
 * React Query hooks for event operations based on:
 * - /backend/routes/events.py
 * - /backend/models/event.py
 *
 * Features:
 * - Fetch events with filters (event_type, is_active, event_category_id)
 * - Calculate member status (my_rsvp, my_attendance) client-side
 * - Categorize events: Upcoming, My RSVPs, Attended
 * - RSVP with binary confirmation (confirmed/cancelled)
 * - Demo mode with realistic mock data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type {
  Event,
  EventWithMemberStatus,
  EventFilters,
  RSVPRequest,
  RSVPResponse,
  EventCategory,
} from '@/types/events';
import { useAuthStore } from '@/stores/auth';
import { mockEvents, mockEventCategories } from '@/mock/events';

/**
 * Calculate EventWithMemberStatus from raw Event
 */
function enrichEventWithMemberStatus(
  event: Event,
  memberId: string
): EventWithMemberStatus {
  const now = new Date();
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const reservationEnd = event.reservation_end ? new Date(event.reservation_end) : null;

  // Find member's RSVP and attendance (with defensive null checks)
  const myRSVP = (event.rsvp_list || []).find((rsvp) => rsvp.member_id === memberId);
  const myAttendance = (event.attendance_list || []).find((att) => att.member_id === memberId);

  // Calculate time-based flags
  const isPast = eventDate ? eventDate < now : false;
  const isUpcoming = eventDate ? eventDate > now : false;

  // Calculate if member can RSVP
  const canRSVP =
    event.requires_rsvp &&
    isUpcoming &&
    !myRSVP &&
    (reservationEnd ? reservationEnd > now : true) &&
    (event.seat_capacity ? event.rsvp_list.length < event.seat_capacity : true);

  // Calculate available seats
  const availableSeats = event.seat_capacity
    ? event.seat_capacity - event.rsvp_list.length
    : undefined;

  return {
    ...event,
    my_rsvp: myRSVP,
    my_attendance: myAttendance,
    total_rsvps: event.rsvp_list.length,
    total_attendance: event.attendance_list.length,
    available_seats: availableSeats,
    is_past: isPast,
    is_upcoming: isUpcoming,
    can_rsvp: canRSVP,
  };
}

/**
 * Fetch all events with filters
 * Base query that other hooks build on
 */
export function useEvents(filters?: EventFilters) {
  const { token, member } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';
  const memberId = member?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.EVENTS_LIST, filters],
    queryFn: async () => {
      // Use mock data in demo mode - INSTANT (no artificial delay)
      if (isDemoMode && memberId) {

        // Apply filters to mock data
        let filteredEvents = mockEvents;

        if (filters?.event_type) {
          filteredEvents = filteredEvents.filter(
            (e) => e.event_type === filters.event_type
          );
        }

        if (filters?.is_active !== undefined) {
          filteredEvents = filteredEvents.filter(
            (e) => e.is_active === filters.is_active
          );
        }

        if (filters?.event_category_id) {
          filteredEvents = filteredEvents.filter(
            (e) => e.event_category_id === filters.event_category_id
          );
        }

        // Enrich with member status
        return filteredEvents.map((event) =>
          enrichEventWithMemberStatus(event, memberId)
        );
      }

      // Real API call
      if (!memberId) {
        throw new Error('Member ID not available');
      }

      const params = new URLSearchParams();
      if (filters?.event_type) params.append('event_type', filters.event_type);
      if (filters?.is_active !== undefined)
        params.append('is_active', String(filters.is_active));
      if (filters?.event_category_id)
        params.append('event_category_id', filters.event_category_id);

      const response = await api.get<Event[]>(
        `/api/events?${params.toString()}`
      );

      // Enrich with member status
      return response.data.map((event) =>
        enrichEventWithMemberStatus(event, memberId)
      );
    },
    staleTime: CACHE_TIMES.EVENTS,
    gcTime: CACHE_TIMES.EVENTS,
    enabled: !!memberId,
  });
}

/**
 * Fetch upcoming events only (excluding events already RSVP'd to)
 * Filters: is_active=true, is_upcoming=true, no my_rsvp
 */
export function useUpcomingEvents(filters?: Omit<EventFilters, 'is_active'>) {
  const eventsQuery = useEvents({ ...filters, is_active: true });

  return {
    ...eventsQuery,
    data: eventsQuery.data?.filter((event) => event.is_upcoming && !event.my_rsvp) ?? [],
  };
}

/**
 * Fetch events I've RSVP'd to but haven't attended yet
 * Shows in "My RSVPs" tab
 */
export function useMyRSVPs(filters?: EventFilters) {
  const eventsQuery = useEvents({ ...filters, is_active: true });

  return {
    ...eventsQuery,
    data:
      eventsQuery.data?.filter(
        (event) => event.my_rsvp && !event.my_attendance
      ) ?? [],
  };
}

/**
 * Fetch events I've attended
 * Shows in "Attended" tab
 */
export function useAttendedEvents(filters?: EventFilters) {
  const eventsQuery = useEvents(filters);

  return {
    ...eventsQuery,
    data: eventsQuery.data?.filter((event) => event.my_attendance) ?? [],
  };
}

/**
 * Fetch single event details
 */
export function useEvent(eventId: string) {
  const { token, member } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';
  const memberId = member?.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.EVENT_DETAIL, eventId],
    queryFn: async () => {
      // Use mock data in demo mode - INSTANT
      if (isDemoMode && memberId) {

        const event = mockEvents.find((e) => e.id === eventId);
        if (!event) {
          throw new Error('Event not found');
        }

        return enrichEventWithMemberStatus(event, memberId);
      }

      // Real API call
      if (!memberId) {
        throw new Error('Member ID not available');
      }

      const response = await api.get<Event>(`/api/events/${eventId}`);
      return enrichEventWithMemberStatus(response.data, memberId);
    },
    enabled: !!eventId && !!memberId,
    staleTime: CACHE_TIMES.EVENTS,
  });
}

/**
 * Fetch event categories for filtering
 */
export function useEventCategories() {
  const { token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery({
    queryKey: QUERY_KEYS.EVENT_CATEGORIES,
    queryFn: async () => {
      // Use mock data in demo mode - INSTANT
      if (isDemoMode) {
        return mockEventCategories;
      }

      // Real API call
      const response = await api.get<EventCategory[]>('/api/event-categories');
      return response.data;
    },
    staleTime: CACHE_TIMES.EVENTS,
  });
}

/**
 * RSVP to event with binary confirmation
 * Backend: POST /api/events/{id}/rsvp?member_id=X&session_id=Y&seat=Z
 */
export function useRSVP() {
  const queryClient = useQueryClient();
  const { token, member } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';
  const memberId = member?.id;

  return useMutation({
    mutationFn: async (request: RSVPRequest & { eventId: string }) => {
      const { eventId, ...rsvpData } = request;

      // Simulate RSVP in demo mode - minimal delay for UX feedback
      if (isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
          success: true,
          message: 'RSVP confirmed successfully',
          rsvp: {
            member_id: rsvpData.member_id,
            member_name: member?.full_name ?? 'Demo User',
            session_id: rsvpData.session_id,
            seat: rsvpData.seat,
            timestamp: new Date().toISOString(),
            status: 'confirmed' as const,
            confirmation_code: `DEMO-${Math.random().toString(36).substring(7).toUpperCase()}`,
            qr_code: 'data:image/png;base64,demo-qr-code',
            qr_data: `EVENT:${eventId}:MEMBER:${rsvpData.member_id}`,
            whatsapp_status: 'pending' as const,
          },
        } as RSVPResponse;
      }

      // Real API call
      const params = new URLSearchParams();
      params.append('member_id', rsvpData.member_id);
      if (rsvpData.session_id) params.append('session_id', rsvpData.session_id);
      if (rsvpData.seat) params.append('seat', rsvpData.seat);

      const response = await api.post<RSVPResponse>(
        `/api/events/${eventId}/rsvp?${params.toString()}`
      );
      return response.data;
    },

    // Optimistic update - Update UI immediately
    onMutate: async ({ eventId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS_LIST });
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.EVENT_DETAIL, eventId],
      });

      // Snapshot previous values
      const previousEventsList = queryClient.getQueryData(QUERY_KEYS.EVENTS_LIST);
      const previousEventDetail = queryClient.getQueryData([
        ...QUERY_KEYS.EVENT_DETAIL,
        eventId,
      ]);

      // Optimistically update events list
      queryClient.setQueriesData<EventWithMemberStatus[]>(
        { queryKey: QUERY_KEYS.EVENTS_LIST },
        (old) => {
          if (!old || !memberId) return old;
          return old.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  my_rsvp: {
                    member_id: memberId,
                    member_name: member?.full_name ?? '',
                    timestamp: new Date().toISOString(),
                    status: 'confirmed' as const,
                    confirmation_code: 'PENDING',
                  },
                  total_rsvps: (event.total_rsvps ?? 0) + 1,
                  available_seats: event.available_seats
                    ? event.available_seats - 1
                    : undefined,
                }
              : event
          );
        }
      );

      // Optimistically update event detail
      queryClient.setQueryData<EventWithMemberStatus>(
        [...QUERY_KEYS.EVENT_DETAIL, eventId],
        (old) => {
          if (!old || !memberId) return old;
          return {
            ...old,
            my_rsvp: {
              member_id: memberId,
              member_name: member?.full_name ?? '',
              timestamp: new Date().toISOString(),
              status: 'confirmed' as const,
              confirmation_code: 'PENDING',
            },
            total_rsvps: (old.total_rsvps ?? 0) + 1,
            available_seats: old.available_seats
              ? old.available_seats - 1
              : undefined,
          };
        }
      );

      return { previousEventsList, previousEventDetail };
    },

    // Revert on error
    onError: (_error, { eventId }, context) => {
      if (context?.previousEventsList) {
        queryClient.setQueryData(QUERY_KEYS.EVENTS_LIST, context.previousEventsList);
      }
      if (context?.previousEventDetail) {
        queryClient.setQueryData(
          [...QUERY_KEYS.EVENT_DETAIL, eventId],
          context.previousEventDetail
        );
      }
    },

    // Refetch on success to get accurate data (QR code, etc.)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS_LIST });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT_DETAIL });
    },
  });
}

/**
 * Cancel RSVP
 * Backend: DELETE /api/events/{id}/rsvp/{member_id}
 */
export function useCancelRSVP() {
  const queryClient = useQueryClient();
  const { token, member } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';
  const memberId = member?.id;

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      // Simulate cancel in demo mode - minimal delay for UX feedback
      if (isDemoMode && memberId) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true, message: 'RSVP cancelled successfully' };
      }

      // Real API call
      if (!memberId) {
        throw new Error('Member ID not available');
      }

      const response = await api.delete(
        `/api/events/${eventId}/rsvp/${memberId}`
      );
      return response.data;
    },

    // Optimistic update
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS_LIST });
      await queryClient.cancelQueries({
        queryKey: [...QUERY_KEYS.EVENT_DETAIL, eventId],
      });

      const previousEventsList = queryClient.getQueryData(QUERY_KEYS.EVENTS_LIST);
      const previousEventDetail = queryClient.getQueryData([
        ...QUERY_KEYS.EVENT_DETAIL,
        eventId,
      ]);

      // Remove RSVP from events
      queryClient.setQueriesData<EventWithMemberStatus[]>(
        { queryKey: QUERY_KEYS.EVENTS_LIST },
        (old) => {
          if (!old) return old;
          return old.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  my_rsvp: undefined,
                  total_rsvps: Math.max(0, (event.total_rsvps ?? 0) - 1),
                  available_seats: event.available_seats
                    ? event.available_seats + 1
                    : undefined,
                }
              : event
          );
        }
      );

      queryClient.setQueryData<EventWithMemberStatus>(
        [...QUERY_KEYS.EVENT_DETAIL, eventId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            my_rsvp: undefined,
            total_rsvps: Math.max(0, (old.total_rsvps ?? 0) - 1),
            available_seats: old.available_seats
              ? old.available_seats + 1
              : undefined,
          };
        }
      );

      return { previousEventsList, previousEventDetail };
    },

    onError: (_error, { eventId }, context) => {
      if (context?.previousEventsList) {
        queryClient.setQueryData(QUERY_KEYS.EVENTS_LIST, context.previousEventsList);
      }
      if (context?.previousEventDetail) {
        queryClient.setQueryData(
          [...QUERY_KEYS.EVENT_DETAIL, eventId],
          context.previousEventDetail
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS_LIST });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENT_DETAIL });
    },
  });
}
