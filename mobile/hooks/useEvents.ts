/**
 * Events API Hooks
 *
 * React Query hooks for event operations:
 * - Fetch upcoming/past events
 * - RSVP to events
 * - Optimistic updates for instant feedback
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type { EventWithRSVP, RSVPStatus, RSVPResponse } from '@/types/events';

/**
 * Fetch upcoming events
 */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.EVENTS_UPCOMING,
    queryFn: async () => {
      const response = await api.get<EventWithRSVP[]>('/api/events/upcoming');
      return response.data;
    },
    staleTime: CACHE_TIMES.EVENTS,
    gcTime: CACHE_TIMES.EVENTS,
  });
}

/**
 * Fetch past events
 */
export function usePastEvents() {
  return useQuery({
    queryKey: QUERY_KEYS.EVENTS_PAST,
    queryFn: async () => {
      const response = await api.get<EventWithRSVP[]>('/api/events/past');
      return response.data;
    },
    staleTime: CACHE_TIMES.EVENTS,
    gcTime: CACHE_TIMES.EVENTS,
  });
}

/**
 * Fetch single event details
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.EVENT_DETAIL, eventId],
    queryFn: async () => {
      const response = await api.get<EventWithRSVP>(`/api/events/${eventId}`);
      return response.data;
    },
    enabled: !!eventId,
    staleTime: CACHE_TIMES.EVENTS,
  });
}

/**
 * RSVP to event with optimistic updates
 */
export function useRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: RSVPStatus;
    }) => {
      const response = await api.post<RSVPResponse>('/api/events/rsvp', {
        event_id: eventId,
        status,
      });
      return response.data;
    },

    // Optimistic update - Update UI immediately
    onMutate: async ({ eventId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS_UPCOMING });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.EVENTS_PAST });

      // Snapshot previous values
      const previousUpcoming = queryClient.getQueryData(QUERY_KEYS.EVENTS_UPCOMING);
      const previousPast = queryClient.getQueryData(QUERY_KEYS.EVENTS_PAST);

      // Optimistically update upcoming events
      queryClient.setQueryData<EventWithRSVP[]>(
        QUERY_KEYS.EVENTS_UPCOMING,
        (old) => {
          if (!old) return old;
          return old.map((event) =>
            event._id === eventId
              ? {
                  ...event,
                  rsvp_status: status,
                  attendee_count:
                    status === 'going'
                      ? event.attendee_count + 1
                      : status === null && event.rsvp_status === 'going'
                      ? event.attendee_count - 1
                      : event.attendee_count,
                }
              : event
          );
        }
      );

      // Optimistically update past events
      queryClient.setQueryData<EventWithRSVP[]>(
        QUERY_KEYS.EVENTS_PAST,
        (old) => {
          if (!old) return old;
          return old.map((event) =>
            event._id === eventId ? { ...event, rsvp_status: status } : event
          );
        }
      );

      return { previousUpcoming, previousPast };
    },

    // Revert on error
    onError: (_error, _variables, context) => {
      if (context?.previousUpcoming) {
        queryClient.setQueryData(QUERY_KEYS.EVENTS_UPCOMING, context.previousUpcoming);
      }
      if (context?.previousPast) {
        queryClient.setQueryData(QUERY_KEYS.EVENTS_PAST, context.previousPast);
      }
    },

    // Refetch on success (to get accurate attendee count)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS_UPCOMING });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS_PAST });
    },
  });
}
