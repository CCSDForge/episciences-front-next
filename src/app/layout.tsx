import { Metadata } from 'next';

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';

import ClientProviders from '@/components/ClientProviders/ClientProviders';
import { fetchVolumes } from '@/services/volume';
import { defaultLanguage } from '@/utils/language-utils';

import "@/styles/index.scss";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always use default language in root layout
  // Language-specific rendering is handled by [lang] layout
  const currentLanguage = defaultLanguage;

  // Précharger les données du dernier volume côté serveur
  let initialVolume = null;
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (rvcode) {
      const volumesData = await fetchVolumes({
        rvcode,
        language: currentLanguage,
        page: 1,
        itemsPerPage: 1,
        types: [],
        years: []
      });

      if (volumesData.data.length > 0) {
        initialVolume = volumesData.data[0];
      }
    }
  } catch (error) {
    console.error('Error preloading last volume:', error);
  }

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  return (
    <html lang={currentLanguage}>
      <head>
        {/* Définir la base URL pour tous les liens relatifs */}
        <base href="/" />
        {/* Charger notre script uniquement en mode production statique */}
        {isStaticBuild && <script src="/force-static.js" />}
      </head>
      <body>
        {/* Client providers for Redux, i18n, MathJax - wrapping all content */}
        <ClientProviders initialVolume={initialVolume} initialLanguage={currentLanguage}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
