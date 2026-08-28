import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import StatisticsClient from './StatisticsClient';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn(), exists: () => false },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/statistics'),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/hooks/useClientSideFetch', () => ({
  useClientSideFetch: vi.fn(),
}));

vi.mock('@/services/statistics', () => ({
  fetchStatistics: vi.fn(),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="statistics-mobile-modal">
      <button onClick={() => props.onCloseCallback?.()}>close-modal</button>
    </div>
  ),
}));

const statsData = {
  data: [
    { name: 'nb-submissions', value: 42, unit: 'submission' },
    { name: 'acceptance-rate', value: 75, unit: 'percent' },
    {
      name: 'evaluation',
      value: { 'median-reviews-number': 3, 'reviews-received': 10, 'reviews-requested': 12 },
    },
  ],
  range: { years: [2023, 2024] },
};

describe('StatisticsClient', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    mockRefetch.mockClear();
    vi.mocked(useClientSideFetch).mockReturnValue({
      data: statsData,
      isUpdating: false,
      refetch: mockRefetch,
    } as any);
  });

  it('renders the glance and evaluation statistic values', () => {
    render(<StatisticsClient initialStats={statsData as any} lang="fr" />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('shows a loader while updating', () => {
    vi.mocked(useClientSideFetch).mockReturnValue({
      data: null,
      isUpdating: true,
      refetch: mockRefetch,
    } as any);

    const { container } = render(<StatisticsClient initialStats={undefined} lang="fr" />);

    expect(container.querySelector('.loader')).toBeInTheDocument();
  });

  it('toggles a statistics section open/closed', () => {
    render(<StatisticsClient initialStats={statsData as any} lang="fr" />);

    const trigger = document.querySelector(
      '.statistics-content-results-cards-row-title'
    ) as HTMLElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('checks a year filter from the sidebar and pushes an updated URL', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<StatisticsClient initialStats={statsData as any} lang="fr" />);

    const yearChoice = screen.getByText('2024');
    fireEvent.click(yearChoice);

    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContain('years=2024');
  });

  it('refetches when the selected years change', () => {
    render(<StatisticsClient initialStats={statsData as any} lang="fr" />);
    mockRefetch.mockClear();

    const yearChoice = screen.getByText('2023');
    fireEvent.click(yearChoice);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <StatisticsClient
        initialStats={statsData as any}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', statistics: 'Statistiques' }}
      />
    );

    expect(screen.getAllByText('Statistiques').length).toBeGreaterThan(0);
  });
});
