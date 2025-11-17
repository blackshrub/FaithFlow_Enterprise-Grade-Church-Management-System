import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devotionsAPI, bibleAPI } from '@/services/api';

export function useDevotions(params = {}) {
  return useQuery({
    queryKey: ['devotions', params],
    queryFn: async () => {
      const response = await devotionsAPI.list(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDevotion(id) {
  return useQuery({
    queryKey: ['devotions', id],
    queryFn: async () => {
      const response = await devotionsAPI.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateDevotion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => devotionsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
}

export function useUpdateDevotion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => devotionsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
}

export function useDeleteDevotion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => devotionsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
    },
  });
}

export function useBibleVersions() {
  return useQuery({
    queryKey: ['bibleVersions'],
    queryFn: async () => {
      const response = await bibleAPI.getVersions();
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useBibleBooks() {
  return useQuery({
    queryKey: ['bibleBooks'],
    queryFn: async () => {
      const response = await bibleAPI.getBooks();
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
