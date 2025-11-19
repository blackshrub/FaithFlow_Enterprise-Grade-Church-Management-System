import { QueryClient } from '@tanstack/react-query';

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factory for consistent naming and multi-tenant scoping
export const queryKeys = {
  // Auth keys
  auth: {
    currentUser: ['auth', 'currentUser'],
    users: (churchId) => ['auth', 'users', { churchId }],
  },
  
  // Churches keys
  churches: {
    all: ['churches'],
    public: ['churches', 'public'],
    detail: (id) => ['churches', id],
  },
  
  // Members keys
  members: {
    all: (churchId, params = {}) => ['members', { churchId, ...params }],
    detail: (churchId, id) => ['members', churchId, id],
    stats: (churchId) => ['members', 'stats', { churchId }],
  },
  
  // Groups keys
  groups: {
    all: (churchId, params = {}) => ['groups', { churchId, ...params }],
    detail: (churchId, id) => ['groups', churchId, id],
  },
  
  // Events keys
  events: {
    all: (churchId, params = {}) => ['events', { churchId, ...params }],
    detail: (churchId, id) => ['events', churchId, id],
  },
  
  // Donations keys
  donations: {
    all: (churchId, params = {}) => ['donations', { churchId, ...params }],
    detail: (churchId, id) => ['donations', churchId, id],
    stats: (churchId) => ['donations', 'stats', { churchId }],
  },
  
  // Prayer requests keys
  prayers: {
    all: (churchId, params = {}) => ['prayers', { churchId, ...params }],
    detail: (churchId, id) => ['prayers', churchId, id],
  },
  
  // Content keys
  content: {
    all: (churchId, params = {}) => ['content', { churchId, ...params }],
    detail: (churchId, id) => ['content', churchId, id],
  },
  
  // Spiritual journey keys
  spiritualJourney: {
    all: (churchId, params = {}) => ['spiritualJourney', { churchId, ...params }],
    detail: (churchId, memberId) => ['spiritualJourney', churchId, memberId],
  },
  
  // Settings keys
  settings: {
    memberStatuses: (churchId) => ['settings', 'memberStatuses', { churchId }],
    demographics: (churchId) => ['settings', 'demographics', { churchId }],
    churchSettings: (churchId) => ['settings', 'churchSettings', { churchId }],
  },
  
  // Status Rules keys
  statusRules: {
    list: (churchId) => ['status-rules', { churchId }],
    detail: (id) => ['status-rules', id],
  },
  
  // Status Conflicts keys
  statusConflicts: {
    list: (churchId, statusFilter, memberId) => ['status-conflicts', { churchId, statusFilter, memberId }],
    detail: (id) => ['status-conflicts', id],
  },
  
  // Status History keys
  statusHistory: {
    member: (memberId) => ['status-history', memberId],
  },
  
  // Webhooks keys
  webhooks: {
    all: (churchId) => ['webhooks', { churchId }],
    detail: (id) => ['webhooks', id],
    logs: (id) => ['webhook-logs', id],
    queueStatus: (churchId) => ['webhook-queue-status', { churchId }],
  },
  
  // API Keys
  apiKeys: {
    all: (churchId) => ['api-keys', { churchId }],
  },
};
