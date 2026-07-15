import { Metadata } from 'next';

import { fetchVolumes, FetchVolumesResult } from '@/services/volume';
import { IVolume } from '@/types/volume';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loader from '@/components/Loader/Loader';

import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateCollectionPageJsonLd } from '@/utils/schema';

const VolumesClient = dynamic(() => import('./VolumesClient'));

const VOLUMES_PER_PAGE = 20;

type SearchParamValue = string | string[] | undefined;

const parseTypesParam = (typeParam: SearchParamValue): string[] => {
  if (typeof typeParam === 'string') {
    return [typeParam];
  }
  if (Array.isArray(typeParam)) {
    return typeParam;
  }
  return [];
};

const parseYearsParam = (yearsParam: SearchParamValue): number[] => {
  if (typeof yearsParam === 'string') {
    return [Number.parseInt(yearsParam, 10)].filter(y => !isNaN(y));
  }
  if (Array.isArray(yearsParam)) {
    return yearsParam.map(y => Number.parseInt(y, 10)).filter(y => !isNaN(y));
  }
  return [];
};

const parseValidPage = (pageParam: SearchParamValue): number => {
  const currentPage = typeof pageParam === 'string' ? Number.parseInt(pageParam, 10) : 1;
  return isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
};

// Counts logic:
// 1. If we are filtering, we trust the volumesData counts (matching volumes)
// 2. If we are NOT filtering, we prefer the counts from fullRangeData if they are higher
//    (since fullRangeData fetches 250 items and might have better fallback counts)
const resolveTotalItems = (
  volumesData: FetchVolumesResult,
  fullRangeData: FetchVolumesResult,
  isFiltering: boolean
): number => {
  if (
    !isFiltering &&
    fullRangeData?.totalItems &&
    fullRangeData.totalItems > volumesData.totalItems
  ) {
    return fullRangeData.totalItems;
  }
  return volumesData.totalItems;
};

const resolveArticlesCount = (
  volumesData: FetchVolumesResult,
  fullRangeData: FetchVolumesResult,
  isFiltering: boolean
): number | undefined => {
  if (
    !isFiltering &&
    fullRangeData?.articlesCount &&
    (volumesData.articlesCount === undefined ||
      volumesData.articlesCount === 0 ||
      fullRangeData.articlesCount > volumesData.articlesCount)
  ) {
    return fullRangeData.articlesCount;
  }
  return volumesData.articlesCount;
};

/** Counts unique articles across volumes when the API doesn't return an aggregate count. */
const countUniqueArticles = (volumes: IVolume[]): number => {
  const uniqueArticleIds = new Set<number>();
  volumes.forEach(vol => {
    vol.articles?.forEach(article => {
      if (article.paperid) uniqueArticleIds.add(article.paperid);
    });
  });
  return uniqueArticleIds.size;
};

const resolveVolumeCounts = (
  volumesData: FetchVolumesResult,
  fullRangeData: FetchVolumesResult,
  isFiltering: boolean
): { totalItems: number; articlesCount: number | undefined } => {
  const totalItems = resolveTotalItems(volumesData, fullRangeData, isFiltering);
  let articlesCount = resolveArticlesCount(volumesData, fullRangeData, isFiltering);

  // FINAL FALLBACK: If articlesCount is still 0 but we have volumes,
  // it's likely the API didn't return the aggregate count.
  const displayData = volumesData.data;
  if (articlesCount === 0 && displayData.length > 0) {
    const sourceData =
      !isFiltering && fullRangeData?.data && fullRangeData.data.length > displayData.length
        ? fullRangeData.data
        : displayData;
    articlesCount = countUniqueArticles(sourceData);
  }

  return { totalItems, articlesCount };
};

const resolveVolumesRangeTypes = (
  fullRangeData: FetchVolumesResult,
  volumesData: FetchVolumesResult
): string[] | undefined =>
  (fullRangeData?.range?.types?.length ?? 0) > 0
    ? fullRangeData?.range?.types
    : volumesData.range?.types || [];

const resolveVolumesYears = (fullRangeData: FetchVolumesResult): number[] => {
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

const buildFinalVolumesData = (
  volumesData: FetchVolumesResult,
  fullRangeData: FetchVolumesResult,
  isFiltering: boolean
): FetchVolumesResult => {
  const { totalItems, articlesCount } = resolveVolumeCounts(volumesData, fullRangeData, isFiltering);

  return {
    ...volumesData,
    data: volumesData.data,
    totalItems,
    articlesCount,
    range: {
      types: resolveVolumesRangeTypes(fullRangeData, volumesData),
      years: resolveVolumesYears(fullRangeData),
    },
  };
};

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

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.volumes.title', translations),
    description: t('pages.volumes.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/volumes'),
  };
}

export default async function VolumesPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const { lang, journalId } = params;

  const types = parseTypesParam(searchParams.type);
  const years = parseYearsParam(searchParams.years);
  const validPage = parseValidPage(searchParams.page);

  logger.debug('VolumesPage searchParams', { types, years, page: validPage, journalId });

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

    const finalVolumesData = buildFinalVolumesData(volumesData, fullRangeData, isFiltering);

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      volumes: t('pages.volumes.title', translations),
    };

    return (
      <>
        <JsonLd
          data={generateCollectionPageJsonLd(journalId, lang, '/volumes', {
            name: t('pages.volumes.title', translations),
            numberOfItems: finalVolumesData.totalItems,
          })}
        />
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
      </>
    );
  } catch (error) {
    logger.error('Error fetching volumes:', error);
    throw error;
  }
}
