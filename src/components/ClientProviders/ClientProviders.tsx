'use client';

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { MathJaxContext } from 'better-react-mathjax';

import store from '@/store';
import i18n from '@/config/i18n';
import { mathJaxConfig, mathJaxSrc } from '@/config/mathjax';
import { JournalInitializer } from '@/components/JournalInitializer/JournalInitializer';
import { LastVolumeInitializer } from '@/components/LastVolumeInitializer/LastVolumeInitializer';
import ThemeStyleSwitch from '@/components/ThemeStyleSwitch/ThemeStyleSwitch';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import { IVolume } from '@/types/volume';

interface ClientProvidersProps {
  initialVolume?: IVolume | null;
  initialLanguage?: string;
  journalId?: string;
  children?: React.ReactNode;
}

/**
 * Client-side providers for Redux, i18n, and MathJax
 * This component wraps the entire application to provide context
 * It ensures the store is only used client-side
 */
const ClientProviders: React.FC<ClientProvidersProps> = ({ initialVolume, initialLanguage, journalId, children }) => {
  // Detect language immediately, before first render
  const detectedLang = (() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Check if pathname starts with /fr/ or /en/
      if (pathname.startsWith('/fr/') || pathname === '/fr') {
        return 'fr';
      } else if (pathname.startsWith('/en/') || pathname === '/en') {
        return 'en';
      }
    }
    return initialLanguage || 'en';
  })();

  const [isClient, setIsClient] = useState(false);

  // Initialize Redux and i18next immediately with detected language
  useEffect(() => {
    setIsClient(true);

    // Update both i18next and Redux store
    if (i18n.language !== detectedLang) {
      i18n.changeLanguage(detectedLang);
    }

    // Update Redux store with detected language
    store.dispatch(setLanguage(detectedLang as any));
  }, [detectedLang]);

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={2}>
          {isClient && <ThemeStyleSwitch />}
          {isClient && <JournalInitializer journalId={journalId} />}
          {isClient && initialVolume && <LastVolumeInitializer initialVolume={initialVolume} />}
          {children}
        </MathJaxContext>
      </I18nextProvider>
    </Provider>
  );
};

export default ClientProviders;