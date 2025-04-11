'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { availableLanguages, defaultLanguage } from "@/utils/i18n";

// Configuration initiale d'i18next
const i18nConfig = {
  fallbackLng: defaultLanguage,
  supportedLngs: [...availableLanguages],
  debug: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false,
  },
  // Pour Next.js, on utilise des chemins relatifs
  backend: {
    loadPath: '/locales/{{lng}}/translation.json',
  }
};

// Utilisation de l'instance globale d'i18next comme dans l'original
if (!i18next.isInitialized) {
  i18next
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(i18nConfig);
}

export default i18next; 