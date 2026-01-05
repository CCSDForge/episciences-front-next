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
import { setCurrentJournal, setApiEndpoint } from '@/store/features/journal/journal.slice';
import { IVolume } from '@/types/volume';
import { IJournal } from '@/types/journal';
import { getLanguageFromPathname } from '@/utils/language-utils';

interface ClientProvidersProps {
  initialVolume?: IVolume | null;
  initialJournal?: IJournal | null;
  initialLanguage?: string;
  journalId?: string;
  translations?: any;
  apiEndpoint?: string;
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
  children 
}) => {
  // Use initialLanguage from server for hydration consistency
  // Client-side detection happens in useEffect to avoid mismatch
  const initialLang = initialLanguage || 'en';

  // Create a dedicated i18n instance for the server to avoid singleton issues
  // On the client, we use the singleton from @/config/i18n
  const [i18nInstance] = useState(() => {
    if (typeof window === 'undefined') {
      // SERVER SIDE
      if (initialLanguage && translations) {
        const inst = i18next.createInstance();
        inst.use(initReactI18next).init({
          lng: initialLanguage,
          fallbackLng: 'en',
          resources: {
            [initialLanguage]: {
              translation: translations
            }
          },
          interpolation: {
            escapeValue: false,
          },
        });
        return inst;
      }
    } else {
      // CLIENT SIDE
      // Hydrate the singleton i18n immediately if translations are provided
      if (initialLanguage && translations) {
        if (!i18n.hasResourceBundle(initialLanguage, 'translation')) {
          i18n.addResourceBundle(initialLanguage, 'translation', translations, true, true);
        }
        if (i18n.language !== initialLanguage) {
          i18n.changeLanguage(initialLanguage);
        }
      }
    }
    return i18n;
  });

  const [isClient, setIsClient] = useState(false);

  // Initialize Redux and i18next after hydration
  useEffect(() => {
    setIsClient(true);

    // Detect language from pathname on client-side (after hydration)
    const clientLang = typeof window !== 'undefined'
      ? getLanguageFromPathname(window.location.pathname)
      : initialLang;

    // Update i18next and Redux store with client-detected language
    if (i18n.language !== clientLang) {
      i18n.changeLanguage(clientLang);
    }

    // Update Redux store
    store.dispatch(setLanguage(clientLang as any));

    // Initialize Journal if provided
    if (initialJournal) {
      store.dispatch(setCurrentJournal(initialJournal));
    }

    // Initialize API Endpoint if provided
    if (apiEndpoint) {
      store.dispatch(setApiEndpoint(apiEndpoint));
    }
  }, [initialLang, initialJournal, apiEndpoint]);

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18nInstance}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={2}>
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