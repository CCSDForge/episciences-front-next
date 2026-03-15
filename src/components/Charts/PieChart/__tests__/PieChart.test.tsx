import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PieChart from '../PieChart';
import { IStatValueDetailsAsPieChart } from '@/types/stat';

// Mock recharts to avoid SVG/canvas issues in happy-dom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-pie">{children}</div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="recharts-cell" data-fill={fill} />,
}));

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'pages.statistics.statuses.beingPublished': 'Being published',
    'pages.statistics.statuses.published': 'Published',
    'pages.statistics.statuses.refused': 'Refused',
    'pages.statistics.statuses.accepted': 'Accepted',
    'pages.statistics.statuses.other-status': 'Other status',
  };
  return translations[key] || key;
});

const pieData: IStatValueDetailsAsPieChart[] = [
  { status: 'published', count: 120 },
  { status: 'refused', count: 30 },
  { status: 'accepted', count: 15, isBeingToPublishStatus: true },
  { status: 'other-status', count: 5, isBeingToPublishStatus: true },
];

describe('PieChart', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_0;
    delete process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_1;
    delete process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_2;
    delete process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_3;
  });

  describe('rendering', () => {
    it('renders the chart container', () => {
      const { container } = render(<PieChart t={mockT as any} data={pieData} />);
      expect(container.querySelector('.pieChart')).toBeInTheDocument();
    });

    it('renders the responsive container', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the correct number of cells', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      const cells = screen.getAllByTestId('recharts-cell');
      expect(cells).toHaveLength(pieData.length);
    });
  });

  describe('legend', () => {
    it('renders legend section', () => {
      const { container } = render(<PieChart t={mockT as any} data={pieData} />);
      expect(container.querySelector('.pieChart-legend')).toBeInTheDocument();
    });

    it('renders "being published" category label', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      expect(screen.getByText('Being published')).toBeInTheDocument();
    });

    it('renders count and label for non-being-to-publish statuses', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      expect(screen.getByText(/120.*Published|Published.*120/)).toBeInTheDocument();
      expect(screen.getByText(/30.*Refused|Refused.*30/)).toBeInTheDocument();
    });

    it('renders count and label for being-to-publish statuses', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      expect(screen.getByText(/15.*Accepted|Accepted.*15/)).toBeInTheDocument();
    });

    it('correctly separates isBeingToPublishStatus items into their group', () => {
      const { container } = render(<PieChart t={mockT as any} data={pieData} />);
      const rows = container.querySelectorAll('.pieChart-legend-rows');
      // Two groups: not being-to-publish (rows[0]) and being-to-publish (rows[1])
      expect(rows).toHaveLength(2);
    });
  });

  describe('colors', () => {
    it('uses default colors when env vars are not set', () => {
      render(<PieChart t={mockT as any} data={pieData} />);
      const cells = screen.getAllByTestId('recharts-cell');
      // Default colors: '#9A312C', '#C9605B', '#FF9994', '#FFC9C7'
      expect(cells[0]).toHaveAttribute('data-fill', '#9A312C');
      expect(cells[1]).toHaveAttribute('data-fill', '#C9605B');
    });

    it('uses env var colors when set', () => {
      process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_0 = '#FF0000';
      process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_1 = '#00FF00';
      process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_2 = '#0000FF';
      process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_3 = '#FFFF00';

      render(<PieChart t={mockT as any} data={pieData} />);
      const cells = screen.getAllByTestId('recharts-cell');
      expect(cells[0]).toHaveAttribute('data-fill', '#FF0000');
      expect(cells[1]).toHaveAttribute('data-fill', '#00FF00');
    });

    it('cycles colors when data exceeds number of defined colors', () => {
      const extraData: IStatValueDetailsAsPieChart[] = [
        ...pieData,
        { status: 'extra', count: 5 },
      ];
      render(<PieChart t={mockT as any} data={extraData} />);
      const cells = screen.getAllByTestId('recharts-cell');
      // 5th cell should cycle back to first color
      expect(cells[4]).toHaveAttribute('data-fill', '#9A312C');
    });
  });

  describe('empty data', () => {
    it('renders without error when data is empty', () => {
      const { container } = render(<PieChart t={mockT as any} data={[]} />);
      expect(container.querySelector('.pieChart')).toBeInTheDocument();
    });

    it('renders no cells when data is empty', () => {
      render(<PieChart t={mockT as any} data={[]} />);
      expect(screen.queryAllByTestId('recharts-cell')).toHaveLength(0);
    });
  });
});
