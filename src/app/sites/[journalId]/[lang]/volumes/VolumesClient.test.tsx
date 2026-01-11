import { render, screen, waitFor, within } from '@testing-library/react';
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
  usePathname: () => '/volumes',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) => selector({
    i18nReducer: { language: 'fr' },
    journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
  }),
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
});