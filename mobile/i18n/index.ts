/**
 * i18n Configuration for FaithFlow Mobile App
 *
 * Supports English (en) and Indonesian (id) languages.
 * Uses MMKV for fast, synchronous storage - no flash of wrong language.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { mmkv } from '@/lib/storage';
import { logError } from '@/utils/errorHelpers';

// Import translation files
import en from '../locales/en.json';
import id from '../locales/id.json';

const LANGUAGE_STORAGE_KEY = 'faithflow_language';

// Get stored language or device language (synchronous with MMKV!)
const getInitialLanguage = (): string => {
  try {
    const storedLanguage = mmkv.getString(LANGUAGE_STORAGE_KEY);
    if (storedLanguage) {
      return storedLanguage;
    }

    // Fallback to device language
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    return ['en', 'id'].includes(deviceLanguage) ? deviceLanguage : 'id'; // Default to Indonesian
  } catch (error) {
    logError('i18n', 'getInitialLanguage', error, 'warning');
    return 'id'; // Default to Indonesian
  }
};

// Save language preference (synchronous with MMKV!)
export const saveLanguage = (language: string): void => {
  try {
    mmkv.setString(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    logError('i18n', 'saveLanguage', error, 'warning');
  }
};

// Initialize i18n (now synchronous!)
export const initializeI18n = (): void => {
  const initialLanguage = getInitialLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        id: { translation: id },
      },
      lng: initialLanguage,
      fallbackLng: 'id', // Default to Indonesian
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
      compatibilityJSON: 'v4', // Use i18next v4 format
    });
};

// Change language
export const changeLanguage = (language: 'en' | 'id'): void => {
  i18n.changeLanguage(language);
  saveLanguage(language);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'id';
};

export default i18n;
