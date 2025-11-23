import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface Member {
  id: string;
  name: string;
  email?: string;
  phone: string;
  church_id: string;
  church_name?: string;
}

interface AuthState {
  token: string | null;
  member: Member | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setToken: (token: string) => Promise<void>;
  setMember: (member: Member) => void;
  login: (token: string, member: Member) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

const TOKEN_KEY = "auth_token";
const MEMBER_KEY = "auth_member";

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  member: null,
  isLoading: true,
  isAuthenticated: false,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },

  setMember: (member: Member) => {
    SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(member));
    set({ member });
  },

  login: async (token: string, member: Member) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(member));
    set({
      token,
      member,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(MEMBER_KEY);
    set({
      token: null,
      member: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const memberStr = await SecureStore.getItemAsync(MEMBER_KEY);
      const member = memberStr ? JSON.parse(memberStr) : null;

      set({
        token,
        member,
        isAuthenticated: !!token,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      set({ isLoading: false });
    }
  },
}));
