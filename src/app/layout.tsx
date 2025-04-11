import { Metadata } from 'next';
import Script from 'next/script'

// Importer l'intercepteur fetch pour logger toutes les requêtes
import '@/utils/fetchInterceptor';

import ClientOnly from '@/components/ClientOnly/ClientOnly';
import ProviderContainer from '@/components/ProviderContainer/ProviderContainer';
import Footer from '@/components/Footer/Footer';
import Header from '@/components/Header/Header';
import ThemeStyleSwitch from '@/components/ThemeStyleSwitch/ThemeStyleSwitch';
import { fetchVolumes } from '@/services/volume';
import { LastVolumeInitializer } from '@/components/LastVolumeInitializer/LastVolumeInitializer';

import "@/styles/index.scss";

export const metadata: Metadata = {
  title: {
    template: '%s | Episciences',
    default: 'Episciences',
  },
  description: 'Overlay Journal Platform',
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
        <ClientOnly>
          <ProviderContainer>
            <ThemeStyleSwitch />
            <Header />
            <div className="main-content">
              {children}
            </div>
            <Footer />
            {/* Initialiser le volume avec les données préchargées */}
            {initialVolume && <LastVolumeInitializer initialVolume={initialVolume} />}
          </ProviderContainer>
        </ClientOnly>
      </body>
    </html>
  );
}
