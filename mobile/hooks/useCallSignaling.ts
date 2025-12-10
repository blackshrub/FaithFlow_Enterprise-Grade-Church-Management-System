/**
 * Call Signaling Hook
 *
 * Automatically connects/disconnects call signaling based on auth state.
 * Should be used at the root layout level to ensure signaling is always active
 * when the user is authenticated.
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import {
  initializeCallSignaling,
  cleanupCallSignaling,
  callSignalingService,
} from '@/services/callSignaling';
import { logError } from '@/utils/errorHelpers';

/**
 * Hook that manages call signaling connection based on auth state.
 * Call this once at the root layout level.
 */
export function useCallSignalingInit(): void {
  const { isAuthenticated, token, member } = useAuthStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    const handleSignaling = async () => {
      // Connect when authenticated
      if (isAuthenticated && token && member?.id && member?.church_id) {
        // Only connect if not already connected
        if (!callSignalingService.connected && !isInitialized.current) {
          isInitialized.current = true;
          try {
            console.log('[useCallSignaling] Initializing call signaling...');
            await initializeCallSignaling(member.church_id, member.id, token);
            console.log('[useCallSignaling] Call signaling connected');
          } catch (error) {
            logError('CallSignaling', 'initialize', error, 'warning');
            isInitialized.current = false;
          }
        }
      }
      // Disconnect when not authenticated
      else if (!isAuthenticated) {
        if (callSignalingService.connected || isInitialized.current) {
          console.log('[useCallSignaling] Cleaning up call signaling...');
          cleanupCallSignaling();
          isInitialized.current = false;
        }
      }
    };

    handleSignaling();

    // Cleanup on unmount
    return () => {
      cleanupCallSignaling();
      isInitialized.current = false;
    };
  }, [isAuthenticated, token, member?.id, member?.church_id]);
}

/**
 * Hook to get call signaling connection status.
 */
export function useCallSignalingStatus(): {
  connected: boolean;
  activeCallId: string | null;
} {
  return {
    connected: callSignalingService.connected,
    activeCallId: callSignalingService.activeCallId,
  };
}
