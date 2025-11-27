import { useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";
import type {
  MemberLoginRequest,
  MemberLoginResponse,
  MemberVerifyOTPRequest,
  MemberAuthResponse,
} from "@/types/api";

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
      // Map API member to store member format
      const member = {
        ...data.member,
        full_name: data.member.name || data.member.name || '',
        avatar_url: data.member.profile_photo_url,
      };
      await login(data.access_token, member as any);
    },
  });
}

/**
 * Hook to logout
 */
export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Just clear local data, no API call needed
      await logout();
    },
  });
}
