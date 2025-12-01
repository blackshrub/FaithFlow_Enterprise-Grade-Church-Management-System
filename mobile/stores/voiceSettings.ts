/**
 * Voice Settings Store
 *
 * Manages voice feature settings fetched from system settings (admin-configured).
 * Uses Google Cloud TTS API for text-to-speech.
 *
 * Features:
 * - Fetches voice config from backend on app start (no auth required - public endpoints)
 * - Caches API key securely with SecureStore (sensitive data)
 * - User preferences stored with MMKV for instant access
 *
 * Backend endpoints (public, no auth token required):
 * - GET /system/settings/voice - returns voice settings without API key
 * - GET /system/settings/voice/api-key - returns the actual API key
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { mmkvStorage } from '@/lib/storage';
import { api } from '@/services/api';
import { API_PREFIX } from '@/constants/api';
import {
  DEV_GOOGLE_TTS_API_KEY,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_STT_SETTINGS,
  type GoogleTTSVoice,
} from '@/constants/voice';

// Secure storage keys (for sensitive data only - API key stays in SecureStore)
const STORAGE_KEYS = {
  CACHED_API_KEY: 'faithflow_google_tts_api_key_cache',
};

export type { GoogleTTSVoice };

export interface SystemVoiceSettings {
  /** Whether voice is enabled system-wide */
  voice_enabled: boolean;
  /** Whether system has API key configured */
  has_api_key: boolean;
  /** Default TTS voice from system (Indonesian) */
  tts_voice: GoogleTTSVoice;
  /** Default TTS voice for English content */
  tts_voice_en: GoogleTTSVoice;
  /** Default speech speed from system */
  tts_speed: number;
  /** STT model from system */
  stt_model: string;
}

export interface UserVoicePreferences {
  /** User-overridden voice (null = use system default) */
  voice: GoogleTTSVoice | null;
  /** User-overridden speed (null = use system default) */
  speed: number | null;
  /** Auto-play AI responses in voice chat mode */
  autoPlayResponses: boolean;
}

interface VoiceSettingsState {
  /** Cached Google TTS API key */
  apiKey: string | null;
  /** System settings fetched from backend */
  systemSettings: SystemVoiceSettings | null;
  /** User-local preferences (can override system defaults) */
  userPreferences: UserVoicePreferences;
  /** Whether settings have been loaded */
  isLoaded: boolean;
  /** Whether currently fetching from backend */
  isFetching: boolean;
  /** Last error if any */
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  refreshFromBackend: () => Promise<void>;
  updateUserPreferences: (prefs: Partial<UserVoicePreferences>) => Promise<void>;
  clearCache: () => Promise<void>;

  // Computed getters
  getEffectiveApiKey: () => string | null;
  getEffectiveVoice: () => GoogleTTSVoice;
  getEffectiveVoiceEN: () => GoogleTTSVoice;
  getEffectiveSpeed: () => number;
  isEnabled: boolean;
}

const DEFAULT_SYSTEM_SETTINGS: SystemVoiceSettings = {
  voice_enabled: false,
  has_api_key: false,
  tts_voice: DEFAULT_TTS_SETTINGS.voice,
  tts_voice_en: DEFAULT_TTS_SETTINGS.voiceEN,
  tts_speed: DEFAULT_TTS_SETTINGS.speakingRate,
  stt_model: DEFAULT_STT_SETTINGS.model,
};

const DEFAULT_USER_PREFERENCES: UserVoicePreferences = {
  voice: null,
  speed: null,
  autoPlayResponses: false,
};

export const useVoiceSettingsStore = create<VoiceSettingsState>()(
  persist(
    (set, get) => ({
      apiKey: null,
      systemSettings: null,
      userPreferences: DEFAULT_USER_PREFERENCES,
      isLoaded: false,
      isFetching: false,
      error: null,
      isEnabled: false,

      /**
       * Load settings - from cache first, then refresh from backend
       * In development mode, uses hardcoded API key for immediate testing
       * Note: userPreferences now auto-loaded by Zustand persist (MMKV)
       */
      loadSettings: async () => {
        try {
          // In dev mode, use hardcoded key immediately
          if (DEV_GOOGLE_TTS_API_KEY) {
            set({
              apiKey: DEV_GOOGLE_TTS_API_KEY,
              isLoaded: true,
              isEnabled: true,
              systemSettings: {
                voice_enabled: true,
                has_api_key: true,
                tts_voice: DEFAULT_TTS_SETTINGS.voice,
                tts_voice_en: DEFAULT_TTS_SETTINGS.voiceEN,
                tts_speed: DEFAULT_TTS_SETTINGS.speakingRate,
                stt_model: DEFAULT_STT_SETTINGS.model,
              },
            });
            console.log('[VoiceSettings] DEV MODE: Using hardcoded Google TTS API key');
            return;
          }

          // Production: Load cached API key from SecureStore (sensitive data)
          const cachedKey = await SecureStore.getItemAsync(STORAGE_KEYS.CACHED_API_KEY);

          // userPreferences already loaded from MMKV by persist middleware

          set({
            apiKey: cachedKey,
            isLoaded: true,
            isEnabled: !!cachedKey,
          });

          // Refresh from backend in background
          get().refreshFromBackend();

          console.log('[VoiceSettings] Loaded from cache, API key:', cachedKey ? 'present' : 'not cached');
        } catch (error) {
          console.error('[VoiceSettings] Failed to load:', error);
          set({ isLoaded: true, error: 'Failed to load voice settings' });
        }
      },

  /**
   * Refresh settings from backend (public endpoints - no auth required)
   */
  refreshFromBackend: async () => {
    set({ isFetching: true, error: null });

    try {
      // Get voice settings (public endpoint - no auth required)
      const { data: systemSettings } = await api.get(`${API_PREFIX}/system/settings/voice`);

      set({ systemSettings });

      // If system has API key configured, fetch it
      if (systemSettings.has_api_key && systemSettings.voice_enabled) {
        try {
          const { data: keyData } = await api.get(`${API_PREFIX}/system/settings/voice/api-key`);

          // Cache the API key securely
          if (keyData.api_key) {
            await SecureStore.setItemAsync(STORAGE_KEYS.CACHED_API_KEY, keyData.api_key);
            set({
              apiKey: keyData.api_key,
              isEnabled: true,
            });
            console.log('[VoiceSettings] API key fetched and cached');
          }
        } catch (keyError: any) {
          console.warn('[VoiceSettings] Failed to fetch API key:', keyError.message);
          const cachedKey = await SecureStore.getItemAsync(STORAGE_KEYS.CACHED_API_KEY);
          if (cachedKey) {
            set({ apiKey: cachedKey, isEnabled: true });
          } else {
            set({ isEnabled: false });
          }
        }
      } else {
        set({ isEnabled: false });
        console.log('[VoiceSettings] Voice disabled or no API key configured');
      }

      set({ isFetching: false });
    } catch (error: any) {
      console.error('[VoiceSettings] Failed to refresh from backend:', error);
      set({
        isFetching: false,
        error: error.message || 'Failed to fetch voice settings',
      });

      const cachedKey = get().apiKey;
      if (cachedKey) {
        set({ isEnabled: true });
      }
    }
  },

  /**
   * Update user preferences
   * Note: Auto-persisted to MMKV by Zustand persist middleware
   */
  updateUserPreferences: async (prefs: Partial<UserVoicePreferences>) => {
    const currentPrefs = get().userPreferences;
    const newPrefs = { ...currentPrefs, ...prefs };
    set({ userPreferences: newPrefs });
    console.log('[VoiceSettings] User preferences updated:', prefs);
  },

  /**
   * Clear cached data
   */
  clearCache: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.CACHED_API_KEY);
      set({ apiKey: null, isEnabled: false });
      console.log('[VoiceSettings] Cache cleared');
    } catch (error) {
      console.error('[VoiceSettings] Failed to clear cache:', error);
    }
  },

  /**
   * Get the effective API key (dev mode fallback included)
   */
  getEffectiveApiKey: () => {
    return get().apiKey || DEV_GOOGLE_TTS_API_KEY;
  },

  /**
   * Get effective Indonesian voice (user preference or system default)
   */
  getEffectiveVoice: () => {
    const { userPreferences, systemSettings } = get();
    return userPreferences.voice ?? systemSettings?.tts_voice ?? DEFAULT_TTS_SETTINGS.voice;
  },

  /**
   * Get effective English voice
   */
  getEffectiveVoiceEN: () => {
    const { systemSettings } = get();
    return systemSettings?.tts_voice_en ?? DEFAULT_TTS_SETTINGS.voiceEN;
  },

  /**
   * Get effective speed (user preference or system default)
   */
  getEffectiveSpeed: () => {
    const { userPreferences, systemSettings } = get();
    return userPreferences.speed ?? systemSettings?.tts_speed ?? DEFAULT_TTS_SETTINGS.speakingRate;
  },
    }),
    {
      name: 'faithflow-voice-settings',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user preferences - API key stays in SecureStore
      partialize: (state) => ({
        userPreferences: state.userPreferences,
      }),
    }
  )
);

/**
 * Hook to check if voice is available
 */
export function useVoiceAvailable(): boolean {
  const { isLoaded, isEnabled, apiKey } = useVoiceSettingsStore();
  return isLoaded && isEnabled && !!apiKey;
}

/**
 * Hook to get API key
 */
export function useGoogleTTSApiKey(): string | null {
  const { getEffectiveApiKey } = useVoiceSettingsStore();
  return getEffectiveApiKey();
}

export default useVoiceSettingsStore;
