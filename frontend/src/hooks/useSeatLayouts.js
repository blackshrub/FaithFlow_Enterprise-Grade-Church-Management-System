import { useQuery } from '@tanstack/react-query';
import { seatLayoutsAPI } from '@/services/api';

export function useSeatLayouts() {
  return useQuery({
    queryKey: ['seatLayouts'],
    queryFn: async () => {
      const response = await seatLayoutsAPI.list();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSeatLayout(id) {
  return useQuery({
    queryKey: ['seatLayouts', id],
    queryFn: async () => {
      const response = await seatLayoutsAPI.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}
