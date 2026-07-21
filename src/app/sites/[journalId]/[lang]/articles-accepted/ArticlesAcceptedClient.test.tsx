import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticlesAcceptedClient from './ArticlesAcceptedClient';
import { useFetchArticlesQuery } from '@/store/features/article/article.query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/articles-accepted'),
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
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="articles-accepted-mobile-modal">
      <button onClick={() => props.onUpdateTypesCallback(props.initialTypes)}>apply-types</button>
      <button onClick={() => props.onCloseCallback()}>close-modal</button>
    </div>
  ),
}));

const mockArticles = [
  {
    id: 1,
    title: 'Article 1',
    tag: 'article',
    authors: [],
    abstract: 'Abstract 1',
    docLink: 'https://example.com/articles/1',
  },
  {
    id: 2,
    title: 'Article 2',
    tag: 'preprint',
    authors: [],
    abstract: 'Abstract 2',
    docLink: 'https://example.com/articles/2',
  },
];

const initialArticles = { data: mockArticles, totalItems: 2 };
const initialRange = { types: ['article', 'preprint'] };

describe('ArticlesAcceptedClient', () => {
  beforeEach(() => {
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: { data: mockArticles, totalItems: 2, range: { types: ['article'] } },
      isFetching: false,
    } as any);
  });

  it('renders articles returned by the query', () => {
    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('shows the loader while fetching (once hydrated)', async () => {
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: undefined,
      isFetching: true,
    } as any);

    const { container } = render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    await waitFor(() => expect(container.querySelector('.loader')).toBeInTheDocument());
  });

  it('shows the no-results message when there are no articles', () => {
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: { data: [], totalItems: 0 },
      isFetching: false,
    } as any);

    render(
      <ArticlesAcceptedClient
        initialArticles={{ data: [], totalItems: 0 }}
        initialRange={initialRange}
        lang="fr"
      />
    );

    expect(screen.getByText('pages.articlesAccepted.noResults')).toBeInTheDocument();
  });

  it('checks a type filter from the sidebar and adds a tag', () => {
    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    const sidebarCheckbox = document.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(sidebarCheckbox);

    expect(document.querySelector('.articlesAccepted-filters-tags')).toBeInTheDocument();
  });

  it('clears all tagged filters when "clear all" is clicked', () => {
    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    const sidebarCheckbox = document.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(sidebarCheckbox);
    expect(document.querySelector('.articlesAccepted-filters-tags')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.filters.clearAll'));
    expect(document.querySelector('.articlesAccepted-filters-tags')).not.toBeInTheDocument();
  });

  it('toggles all abstracts open/closed', () => {
    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    const toggle = screen.getAllByText('common.toggleAbstracts.showAll')[0];
    fireEvent.click(toggle);

    expect(screen.getAllByText('common.toggleAbstracts.hideAll').length).toBeGreaterThan(0);
  });

  it('opens the mobile filters modal, applies types from it, then closes it', () => {
    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    const filterTile = document.querySelector(
      '.articlesAccepted-title-count-filtersMobile-tile'
    ) as HTMLElement;
    fireEvent.click(filterTile);

    expect(screen.getByTestId('articles-accepted-mobile-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('articles-accepted-mobile-modal')).not.toBeInTheDocument();
  });

  it('falls back to initialArticles when the query has not yet returned data', () => {
    vi.mocked(useFetchArticlesQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
    } as any);

    render(
      <ArticlesAcceptedClient initialArticles={initialArticles} initialRange={initialRange} lang="fr" />
    );

    expect(screen.getByText('Article 1')).toBeInTheDocument();
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <ArticlesAcceptedClient
        initialArticles={initialArticles}
        initialRange={initialRange}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', articlesAccepted: 'Accepted' }}
      />
    );

    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
  });
});
