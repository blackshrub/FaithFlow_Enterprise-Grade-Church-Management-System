/**
 * i18n Configuration for FaithFlow Mobile App
 *
 * Supports English (en) and Indonesian (id) languages.
 * Uses react-i18next with async storage for persistence.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '../locales/en.json';
import id from '../locales/id.json';

const LANGUAGE_STORAGE_KEY = '@FaithFlow:language';

// Get stored language or device language
const getInitialLanguage = async (): Promise<string> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage) {
      return storedLanguage;
    }

    // Fallback to device language
    const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
    return ['en', 'id'].includes(deviceLanguage) ? deviceLanguage : 'id'; // Default to Indonesian
  } catch (error) {
    console.error('Error getting initial language:', error);
    return 'id'; // Default to Indonesian
  }
};

// Save language preference
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Initialize i18n
export const initializeI18n = async (): Promise<void> => {
  const initialLanguage = await getInitialLanguage();

  await i18n
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
export const changeLanguage = async (language: 'en' | 'id'): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'id';
};

export default i18n;
