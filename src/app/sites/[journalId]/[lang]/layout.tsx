import { ReactNode } from 'react';
import { getLanguageFromParams, acceptedLanguages } from '@/utils/language-utils';
import HeaderServer from '@/components/Header/HeaderServer';
import HeaderClientWrapper from '@/components/Header/HeaderClientWrapper';
import FooterServer from '@/components/Footer/FooterServer';
import ToastContainerWrapper from '@/components/ToastContainerWrapper/ToastContainerWrapper';
import ClientProviders from '@/components/ClientProviders/ClientProviders';
import { fetchVolumes } from '@/services/volume';
import { getJournalByCode } from '@/services/journal';
import { getServerTranslations } from '@/utils/server-i18n';
import { getJournalApiUrl } from '@/utils/env-loader';
import { connection } from 'next/server';

interface LanguageLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string; journalId: string }>;
}

/**
 * Layout for handling language-prefixed routes in a multi-tenant setup
 */
export default async function LanguageLayout(props: LanguageLayoutProps) {
  // Dynamic layout: allows child pages to have their own cache strategies
  await connection();

  const params = await props.params;

  const {
    children
  } = props;

  // Extract and validate language from params
  const lang = getLanguageFromParams(params);
  const { journalId } = params;

  // Précharger les données du journal, du dernier volume et les traductions côté serveur
  let initialVolume = null;
  let initialJournal = null;
  let translations = {};

  // Charger l'URL de l'API spécifique au journal
  const apiEndpoint = getJournalApiUrl(journalId);

  try {
    const [volumesData, journalData, translationsData] = await Promise.all([
      fetchVolumes({
        rvcode: journalId,
        language: lang,
        page: 1,
        itemsPerPage: 1,
        types: [],
        years: []
      }),
      getJournalByCode(journalId),
      getServerTranslations(lang)
    ]);

    if (volumesData.data.length > 0) {
      initialVolume = volumesData.data[0];
    }
    
    if (journalData) {
      initialJournal = journalData;
    }

    if (translationsData) {
      translations = translationsData;
    }
  } catch (error) {
    console.error(`Error preloading data for journal ${journalId} in LanguageLayout:`, error);
  }

  return (
    <ClientProviders 
      initialVolume={initialVolume} 
      initialJournal={initialJournal}
      initialLanguage={lang} 
      journalId={journalId}
      translations={translations}
      apiEndpoint={apiEndpoint}
    >
      <ToastContainerWrapper />
      {/* Header with scroll behavior */}
      <HeaderClientWrapper>
        <HeaderServer lang={lang} journalId={journalId} />
      </HeaderClientWrapper>
      {/* Server-rendered content - visible in static HTML */}
      <div className="main-content">
        {children}
      </div>
      <FooterServer lang={lang} journalId={journalId} />
    </ClientProviders>
  );
}
