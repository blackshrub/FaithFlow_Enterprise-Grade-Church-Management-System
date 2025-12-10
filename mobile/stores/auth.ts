import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import * as SecureStore from "expo-secure-store";
import { logError } from '@/utils/errorHelpers';
import { useWebSocketStore } from './websocket';

interface Member {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  name?: string; // From API - alternate name field
  email?: string;
  phone_whatsapp?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'male' | 'female';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  marital_status?: 'Married' | 'Not Married' | 'Widower' | 'Widow';
  occupation?: string;
  baptism_date?: string;
  membership_date?: string;
  member_since?: string; // From API
  notes?: string;
  church_id: string;
  church_name?: string;
  profile_photo_url?: string; // From API
  photo_url?: string; // Alias for profile_photo_url
  avatar_url?: string; // Alias for avatar
  is_active?: boolean; // From API
}

interface AuthState {
  token: string | null;
  member: Member | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Derived church context
  churchId: string | null;
  sessionChurchId: string | null;

  // Actions
  setToken: (token: string) => Promise<void>;
  setMember: (member: Member) => Promise<void>;  // Fixed: should be async
  login: (token: string, member: Member) => Promise<void>;
  loginDemo: () => Promise<void>; // Demo login for testing
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const TOKEN_KEY = "auth_token";
const MEMBER_KEY = "auth_member";

// Guard against concurrent initialization calls
let initializationPromise: Promise<void> | null = null;

/**
 * SEC-M4 FIX: Minimal member fields to store locally
 * Only essential fields for auth/display - no sensitive PII
 */
interface MinimalMember {
  id: string;
  church_id: string;
  full_name: string;
  church_name?: string;
  phone_whatsapp?: string;
  email?: string;
  profile_photo_url?: string;
}

/**
 * Extract minimal fields from full member object for secure storage
 * Reduces PII exposure if device is compromised
 */
function extractMinimalMember(member: Member): MinimalMember {
  return {
    id: member.id,
    church_id: member.church_id,
    full_name: member.full_name || member.name || '',
    church_name: member.church_name,
    phone_whatsapp: member.phone_whatsapp,
    email: member.email,
    profile_photo_url: member.profile_photo_url,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  member: null,
  isLoading: true,
  isAuthenticated: false,
  churchId: null,
  sessionChurchId: null,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },

  setMember: async (member: Member) => {
    // SEC-M4 FIX: Store only minimal PII in SecureStore
    const minimalMember = extractMinimalMember(member);
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(minimalMember));
    // Keep full member in memory state for current session
    set({
      member,
      churchId: member.church_id,
      sessionChurchId: member.church_id,
    });
  },

  login: async (token: string, member: Member) => {
    // SEC-M4 FIX: Store only minimal PII in SecureStore
    const minimalMember = extractMinimalMember(member);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(minimalMember));
    set({
      token,
      member,
      churchId: member.church_id,
      sessionChurchId: member.church_id,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  /**
   * SECURITY: Demo login is only available in development builds.
   * In production, this function throws an error to prevent unauthorized access.
   */
  loginDemo: async () => {
    // SECURITY: Only allow demo login in development mode
    if (!__DEV__) {
      console.error('[Auth] Demo login attempted in production build - blocked');
      throw new Error('Demo login is not available in production');
    }

    // Demo member data
    const demoMember: Member = {
      id: "demo-member-001",
      full_name: "Demo User",
      first_name: "Demo",
      last_name: "User",
      email: "demo@faithflow.com",
      phone_whatsapp: "8123456789",
      date_of_birth: "1990-01-01",
      gender: "Male",
      address: "123 Demo Street",
      city: "Jakarta",
      state: "DKI Jakarta",
      country: "Indonesia",
      marital_status: "Married",
      occupation: "Software Developer",
      baptism_date: "2010-06-15",
      membership_date: "2010-07-01",
      notes: "Demo account for testing",
      church_id: "demo-church-001",
      church_name: "FaithFlow Demo Church",
    };

    const demoToken = "demo-jwt-token-for-testing";

    await SecureStore.setItemAsync(TOKEN_KEY, demoToken);
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(demoMember));

    set({
      token: demoToken,
      member: demoMember,
      churchId: demoMember.church_id,
      sessionChurchId: demoMember.church_id,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    // SEC-M9 FIX: Disconnect WebSocket on logout to prevent lingering connections
    try {
      const wsStore = useWebSocketStore.getState();
      wsStore.disconnect();
    } catch (error) {
      // Don't fail logout if WebSocket disconnect fails
      logError('Auth', 'disconnectWebSocket', error, 'warning');
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(MEMBER_KEY);
    set({
      token: null,
      member: null,
      churchId: null,
      sessionChurchId: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initialize: async () => {
    // Prevent concurrent initialization - return existing promise if already initializing
    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const memberStr = await SecureStore.getItemAsync(MEMBER_KEY);
        const member = memberStr ? JSON.parse(memberStr) : null;

        // SEC FIX: Check if JWT is expired before accepting it
        let isTokenValid = !!token;
        if (token && token !== 'demo-jwt-token-for-testing') {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const exp = payload.exp;
              if (exp && Date.now() >= exp * 1000) {
                // Token expired - clear credentials
                console.log('[Auth] JWT expired during initialization, clearing credentials');
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                await SecureStore.deleteItemAsync(MEMBER_KEY);
                isTokenValid = false;
              }
            }
          } catch (decodeError) {
            logError('Auth', 'decodeJWT', decodeError, 'info');
            // Continue with token - backend will reject if invalid
          }
        }

        // Atomic state update to prevent partial state
        set({
          token: isTokenValid ? token : null,
          member: isTokenValid ? member : null,
          churchId: isTokenValid ? (member?.church_id ?? null) : null,
          sessionChurchId: isTokenValid ? (member?.church_id ?? null) : null,
          isAuthenticated: isTokenValid,
          isLoading: false,
        });
      } catch (error) {
        logError('Auth', 'initialize', error, 'critical');
        set({ isLoading: false });
      } finally {
        // DATA FIX: Remove setTimeout race condition - use flag-based approach
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  },
}));

// =============================================================================
// SHALLOW SELECTORS
// Performance: Prevent re-renders when only unrelated state changes
// =============================================================================

/**
 * Use when you only need member data (prevents re-render on token change)
 * @example const { member, isAuthenticated } = useAuthMember();
 */
export const useAuthMember = () =>
  useAuthStore(
    useShallow((state) => ({
      member: state.member,
      isAuthenticated: state.isAuthenticated,
    }))
  );

/**
 * Use when you only need the token (prevents re-render on member change)
 * @example const { token } = useAuthToken();
 */
export const useAuthToken = () =>
  useAuthStore(
    useShallow((state) => ({
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }))
  );

/**
 * Use when you only need auth actions (never re-renders)
 * @example const { login, logout } = useAuthActions();
 */
export const useAuthActions = () =>
  useAuthStore(
    useShallow((state) => ({
      login: state.login,
      loginDemo: state.loginDemo,
      logout: state.logout,
      setToken: state.setToken,
      setMember: state.setMember,
      initialize: state.initialize,
    }))
  );

/**
 * Use when you only need loading state
 * @example const { isLoading } = useAuthLoading();
 */
export const useAuthLoading = () =>
  useAuthStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
    }))
  );
