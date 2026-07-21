import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import ArticlesClient from './ArticlesClient';
import {
  useFetchArticlesQuery,
  useFetchArticleMetadataQuery,
} from '@/store/features/article/article.query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/articles'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/store/features/article/article.query', () => ({
  useFetchArticlesQuery: vi.fn(),
  useFetchArticleMetadataQuery: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="articles-mobile-modal">
      <button onClick={() => props.onUpdateTypesCallback(props.initialTypes)}>apply-types</button>
      <button onClick={() => props.onUpdateYearsCallback(props.initialYears)}>apply-years</button>
      <button onClick={() => props.onCloseCallback()}>close-modal</button>
    </div>
  ),
}));

const mockArticles = [
  { id: 1, title: 'Article 1', tag: 'article', authors: [], docLink: 'https://x/1' },
  { id: 2, title: 'Article 2', tag: 'preprint', authors: [], docLink: 'https://x/2' },
];

const initialArticles = {
  data: mockArticles,
  totalItems: 2,
  range: { types: ['article', 'preprint'], years: [2023, 2024] },
};

describe('ArticlesClient', () => {
  beforeEach(() => {
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);
    vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: undefined } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
  });

  it('renders the initial articles', () => {
    render(<ArticlesClient initialArticles={initialArticles as any} lang="fr" />);

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('shows the plural articles count', () => {
    render(<ArticlesClient initialArticles={initialArticles as any} lang="fr" />);
    expect(screen.getByText('2 common.articles')).toBeInTheDocument();
  });

  it('checks a type filter, adds a tag, and clears it', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<ArticlesClient initialArticles={initialArticles as any} lang="fr" />);

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(document.querySelector('.articles-filters-tags')).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/articles');

    fireEvent.click(screen.getByText('common.filters.clearAll'));
    expect(document.querySelector('.articles-filters-tags')).not.toBeInTheDocument();
  });

  it('toggles all abstracts open/closed', () => {
    render(<ArticlesClient initialArticles={initialArticles as any} lang="fr" />);

    const toggle = screen.getAllByText('common.toggleAbstracts.showAll')[0];
    fireEvent.click(toggle);

    expect(screen.getAllByText('common.toggleAbstracts.hideAll').length).toBeGreaterThan(0);
  });

  it('opens then closes the mobile filters modal', () => {
    render(<ArticlesClient initialArticles={initialArticles as any} lang="fr" />);

    const filterTile = document.querySelector(
      '.articles-title-count-filtersMobile-tile'
    ) as HTMLElement;
    fireEvent.click(filterTile);

    expect(screen.getByTestId('articles-mobile-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('articles-mobile-modal')).not.toBeInTheDocument();
  });

  it('paginates and pushes the new page to the URL', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    render(
      <ArticlesClient
        initialArticles={{ ...initialArticles, totalItems: 50 } as any}
        lang="fr"
      />
    );

    fireEvent.click(screen.getByLabelText('components.pagination.next'));

    expect(mockPush).toHaveBeenCalledWith('/articles?page=2');
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('shows a loader while fetching with no articles yet resolved', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=2') as any);
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as any);

    const { container } = render(
      <ArticlesClient initialArticles={{ data: [], totalItems: 0 } as any} lang="fr" />
    );

    expect(container.querySelector('.loader')).toBeInTheDocument();
  });

  it('uses custom breadcrumb and count labels when provided', () => {
    render(
      <ArticlesClient
        initialArticles={{ data: [mockArticles[0]], totalItems: 1 } as any}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', articles: 'Articles FR' }}
        countLabels={{ article: 'article', articles: 'articles' }}
      />
    );

    expect(screen.getAllByText('Articles FR').length).toBeGreaterThan(0);
    expect(screen.getByText('1 article')).toBeInTheDocument();
  });
});
