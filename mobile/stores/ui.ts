import { create } from "zustand";

interface UIState {
  theme: "light" | "dark" | "system";
  language: "en" | "id";

  // Actions
  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (language: "en" | "id") => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  language: "id", // Default to Indonesian

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}));
