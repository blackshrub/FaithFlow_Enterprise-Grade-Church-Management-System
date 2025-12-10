/**
 * Network Status Store
 *
 * Global network state detection for the app.
 * UX FIX: UX-C2 - Global network status indicator
 *
 * Features:
 * - Detects online/offline status
 * - Provides isOnline, isOffline getters
 * - Auto-updates when network changes
 */

import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatusState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string | null;
  isInitialized: boolean;

  // Actions
  initialize: () => () => void;
  updateStatus: (state: NetInfoState) => void;
}

export const useNetworkStatusStore = create<NetworkStatusState>((set) => ({
  isConnected: null,
  isInternetReachable: null,
  type: null,
  isInitialized: false,

  initialize: () => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isInitialized: true,
      });
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      set({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isInitialized: true,
      });
    });

    // Return unsubscribe function
    return unsubscribe;
  },

  updateStatus: (state) => {
    set({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });
  },
}));

/**
 * Hook to check if the device is online
 * Returns true if connected AND internet is reachable
 */
export const useIsOnline = (): boolean => {
  const { isConnected, isInternetReachable } = useNetworkStatusStore();
  // Consider online only if both connected and internet is reachable
  // Handle null (unknown) as potentially online to avoid false negatives
  return isConnected !== false && isInternetReachable !== false;
};

/**
 * Hook to check if the device is offline
 * Returns true if definitely disconnected
 */
export const useIsOffline = (): boolean => {
  const { isConnected, isInternetReachable } = useNetworkStatusStore();
  // Only return offline if we're definitely not connected
  return isConnected === false || isInternetReachable === false;
};
