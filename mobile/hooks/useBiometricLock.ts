/**
 * Biometric Lock Hook
 *
 * Manages app lock/unlock based on app state changes.
 * Locks app when backgrounded, requires biometric on resume.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBiometricAuthStore } from '@/stores/biometricAuth';
import { useAuthStore } from '@/stores/auth';
import { mmkv } from '@/lib/storage';

// Lock delay (ms) - don't lock immediately on quick app switches
const LOCK_DELAY_MS = 5000; // 5 seconds

// Storage key for background timestamp
const BACKGROUND_TIME_KEY = 'faithflow_background_time';

interface UseBiometricLockOptions {
  /** Whether to auto-prompt biometric when locked */
  autoPrompt?: boolean;
  /** Callback when authentication succeeds */
  onAuthSuccess?: () => void;
  /** Callback when authentication fails */
  onAuthFail?: () => void;
}

export function useBiometricLock(options: UseBiometricLockOptions = {}) {
  const { autoPrompt = true, onAuthSuccess, onAuthFail } = options;

  const appState = useRef(AppState.currentState);
  const authAttempted = useRef(false);

  const {
    isEnabled,
    isLocked,
    requiresAuth,
    isAuthenticating,
    lock,
    unlock,
    authenticate,
    checkHardwareSupport,
  } = useBiometricAuthStore();

  const { isAuthenticated } = useAuthStore();

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextAppState;

      // Only manage lock if biometric is enabled and user is authenticated
      if (!isEnabled || !isAuthenticated) {
        return;
      }

      // App going to background
      if (
        prevState === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // Store background timestamp
        mmkv.setString(BACKGROUND_TIME_KEY, Date.now().toString());
        console.log('[BiometricLock] App backgrounded, timestamp saved');
      }

      // App coming to foreground
      if (
        (prevState === 'inactive' || prevState === 'background') &&
        nextAppState === 'active'
      ) {
        // Check how long app was in background
        const backgroundTimeStr = mmkv.getString(BACKGROUND_TIME_KEY);
        const backgroundTime = backgroundTimeStr ? parseInt(backgroundTimeStr, 10) : 0;
        const elapsedMs = Date.now() - backgroundTime;

        if (elapsedMs > LOCK_DELAY_MS) {
          // Lock app after delay
          lock();
          authAttempted.current = false;
          console.log('[BiometricLock] App locked after', elapsedMs, 'ms in background');

          // Auto-prompt biometric if enabled
          if (autoPrompt && !authAttempted.current) {
            authAttempted.current = true;
            setTimeout(() => {
              handleAuthenticate();
            }, 300); // Small delay for UI to settle
          }
        } else {
          console.log('[BiometricLock] Quick switch, not locking');
        }
      }
    },
    [isEnabled, isAuthenticated, lock, autoPrompt]
  );

  /**
   * Perform biometric authentication
   */
  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;

    const success = await authenticate();
    if (success) {
      onAuthSuccess?.();
    } else {
      onAuthFail?.();
    }
  }, [authenticate, isAuthenticating, onAuthSuccess, onAuthFail]);

  /**
   * Initialize and listen to app state
   */
  useEffect(() => {
    // Check hardware support on mount
    checkHardwareSupport();

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange, checkHardwareSupport]);

  /**
   * Check lock state on mount (for when app is killed and reopened)
   */
  useEffect(() => {
    if (isEnabled && isAuthenticated && !isLocked) {
      // Check if we should lock based on stored background time
      const backgroundTimeStr = mmkv.getString(BACKGROUND_TIME_KEY);
      if (backgroundTimeStr) {
        const backgroundTime = parseInt(backgroundTimeStr, 10);
        const elapsedMs = Date.now() - backgroundTime;

        if (elapsedMs > LOCK_DELAY_MS) {
          lock();
          console.log('[BiometricLock] Locked on mount after', elapsedMs, 'ms');

          if (autoPrompt) {
            setTimeout(() => {
              handleAuthenticate();
            }, 500);
          }
        }
      }
    }
  }, [isEnabled, isAuthenticated, isLocked, lock, autoPrompt, handleAuthenticate]);

  return {
    isLocked,
    requiresAuth,
    isAuthenticating,
    authenticate: handleAuthenticate,
    unlock,
  };
}

export default useBiometricLock;
