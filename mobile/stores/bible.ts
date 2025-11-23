import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface BibleState {
  selectedVersion: string;
  fontSize: number;
  fontFamily: string;

  // Actions
  setSelectedVersion: (version: string) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setFontFamily: (family: string) => Promise<void>;
  initialize: () => Promise<void>;
}

const VERSION_KEY = "bible_version";
const FONT_SIZE_KEY = "bible_font_size";
const FONT_FAMILY_KEY = "bible_font_family";

export const useBibleStore = create<BibleState>((set) => ({
  selectedVersion: "tb", // Default to Indonesian Terjemahan Baru
  fontSize: 16,
  fontFamily: "default",

  setSelectedVersion: async (version: string) => {
    await AsyncStorage.setItem(VERSION_KEY, version);
    set({ selectedVersion: version });
  },

  setFontSize: async (size: number) => {
    await AsyncStorage.setItem(FONT_SIZE_KEY, size.toString());
    set({ fontSize: size });
  },

  setFontFamily: async (family: string) => {
    await AsyncStorage.setItem(FONT_FAMILY_KEY, family);
    set({ fontFamily: family });
  },

  initialize: async () => {
    try {
      const version = await AsyncStorage.getItem(VERSION_KEY);
      const fontSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
      const fontFamily = await AsyncStorage.getItem(FONT_FAMILY_KEY);

      set({
        selectedVersion: version || "tb",
        fontSize: fontSize ? parseInt(fontSize) : 16,
        fontFamily: fontFamily || "default",
      });
    } catch (error) {
      console.error("Failed to initialize bible preferences:", error);
    }
  },
}));
