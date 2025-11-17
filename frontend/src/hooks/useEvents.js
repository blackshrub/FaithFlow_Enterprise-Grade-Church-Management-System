import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '@/services/api';

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
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => eventsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => eventsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
