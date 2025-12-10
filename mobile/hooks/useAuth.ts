import { useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { registerPushToken, setupNotificationListeners, unregisterPushToken } from "@/services/pushNotifications";
import { logError } from "@/utils/errorHelpers";
import type {
  MemberLoginRequest,
  MemberLoginResponse,
  MemberVerifyOTPRequest,
  MemberAuthResponse,
} from "@/types/api";

/**
 * API Member Response Interface
 * The raw member object from the API may have different field names than our store Member type.
 * This interface defines all possible fields that can come from the API.
 */
interface ApiMember {
  id: string;
  church_id: string;
  // Name fields (API may use 'name' or 'full_name')
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  // Contact
  email?: string;
  phone_whatsapp?: string;
  // Personal info
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'male' | 'female';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  marital_status?: 'Married' | 'Not Married' | 'Widower' | 'Widow';
  occupation?: string;
  // Church info
  baptism_date?: string;
  membership_date?: string;
  member_since?: string;
  notes?: string;
  church_name?: string;
  // Photo (API may use different field names)
  profile_photo_url?: string;
  photo_url?: string;
  avatar_url?: string;
  // Status
  is_active?: boolean;
}

/**
 * Hook to send OTP to phone number via WhatsApp
 */
export function useSendOTP() {
  return useMutation({
    mutationFn: async (data: MemberLoginRequest) => {
      const response = await api.post<MemberLoginResponse>(
        API_ENDPOINTS.AUTH_SEND_OTP,
        data
      );
      return response.data;
    },
  });
}

/**
 * Hook to verify OTP and login
 */
export function useVerifyOTP() {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: async (data: MemberVerifyOTPRequest) => {
      const response = await api.post<MemberAuthResponse>(
        API_ENDPOINTS.AUTH_VERIFY_OTP,
        data
      );
      return response.data;
    },
    onSuccess: async (data) => {
      // Store token and member data
      // DATA FIX: Type-safe mapping from API response to store Member type
      // The API response may use different field names (e.g., 'name' vs 'full_name')
      const apiMember: ApiMember = data.member;

      // Map API response to store Member type with proper fallbacks
      const member = {
        id: apiMember.id,
        church_id: apiMember.church_id,
        // Prefer 'name' if available, fallback to 'full_name', then empty string
        full_name: apiMember.name || apiMember.full_name || '',
        first_name: apiMember.first_name,
        last_name: apiMember.last_name,
        name: apiMember.name,
        email: apiMember.email,
        phone_whatsapp: apiMember.phone_whatsapp,
        date_of_birth: apiMember.date_of_birth,
        gender: apiMember.gender,
        address: apiMember.address,
        city: apiMember.city,
        state: apiMember.state,
        country: apiMember.country,
        marital_status: apiMember.marital_status,
        occupation: apiMember.occupation,
        baptism_date: apiMember.baptism_date,
        membership_date: apiMember.membership_date,
        member_since: apiMember.member_since,
        notes: apiMember.notes,
        church_name: apiMember.church_name,
        // Use profile_photo_url as the canonical photo field
        profile_photo_url: apiMember.profile_photo_url,
        photo_url: apiMember.profile_photo_url,
        avatar_url: apiMember.profile_photo_url,
        is_active: apiMember.is_active,
      };
      await login(data.access_token, member);

      // Initialize push notifications after successful login
      // This registers the device token and sets up notification listeners
      try {
        // Set up notification listeners first
        setupNotificationListeners();

        // Register push token with backend
        await registerPushToken(data.member.id, data.member.church_id);
        console.log('[Auth] Push notifications initialized successfully');
      } catch (error) {
        // Don't fail login if push registration fails
        logError('Auth', 'initPushNotifications', error, 'warning');
      }
    },
  });
}

/**
 * Hook to logout
 *
 * SEC FIX: Now disconnects WebSocket on logout to prevent lingering connections
 */
export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Unregister push token before logging out
      // This ensures the device doesn't receive notifications after logout
      try {
        await unregisterPushToken();
        console.log('[Auth] Push token unregistered successfully');
      } catch (error) {
        // Don't fail logout if push unregistration fails
        logError('Auth', 'unregisterPushToken', error, 'warning');
      }

      // SEC FIX: Disconnect WebSocket to prevent lingering connections
      try {
        const wsStore = useWebSocketStore.getState();
        wsStore.disconnect();
        console.log('[Auth] WebSocket disconnected successfully');
      } catch (error) {
        // Don't fail logout if WebSocket disconnect fails
        logError('Auth', 'disconnectWebSocket', error, 'warning');
      }

      // Clear local data
      await logout();
    },
  });
}
