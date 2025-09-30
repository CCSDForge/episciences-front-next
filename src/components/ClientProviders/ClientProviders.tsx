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
import { IVolume } from '@/types/volume';

interface ClientProvidersProps {
  initialVolume?: IVolume | null;
  children?: React.ReactNode;
}

/**
 * Client-side providers for Redux, i18n, and MathJax
 * This component wraps the entire application to provide context
 * It ensures the store is only used client-side
 */
const ClientProviders: React.FC<ClientProvidersProps> = ({ initialVolume, children }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render with Redux provider once we're on the client
  if (!isClient) {
    return (
      <I18nextProvider i18n={i18n}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={2}>
          {children}
        </MathJaxContext>
      </I18nextProvider>
    );
  }

  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={2}>
          <ThemeStyleSwitch />
          <JournalInitializer />
          {initialVolume && <LastVolumeInitializer initialVolume={initialVolume} />}
          {children}
        </MathJaxContext>
      </I18nextProvider>
    </Provider>
  );
};

export default ClientProviders;