import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

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
  avatar_url?: string; // Alias for avatar
  is_active?: boolean; // From API
}

interface AuthState {
  token: string | null;
  member: Member | null;
  isLoading: boolean;
  isAuthenticated: boolean;

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

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  member: null,
  isLoading: true,
  isAuthenticated: false,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },

  setMember: async (member: Member) => {
    // Fix: Await SecureStore operation to ensure data persistence before state update
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(member));
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

  loginDemo: async () => {
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
