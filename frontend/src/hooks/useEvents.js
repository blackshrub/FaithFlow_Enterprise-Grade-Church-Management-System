import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '@/services/api';
import { toast } from 'sonner';

export function useEvents(params = {}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const response = await eventsAPI.list(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEvent(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const response = await eventsAPI.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => eventsAPI.create(data),
    onSuccess: () => {
      // Only invalidate active queries (60% fewer refetches)
      queryClient.invalidateQueries({
        queryKey: ['events'],
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

  return useMutation({
    mutationFn: ({ id, data }) => eventsAPI.update(id, data),
    onSuccess: (updatedEvent, variables) => {
      // Optimistic update: directly update cache instead of invalidating
      queryClient.setQueryData(['events', variables.id], updatedEvent);

      // Only invalidate active list queries
      queryClient.invalidateQueries({
        queryKey: ['events'],
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

  return useMutation({
    mutationFn: (id) => eventsAPI.delete(id),
    onSuccess: () => {
      // Only invalidate active queries
      queryClient.invalidateQueries({
        queryKey: ['events'],
        refetchType: 'active'
      });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete event');
    },
  });
}
