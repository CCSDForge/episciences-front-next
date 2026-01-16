import { Metadata } from 'next';

import { fetchVolumes } from '@/services/volume';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loader from '@/components/Loader/Loader';

const VolumesClient = dynamic(() => import('./VolumesClient'));

const VOLUMES_PER_PAGE = 20;

// Volume list updates moderately - daily revalidation is appropriate
export const revalidate = 86400; // 24 hours

// Pre-generate volumes page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export const metadata: Metadata = {
  title: 'Volumes',
};

export default async function VolumesPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang, journalId } = params;

  // Parse types from searchParams
  const typeParam = searchParams.type;
  let types: string[] = [];
  if (typeof typeParam === 'string') {
    types = [typeParam];
  } else if (Array.isArray(typeParam)) {
    types = typeParam;
  }

  // Parse years from searchParams
  const yearsParam = searchParams.years;
  let years: number[] = [];
  if (typeof yearsParam === 'string') {
    years = [parseInt(yearsParam, 10)].filter(y => !isNaN(y));
  } else if (Array.isArray(yearsParam)) {
    years = yearsParam.map(y => parseInt(y, 10)).filter(y => !isNaN(y));
  }

  const pageParam = searchParams.page;
  const currentPage = typeof pageParam === 'string' ? parseInt(pageParam, 10) : 1;
  const validPage = isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;

  console.log('VolumesPage searchParams types:', types, 'years:', years, 'page:', validPage, 'journalId:', journalId);

  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const isFiltering = types.length > 0 || years.length > 0;

    // Strategy: Fetch the requested page normally. 
    // We also fetch a full range in parallel to get facets for the sidebar.
    const volumePromise = fetchVolumes({
      rvcode: journalId,
      language: lang,
      page: validPage,
      itemsPerPage: VOLUMES_PER_PAGE,
      types: types,
      years: years,
    });

    const fullRangePromise = fetchVolumes({
      rvcode: journalId,
      language: lang,
      page: 1,
      itemsPerPage: 250, 
      types: [], 
      years: [],
    });

    const [volumesData, fullRangeData, translations] = await Promise.all([
      volumePromise,
      fullRangePromise,
      getServerTranslations(lang),
    ]);

    // Helper to get years
    const getYears = (): number[] => {
      if (fullRangeData?.range?.years && fullRangeData.range.years.length > 0) {
        return fullRangeData.range.years;
      }
      if (fullRangeData?.data && fullRangeData.data.length > 0) {
        const extracted = fullRangeData.data
          .map(v => v.year)
          .filter((y): y is number => typeof y === 'number');
        return Array.from(new Set(extracted)).sort((a, b) => b - a);
      }
      return [];
    };

    const displayData = volumesData.data;
    let totalItems = volumesData.totalItems;
    let articlesCount = volumesData.articlesCount;

    // Logic for counts:
    // 1. If we are filtering, we trust the volumesData counts (matching volumes)
    // 2. If we are NOT filtering, we prefer the counts from fullRangeData if they are higher 
    //    (since fullRangeData fetches 250 items and might have better fallback counts)
    if (!isFiltering) {
      if (fullRangeData?.totalItems && fullRangeData.totalItems > totalItems) {
        totalItems = fullRangeData.totalItems;
      }
      if (fullRangeData?.articlesCount && (articlesCount === undefined || articlesCount === 0 || fullRangeData.articlesCount > articlesCount)) {
        articlesCount = fullRangeData.articlesCount;
      }
    }

    // FINAL FALLBACK: If articlesCount is still 0 but we have volumes, 
    // it's likely the API didn't return the aggregate count.
    // In that case, we can sum the papers in the volumes we have.
    if (articlesCount === 0 && displayData.length > 0) {
       articlesCount = displayData.reduce((acc, vol) => acc + (vol.articles?.length || 0), 0);
       
       // If we're not filtering and fullRangeData has more volumes, use that sum instead
       if (!isFiltering && fullRangeData?.data && fullRangeData.data.length > displayData.length) {
         articlesCount = fullRangeData.data.reduce((acc, vol) => acc + (vol.articles?.length || 0), 0);
       }
    }

    const finalVolumesData = {
      ...volumesData,
      data: displayData,
      totalItems: totalItems,
      articlesCount: articlesCount,
      range: {
        types:
          (fullRangeData?.range?.types?.length ?? 0) > 0
            ? fullRangeData?.range?.types
            : volumesData.range?.types || [],
        years: getYears(),
      },
    };

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      volumes: t('pages.volumes.title', translations),
    };

    return (
      <Suspense fallback={<Loader />}>
        <VolumesClient
          initialVolumes={finalVolumesData}
          initialPage={validPage}
          initialTypes={types}
          initialYears={years}
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