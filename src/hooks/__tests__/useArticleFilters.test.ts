import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { getPublicationYear, useArticleFilters } from '../useArticleFilters';
import { IArticle } from '@/types/article';

const article = (id: number, publicationDate: string, tag?: string): IArticle =>
  ({ id, title: `A${id}`, publicationDate, tag }) as IArticle;

const articles = [
  article(1, '2024-03-01', 'article'),
  article(2, '2023-06-15 10:00:00', 'conferenceobject'),
  article(3, '2024-12-31T23:30:00+00:00', 'article'),
  article(4, '2021-01-01', 'unknown-type'),
];

const ids = (list: IArticle[]): number[] => list.map(a => a.id);

describe('getPublicationYear', () => {
  it('reads the leading year regardless of the time part', () => {
    expect(getPublicationYear('2024-12-31T23:30:00-10:00')).toBe(2024);
    expect(getPublicationYear('2023-06-15 10:00:00')).toBe(2023);
  });

  it('returns undefined for missing or unparsable dates', () => {
    expect(getPublicationYear(undefined)).toBeUndefined();
    expect(getPublicationYear('')).toBeUndefined();
    expect(getPublicationYear('n/a')).toBeUndefined();
  });
});

describe('useArticleFilters', () => {
  it('derives known types and years (newest first) from the articles', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    expect(result.current.types.map(t => t.value)).toEqual(['article', 'conferenceobject']);
    expect(result.current.years.map(y => y.year)).toEqual([2024, 2023, 2021]);
    expect(ids(result.current.filteredArticles)).toEqual([1, 2, 3, 4]);
    expect(result.current.taggedFilters).toEqual([]);
  });

  it('filters by year and by type (AND across facets, OR within one)', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    act(() => result.current.toggleYear(2024));
    expect(ids(result.current.filteredArticles)).toEqual([1, 3]);

    act(() => result.current.toggleYear(2023));
    expect(ids(result.current.filteredArticles)).toEqual([1, 2, 3]);

    act(() => result.current.toggleType('conferenceobject'));
    expect(ids(result.current.filteredArticles)).toEqual([2]);
    expect(result.current.taggedFilters.map(f => f.value)).toEqual([
      'conferenceobject',
      2024,
      2023,
    ]);
  });

  it('toggling twice removes the filter', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    act(() => result.current.toggleType('article'));
    act(() => result.current.toggleType('article'));
    expect(result.current.types.every(t => !t.isChecked)).toBe(true);
    expect(result.current.filteredArticles).toHaveLength(4);
  });

  it('removes a single filter and clears all', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    act(() => {
      result.current.toggleType('article');
      result.current.toggleYear(2024);
    });
    act(() => result.current.removeFilter('year', 2024));
    expect(result.current.taggedFilters).toEqual([
      { type: 'type', value: 'article', labelPath: 'pages.articles.types.article' },
    ]);

    act(() => result.current.clearFilters());
    expect(result.current.taggedFilters).toEqual([]);
    expect(result.current.filteredArticles).toHaveLength(4);
  });

  it('removing a filter that is not selected leaves it unselected', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    act(() => result.current.toggleYear(2024));
    act(() => result.current.removeFilter('year', 2024));
    act(() => result.current.removeFilter('year', 2024));

    expect(result.current.taggedFilters).toEqual([]);
  });

  it('applies whole selections coming from the mobile modal', () => {
    const { result } = renderHook(() => useArticleFilters(articles));

    act(() => {
      result.current.applySelection({
        types: result.current.types.map(t => ({ ...t, isChecked: true })),
        years: [
          { year: 2021, isChecked: true },
          { year: 2024, isChecked: false },
        ],
      });
    });
    expect(ids(result.current.filteredArticles)).toEqual([]);
    expect(result.current.years.find(y => y.year === 2021)?.isChecked).toBe(true);
  });

  it('hides a facet that offers a single choice', () => {
    const { result } = renderHook(() =>
      useArticleFilters([article(1, '2024-01-01', 'article'), article(2, '2023-01-01', 'article')])
    );

    expect(result.current.types).toEqual([]);
    expect(result.current.years.map(y => y.year)).toEqual([2024, 2023]);
  });
});
