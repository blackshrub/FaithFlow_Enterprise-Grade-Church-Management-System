/**
 * Route Protection Hook
 *
 * SEC-M7: Ensures user is authenticated before accessing protected screens.
 * Use this hook at the top of any screen that requires authentication.
 *
 * Features:
 * - Redirects to login if not authenticated
 * - Handles loading state
 * - Works with deep links
 *
 * Usage:
 * ```tsx
 * function ProtectedScreen() {
 *   const { isLoading } = useRequireAuth();
 *   if (isLoading) return <LoadingScreen />;
 *   // ... rest of component
 * }
 * ```
 */

import { useEffect } from 'react';
import { router, usePathname, Href } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

interface UseRequireAuthOptions {
  /** Where to redirect if not authenticated. Default: /(auth)/login */
  redirectTo?: Href;
}

interface UseRequireAuthResult {
  /** True while checking auth state */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** Current member data (null if not authenticated) */
  member: any; // Member type from auth store
}

export function useRequireAuth(options?: UseRequireAuthOptions): UseRequireAuthResult {
  const { redirectTo = '/(auth)/login' as Href } = options || {};
  const { token, member, isLoading, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth state to initialize
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated || !token) {
      console.log('[Auth Guard] Not authenticated, redirecting from:', pathname);
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, token, redirectTo, pathname]);

  return {
    isLoading,
    isAuthenticated,
    member,
  };
}

/**
 * Hook to check if user is guest (not authenticated)
 * Use this for auth screens to redirect away if already logged in
 */
export function useRequireGuest(redirectTo: Href = '/(tabs)' as Href): { isLoading: boolean } {
  const { isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      console.log('[Auth Guard] Already authenticated, redirecting to:', redirectTo);
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  return { isLoading };
}
