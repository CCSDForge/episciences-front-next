import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TFunction } from 'i18next';
import { useSearchParams } from 'next/navigation';
import PaginatedArticleList from '../PaginatedArticleList';
import { ARTICLES_PER_PAGE } from '@/utils/pagination';
import { IArticle } from '@/types/article';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push })),
  usePathname: vi.fn(() => '/en/volumes/669'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/components/Cards/VolumeArticleCard/VolumeArticleCard', () => ({
  default: ({ article }: { article: IArticle }) => (
    <div data-testid="article-card">{article.title}</div>
  ),
}));

vi.mock('@/components/Pagination/Pagination', () => ({
  default: ({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    hrefBuilder,
  }: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (item: { selected: number }) => void;
    hrefBuilder?: (page: number) => string;
  }) =>
    Math.ceil(totalItems / itemsPerPage) > 1 ? (
      <div data-testid="pagination" data-current={currentPage}>
        <a href={hrefBuilder?.(1)}>link to page 1</a>
        <a href={hrefBuilder?.(2)}>link to page 2</a>
        <button type="button" onClick={() => onPageChange({ selected: 1 })}>
          go to page 2
        </button>
      </div>
    ) : null,
}));

const t = ((key: string, options?: { page?: number }) =>
  options?.page ? `${key}:${options.page}` : key) as unknown as TFunction<'translation', undefined>;

const makeArticles = (count: number): IArticle[] =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, title: `Article ${i + 1}` }) as IArticle);

const renderList = (count: number) =>
  render(
    <PaginatedArticleList articles={makeArticles(count)} language="en" t={t} className="cards" />
  );

describe('PaginatedArticleList', () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as never);
    window.scrollTo = vi.fn();
  });

  it('renders all articles without pagination when they fit on one page', () => {
    renderList(ARTICLES_PER_PAGE);
    expect(screen.getAllByTestId('article-card')).toHaveLength(ARTICLES_PER_PAGE);
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('renders the first page by default', () => {
    renderList(45);
    const cards = screen.getAllByTestId('article-card');
    expect(cards).toHaveLength(20);
    expect(cards[0]).toHaveTextContent('Article 1');
    expect(screen.getByTestId('pagination')).toHaveAttribute('data-current', '1');
  });

  it('renders the page given by ?page=', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=3') as never);
    renderList(45);
    const cards = screen.getAllByTestId('article-card');
    expect(cards).toHaveLength(5);
    expect(cards[0]).toHaveTextContent('Article 41');
  });

  it.each([
    ['abc', 1, 'Article 1'],
    ['2abc', 1, 'Article 1'],
    ['-2', 1, 'Article 1'],
    ['0', 1, 'Article 1'],
    ['99', 3, 'Article 41'],
  ])('clamps invalid page "%s" to page %i', (page, expected, firstTitle) => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(`page=${page}`) as never);
    renderList(45);
    expect(screen.getByTestId('pagination')).toHaveAttribute('data-current', String(expected));
    expect(screen.getAllByTestId('article-card')[0]).toHaveTextContent(firstTitle);
  });

  it('pushes the new page to the URL, keeping other params, and scrolls to top', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('foo=bar') as never);
    renderList(45);
    fireEvent.click(screen.getByText('go to page 2'));
    expect(push).toHaveBeenCalledWith('/en/volumes/669?foo=bar&page=2', { scroll: false });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(screen.getByText('common.pagination.pageLoaded:2')).toBeInTheDocument();
  });

  it('links each page, page 1 being the URL without ?page=, keeping other params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('foo=bar&page=3') as never);
    renderList(45);
    expect(screen.getByText('link to page 1')).toHaveAttribute('href', '/en/volumes/669?foo=bar');
    expect(screen.getByText('link to page 2')).toHaveAttribute(
      'href',
      '/en/volumes/669?foo=bar&page=2'
    );
  });

  it('applies the container class name', () => {
    const { container } = renderList(3);
    expect(container.querySelector('.cards')).toBeInTheDocument();
  });
});
