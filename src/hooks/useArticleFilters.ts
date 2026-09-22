'use client';

import { useMemo, useState } from 'react';
import { IArticle } from '@/types/article';
import { articleTypes } from '@/utils/article';
import {
  IArticleFiltersSelection,
  IArticleTypeSelection,
  IArticleYearSelection,
} from '@/components/Sidebars/ArticlesSidebar/ArticlesSidebar';

export type ArticleFilterKind = 'type' | 'year';

export interface IArticleTaggedFilter {
  type: ArticleFilterKind;
  value: string | number;
  label?: number;
  labelPath?: string;
}

/**
 * Reads the year from the leading `YYYY` of the date string rather than through `Date`,
 * so server and client agree whatever their time zone (no hydration mismatch).
 */
export function getPublicationYear(publicationDate?: string): number | undefined {
  const year = Number.parseInt(publicationDate?.slice(0, 4) ?? '', 10);
  return Number.isNaN(year) ? undefined : year;
}

function toggle<T>(source: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(source);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

/**
 * Client-side document type / year filtering of an already fully loaded article list
 * (e.g. a section). Facets are derived from the articles themselves; a facet offering a
 * single choice cannot narrow the list, so it is returned empty (hidden).
 */
export function useArticleFilters(articles: IArticle[]) {
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set());
  const [checkedYears, setCheckedYears] = useState<Set<number>>(new Set());

  const types = useMemo<IArticleTypeSelection[]>(() => {
    const present = new Set(articles.map(article => article.tag).filter(Boolean));
    const available = articleTypes.filter(type => present.has(type.value));
    if (available.length < 2) return [];
    return available.map(type => ({ ...type, isChecked: checkedTypes.has(type.value) }));
  }, [articles, checkedTypes]);

  const years = useMemo<IArticleYearSelection[]>(() => {
    const present = new Set(
      articles
        .map(article => getPublicationYear(article.publicationDate))
        .filter((year): year is number => year !== undefined)
    );
    if (present.size < 2) return [];
    return [...present]
      .sort((a, b) => b - a)
      .map(year => ({ year, isChecked: checkedYears.has(year) }));
  }, [articles, checkedYears]);

  const filteredArticles = useMemo(
    () =>
      articles.filter(
        article =>
          (checkedTypes.size === 0 || checkedTypes.has(article.tag ?? '')) &&
          (checkedYears.size === 0 ||
            checkedYears.has(getPublicationYear(article.publicationDate) ?? Number.NaN))
      ),
    [articles, checkedTypes, checkedYears]
  );

  const taggedFilters = useMemo<IArticleTaggedFilter[]>(
    () => [
      ...types
        .filter(type => type.isChecked)
        .map(type => ({ type: 'type' as const, value: type.value, labelPath: type.labelPath })),
      ...years
        .filter(year => year.isChecked)
        .map(year => ({ type: 'year' as const, value: year.year, label: year.year })),
    ],
    [types, years]
  );

  return {
    types,
    years,
    filteredArticles,
    taggedFilters,
    toggleType: (value: string): void => setCheckedTypes(prev => toggle(prev, value)),
    toggleYear: (year: number): void => setCheckedYears(prev => toggle(prev, year)),
    /** Replaces the whole selection, e.g. when the mobile modal applies its filters. */
    applySelection: ({ types, years }: IArticleFiltersSelection): void => {
      setCheckedTypes(new Set(types.filter(type => type.isChecked).map(type => type.value)));
      setCheckedYears(new Set(years.filter(year => year.isChecked).map(year => year.year)));
    },
    removeFilter: (type: ArticleFilterKind, value: string | number): void => {
      if (type === 'type') {
        setCheckedTypes(prev => toggle(prev, String(value)));
      } else {
        setCheckedYears(prev => toggle(prev, Number(value)));
      }
    },
    clearFilters: (): void => {
      setCheckedTypes(new Set());
      setCheckedYears(new Set());
    },
  };
}
