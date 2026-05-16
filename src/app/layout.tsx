import { Metadata } from 'next';
import localFont from 'next/font/local';

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';
import { defaultLanguage } from '@/utils/language-utils';
import '@/styles/index.scss';

// next/font/local inlines @font-face in the SSR HTML and automatically calculates
// size-adjust overrides for the fallback font, guaranteeing zero CLS.
// display:'optional' prevents font-swap entirely: if the font isn't cached yet, the
// fallback is kept for this load (no reflow). The preload link is emitted by next/font.
const notoSans = localFont({
  src: [
    {
      path: '../../public/fonts/Noto-Sans/NotoSans-Regular.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Noto-Sans/NotoSans-Italic.woff',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-noto-sans',
  display: 'optional',
});

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
    <html lang={defaultLanguage} className={notoSans.variable}>
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
