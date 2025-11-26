import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export function useEvents(params = {}) {
  const { user } = useAuth();
  // Multi-tenant cache isolation - include church_id in query key
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useQuery({
    queryKey: ['events', sessionChurchId, params],
    queryFn: async () => {
      const response = await eventsAPI.list(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionChurchId,
  });
}

export function useEvent(id) {
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useQuery({
    queryKey: ['events', sessionChurchId, 'detail', id],
    queryFn: async () => {
      const response = await eventsAPI.get(id);
      return response.data;
    },
    enabled: !!sessionChurchId && !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: (data) => eventsAPI.create(data),
    onSuccess: () => {
      // Invalidate with church scope for proper multi-tenant cache
      queryClient.invalidateQueries({
        queryKey: ['events', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create event');
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: ({ id, data }) => eventsAPI.update(id, data),
    onSuccess: (updatedEvent, variables) => {
      // Optimistic update: directly update cache with church scope
      queryClient.setQueryData(['events', sessionChurchId, 'detail', variables.id], updatedEvent);

      // Invalidate with church scope
      queryClient.invalidateQueries({
        queryKey: ['events', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Event updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update event');
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const sessionChurchId = user?.session_church_id ?? user?.church_id;

  return useMutation({
    mutationFn: (id) => eventsAPI.delete(id),
    onSuccess: () => {
      // Invalidate with church scope
      queryClient.invalidateQueries({
        queryKey: ['events', sessionChurchId],
        refetchType: 'active'
      });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete event');
    },
  });
}
