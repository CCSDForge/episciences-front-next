'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { allSupportedLanguages, defaultLanguage } from '@/utils/i18n';

// Detect initial language from URL (client-side only)
function getInitialLanguage(): string {
  if (typeof window === 'undefined') {
    return defaultLanguage;
  }

  const pathname = window.location.pathname;

  for (const lang of allSupportedLanguages) {
    if (pathname.startsWith(`/${lang}/`) || pathname === `/${lang}`) {
      return lang;
    }
  }

  return defaultLanguage;
}

// Configuration initiale d'i18next
const i18nConfig = {
  lng: getInitialLanguage(), // Start with detected language
  fallbackLng: defaultLanguage,
  supportedLngs: [...allSupportedLanguages],
  debug: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed',
  },
};

// Utilisation de l'instance globale d'i18next comme dans l'original
if (!i18next.isInitialized) {
  i18next
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../../public/locales/${language}/${namespace}.json`)
      )
    )
    .use(initReactI18next)
    .init(i18nConfig);
}

export default i18next;
