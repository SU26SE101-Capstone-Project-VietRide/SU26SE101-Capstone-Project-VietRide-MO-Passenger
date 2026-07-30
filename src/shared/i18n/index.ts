/**
 * i18n Configuration — react-i18next setup
 *
 * Initializes i18next with English and Vietnamese locales.
 * Default language is Vietnamese (vi).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'en',
  supportedLngs: ['vi', 'en'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  returnNull: false,
  saveMissing: __DEV__,
  missingKeyHandler: (_languages, _namespace, key) => {
    if (__DEV__) {
      console.warn(`[i18n] Missing translation key: ${key}`);
    }
  },
  interpolation: {
    escapeValue: false, // React already escapes
  },
  compatibilityJSON: 'v4',
  react: {
    useSuspense: false,
  },
});

export default i18n;
