import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import idTranslations from './locales/id.json';

// Force cache bust for translations
const TRANSLATION_VERSION = '1.2.0';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      id: {
        translation: idTranslations,
      },
    },
    fallbackLng: 'en',
    lng: localStorage.getItem('i18nextLng') || 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
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
