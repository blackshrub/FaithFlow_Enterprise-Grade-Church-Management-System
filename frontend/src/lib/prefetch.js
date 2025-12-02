/**
 * Route prefetching utilities for improved navigation performance
 * Prefetches route components and data on hover/focus
 */

import { queryClient } from './react-query';

// Map of routes to their lazy import functions for prefetching
const routeImports = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/members': () => import('../pages/Members'),
  '/settings': () => import('../pages/Settings'),
  '/events': () => import('../pages/Events'),
  '/events/ratings': () => import('../pages/EventRatings'),
  '/seat-layouts': () => import('../pages/SeatLayouts'),
  '/kiosk': () => import('../pages/KioskMode'),
  '/import-export': () => import('../pages/ImportExport'),
  '/prayer-requests': () => import('../pages/PrayerRequests/PrayerRequestsList'),
  '/communities': () => import('../pages/Communities/CommunitiesListPage'),
  '/groups': () => import('../pages/Groups/GroupsListPage'),
  '/articles': () => import('../pages/Articles/ArticlesList'),
  '/integrations': () => import('../pages/SystemSettings'),
  '/users/management': () => import('../pages/System/UserManagement'),
  // Accounting
  '/accounting': () => import('../pages/Accounting/AccountingDashboard'),
  '/accounting/coa': () => import('../pages/Accounting/ChartOfAccounts'),
  '/accounting/journals': () => import('../pages/Accounting/Journals'),
  '/accounting/budgets': () => import('../pages/Accounting/Budgets'),
  '/accounting/reports': () => import('../pages/Accounting/Reports'),
  // Counseling
  '/counseling': () => import('../pages/Counseling/Dashboard'),
  '/counseling/counselors': () => import('../pages/Counseling/Counselors'),
  '/counseling/availability': () => import('../pages/Counseling/Availability'),
  '/counseling/appointments': () => import('../pages/Counseling/Appointments'),
  // Content Center
  '/content-center': () => import('../pages/Explore/ExploreDashboard'),
  '/content-center/schedule': () => import('../pages/Explore/SchedulingCalendar'),
  '/content-center/analytics': () => import('../pages/Explore/AnalyticsDashboard'),
  '/content-center/ai': () => import('../pages/Explore/AIGenerationHub'),
  '/content-center/devotion': () => import('../pages/Explore/ExploreContentList'),
  '/content-center/verse': () => import('../pages/Explore/ExploreContentList'),
  '/content-center/figure': () => import('../pages/Explore/ExploreContentList'),
  '/content-center/quiz': () => import('../pages/Explore/ExploreContentList'),
  '/content-center/bible-study': () => import('../pages/Explore/ExploreContentList'),
  '/content-center/topical': () => import('../pages/Explore/ExploreContentList'),
};

// Track what's been prefetched to avoid duplicate work
const prefetchedRoutes = new Set();

/**
 * Prefetch a route's component code
 * @param {string} path - The route path to prefetch
 */
export function prefetchRoute(path) {
  // Normalize path (remove trailing slash, handle submenu paths)
  const normalizedPath = path.replace(/\/$/, '') || '/';

  // Skip if already prefetched
  if (prefetchedRoutes.has(normalizedPath)) {
    return;
  }

  // Find matching import
  const importFn = routeImports[normalizedPath];
  if (importFn) {
    prefetchedRoutes.add(normalizedPath);
    // Prefetch after a small delay to not block hover interactions
    setTimeout(() => {
      importFn().catch(() => {
        // Remove from set if prefetch fails so it can retry
        prefetchedRoutes.delete(normalizedPath);
      });
    }, 100);
  }
}

/**
 * Prefetch data for a route using React Query
 * @param {string[]} queryKey - The query key to prefetch
 * @param {Function} queryFn - The query function
 * @param {object} options - Additional options
 */
export function prefetchData(queryKey, queryFn, options = {}) {
  queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes default
  });
}

/**
 * Hook to add prefetch behavior to navigation items
 * Returns props to spread on navigation elements
 */
export function usePrefetchProps(path) {
  return {
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
  };
}
