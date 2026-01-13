'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { IAuthor, fetchAuthors } from '@/services/author';
import { useAppSelector } from '@/hooks/store';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import AuthorCard from '@/components/Cards/AuthorCard/AuthorCard';
import AuthorsSidebar from '@/components/Sidebars/AuthorsSidebar/AuthorsSidebar';
import AuthorDetailsSidebar from '@/components/Sidebars/AuthorDetailsSidebar/AuthorDetailsSidebar';
import Loader from '@/components/Loader/Loader';
import Pagination from '@/components/Pagination/Pagination';
import Tag from '@/components/Tag/Tag';
import PageTitle from '@/components/PageTitle/PageTitle';
import { handleKeyboardClick } from '@/utils/keyboard';
import './Authors.scss';

type AuthorTypeFilter = 'search' | 'activeLetter';

interface IAuthorFilter {
  type: AuthorTypeFilter;
  value: string;
}

interface AuthorsClientProps {
  initialPage: number;
  initialSearch: string;
  initialLetter?: string;
  initialAuthorsData?: {
    items: IAuthor[];
    totalItems: number;
  };
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    content: string;
    authors: string;
  };
  countLabels?: {
    author: string;
    authors: string;
    authorFor: string;
    authorsFor: string;
    others: string;
  };
}

const AUTHORS_PER_PAGE = 10;

export default function AuthorsClient({
  initialPage,
  initialSearch,
  initialLetter = '',
  initialAuthorsData,
  lang,
  breadcrumbLabels,
  countLabels,
}: AuthorsClientProps) {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const i18nState = useAppSelector(state => state.i18nReducer);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // État local
  const [isLoading, setIsLoading] = useState(!initialAuthorsData);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [activeLetter, setActiveLetter] = useState(initialLetter);
  const [authors, setAuthors] = useState<IAuthor[]>(initialAuthorsData?.items || []);
  const [totalAuthors, setTotalAuthors] = useState(initialAuthorsData?.totalItems || 0);
  const [taggedFilters, setTaggedFilters] = useState<IAuthorFilter[]>([]);
  const [expandedAuthorIndex, setExpandedAuthorIndex] = useState(-1);

  // Memoize fetch dependencies to avoid infinite loops
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!rvcode) {
          console.error('Journal code not available');
          return;
        }

        const authorsData = await fetchAuthors({
          rvcode,
          page: currentPage,
          itemsPerPage: AUTHORS_PER_PAGE,
          search: searchValue,
          letter: activeLetter,
        });

        setAuthors(authorsData.data);
        setTotalAuthors(authorsData.totalItems);
      } catch (error) {
        console.error('Error fetching authors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [rvcode, currentPage, searchValue, activeLetter]);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const newParams = new URLSearchParams(params?.toString() || '');
      if (value) {
        newParams.set(name, value);
      } else {
        newParams.delete(name);
      }
      return newParams.toString();
    },
    [params]
  );

  const onSearch = useCallback(
    (newSearch: string): void => {
      const newParams = createQueryString('search', newSearch);
      if (activeLetter) {
        const paramsWithoutLetter = new URLSearchParams(newParams);
        paramsWithoutLetter.delete('letter');
        router.push(`${pathname}?${paramsWithoutLetter.toString()}`);
      } else {
        router.push(`${pathname}?${newParams}`);
      }

      setCurrentPage(1);
      setExpandedAuthorIndex(-1);
      setActiveLetter('');
      setSearchValue(newSearch);
    },
    [activeLetter, createQueryString, pathname, router]
  );

  const onSetActiveLetter = useCallback(
    (newActiveLetter: string): void => {
      const actualNewLetter = newActiveLetter !== activeLetter ? newActiveLetter : '';
      const newParams = createQueryString('letter', actualNewLetter);

      if (searchValue) {
        const paramsWithoutSearch = new URLSearchParams(newParams);
        paramsWithoutSearch.delete('search');
        router.push(`${pathname}?${paramsWithoutSearch.toString()}`);
      } else {
        router.push(`${pathname}?${newParams}`);
      }

      setCurrentPage(1);
      setExpandedAuthorIndex(-1);
      setSearchValue('');
      setActiveLetter(actualNewLetter);
    },
    [activeLetter, createQueryString, pathname, router, searchValue]
  );

  const getExpandedAuthor = useCallback((): IAuthor | undefined => {
    if (expandedAuthorIndex === -1 || !authors) {
      return undefined;
    }

    return authors.find((_, index) => expandedAuthorIndex === index);
  }, [authors, expandedAuthorIndex]);

  const onCloseDetails = useCallback((): void => {
    setExpandedAuthorIndex(-1);
  }, []);

  const handlePageClick = useCallback(
    (selectedItem: { selected: number }): void => {
      const newPage = selectedItem.selected + 1;
      const newParams = createQueryString('page', newPage.toString());
      router.push(`${pathname}?${newParams}`);
      setCurrentPage(newPage);
    },
    [createQueryString, pathname, router]
  );

  const getAuthorsCount = (): React.JSX.Element | null => {
    if (totalAuthors > 1) {
      if (searchValue)
        return (
          <div className="authors-count">
            {totalAuthors} {countLabels?.authorsFor || t('common.authorsFor')} &ldquo;{searchValue}
            &rdquo;
          </div>
        );
      if (activeLetter)
        return (
          <div className="authors-count">
            {totalAuthors} {countLabels?.authorsFor || t('common.authorsFor')} &ldquo;
            {activeLetter === 'others'
              ? countLabels?.others || t('pages.authors.others')
              : activeLetter}
            &rdquo;
          </div>
        );

      return (
        <div className="authors-count">
          {totalAuthors} {countLabels?.authors || t('common.authors')}
        </div>
      );
    }

    if (searchValue)
      return (
        <div className="authors-count">
          {totalAuthors} {countLabels?.authorFor || t('common.authorFor')} &ldquo;{searchValue}
          &rdquo;
        </div>
      );
    if (activeLetter)
      return (
        <div className="authors-count">
          {totalAuthors} {countLabels?.authorFor || t('common.authorFor')} &ldquo;
          {activeLetter === 'others'
            ? countLabels?.others || t('pages.authors.others')
            : activeLetter}
          &rdquo;
        </div>
      );

    return (
      <div className="authors-count">
        {totalAuthors} {countLabels?.author || t('common.author')}
      </div>
    );
  };

  const setAllTaggedFilters = useCallback((): void => {
    const initFilters: IAuthorFilter[] = [];

    if (activeLetter) {
      initFilters.push({
        type: 'activeLetter',
        value: activeLetter,
      });
    }

    if (searchValue) {
      initFilters.push({
        type: 'search',
        value: searchValue,
      });
    }

    setTaggedFilters(initFilters);
  }, [activeLetter, searchValue]);

  const onCloseTaggedFilter = useCallback(
    (type: AuthorTypeFilter) => {
      if (type === 'search') {
        const newParams = new URLSearchParams(params?.toString() || '');
        newParams.delete('search');
        if (pathname) {
          router.push(`${pathname}?${newParams.toString()}`);
        }
        setSearchValue('');
      } else if (type === 'activeLetter') {
        const newParams = new URLSearchParams(params?.toString() || '');
        newParams.delete('letter');
        if (pathname) {
          router.push(`${pathname}?${newParams.toString()}`);
        }
        setActiveLetter('');
      }
    },
    [params, pathname, router]
  );

  const clearTaggedFilters = useCallback((): void => {
    if (pathname) {
      router.push(pathname);
    }
    setSearchValue('');
    setActiveLetter('');
    setTaggedFilters([]);
  }, [pathname, router]);

  useEffect(() => {
    setAllTaggedFilters();
  }, [setAllTaggedFilters]);

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels
        ? `${breadcrumbLabels.home} > ${breadcrumbLabels.content} >`
        : `${t('pages.home.title')} > ${t('common.content')} >`,
    },
  ];

  return (
    <main className="authors">
      <PageTitle title={breadcrumbLabels?.authors || t('pages.authors.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.authors || t('pages.authors.title')}
        lang={lang}
      />
      <h1 className="authors-title">{breadcrumbLabels?.authors || t('pages.authors.title')}</h1>
      {getAuthorsCount()}
      <div className="authors-filters">
        <div className="authors-filters-tags">
          {taggedFilters.map((filter, index) => (
            <Tag
              key={index}
              text={
                filter.value === 'others'
                  ? countLabels?.others || t('pages.authors.others')
                  : filter.value
              }
              onCloseCallback={(): void => onCloseTaggedFilter(filter.type)}
            />
          ))}
          {taggedFilters.length > 0 ? (
            <div className="authors-filters-tags-clear" 
        role="button"
        tabIndex={0}
        
        onClick={clearTaggedFilters}
        onKeyDown={(e) => handleKeyboardClick(e, clearTaggedFilters)}>
              {t('common.filters.clearAll')}
            </div>
          ) : (
            <div className="authors-filters-tags-clear"></div>
          )}
        </div>
      </div>
      <div className="authors-content">
        <AuthorsSidebar
          t={t}
          search={searchValue}
          onSearchCallback={onSearch}
          activeLetter={activeLetter}
          onSetActiveLetterCallback={onSetActiveLetter}
        />
        <div className="authors-content-results">
          <div className="authors-content-results-paginationTop">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={AUTHORS_PER_PAGE}
              totalItems={totalAuthors}
              onPageChange={handlePageClick}
            />
          </div>
          {isLoading ? (
            <div className="authors-content-loader">
              <Loader />
            </div>
          ) : (
            <div className="authors-content-results-cards">
              {authors?.map((author, index) => (
                <AuthorCard
                  key={index}
                  t={t}
                  author={author}
                  expandedCard={expandedAuthorIndex === index}
                  setExpandedAuthorIndexCallback={(): void =>
                    expandedAuthorIndex !== index
                      ? setExpandedAuthorIndex(index)
                      : setExpandedAuthorIndex(-1)
                  }
                />
              ))}
            </div>
          )}
          <div className="authors-content-results-paginationBottom">
            <Pagination
              currentPage={currentPage}
              itemsPerPage={AUTHORS_PER_PAGE}
              totalItems={totalAuthors}
              onPageChange={handlePageClick}
            />
          </div>
        </div>
      </div>
      {expandedAuthorIndex >= 0 && (
        <AuthorDetailsSidebar
          language={i18nState.language}
          t={t}
          rvcode={rvcode}
          expandedAuthor={getExpandedAuthor()}
          onCloseDetailsCallback={onCloseDetails}
        />
      )}
    </main>
  );
}
