import { Metadata } from 'next';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: On ne peut pas utiliser headers() ici car cela force le rendu dynamique de toute l'application,
  // ce qui casse les pages en ISR/SSG comme les articles.
  // La langue correcte est gérée au niveau des sous-layouts via les paramètres d'URL.
  return (
    <html lang={defaultLanguage}>
      <head>
        <base href="/" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
      </head>
      <body className="light-theme">
        {/* The JournalLayout at /sites/[journalId]/layout.tsx will provide ClientProviders */}
        {children}
      </body>
    </html>
  );
}
