/**
 * Route Prefetching Utility
 *
 * Preloads critical page chunks to improve perceived performance.
 * Call prefetchCriticalRoutes() on login page to preload Dashboard, Members, Events.
 */

// Critical routes to prefetch after user lands on login page
const criticalRoutes = [
  () => import('../pages/Dashboard'),
  () => import('../pages/Members'),
  () => import('../pages/Events'),
  () => import('../pages/Settings'),
];

// Secondary routes to prefetch after critical ones are done
const secondaryRoutes = [
  () => import('../pages/ImportExport'),
  () => import('../pages/Groups/GroupsListPage'),
  () => import('../pages/PrayerRequests/PrayerRequestsList'),
  () => import('../pages/Accounting/AccountingDashboard'),
];

/**
 * Prefetch critical routes during idle time
 * Uses requestIdleCallback for non-blocking prefetch
 */
export function prefetchCriticalRoutes() {
  // Only prefetch on login page and if browser supports idle callback
  if (typeof window === 'undefined') return;

  const prefetch = (routes, delay = 0) => {
    setTimeout(() => {
      if ('requestIdleCallback' in window) {
        routes.forEach((importFn) => {
          requestIdleCallback(() => {
            importFn().catch(() => {
              // Silently ignore prefetch errors
            });
          }, { timeout: 3000 });
        });
      } else {
        // Fallback for Safari
        routes.forEach((importFn) => {
          setTimeout(() => {
            importFn().catch(() => {});
          }, 100);
        });
      }
    }, delay);
  };

  // Prefetch critical routes immediately after 1s (let login page render first)
  prefetch(criticalRoutes, 1000);

  // Prefetch secondary routes after 3s
  prefetch(secondaryRoutes, 3000);
}

/**
 * Prefetch a specific route on hover/focus
 * Use this on navigation links for instant transitions
 */
export function prefetchRoute(importFn) {
  if (typeof window === 'undefined') return;

  importFn().catch(() => {
    // Silently ignore prefetch errors
  });
}
