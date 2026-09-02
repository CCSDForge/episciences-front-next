import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import VolumesClient from './VolumesClient';
import { IVolume } from '@/types/volume';
import { describe, it, expect, vi } from 'vitest';
import { useRouter } from 'next/navigation';

// Mocks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'fr',
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/volumes'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

// Mock the MathJax component
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock icons
vi.mock('@/components/icons', () => ({
  FilterIcon: () => <div data-testid="FilterIcon" />,
  ListBlackIcon: () => <div data-testid="ListBlackIcon" />,
  ListGreyIcon: () => <div data-testid="ListGreyIcon" />,
  TileBlackIcon: () => <div data-testid="TileBlackIcon" />,
  TileGreyIcon: () => <div data-testid="TileGreyIcon" />,
  FileGreyIcon: () => <div data-testid="FileGreyIcon" />,
  CloseBlackIcon: () => <div data-testid="CloseBlackIcon" />,
  CaretLeftGreyLightIcon: () => <div data-testid="CaretLeftGreyLightIcon" />,
  CaretLeftBlackIcon: () => <div data-testid="CaretLeftBlackIcon" />,
  CaretRightGreyLightIcon: () => <div data-testid="CaretRightGreyLightIcon" />,
  CaretRightBlackIcon: () => <div data-testid="CaretRightBlackIcon" />,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="volumes-modal">
      <button onClick={() => props.onCloseCallback()}>close-modal</button>
    </div>
  ),
}));

const mockVolumes = {
  data: [
    {
      id: 1,
      vid: 1,
      vol_num: '1',
      title: { fr: 'Volume 1' },
      types: ['special_issue'],
      year: 2024,
      articles: [],
      downloadLink: '',
    } as unknown as IVolume,
    {
      id: 2,
      vid: 2,
      vol_num: '2',
      title: { fr: 'Volume 2' },
      types: ['proceedings'],
      year: 2023,
      articles: [],
      downloadLink: '',
    } as unknown as IVolume,
  ],
  totalItems: 2,
  articlesCount: 10,
  range: {
    types: ['special_issue', 'proceedings'],
    years: [2023, 2024],
  },
};

describe('VolumesClient', () => {
  it('should initialize filters based on initialTypes', async () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={['special_issue']}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    // Find the sidebar specifically
    const sidebar = document.querySelector('.volumesSidebar');
    expect(sidebar).toBeTruthy();

    // Find label in sidebar
    const label = within(sidebar as HTMLElement).getByText('pages.volumes.types.specialIssues');
    expect(label).toBeInTheDocument();

    const container = label.closest('.volumesSidebar-typesSection-types-choice');
    const checkbox = container?.querySelector('input[type="checkbox"]') as HTMLInputElement;

    await waitFor(() => {
      expect(checkbox.checked).toBe(true);
    });
  });

  it('should call router.push when a filter is clicked', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    // Click on 'proceedings' label in sidebar
    const sidebar = document.querySelector('.volumesSidebar');
    const label = within(sidebar as HTMLElement).getByText('pages.volumes.types.proceedings');
    label.click();

    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('type=proceedings');
  });

  it('should display the volumes provided in initialVolumes', () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    expect(screen.getByText('Volume 1')).toBeInTheDocument();
    expect(screen.getByText('Volume 2')).toBeInTheDocument();
  });

  it('shows the plural volumes and articles counts', () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    expect(screen.getAllByText('2 common.volumes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10 common.articles').length).toBeGreaterThan(0);
  });

  it('shows the singular counts when there is exactly one volume/article', () => {
    render(
      <VolumesClient
        initialVolumes={{ ...mockVolumes, totalItems: 1, articlesCount: 1 }}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    expect(screen.getAllByText('1 common.volume').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 common.article').length).toBeGreaterThan(0);
  });

  it('switches to tile mode and hides the sidebar', () => {
    const { container } = render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    const tileButton = screen
      .getByText('common.renderingMode.tile')
      .closest('[role="button"]') as HTMLElement;
    fireEvent.click(tileButton);

    expect(container.querySelector('.volumesSidebar')).not.toBeInTheDocument();
    expect(container.querySelector('.volumes-content-results-cards-tiles')).toBeInTheDocument();
  });

  it('opens the desktop filters modal in tile mode and closes it', () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    fireEvent.click(
      screen.getByText('common.renderingMode.tile').closest('[role="button"]') as HTMLElement
    );

    const filterTile = document.querySelector('.volumes-filters-tags-filterTile') as HTMLElement;
    fireEvent.click(filterTile);

    expect(screen.getByTestId('volumes-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('volumes-modal')).not.toBeInTheDocument();
  });

  it('opens then closes the mobile filters modal', () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    const mobileFilterTile = document.querySelector('.volumes-filtersMobile-tile') as HTMLElement;
    fireEvent.click(mobileFilterTile);

    expect(screen.getByTestId('volumes-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('volumes-modal')).not.toBeInTheDocument();
  });

  it('clears all tagged filters and navigates', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={['special_issue']}
        initialYears={[2024]}
        lang="fr"
        journalId="journal"
      />
    );

    fireEvent.click(screen.getByText('common.filters.clearAll'));

    expect(mockPush).toHaveBeenCalled();
    const calledUrl = mockPush.mock.calls[mockPush.mock.calls.length - 1][0];
    expect(calledUrl).not.toContain('type=');
    expect(calledUrl).not.toContain('years=');
  });

  it('closes a single tagged filter via its close button', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    const { container } = render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={['special_issue']}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    const closeIcon = container.querySelector('[data-testid="CloseBlackIcon"]') as HTMLElement;
    fireEvent.click(closeIcon);

    expect(mockPush).toHaveBeenCalled();
  });

  it('paginates to a new page', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    render(
      <VolumesClient
        initialVolumes={{ ...mockVolumes, totalItems: 50 }}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
      />
    );

    fireEvent.click(screen.getByLabelText('components.pagination.next'));

    expect(mockPush).toHaveBeenCalledWith('/volumes?page=2');
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <VolumesClient
        initialVolumes={mockVolumes}
        initialPage={1}
        initialTypes={[]}
        initialYears={[]}
        lang="fr"
        journalId="journal"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', volumes: 'Volumes FR' }}
      />
    );

    expect(screen.getAllByText('Volumes FR').length).toBeGreaterThan(0);
  });
});
