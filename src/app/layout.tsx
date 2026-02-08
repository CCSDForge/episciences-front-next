import { Metadata } from 'next';

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';
import { defaultLanguage } from '@/utils/language-utils';
import '@/styles/index.scss';
import { API_DOMAIN } from '@/config/api';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: On ne peut pas utiliser headers() ici car cela force le rendu dynamique de toute l'application,
  // ce qui casse les pages en ISR/SSG comme les articles. 
  // La langue correcte est gérée au niveau des sous-layouts via les paramètres d'URL.
  return (
    <html lang={defaultLanguage}>
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
        <link rel="preconnect" href={API_DOMAIN} />
        <link rel="dns-prefetch" href={API_DOMAIN} />
      </head>
      <body>
        {/* The JournalLayout at /sites/[journalId]/layout.tsx will provide ClientProviders */}
        {children}
      </body>
    </html>
  );
}
