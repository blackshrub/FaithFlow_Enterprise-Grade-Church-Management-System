/**
 * React Query hooks for Counseling & Prayer Appointment module
 * 
 * Provides hooks for:
 * - Counselors management
 * - Recurring rules
 * - Overrides
 * - Time slots
 * - Appointments (admin)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ==================== COUNSELORS ====================

export const useCounselors = () => {
  return useQuery({
    queryKey: ['counselors'],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/counselors');
      return response.data.data;
    },
  });
};

export const useCreateCounselor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/counselors', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors'] });
    },
  });
};

export const useUpdateCounselor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/counselors/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors'] });
    },
  });
};

export const useDeleteCounselor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/counselors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors'] });
    },
  });
};

// ==================== RECURRING RULES ====================

export const useRecurringRules = (counselorId = null) => {
  return useQuery({
    queryKey: ['recurring-rules', counselorId],
    queryFn: async () => {
      const params = counselorId ? { counselor_id: counselorId } : {};
      const response = await api.get('/v1/counseling/recurring-rules', { params });
      return response.data.data;
    },
  });
};

export const useCreateRecurringRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/recurring-rules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useUpdateRecurringRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/recurring-rules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useDeleteRecurringRule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/recurring-rules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

// ==================== OVERRIDES ====================

export const useOverrides = (filters = {}) => {
  return useQuery({
    queryKey: ['overrides', filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/overrides', { params: filters });
      return response.data.data;
    },
  });
};

export const useCreateOverride = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/overrides', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useUpdateOverride = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/overrides/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useDeleteOverride = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/overrides/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

// ==================== TIME SLOTS ====================

export const useTimeSlots = (filters = {}) => {
  return useQuery({
    queryKey: ['slots', filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/slots', { params: filters });
      return response.data.data;
    },
  });
};

// ==================== APPOINTMENTS ====================

export const useAppointments = (filters = {}) => {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/appointments', { params: filters });
      return response.data.data;
    },
  });
};

export const useAppointment = (id) => {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const response = await api.get(`/v1/counseling/appointments/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/appointments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/appointments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
    },
  });
};

export const useApproveAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, admin_notes }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/approve`, { admin_notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
    },
  });
};

export const useRejectAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/cancel`, null, {
        params: { reason }
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
};

export const useCompleteAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, outcome_notes }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/complete`, { outcome_notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
    },
  });
};

// ==================== HELPER: Search Members ====================

export const useSearchMembers = (searchTerm) => {
  return useQuery({
    queryKey: ['members', 'search', searchTerm],
    queryFn: async () => {
      const response = await api.get('/members', {
        params: {
          search: searchTerm,
          limit: 20
        }
      });
      return response.data.data || [];
    },
    enabled: searchTerm && searchTerm.length >= 2,
  });
};

// ==================== HELPER: Staff Users ====================

export const useStaffUsers = () => {
  return useQuery({
    queryKey: ['users', 'staff'],
    queryFn: async () => {
      const response = await api.get('/auth/users');
      return response.data.data || [];
    },
  });
};
