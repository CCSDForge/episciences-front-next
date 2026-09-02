import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchClient from './SearchClient';
import { fetchSearchResults } from '@/services/search';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/search'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/services/search', () => ({
  fetchSearchResults: vi.fn(),
}));

vi.mock('@/store/features/article/article.query', () => ({
  useFetchArticleMetadataQuery: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="search-mobile-modal">
      <button onClick={() => props.onCloseCallback()}>close-modal</button>
      <button onClick={() => props.onUpdateTypesCallback?.([{ value: 'article', isChecked: true }])}>
        update-types
      </button>
      <button onClick={() => props.onUpdateYearsCallback?.([{ year: 2024, isChecked: true }])}>
        update-years
      </button>
      <button onClick={() => props.onUpdateVolumesCallback?.([{ id: 10, isChecked: true }])}>
        update-volumes
      </button>
      <button onClick={() => props.onUpdateSectionsCallback?.([{ id: 20, isChecked: true }])}>
        update-sections
      </button>
      <button
        onClick={() => props.onUpdateAuthorsCallback?.([{ fullname: 'Doe, John', isChecked: true }])}
      >
        update-authors
      </button>
    </div>
  ),
}));

const mockResults = [
  { id: 1, title: 'Result 1', tag: 'article', authors: [], docLink: 'https://x/1' },
  { id: 2, title: 'Result 2', tag: 'preprint', authors: [], docLink: 'https://x/2' },
];

const initialSearchResults = {
  data: mockResults,
  totalItems: 2,
  range: {
    types: [{ value: 'article', count: 1 }],
    years: [{ value: 2024, count: 2 }],
  },
};

describe('SearchClient', () => {
  beforeEach(() => {
    vi.mocked(fetchSearchResults).mockResolvedValue(initialSearchResults as any);
    vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: undefined } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
  });

  it('renders the initial search results', async () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    expect(await screen.findByText('Result 1')).toBeInTheDocument();
    expect(screen.getByText('Result 2')).toBeInTheDocument();
  });

  it('shows the plural results-for count with the search term', () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    expect(screen.getByText(/common.resultsFor/)).toBeInTheDocument();
    expect(screen.getByText(/graph/)).toBeInTheDocument();
  });

  it('checks a type filter from the sidebar, showing a tag', async () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    await waitFor(() =>
      expect(document.querySelector('.articles-filters-tags')).toBeInTheDocument()
    );
  });

  it('clears all tagged filters when "clear all" is clicked', async () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(document.querySelector('.articles-filters-tags')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText('common.filters.clearAll'));
    await waitFor(() =>
      expect(document.querySelector('.articles-filters-tags')).not.toBeInTheDocument()
    );
  });

  it('toggles all abstracts open/closed', () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    const toggle = screen.getAllByText('common.toggleAbstracts.showAll')[0];
    fireEvent.click(toggle);

    expect(screen.getAllByText('common.toggleAbstracts.hideAll').length).toBeGreaterThan(0);
  });

  it('opens then closes the mobile filters modal', () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    const filterTile = document.querySelector(
      '.articles-title-count-filtersMobile-tile'
    ) as HTMLElement;
    fireEvent.click(filterTile);

    expect(screen.getByTestId('search-mobile-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('search-mobile-modal')).not.toBeInTheDocument();
  });

  it('re-fetches results when the URL "terms" query param changes', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('terms=graph+theory') as any);

    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    await waitFor(() =>
      expect(fetchSearchResults).toHaveBeenCalledWith(
        expect.objectContaining({ terms: 'graph theory' })
      )
    );
  });

  it('paginates results', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    vi.mocked(fetchSearchResults).mockResolvedValue({
      ...initialSearchResults,
      totalItems: 50,
    } as any);

    render(
      <SearchClient
        initialSearchResults={{ ...initialSearchResults, totalItems: 50 } as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    await screen.findByText('Result 1');
    fireEvent.click(screen.getByLabelText('components.pagination.next'));

    await waitFor(() =>
      expect(fetchSearchResults).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    );
  });

  it('shows a loader while a filtered search request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(fetchSearchResults).mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      }) as any
    );

    const { container } = render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    await waitFor(() => expect(container.querySelector('.loader')).toBeInTheDocument());

    resolveFetch(initialSearchResults);
    await waitFor(() => expect(container.querySelector('.loader')).not.toBeInTheDocument());
  });

  it('uses custom breadcrumb and count labels when provided', () => {
    render(
      <SearchClient
        initialSearchResults={
          { ...initialSearchResults, data: [mockResults[0]], totalItems: 1 } as any
        }
        initialSearch="graph"
        initialPage={1}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', search: 'Recherche' }}
        countLabels={{ resultFor: 'résultat pour', resultsFor: 'résultats pour' }}
      />
    );

    expect(screen.getAllByText('Recherche').length).toBeGreaterThan(0);
    expect(screen.getByText(/résultat pour/)).toBeInTheDocument();
  });

  it('renders correctly with 0 search results', () => {
    render(
      <SearchClient
        initialSearchResults={{ data: [], totalItems: 0, range: {} } as any}
        initialSearch="nonexistent"
        initialPage={1}
        lang="fr"
      />
    );

    expect(screen.getByText(/common\.resultFor/)).toBeInTheDocument();
  });

  it('handles rich facets (year, volume, section, author) and tag removal', async () => {
    const richRangeResults = {
      data: mockResults,
      totalItems: 2,
      range: {
        types: [{ value: 'article', count: 1 }],
        years: [{ value: 2024, count: 2 }],
        volumes: {
          fr: [{ '10': 'Volume Dix' }],
          en: [{ '10': 'Volume Ten' }],
        },
        sections: {
          fr: [{ '20': 'Section Vingt' }],
          en: [{ '20': 'Section Twenty' }],
        },
        authors: [{ value: 'Doe, John', count: 1 }],
      },
    };

    render(
      <SearchClient
        initialSearchResults={richRangeResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    // Find all checkboxes
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.length).toBeGreaterThanOrEqual(5);

    // Click year checkbox
    fireEvent.click(checkboxes[1]);
    await waitFor(() =>
      expect(document.querySelector('.articles-filters-tags')).toBeInTheDocument()
    );

    // Remove the tag by clicking on its close button
    const removeTagBtn = document.querySelector('.articles-filters-tags button');
    if (removeTagBtn) {
      fireEvent.click(removeTagBtn);
      await waitFor(() =>
        expect(document.querySelector('.articles-filters-tags')).not.toBeInTheDocument()
      );
    }
  });

  it('handles search fetch failure gracefully', async () => {
    vi.mocked(fetchSearchResults).mockRejectedValueOnce(new Error('Search service down'));

    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    // Should not crash and keep or restore results
    await waitFor(() => {
      expect(fetchSearchResults).toHaveBeenCalled();
    });
  });

  it('updates filters when callbacks from mobile modal are triggered', async () => {
    render(
      <SearchClient
        initialSearchResults={initialSearchResults as any}
        initialSearch="graph"
        initialPage={1}
        lang="fr"
      />
    );

    // Open modal
    const filterTile = document.querySelector(
      '.articles-title-count-filtersMobile-tile'
    ) as HTMLElement;
    fireEvent.click(filterTile);

    expect(screen.getByTestId('search-mobile-modal')).toBeInTheDocument();

    // Trigger update-types
    fireEvent.click(screen.getByText('update-types'));
    // Trigger update-years
    fireEvent.click(screen.getByText('update-years'));
    // Trigger update-volumes
    fireEvent.click(screen.getByText('update-volumes'));
    // Trigger update-sections
    fireEvent.click(screen.getByText('update-sections'));
    // Trigger update-authors
    fireEvent.click(screen.getByText('update-authors'));

    // Close modal
    fireEvent.click(screen.getByText('close-modal'));

    await waitFor(() => {
      expect(document.querySelector('.articles-filters-tags')).toBeInTheDocument();
    });
  });
});
