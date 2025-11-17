import { useQuery } from '@tanstack/react-query';
import { bibleAPI } from '@/services/api';

export function useBibleVersions() {
  return useQuery({
    queryKey: ['bibleVersions'],
    queryFn: async () => {
      const response = await bibleAPI.getVersions();
      return response.data;
    },
    staleTime: 60 * 60 * 1000,
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
