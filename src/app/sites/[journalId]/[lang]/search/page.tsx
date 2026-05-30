import { Metadata } from 'next';
import './Search.scss';
import dynamic from 'next/dynamic';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { fetchSearchResults } from '@/services/search';
import { FetchedArticle } from '@/utils/article';
import { SearchRange } from '@/utils/pagination';
import { connection } from 'next/server';

import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';

const SearchClient = dynamic(() => import('./SearchClient'), {
  loading: () => <div className="loader">Chargement...</div>,
});

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.search.title', translations),
    description: t('pages.search.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/search'),
  };
}

interface SearchPageProps {
  params: Promise<{ lang: string; journalId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage(props: SearchPageProps) {
  await connection();

  const [searchParams, params] = await Promise.all([props.searchParams, props.params]);
  const { lang, journalId } = params;

  // Extract search params
  const search = (searchParams?.terms as string) || (searchParams?.q as string) || '';
  const page = searchParams?.page ? Math.max(1, parseInt(searchParams.page as string, 10)) : 1;

  // Fetch translations and search results in parallel
  const translationsPromise = getServerTranslations(lang);

  const emptyResults: { data: FetchedArticle[]; totalItems: number; range?: SearchRange } = {
    data: [],
    totalItems: 0,
  };
  const searchPromise =
    search && journalId
      ? fetchSearchResults({
          terms: search,
          rvcode: journalId,
          page,
          itemsPerPage: 10,
          types: [],
          years: [],
          volumes: [],
          sections: [],
          authors: [],
        }).catch((error: unknown) => {
          logger.error('Initial search failed:', error);
          return emptyResults;
        })
      : Promise.resolve(emptyResults);

  const [translations, initialSearchResults] = await Promise.all([
    translationsPromise,
    searchPromise,
  ]);

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    content: t('common.content', translations),
    search: t('pages.search.title', translations),
  };

  const countLabels = {
    resultFor: t('common.resultFor', translations),
    resultsFor: t('common.resultsFor', translations),
  };

  return (
    <SearchClient
      initialSearchResults={initialSearchResults}
      initialSearch={search}
      initialPage={page}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
      countLabels={countLabels}
    />
  );
}
