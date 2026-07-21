import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthorsClient from './AuthorsClient';
import { fetchAuthors } from '@/services/author';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/authors'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/services/author', () => ({
  fetchAuthors: vi.fn(),
}));

vi.mock('@/store/features/author/author.query', () => ({
  useFetchAuthorArticlesQuery: vi.fn(() => ({ data: undefined, isFetching: false })),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockAuthors = [
  { id: '1', name: 'Jane Doe', count: 2 },
  { id: '2', name: 'John Smith', count: 1 },
];

const initialAuthorsData = { items: mockAuthors, totalItems: 2 };

describe('AuthorsClient', () => {
  beforeEach(() => {
    vi.mocked(fetchAuthors).mockResolvedValue({
      data: mockAuthors,
      totalItems: 2,
    } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
  });

  it('renders authors from initialAuthorsData without a loader', async () => {
    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('shows a loader when no initial data is provided', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(fetchAuthors).mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      }) as any
    );

    const { container } = render(
      <AuthorsClient initialPage={1} initialSearch="" lang="fr" />
    );

    expect(container.querySelector('.authors-content-loader')).toBeInTheDocument();

    resolveFetch({ data: mockAuthors, totalItems: 2 });
    await waitFor(() =>
      expect(container.querySelector('.authors-content-loader')).not.toBeInTheDocument()
    );
  });

  it('shows the singular author count when there is exactly one', () => {
    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={{ items: [mockAuthors[0]], totalItems: 1 }}
        lang="fr"
      />
    );

    expect(screen.getByText(/1 common.author$/)).toBeInTheDocument();
  });

  it('shows the search-qualified count and a tag when a search term is active', () => {
    render(
      <AuthorsClient
        initialPage={1}
        initialSearch="Jane"
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    expect(screen.getByText(/common.authorsFor/)).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('navigates and updates state when typing a new search term', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Doe' } });

    expect(mockPush).toHaveBeenCalledWith('/authors?search=Doe');
  });

  it('sets the active letter filter and shows the "others" label', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialLetter="others"
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    // Appears once as the sidebar's catch-all letter and once in the active count.
    expect(screen.getAllByText('pages.authors.others').length).toBeGreaterThanOrEqual(2);
  });

  it('clears all tagged filters when "clear all" is clicked', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <AuthorsClient
        initialPage={1}
        initialSearch="Jane"
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    fireEvent.click(screen.getByText('common.filters.clearAll'));

    expect(mockPush).toHaveBeenCalledWith('/authors');
  });

  it('expands an author card and shows the details sidebar, then closes it', async () => {
    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={initialAuthorsData}
        lang="fr"
      />
    );

    fireEvent.click(await screen.findByText('Jane Doe'));
    expect(document.querySelector('.authorDetailsSidebar')).toBeInTheDocument();

    const closeButton = document.querySelector(
      '.authorDetailsSidebar-close'
    ) as HTMLElement | null;
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(document.querySelector('.authorDetailsSidebar')).not.toBeInTheDocument();
    }
  });

  it('paginates to a new page', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={{ items: mockAuthors, totalItems: 30 }}
        lang="fr"
      />
    );

    const nextButtons = screen.getAllByLabelText('components.pagination.next');
    fireEvent.click(nextButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/authors?page=2');
  });

  it('uses custom breadcrumb and count labels when provided', () => {
    render(
      <AuthorsClient
        initialPage={1}
        initialSearch=""
        initialAuthorsData={{ items: [mockAuthors[0]], totalItems: 1 }}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', authors: 'Auteurs' }}
        countLabels={{
          author: 'auteur',
          authors: 'auteurs',
          authorFor: 'auteur pour',
          authorsFor: 'auteurs pour',
          others: 'autres',
        }}
      />
    );

    expect(screen.getAllByText('Auteurs').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 auteur$/)).toBeInTheDocument();
  });
});
