import { useQuery } from '@tanstack/react-query';
import { seatLayoutsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

// CRITICAL: Include church_id in query keys for multi-tenant data isolation
export function useSeatLayouts() {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['seatLayouts', church?.id],
    queryFn: async () => {
      const response = await seatLayoutsAPI.list();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!church?.id,
  });
}

export function useSeatLayout(id) {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['seatLayouts', church?.id, id],
    queryFn: async () => {
      const response = await seatLayoutsAPI.get(id);
      return response.data;
    },
    enabled: !!church?.id && !!id,
  });
}
