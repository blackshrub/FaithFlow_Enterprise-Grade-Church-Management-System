import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import idTranslations from './locales/id.json';
import enKiosk from './locales/en/kiosk.json';
import idKiosk from './locales/id/kiosk.json';

// Force cache bust for translations
const TRANSLATION_VERSION = '1.7.0';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
        kiosk: enKiosk,
      },
      id: {
        translation: idTranslations,
        kiosk: idKiosk,
      },
    },
    fallbackLng: 'en',
    lng: localStorage.getItem('i18nextLng') || 'en',
    defaultNS: 'translation',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      // Only check localStorage, don't auto-detect browser language
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Store version to detect updates
const storedVersion = localStorage.getItem('translation_version');
if (storedVersion !== TRANSLATION_VERSION) {
  console.log('Translation version updated, clearing language cache');
  localStorage.removeItem('i18nextLng');
  localStorage.setItem('translation_version', TRANSLATION_VERSION);
  // Force reload on next page load
  if (storedVersion) {
    window.location.reload();
  }
}

export default i18n;
