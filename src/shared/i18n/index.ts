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
  interpolation: {
    escapeValue: false, // React already escapes
  },
  compatibilityJSON: 'v4',
});

export default i18n;
