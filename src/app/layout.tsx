import { Metadata } from 'next';
import { headers } from 'next/headers';

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';
import { defaultLanguage } from '@/utils/language-utils';
import '@/styles/index.scss';

export const metadata: Metadata = {
  title: {
    template: '%s | Episciences',
    default: 'Episciences',
  },
  description: 'Overlay Journal Platform',
  icons: {
    icon: '/favicon.ico',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the language from the custom header set by middleware
  const headersList = await headers();
  const detectedLanguage = headersList.get('x-detected-language');
  const currentLanguage = detectedLanguage || defaultLanguage;

  return (
    <html lang={currentLanguage}>
      <head>
        <base href="/" />
        {/* Preload critical font to avoid FOIT/FOUT */}
        <link
          rel="preload"
          href="/fonts/Noto-Sans/NotoSans-Regular.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        {/* Preconnect to API to reduce latency on first API call */}
        <link rel="preconnect" href="https://api-preprod.episciences.org" />
        <link rel="dns-prefetch" href="https://api-preprod.episciences.org" />
      </head>
      <body>
        {/* The JournalLayout at /sites/[journalId]/layout.tsx will provide ClientProviders */}
        {children}
      </body>
    </html>
  );
}
