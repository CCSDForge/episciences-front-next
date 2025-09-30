import { Metadata } from 'next';
import Script from 'next/script'

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';

import ClientProviders from '@/components/ClientProviders/ClientProviders';
import FooterServer from '@/components/Footer/FooterServer';
import HeaderServer from '@/components/Header/HeaderServer';
import HeaderClientWrapper from '@/components/Header/HeaderClientWrapper';
import { fetchVolumes } from '@/services/volume';

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
  // Précharger les données du dernier volume côté serveur
  let initialVolume = null;
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (rvcode) {
      const volumesData = await fetchVolumes({
        rvcode,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en',
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

  return (
    <html lang="fr">
      <head>
        {/* Définir la base URL pour tous les liens relatifs */}
        <base href="/" />
        {/* Charger notre script le plus tôt possible */}
        <script src="/force-static.js" />
      </head>
      <body>
        {/* Client providers for Redux, i18n, MathJax - wrapping all content */}
        <ClientProviders initialVolume={initialVolume}>
          {/* Header with scroll behavior */}
          <HeaderClientWrapper>
            <HeaderServer />
          </HeaderClientWrapper>
          {/* Server-rendered content - visible in static HTML */}
          <div className="main-content">
            {children}
          </div>
          <FooterServer />
        </ClientProviders>
      </body>
    </html>
  );
}
