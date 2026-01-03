import { Metadata } from 'next';
import './Search.scss';
import dynamic from 'next/dynamic';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { fetchSearchResults } from '@/services/search';
import { FetchedArticle } from '@/utils/article';
import { SearchRange } from '@/utils/pagination';

const SearchClient = dynamic(() => import('./SearchClient'), {
  loading: () => <div className="loader">Chargement...</div>,
});

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Rechercher des articles dans la revue',
};

interface SearchPageProps {
  params: { lang: string; journalId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { lang, journalId } = params;
  
  // Extract search params
  const search = searchParams?.terms as string || searchParams?.q as string || '';
  const page = searchParams?.page ? Math.max(1, parseInt(searchParams.page as string, 10)) : 1;
  
  // Fetch translations
  const translations = await getServerTranslations(lang);
  
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    content: t('common.content', translations),
    search: t('pages.search.title', translations),
  };

  const countLabels = {
    resultFor: t('common.resultFor', translations),
    resultsFor: t('common.resultsFor', translations),
  };
  
  // Optionally fetch initial results if search term is present
  let initialSearchResults: {
    data: FetchedArticle[];
    totalItems: number;
    range?: SearchRange;
  } = {
    data: [],
    totalItems: 0
  };

  if (search && journalId) {
    try {
      initialSearchResults = await fetchSearchResults({
        terms: search,
        rvcode: journalId,
        page,
        itemsPerPage: 10,
        types: [],
        years: [],
        volumes: [],
        sections: [],
        authors: []
      });
    } catch (error) {
      console.error('Initial search failed:', error);
    }
  }

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