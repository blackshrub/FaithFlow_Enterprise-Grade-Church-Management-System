import { QueryClient } from '@tanstack/react-query';

/**
 * World-class React Query configuration for optimal performance
 *
 * Performance optimizations:
 * 1. Smart stale times based on data type
 * 2. Longer garbage collection to preserve cache
 * 3. Conditional refetch strategies
 * 4. Exponential backoff for retries
 * 5. Network-aware fetching
 */

// Retry with exponential backoff
const retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000);

// Create a query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 3 minutes
      staleTime: 1000 * 60 * 3,

      // Keep unused data for 30 minutes (preserve cache between page visits)
      gcTime: 1000 * 60 * 30,

      // Retry failed requests twice with exponential backoff
      retry: 2,
      retryDelay,

      // Don't refetch on window focus (avoids unnecessary requests)
      refetchOnWindowFocus: false,

      // Only refetch on mount if data is stale
      refetchOnMount: 'always',

      // Refetch on reconnect to sync stale data
      refetchOnReconnect: 'always',

      // Network mode: fetch when online, use cache when offline
      networkMode: 'offlineFirst',

      // Structural sharing for optimal re-renders
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
      retryDelay,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Query options presets for different data freshness requirements
 */
export const queryPresets = {
  // Real-time data (notifications, activity feeds)
  realtime: {
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refetch every minute
    refetchOnWindowFocus: true,
  },

  // Standard data (members, events, groups)
  standard: {
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },

  // Static data (categories, settings, bible content)
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },

  // User-specific data (profile, preferences)
  user: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },

  // Dashboard/stats data (slightly longer stale time)
  dashboard: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  },

  // Search results (short-lived)
  search: {
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
};

/**
 * Invalidate all queries for a specific church (multi-tenant cache reset)
 */
export const invalidateChurchData = async (churchId) => {
  // Invalidate all queries that contain churchId
  await queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      // Type-safe check: iterate through query key array to find exact churchId match
      // This prevents partial string matching (e.g., "123" matching "1234")
      return queryKey.some((keyPart) => {
        // Handle objects with churchId property
        if (typeof keyPart === 'object' && keyPart !== null) {
          return keyPart.churchId === churchId || keyPart.church_id === churchId;
        }
        // Handle direct string matches
        return keyPart === churchId;
      });
    },
  });
};

/**
 * Prefetch common data for faster navigation
 */
export const prefetchCommonData = async (churchId, fetchers) => {
  const prefetchPromises = [];

  if (fetchers.members) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.members.all(churchId),
        queryFn: fetchers.members,
        ...queryPresets.standard,
      })
    );
  }

  if (fetchers.events) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.events.all(churchId),
        queryFn: fetchers.events,
        ...queryPresets.standard,
      })
    );
  }

  await Promise.all(prefetchPromises);
};

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
    trash: (churchId) => ['members', 'trash', { churchId }],
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
