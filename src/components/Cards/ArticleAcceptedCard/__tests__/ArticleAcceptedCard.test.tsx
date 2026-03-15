import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import ArticleAcceptedCard, { IArticleAcceptedCard } from '../ArticleAcceptedCard';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    target,
  }: {
    href: string;
    children: React.ReactNode;
    target?: string;
  }) => (
    <a href={href} target={target}>
      {children}
    </a>
  ),
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
  formatDate: vi.fn(() => 'Feb 10, 2024'),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'common.abstract': 'Abstract',
    'common.acceptedOn': 'Accepted on',
  };
  return map[key] ?? key;
});

const baseArticle: IArticleAcceptedCard = {
  id: 99,
  title: 'Deep Learning for Protein Folding',
  authors: [{ fullname: 'Marie Curie' }, { fullname: 'Albert Einstein' }],
  publicationDate: '2024-02-10',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-99',
  doi: '10.9999/hal.99',
  openedAbstract: false,
};

const mockToggle = vi.fn();

beforeEach(() => {
  mockToggle.mockClear();
});

// --- Tests ---

describe('ArticleAcceptedCard', () => {
  describe('rendering', () => {
    it('renders the article title via docLink when provided', () => {
      const article: IArticleAcceptedCard = {
        ...baseArticle,
        docLink: 'https://hal.science/hal-99',
      };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Deep Learning for Protein Folding')).toBeInTheDocument();
    });

    it('title is a link to docLink when provided', () => {
      const article: IArticleAcceptedCard = {
        ...baseArticle,
        docLink: 'https://hal.science/hal-99',
      };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      const link = screen.getByRole('link', { name: /Deep Learning/ });
      expect(link).toHaveAttribute('href', 'https://hal.science/hal-99');
    });

    it('does not render title link when docLink is absent', () => {
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders authors joined by comma', () => {
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Marie Curie, Albert Einstein')).toBeInTheDocument();
    });

    it('renders empty string when authors array is empty', () => {
      const article: IArticleAcceptedCard = { ...baseArticle, authors: [] };
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleAcceptedCard-authors')?.textContent).toBe('');
    });

    it('renders acceptance date when provided', () => {
      const article: IArticleAcceptedCard = {
        ...baseArticle,
        acceptanceDate: '2024-01-15',
      };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText(/Accepted on/)).toBeInTheDocument();
    });

    it('renders empty acceptance date area when acceptanceDate is absent', () => {
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      const dateEl = container.querySelector('.articleAcceptedCard-anchor-acceptanceDate');
      expect(dateEl).toBeInTheDocument();
      expect(dateEl?.textContent).toBe('');
    });

    it('renders article tag when present', () => {
      const article: IArticleAcceptedCard = { ...baseArticle, tag: 'article' };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('pages.articles.types.article')).toBeInTheDocument();
    });

    it('renders download link when docLink is present', () => {
      const article: IArticleAcceptedCard = {
        ...baseArticle,
        docLink: 'https://hal.science/hal-99',
        repositoryIdentifier: 'hal-99',
      };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('hal-99')).toBeInTheDocument();
    });

    it('does not render download link when docLink is absent', () => {
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleAcceptedCard-anchor-icons-download')).not.toBeInTheDocument();
    });
  });

  describe('abstract toggle', () => {
    const articleWithAbstract: IArticleAcceptedCard = {
      ...baseArticle,
      abstract: 'AlphaFold solved protein folding.',
    };

    it('renders abstract toggle when abstract is present', () => {
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByRole('button', { name: /abstract/i })).toBeInTheDocument();
    });

    it('does not render abstract section when abstract is absent', () => {
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleAcceptedCard-abstract')).not.toBeInTheDocument();
    });

    it('calls toggleAbstractCallback on click', async () => {
      const user = userEvent.setup();
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('calls toggleAbstractCallback on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard('{Enter}');
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('calls toggleAbstractCallback on Space key', async () => {
      const user = userEvent.setup();
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard(' ');
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('shows closed modifier class when openedAbstract is false', () => {
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.articleAcceptedCard-abstract-title-closed')
      ).toBeInTheDocument();
    });

    it('removes closed modifier class when openedAbstract is true', () => {
      const article: IArticleAcceptedCard = { ...articleWithAbstract, openedAbstract: true };
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.articleAcceptedCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('shows caret-down when collapsed', () => {
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });

    it('shows caret-up when expanded', () => {
      const article: IArticleAcceptedCard = { ...articleWithAbstract, openedAbstract: true };
      render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no a11y violations in base state', async () => {
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract, docLink, and acceptanceDate', async () => {
      const article: IArticleAcceptedCard = {
        ...baseArticle,
        abstract: 'AlphaFold solved protein folding.',
        docLink: 'https://hal.science/hal-99',
        acceptanceDate: '2024-01-15',
      };
      const { container } = render(
        <ArticleAcceptedCard language="en" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
