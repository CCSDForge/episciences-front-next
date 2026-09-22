'use client';

import { Suspense, useCallback, useState } from 'react';
import { TFunction } from 'i18next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AvailableLanguage } from '@/utils/i18n';
import { IArticle } from '@/types/article';
import VolumeArticleCard from '@/components/Cards/VolumeArticleCard/VolumeArticleCard';
import Pagination from '@/components/Pagination/Pagination';
import LiveRegion from '@/components/LiveRegion/LiveRegion';
import { ARTICLES_PER_PAGE } from '@/utils/pagination';

interface IArticleCardsProps {
  readonly articles: IArticle[];
  readonly language: AvailableLanguage;
  readonly t: TFunction<'translation', undefined>;
  readonly className: string;
  readonly itemsPerPage?: number;
}

function ArticleCards({
  articles,
  language,
  t,
  className,
}: Omit<IArticleCardsProps, 'itemsPerPage'>): React.JSX.Element {
  return (
    <div className={className}>
      {articles.map(article => (
        <VolumeArticleCard key={article.id} language={language} t={t} article={article} />
      ))}
    </div>
  );
}

/** URL of a list page (1-based); page 1 is the bare URL, which is also the canonical one. */
function buildPageHref(pathname: string, search: string, page: number): string {
  const params = new URLSearchParams(search);
  if (page > 1) {
    params.set('page', page.toString());
  } else {
    params.delete('page');
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

const noop = (): void => {};

/**
 * First page rendered without `useSearchParams`. Used as the Suspense fallback so the
 * prerendered (ISR) HTML contains the first articles and real pagination links, which work
 * even before hydration, instead of a loader.
 */
function ArticleCardsFirstPage({
  articles,
  itemsPerPage = ARTICLES_PER_PAGE,
  ...rest
}: IArticleCardsProps): React.JSX.Element {
  const pathname = usePathname() ?? '';
  return (
    <>
      <ArticleCards articles={articles.slice(0, itemsPerPage)} {...rest} />
      <Pagination
        currentPage={1}
        itemsPerPage={itemsPerPage}
        totalItems={articles.length}
        onPageChange={noop}
        hrefBuilder={page => buildPageHref(pathname, '', page)}
      />
    </>
  );
}

function UrlPaginatedArticleList({
  articles,
  language,
  t,
  className,
  itemsPerPage = ARTICLES_PER_PAGE,
}: IArticleCardsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [announcement, setAnnouncement] = useState('');

  const totalPages = Math.max(1, Math.ceil(articles.length / itemsPerPage));
  const parsedPage = Number.parseInt(searchParams?.get('page') ?? '1', 10);
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.min(Math.max(1, parsedPage), totalPages);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageArticles = articles.slice(startIndex, startIndex + itemsPerPage);

  const pageHref = useCallback(
    (page: number): string => buildPageHref(pathname ?? '', searchParams?.toString() ?? '', page),
    [pathname, searchParams]
  );

  const handlePageClick = useCallback(
    (selectedItem: { selected: number }): void => {
      const newPage = selectedItem.selected + 1;
      if (pathname) {
        router.push(pageHref(newPage), { scroll: false });
      }
      setAnnouncement(t('common.pagination.pageLoaded', { page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pathname, router, pageHref, t]
  );

  return (
    <>
      <LiveRegion message={announcement} />
      <ArticleCards articles={pageArticles} language={language} t={t} className={className} />
      <Pagination
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={articles.length}
        onPageChange={handlePageClick}
        hrefBuilder={pageHref}
      />
    </>
  );
}

/**
 * Client-side paginated list of article cards. The full list is already fetched
 * server-side, so pages are slices of it; the current page lives in `?page=`.
 * The Suspense boundary required by `useSearchParams` is owned here so callers
 * don't need to know how the page state is stored.
 */
export default function PaginatedArticleList(props: IArticleCardsProps): React.JSX.Element {
  return (
    <Suspense fallback={<ArticleCardsFirstPage {...props} />}>
      <UrlPaginatedArticleList {...props} />
    </Suspense>
  );
}
