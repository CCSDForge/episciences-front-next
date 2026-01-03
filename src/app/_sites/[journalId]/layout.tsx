import { fetchVolumes } from '@/services/volume';
import { defaultLanguage } from '@/utils/language-utils';
import ClientProviders from '@/components/ClientProviders/ClientProviders';

interface JournalLayoutProps {
  children: React.ReactNode;
  params: { journalId: string };
}

export const revalidate = 60; // Revalidate every minute

export default async function JournalLayout({
  children,
  params,
}: JournalLayoutProps) {
  const { journalId } = params;
  const currentLanguage = defaultLanguage;

  // Précharger les données du dernier volume côté serveur pour cette revue spécifique
  let initialVolume = null;
  try {
    const volumesData = await fetchVolumes({
      rvcode: journalId,
      language: currentLanguage,
      page: 1,
      itemsPerPage: 1,
      types: [],
      years: []
    });

    if (volumesData.data.length > 0) {
      initialVolume = volumesData.data[0];
    }
  } catch (error) {
    console.error(`Error preloading last volume for journal ${journalId}:`, error);
  }

  return (
    <ClientProviders 
      initialVolume={initialVolume} 
      initialLanguage={currentLanguage} 
      journalId={journalId}
    >
      {children}
    </ClientProviders>
  );
}
