'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { MathJaxContext } from 'better-react-mathjax';

import store from '@/store';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import i18n from '@/config/i18n';
import { mathJaxConfig, mathJaxSrc } from '@/config/mathjax';
import { JournalInitializer } from '@/components/JournalInitializer/JournalInitializer';
import { LastVolumeInitializer } from '@/components/LastVolumeInitializer/LastVolumeInitializer';
import ThemeStyleSwitch from '@/components/ThemeStyleSwitch/ThemeStyleSwitch';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import {
  setCurrentJournal,
  setApiEndpoint,
  setJournalConfig,
} from '@/store/features/journal/journal.slice';
import { IVolume } from '@/types/volume';
import { IJournal } from '@/types/journal';

interface ClientProvidersProps {
  initialVolume?: IVolume | null;
  initialJournal?: IJournal | null;
  initialLanguage?: string;
  journalId?: string;
  translations?: any;
  apiEndpoint?: string;
  journalConfig?: Record<string, string>;
  children?: React.ReactNode;
}

/**
 * Client-side providers for Redux, i18n, and MathJax
 * This component wraps the entire application to provide context
 * It ensures the store is only used client-side
 */
const ClientProviders: React.FC<ClientProvidersProps> = ({
  initialVolume,
  initialJournal,
  initialLanguage,
  journalId,
  translations,
  apiEndpoint,
  journalConfig,
  children,
}) => {
  // Use initialLanguage from server for hydration consistency
  // Client-side detection happens in useEffect to avoid mismatch
  const initialLang = initialLanguage || 'en';

  // Always create a fresh i18next instance pre-loaded with translations.
  // Using `resources` initializes synchronously (no async backend), so the instance
  // is ready before the first render on both server and client — no singleton mutation,
  // no "update during render" warning, no hydration mismatch.
  const [i18nInstance] = useState(() => {
    if (initialLanguage && translations) {
      const inst = i18next.createInstance();
      inst.use(initReactI18next).init({
        lng: initialLanguage,
        fallbackLng: 'en',
        resources: {
          [initialLanguage]: {
            translation: translations,
          },
        },
        interpolation: {
          escapeValue: false,
        },
      });
      return inst;
    }
    return i18n;
  });

  const [isClient, setIsClient] = useState(false);

  // Sync Redux store after hydration.
  // i18n language is already set in the instance created above — no changeLanguage needed.
  useEffect(() => {
    setIsClient(true);
    store.dispatch(setLanguage((initialLanguage || initialLang) as any));
    if (initialJournal) store.dispatch(setCurrentJournal(initialJournal));
    if (apiEndpoint) store.dispatch(setApiEndpoint(apiEndpoint));
    if (journalConfig) store.dispatch(setJournalConfig(journalConfig));
  }, [initialLang, initialLanguage, initialJournal, apiEndpoint, journalConfig]);

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18nInstance}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={3}>
          {isClient && <ThemeStyleSwitch />}
          {/* JournalInitializer is no longer needed if we have initialJournal */}
          {isClient && !initialJournal && <JournalInitializer journalId={journalId} />}
          {isClient && initialVolume && <LastVolumeInitializer initialVolume={initialVolume} />}
          {children}
        </MathJaxContext>
      </I18nextProvider>
    </Provider>
  );
};

export default ClientProviders;
