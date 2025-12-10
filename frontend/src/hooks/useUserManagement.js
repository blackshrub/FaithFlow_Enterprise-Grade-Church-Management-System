/**
 * React Query hooks for User Management
 * CRITICAL: All queries include church_id for multi-tenant data isolation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useUsers = (filters = {}) => {
  const { church } = useAuth();

  return useQuery({
    queryKey: ['users', 'management', church?.id, filters],
    queryFn: async () => {
      const response = await api.get('/v1/users/management', { params: filters });
      return response.data.data;
    },
    enabled: !!church?.id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/users/management', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'management', church?.id] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/users/management/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'management', church?.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { church } = useAuth();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/users/management/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'management', church?.id] });
    },
  });
};
