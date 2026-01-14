'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { MathJaxContext } from 'better-react-mathjax';

import store from '@/store';
import i18n from '@/config/i18n';
import { mathJaxConfig, mathJaxSrc } from '@/config/mathjax';
import { JournalInitializer } from '@/components/JournalInitializer/JournalInitializer';
import { LastVolumeInitializer } from '@/components/LastVolumeInitializer/LastVolumeInitializer';

interface ProviderContainerProps {
  children: React.ReactNode;
}

const ProviderContainer: React.FC<ProviderContainerProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MathJaxContext config={mathJaxConfig} src={mathJaxSrc} version={3}>
          <JournalInitializer />
          <LastVolumeInitializer />
          {children}
        </MathJaxContext>
      </I18nextProvider>
    </Provider>
  );
};

export default ProviderContainer;
