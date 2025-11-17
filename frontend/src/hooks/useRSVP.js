import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '@/services/api';

export function useEventRSVPs(eventId, sessionId = null) {
  return useQuery({
    queryKey: ['rsvps', eventId, sessionId],
    queryFn: async () => {
      const response = await eventsAPI.getRSVPs(eventId);
      let rsvps = response.data.rsvps || [];
      
      // Filter by session if provided
      if (sessionId) {
        rsvps = rsvps.filter(r => r.session_id === sessionId);
      }
      
      return {
        ...response.data,
        rsvps,
        total_rsvps: rsvps.length
      };
    },
    enabled: !!eventId,
  });
}

export function useAvailableSeats(eventId, sessionId = null) {
  return useQuery({
    queryKey: ['availableSeats', eventId, sessionId],
    queryFn: async () => {
      const params = sessionId ? { session_id: sessionId } : {};
      const response = await eventsAPI.getAvailableSeats(eventId, params);
      return response.data;
    },
    enabled: !!eventId,
  });
}

export function useRegisterRSVP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, memberId, sessionId, seat }) => 
      eventsAPI.registerRSVP(eventId, { member_id: memberId, session_id: sessionId, seat }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['availableSeats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useCancelRSVP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, memberId, sessionId }) => 
      eventsAPI.cancelRSVP(eventId, memberId, sessionId ? { session_id: sessionId } : {}),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rsvps', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['availableSeats', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
