import { Metadata } from 'next';

import { fetchVolumes } from '@/services/volume';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loader from '@/components/Loader/Loader';

const VolumesClient = dynamic(() => import('./VolumesClient'));

const VOLUMES_PER_PAGE = 20;

// Volume list updates moderately - daily revalidation is appropriate
export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'Volumes',
};

export default async function VolumesPage(props: { params: Promise<{ lang: string; journalId: string }> }) {
  const params = await props.params;
  const { lang, journalId } = params;
  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [volumesData, translations] = await Promise.all([
      fetchVolumes({
        rvcode: journalId,
        language: lang,
        page: 1,
        itemsPerPage: VOLUMES_PER_PAGE,
        types: [],
        years: []
      }),
      getServerTranslations(lang)
    ]);

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      volumes: t('pages.volumes.title', translations),
    };
    
    return (
      <Suspense fallback={<Loader />}>
        <VolumesClient
          initialVolumes={volumesData}
          initialPage={1}
          initialType=""
          lang={lang}
          journalId={journalId}
          breadcrumbLabels={breadcrumbLabels}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error fetching volumes:', error);
    return <div>Failed to load volumes</div>;
  }
}
 