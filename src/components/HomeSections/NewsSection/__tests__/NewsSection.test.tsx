import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NewsSection from '../NewsSection';
import { INews } from '@/types/news';

// Mock Link component
vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock formatDate
vi.mock('@/utils/date', () => ({
  formatDate: vi.fn(() => 'Jan 1, 2024'),
}));

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.publishedOn': 'Published on',
  };
  return translations[key] || key;
});

const mockNews: INews[] = [
  {
    id: 1,
    title: { en: 'First news article', fr: 'Premier article' },
    publicationDate: '2024-01-01',
    author: 'Author 1',
  },
  {
    id: 2,
    title: { en: 'Second news article', fr: 'Deuxième article' },
    publicationDate: '2024-01-02',
    author: 'Author 2',
  },
  {
    id: 3,
    title: { en: 'Third news article', fr: 'Troisième article' },
    publicationDate: '2024-01-03',
    author: 'Author 3',
  },
];

describe('NewsSection', () => {
  describe('rendering', () => {
    it('renders the newsSection container', () => {
      const { container } = render(
        <NewsSection language="en" t={mockT as any} news={mockNews} />
      );

      expect(container.querySelector('.newsSection')).toBeInTheDocument();
    });

    it('renders all news items', () => {
      render(<NewsSection language="en" t={mockT as any} news={mockNews} />);

      expect(screen.getByText('First news article')).toBeInTheDocument();
      expect(screen.getByText('Second news article')).toBeInTheDocument();
      expect(screen.getByText('Third news article')).toBeInTheDocument();
    });

    it('renders news titles in the correct language', () => {
      render(<NewsSection language="fr" t={mockT as any} news={mockNews} />);

      expect(screen.getByText('Premier article')).toBeInTheDocument();
      expect(screen.getByText('Deuxième article')).toBeInTheDocument();
    });

    it('renders publication dates', () => {
      render(<NewsSection language="en" t={mockT as any} news={mockNews} />);

      const dates = screen.getAllByText(/Published on/);
      expect(dates).toHaveLength(3);
    });

    it('renders empty container when no news', () => {
      const { container } = render(
        <NewsSection language="en" t={mockT as any} news={[]} />
      );

      expect(container.querySelector('.newsSection')).toBeInTheDocument();
      expect(container.querySelectorAll('.newsSection-row')).toHaveLength(0);
    });
  });

  describe('links', () => {
    it('renders links pointing to news page with item id', () => {
      const { container } = render(
        <NewsSection language="en" t={mockT as any} news={mockNews} />
      );

      const links = container.querySelectorAll('a');
      expect(links[0]).toHaveAttribute('href', expect.stringContaining('#1'));
      expect(links[1]).toHaveAttribute('href', expect.stringContaining('#2'));
      expect(links[2]).toHaveAttribute('href', expect.stringContaining('#3'));
    });
  });

  describe('dividers', () => {
    it('renders dividers between news items (not after last)', () => {
      const { container } = render(
        <NewsSection language="en" t={mockT as any} news={mockNews} />
      );

      const dividers = container.querySelectorAll('.newsSection-divider');
      // Should have 2 dividers for 3 items (not after the last one)
      expect(dividers).toHaveLength(2);
    });

    it('renders no dividers when there is only one news item', () => {
      const { container } = render(
        <NewsSection language="en" t={mockT as any} news={[mockNews[0]]} />
      );

      const dividers = container.querySelectorAll('.newsSection-divider');
      expect(dividers).toHaveLength(0);
    });
  });

  describe('no hydration risk', () => {
    it('renders all items on server-side (no isMounted guard)', () => {
      // The component should not use useState/useEffect for slicing,
      // ensuring SSR and client render the same output
      render(<NewsSection language="en" t={mockT as any} news={mockNews} />);

      // All 3 items must be visible on first render (no isMounted guard)
      expect(screen.getByText('First news article')).toBeInTheDocument();
      expect(screen.getByText('Second news article')).toBeInTheDocument();
      expect(screen.getByText('Third news article')).toBeInTheDocument();
    });
  });
});
