/**
 * Voice Settings Store
 *
 * Manages voice feature settings fetched from system settings (admin-configured).
 * The OpenAI API key is managed at system level via webapp admin panel.
 *
 * Features:
 * - Fetches voice config from backend on app start (no auth required - public endpoints)
 * - Caches API key securely for offline use
 * - User can override local preferences (speed, voice)
 * - Uses same API key for both TTS and STT
 *
 * Backend endpoints (public, no auth token required):
 * - GET /system/settings/voice - returns voice settings without API key
 * - GET /system/settings/voice/api-key - returns the actual API key
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';
import { API_PREFIX } from '@/constants/api';
import { DEV_OPENAI_API_KEY, DEFAULT_TTS_SETTINGS, DEFAULT_STT_SETTINGS } from '@/constants/voice';

// Secure storage keys
const STORAGE_KEYS = {
  CACHED_API_KEY: 'faithflow_voice_api_key_cache',
  USER_PREFERENCES: 'faithflow_voice_user_prefs',
};

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface SystemVoiceSettings {
  /** Whether voice is enabled system-wide */
  voice_enabled: boolean;
  /** Whether system has API key configured */
  has_api_key: boolean;
  /** Default TTS voice from system */
  tts_voice: TTSVoice;
  /** TTS model from system */
  tts_model: 'tts-1' | 'tts-1-hd';
  /** Default speech speed from system */
  tts_speed: number;
  /** STT model from system */
  stt_model: string;
}

export interface UserVoicePreferences {
  /** User-overridden voice (null = use system default) */
  voice: TTSVoice | null;
  /** User-overridden speed (null = use system default) */
  speed: number | null;
  /** Auto-play AI responses in voice chat mode */
  autoPlayResponses: boolean;
}

interface VoiceSettingsState {
  /** Cached OpenAI API key */
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
  getEffectiveVoice: () => TTSVoice;
  getEffectiveSpeed: () => number;
  getEffectiveModel: () => 'tts-1' | 'tts-1-hd';
  isEnabled: boolean;
}

const DEFAULT_SYSTEM_SETTINGS: SystemVoiceSettings = {
  voice_enabled: false,
  has_api_key: false,
  tts_voice: 'nova',
  tts_model: 'tts-1-hd', // HD model for better Indonesian pronunciation
  tts_speed: 1.0,
  stt_model: 'whisper-1',
};

const DEFAULT_USER_PREFERENCES: UserVoicePreferences = {
  voice: null,
  speed: null,
  autoPlayResponses: false,
};

export const useVoiceSettingsStore = create<VoiceSettingsState>((set, get) => ({
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
   */
  loadSettings: async () => {
    try {
      // In dev mode, use hardcoded key immediately
      if (DEV_OPENAI_API_KEY) {
        const userPrefsJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PREFERENCES);
        const userPrefs = userPrefsJson
          ? { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(userPrefsJson) }
          : DEFAULT_USER_PREFERENCES;

        set({
          apiKey: DEV_OPENAI_API_KEY,
          userPreferences: userPrefs,
          isLoaded: true,
          isEnabled: true,
          systemSettings: {
            voice_enabled: true,
            has_api_key: true,
            tts_voice: DEFAULT_TTS_SETTINGS.voice,
            tts_model: DEFAULT_TTS_SETTINGS.model,
            tts_speed: DEFAULT_TTS_SETTINGS.speed,
            stt_model: DEFAULT_STT_SETTINGS.model,
          },
        });
        console.log('[VoiceSettings] DEV MODE: Using hardcoded API key');
        return;
      }

      // Production: Load cached API key
      const cachedKey = await SecureStore.getItemAsync(STORAGE_KEYS.CACHED_API_KEY);

      // Load user preferences
      const userPrefsJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PREFERENCES);
      const userPrefs = userPrefsJson
        ? { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(userPrefsJson) }
        : DEFAULT_USER_PREFERENCES;

      set({
        apiKey: cachedKey,
        userPreferences: userPrefs,
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
      // Note: Must include API_PREFIX since api client only has base URL
      const { data: systemSettings } = await api.get(`${API_PREFIX}/system/settings/voice`);

      set({ systemSettings });

      // If system has API key configured, fetch it (public endpoint - no auth required)
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
          // API key fetch failed - use cached if available
          console.warn('[VoiceSettings] Failed to fetch API key:', keyError.message);
          const cachedKey = await SecureStore.getItemAsync(STORAGE_KEYS.CACHED_API_KEY);
          if (cachedKey) {
            set({ apiKey: cachedKey, isEnabled: true });
          } else {
            set({ isEnabled: false });
          }
        }
      } else {
        // Voice not enabled or no API key
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

      // Keep using cached values if available
      const cachedKey = get().apiKey;
      if (cachedKey) {
        set({ isEnabled: true });
      }
    }
  },

  /**
   * Update user preferences (local overrides)
   */
  updateUserPreferences: async (prefs: Partial<UserVoicePreferences>) => {
    try {
      const currentPrefs = get().userPreferences;
      const newPrefs = { ...currentPrefs, ...prefs };

      await SecureStore.setItemAsync(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(newPrefs)
      );

      set({ userPreferences: newPrefs });
      console.log('[VoiceSettings] User preferences updated:', prefs);
    } catch (error) {
      console.error('[VoiceSettings] Failed to save user preferences:', error);
      throw error;
    }
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
    return get().apiKey || DEV_OPENAI_API_KEY;
  },

  /**
   * Get effective voice (user preference or system default)
   */
  getEffectiveVoice: () => {
    const { userPreferences, systemSettings } = get();
    return userPreferences.voice ?? systemSettings?.tts_voice ?? 'nova';
  },

  /**
   * Get effective speed (user preference or system default)
   */
  getEffectiveSpeed: () => {
    const { userPreferences, systemSettings } = get();
    return userPreferences.speed ?? systemSettings?.tts_speed ?? 1.0;
  },

  /**
   * Get effective TTS model from system settings
   */
  getEffectiveModel: () => {
    const { systemSettings } = get();
    return systemSettings?.tts_model ?? 'tts-1';
  },
}));

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
export function useOpenAIApiKey(): string | null {
  const { getEffectiveApiKey } = useVoiceSettingsStore();
  return getEffectiveApiKey();
}

export default useVoiceSettingsStore;
