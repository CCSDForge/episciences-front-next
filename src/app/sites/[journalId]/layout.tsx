import { fetchVolumes } from '@/services/volume';
import { getJournalByCode } from '@/services/journal';
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

  // Précharger les données du journal et du dernier volume côté serveur
  let initialVolume = null;
  let initialJournal = null;

  try {
    // Parallel fetch for performance
    const [volumesData, journalData] = await Promise.all([
      fetchVolumes({
        rvcode: journalId,
        language: currentLanguage,
        page: 1,
        itemsPerPage: 1,
        types: [],
        years: []
      }),
      getJournalByCode(journalId)
    ]);

    if (volumesData.data.length > 0) {
      initialVolume = volumesData.data[0];
    }
    
    if (journalData) {
      initialJournal = journalData;
    }
  } catch (error) {
    console.error(`Error preloading data for journal ${journalId}:`, error);
  }

  return (
    <ClientProviders 
      initialVolume={initialVolume} 
      initialJournal={initialJournal}
      initialLanguage={currentLanguage} 
      journalId={journalId}
    >
      {children}
    </ClientProviders>
  );
}
