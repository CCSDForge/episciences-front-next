import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SectionArticleCard from '../SectionArticleCard';
import { IArticle } from '@/types/article';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/icons', () => ({
  CaretUpBlackIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="caret-up" aria-label={ariaLabel} />
  ),
  CaretDownBlackIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="caret-down" aria-label={ariaLabel} />
  ),
  DownloadBlackIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="download-icon" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/utils/date', () => ({
  formatDate: vi.fn(() => 'Jan 20, 2024'),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'common.abstract': 'Abstract',
    'common.pdf': 'PDF',
  };
  return map[key] ?? key;
});

const baseArticle: IArticle = {
  id: 55,
  title: 'Graph Theory Applications in Social Networks',
  authors: [{ fullname: 'Eve Torres' }, { fullname: 'Frank Mueller' }],
  publicationDate: '2024-01-20',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-55',
  doi: '10.8888/hal.55',
};

// --- Tests ---

describe('SectionArticleCard', () => {
  describe('rendering', () => {
    it('renders the article title', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText('Graph Theory Applications in Social Networks')).toBeInTheDocument();
    });

    it('renders title as a link to the article detail page', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={baseArticle} />);
      const link = screen.getByRole('link', { name: /Graph Theory/ });
      expect(link).toHaveAttribute('href', expect.stringContaining('55'));
    });

    it('renders authors joined by comma', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText('Eve Torres, Frank Mueller')).toBeInTheDocument();
    });

    it('renders the publication date', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument();
    });

    it('renders article tag when present', () => {
      const article: IArticle = { ...baseArticle, tag: 'article' };
      render(<SectionArticleCard language="en" t={mockT as any} article={article} />);
      expect(screen.getByText('pages.articles.types.article')).toBeInTheDocument();
    });

    it('does not render tag when absent', () => {
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      expect(container.querySelector('.volumeArticleCard-tag')).not.toBeInTheDocument();
    });

    it('does not render abstract section when abstract is absent', () => {
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      expect(container.querySelector('.sectionArticleCard-abstract')).not.toBeInTheDocument();
    });

    it('does not render PDF link when pdfLink is absent', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('renders PDF download link when pdfLink is present', () => {
      const article: IArticle = { ...baseArticle, pdfLink: 'https://example.com/p.pdf' };
      render(<SectionArticleCard language="en" t={mockT as any} article={article} />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('PDF link points to the download route', () => {
      const article: IArticle = { ...baseArticle, pdfLink: 'https://example.com/p.pdf' };
      render(<SectionArticleCard language="en" t={mockT as any} article={article} />);
      const link = screen.getByRole('link', { name: /PDF/ });
      expect(link).toHaveAttribute('href', expect.stringContaining('55'));
      expect(link).toHaveAttribute('href', expect.stringContaining('download'));
    });
  });

  describe('abstract toggle — internal state', () => {
    const articleWithAbstract: IArticle = {
      ...baseArticle,
      abstract: 'We analyze social network graphs using combinatorial methods.',
    };

    it('renders abstract toggle when abstract is present', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      expect(screen.getByRole('button', { name: /abstract/i })).toBeInTheDocument();
    });

    it('abstract is collapsed initially', () => {
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      expect(
        container.querySelector('.sectionArticleCard-abstract-title-closed')
      ).toBeInTheDocument();
    });

    it('expands abstract on click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(
        container.querySelector('.sectionArticleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('collapses abstract on second click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      const toggle = screen.getByRole('button', { name: /abstract/i });
      await user.click(toggle);
      await user.click(toggle);
      expect(
        container.querySelector('.sectionArticleCard-abstract-title-closed')
      ).toBeInTheDocument();
    });

    it('expands abstract on Enter key', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard('{Enter}');
      expect(
        container.querySelector('.sectionArticleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('expands abstract on Space key', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard(' ');
      expect(
        container.querySelector('.sectionArticleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('shows caret-down when abstract is collapsed', () => {
      render(<SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });

    it('shows caret-up after expanding', async () => {
      const user = userEvent.setup();
      render(<SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('shows abstract content when expanded', async () => {
      const user = userEvent.setup();
      render(<SectionArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(
        screen.getByText('We analyze social network graphs using combinatorial methods.')
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no a11y violations in base state', async () => {
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract and pdf link', async () => {
      const article: IArticle = {
        ...baseArticle,
        abstract: 'We analyze social network graphs.',
        pdfLink: 'https://example.com/p.pdf',
      };
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={article} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract expanded', async () => {
      const user = userEvent.setup();
      const article: IArticle = {
        ...baseArticle,
        abstract: 'We analyze social network graphs.',
      };
      const { container } = render(
        <SectionArticleCard language="en" t={mockT as any} article={article} />
      );
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
