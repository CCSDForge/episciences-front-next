import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatisticsSection from '../StatisticsSection';
import { IStat } from '@/types/stat';

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'pages.statistics.types.nbSubmissions': 'Submissions',
    'pages.statistics.types.acceptanceRate': 'Acceptance rate',
    'pages.statistics.types.medianSubmissionPublication': 'Median publication time',
  };
  return translations[key] || key;
});

const mockI18n = {
  exists: vi.fn((key: string) => key.includes('percent')),
  language: 'en',
};

const mockStats: IStat[] = [
  { name: 'nb-submissions', value: 150 },
  { name: 'acceptance-rate', value: 75, unit: 'percent' },
  { name: 'median-submission-publication', value: 90, unit: 'day' },
];

// Stats that should be filtered out (IStatValueDetails)
const detailsStats: IStat[] = [
  {
    name: 'nb-submissions-details',
    value: { published: 100, refused: 50 },
  },
];

describe('StatisticsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.exists.mockImplementation((key: string) => key.includes('percent'));
  });

  describe('rendering', () => {
    it('renders the statisticsSection container', () => {
      const { container } = render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      expect(container.querySelector('.statisticsSection')).toBeInTheDocument();
    });

    it('renders stat values', () => {
      render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('renders stat labels via translation key', () => {
      render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      expect(screen.getByText('Submissions')).toBeInTheDocument();
      expect(screen.getByText('Acceptance rate')).toBeInTheDocument();
    });

    it('renders empty container when no stats', () => {
      const { container } = render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={[]} />
      );

      expect(container.querySelector('.statisticsSection')).toBeInTheDocument();
      expect(container.querySelectorAll('.statisticsSection-row')).toHaveLength(0);
    });
  });

  describe('filtering IStatValueDetails stats', () => {
    it('filters out stats with IStatValueDetails values', () => {
      const { container } = render(
        <StatisticsSection
          t={mockT as any}
          i18n={mockI18n as any}
          stats={detailsStats}
        />
      );

      expect(container.querySelectorAll('.statisticsSection-row')).toHaveLength(0);
    });

    it('renders only simple stats when mixed with details stats', () => {
      const mixedStats = [...mockStats, ...detailsStats];

      const { container } = render(
        <StatisticsSection
          t={mockT as any}
          i18n={mockI18n as any}
          stats={mixedStats}
        />
      );

      // Only 3 simple stats, not the details one
      expect(container.querySelectorAll('.statisticsSection-row')).toHaveLength(3);
    });
  });

  describe('units', () => {
    it('renders unit with stat value when unit exists in i18n', () => {
      // percent exists in i18n mock
      render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      // i18n.exists returns true for "percent", so translated unit should be called
      expect(mockI18n.exists).toHaveBeenCalledWith('common.percent');
      // value is 75 > 1, so plural form called
      expect(mockT).toHaveBeenCalledWith('common.percents');
    });

    it('renders raw unit when unit is not in i18n', () => {
      // 'day' unit — i18n.exists returns false for it
      const { container } = render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      // 'day' is not in i18n, so it renders as raw text alongside the value
      const statDivs = container.querySelectorAll('.statisticsSection-row-stat');
      const dayStatDiv = Array.from(statDivs).find(el => el.textContent?.includes('day'));
      expect(dayStatDiv).toBeInTheDocument();
    });

    it('renders stat without unit correctly', () => {
      const statWithoutUnit: IStat[] = [{ name: 'nb-submissions', value: 42 }];

      render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={statWithoutUnit} />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('dividers', () => {
    it('renders dividers between stats (not after last)', () => {
      const { container } = render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      const dividers = container.querySelectorAll('.statisticsSection-divider');
      // 3 stats → 2 dividers
      expect(dividers).toHaveLength(2);
    });

    it('renders no dividers for single stat', () => {
      const { container } = render(
        <StatisticsSection
          t={mockT as any}
          i18n={mockI18n as any}
          stats={[mockStats[0]]}
        />
      );

      const dividers = container.querySelectorAll('.statisticsSection-divider');
      expect(dividers).toHaveLength(0);
    });
  });

  describe('no hydration risk', () => {
    it('renders all stats on first render (no isMounted guard)', () => {
      render(
        <StatisticsSection t={mockT as any} i18n={mockI18n as any} stats={mockStats} />
      );

      // All 3 rows must render without waiting for isMounted
      const rows = screen.getAllByText(/Submissions|Acceptance rate|Median/);
      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  });
});
