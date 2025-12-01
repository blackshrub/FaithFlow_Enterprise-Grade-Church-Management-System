/**
 * Biometric Authentication Store
 *
 * Manages biometric (fingerprint/Face ID) quick login settings.
 * After initial WhatsApp login, users can enable biometric for faster access.
 *
 * Flow:
 * 1. User logs in via WhatsApp OTP (first time)
 * 2. User enables biometric in settings
 * 3. On subsequent app opens, biometric prompt appears
 * 4. If successful, user is authenticated without WhatsApp
 * 5. If failed/cancelled, user must use WhatsApp login
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { mmkvStorage } from '@/lib/storage';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Secure storage key for biometric credential
const BIOMETRIC_CREDENTIAL_KEY = 'faithflow_biometric_credential';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

interface BiometricAuthState {
  // Device capabilities
  isHardwareSupported: boolean;
  isEnrolled: boolean;
  biometricTypes: BiometricType[];

  // User settings
  isEnabled: boolean;
  lastAuthTime: string | null;

  // App lock state
  isLocked: boolean;
  requiresAuth: boolean;

  // Loading states
  isChecking: boolean;
  isAuthenticating: boolean;
  error: string | null;

  // Actions
  checkHardwareSupport: () => Promise<void>;
  enableBiometric: (memberId: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticate: (reason?: string) => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  setRequiresAuth: (requires: boolean) => void;
  clearError: () => void;
}

/**
 * Convert expo-local-authentication types to our types
 */
const mapBiometricType = (type: LocalAuthentication.AuthenticationType): BiometricType => {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facial';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
    default:
      return 'none';
  }
};

export const useBiometricAuthStore = create<BiometricAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isHardwareSupported: false,
      isEnrolled: false,
      biometricTypes: [],
      isEnabled: false,
      lastAuthTime: null,
      isLocked: false,
      requiresAuth: false,
      isChecking: false,
      isAuthenticating: false,
      error: null,

      /**
       * Check device biometric hardware support
       * Should be called on app startup
       */
      checkHardwareSupport: async () => {
        set({ isChecking: true, error: null });

        try {
          // Check if hardware is available
          const hasHardware = await LocalAuthentication.hasHardwareAsync();

          // Check if biometric is enrolled
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          // Get available biometric types
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          const biometricTypes = types.map(mapBiometricType);

          set({
            isHardwareSupported: hasHardware,
            isEnrolled,
            biometricTypes,
            isChecking: false,
          });

          console.log('[Biometric] Hardware check:', {
            hasHardware,
            isEnrolled,
            types: biometricTypes,
          });
        } catch (error) {
          console.error('[Biometric] Hardware check failed:', error);
          set({
            isHardwareSupported: false,
            isEnrolled: false,
            isChecking: false,
            error: 'Failed to check biometric hardware',
          });
        }
      },

      /**
       * Enable biometric authentication for the current user
       * Stores a credential marker in SecureStore
       */
      enableBiometric: async (memberId: string) => {
        const { isHardwareSupported, isEnrolled } = get();

        if (!isHardwareSupported || !isEnrolled) {
          set({ error: 'Biometric not available on this device' });
          return false;
        }

        try {
          // Prompt user to confirm with biometric
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Confirm to enable biometric login',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
            fallbackLabel: 'Use passcode',
          });

          if (result.success) {
            // Store credential marker
            await SecureStore.setItemAsync(
              BIOMETRIC_CREDENTIAL_KEY,
              JSON.stringify({
                memberId,
                enabledAt: new Date().toISOString(),
              })
            );

            set({
              isEnabled: true,
              lastAuthTime: new Date().toISOString(),
              error: null,
            });

            console.log('[Biometric] Enabled for member:', memberId);
            return true;
          } else {
            set({ error: result.error || 'Authentication cancelled' });
            return false;
          }
        } catch (error) {
          console.error('[Biometric] Enable failed:', error);
          set({ error: 'Failed to enable biometric' });
          return false;
        }
      },

      /**
       * Disable biometric authentication
       */
      disableBiometric: async () => {
        try {
          await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIAL_KEY);
          set({
            isEnabled: false,
            lastAuthTime: null,
            isLocked: false,
            requiresAuth: false,
            error: null,
          });
          console.log('[Biometric] Disabled');
        } catch (error) {
          console.error('[Biometric] Disable failed:', error);
          set({ error: 'Failed to disable biometric' });
        }
      },

      /**
       * Authenticate user with biometric
       * Returns true if successful
       */
      authenticate: async (reason?: string) => {
        const { isEnabled, isHardwareSupported, isEnrolled } = get();

        if (!isEnabled || !isHardwareSupported || !isEnrolled) {
          return false;
        }

        set({ isAuthenticating: true, error: null });

        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: reason || 'Authenticate to access FaithFlow',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
            fallbackLabel: 'Use passcode',
          });

          if (result.success) {
            set({
              isAuthenticating: false,
              isLocked: false,
              requiresAuth: false,
              lastAuthTime: new Date().toISOString(),
            });
            console.log('[Biometric] Authentication successful');
            return true;
          } else {
            set({
              isAuthenticating: false,
              error: result.error || 'Authentication failed',
            });
            console.log('[Biometric] Authentication failed:', result.error);
            return false;
          }
        } catch (error) {
          console.error('[Biometric] Authentication error:', error);
          set({
            isAuthenticating: false,
            error: 'Biometric authentication error',
          });
          return false;
        }
      },

      /**
       * Lock the app (require biometric on next interaction)
       */
      lock: () => {
        const { isEnabled } = get();
        if (isEnabled) {
          set({ isLocked: true, requiresAuth: true });
          console.log('[Biometric] App locked');
        }
      },

      /**
       * Unlock the app
       */
      unlock: () => {
        set({ isLocked: false, requiresAuth: false });
        console.log('[Biometric] App unlocked');
      },

      /**
       * Set requires auth flag
       */
      setRequiresAuth: (requires: boolean) => {
        set({ requiresAuth: requires });
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'faithflow-biometric',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user settings, not runtime state
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        lastAuthTime: state.lastAuthTime,
      }),
    }
  )
);

/**
 * Hook to get biometric display name
 */
export function useBiometricName(): string {
  const { biometricTypes } = useBiometricAuthStore();

  if (biometricTypes.includes('facial')) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
  }
  if (biometricTypes.includes('fingerprint')) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
  }
  if (biometricTypes.includes('iris')) {
    return 'Iris Scanner';
  }
  return 'Biometric';
}

/**
 * Hook to check if biometric is available
 */
export function useBiometricAvailable(): boolean {
  const { isHardwareSupported, isEnrolled } = useBiometricAuthStore();
  return isHardwareSupported && isEnrolled;
}

export default useBiometricAuthStore;
