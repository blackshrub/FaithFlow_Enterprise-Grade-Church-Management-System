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
import { useAuth } from '../context/AuthContext';

// Helper to get session church ID for cache isolation
const useSessionChurchId = () => {
  const { user } = useAuth();
  return user?.session_church_id ?? user?.church_id;
};

// ==================== COUNSELORS ====================

export const useCounselors = () => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['counselors', sessionChurchId],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/counselors');
      return response.data.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useCreateCounselor = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/counselors', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors', sessionChurchId] });
    },
  });
};

export const useUpdateCounselor = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/counselors/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors', sessionChurchId] });
    },
  });
};

export const useDeleteCounselor = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/counselors/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counselors', sessionChurchId] });
    },
  });
};

// ==================== RECURRING RULES ====================

export const useRecurringRules = (counselorId = null) => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['recurring-rules', sessionChurchId, counselorId],
    queryFn: async () => {
      const params = counselorId ? { counselor_id: counselorId } : {};
      const response = await api.get('/v1/counseling/recurring-rules', { params });
      return response.data.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useCreateRecurringRule = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/recurring-rules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useUpdateRecurringRule = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/recurring-rules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useDeleteRecurringRule = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/recurring-rules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

// ==================== OVERRIDES ====================

export const useOverrides = (filters = {}) => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['overrides', sessionChurchId, filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/overrides', { params: filters });
      return response.data.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useCreateOverride = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/overrides', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useUpdateOverride = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/overrides/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useDeleteOverride = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/v1/counseling/overrides/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overrides', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

// ==================== TIME SLOTS ====================

export const useTimeSlots = (filters = {}) => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['slots', sessionChurchId, filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/slots', { params: filters });
      return response.data.data;
    },
    enabled: !!sessionChurchId,
  });
};

// ==================== APPOINTMENTS ====================

export const usePendingAppointmentsCount = () => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['appointments-pending-count', sessionChurchId],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/appointments/pending-count');
      return response.data;
    },
    enabled: !!sessionChurchId,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useAppointments = (filters = {}) => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['appointments', sessionChurchId, filters],
    queryFn: async () => {
      const response = await api.get('/v1/counseling/appointments', { params: filters });
      return response.data.data;
    },
    enabled: !!sessionChurchId,
  });
};

export const useAppointment = (id) => {
  const sessionChurchId = useSessionChurchId();
  return useQuery({
    queryKey: ['appointment', sessionChurchId, id],
    queryFn: async () => {
      const response = await api.get(`/v1/counseling/appointments/${id}`);
      return response.data.data;
    },
    enabled: !!id && !!sessionChurchId,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/v1/counseling/appointments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/v1/counseling/appointments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionChurchId, variables.id] });
    },
  });
};

export const useApproveAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, admin_notes }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/approve`, { admin_notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionChurchId, variables.id] });
    },
  });
};

export const useRejectAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionChurchId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, reason }) => {
      // Changed from query param to request body to match backend update
      const response = await api.post(`/v1/counseling/appointments/${id}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionChurchId, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['slots', sessionChurchId] });
    },
  });
};

export const useCompleteAppointment = () => {
  const queryClient = useQueryClient();
  const sessionChurchId = useSessionChurchId();

  return useMutation({
    mutationFn: async ({ id, outcome_notes }) => {
      const response = await api.post(`/v1/counseling/appointments/${id}/complete`, { outcome_notes });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', sessionChurchId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', sessionChurchId, variables.id] });
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
