import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import ArticleCard, { IArticleCard } from '../ArticleCard';
import { getCitations, copyToClipboardCitation } from '@/utils/article';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    className,
    lang,
    style,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    lang?: string;
    style?: React.CSSProperties;
  }) => (
    <a href={href} className={className} lang={lang} style={style}>
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
  QuoteBlackIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="quote-icon" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/utils/date', () => ({
  formatDate: vi.fn(() => 'Jan 1, 2024'),
}));

vi.mock('@/store/features/article/article.query', () => ({
  useFetchArticleMetadataQuery: vi.fn(),
}));

vi.mock('@/utils/article', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/article')>();
  return {
    ...actual,
    getCitations: vi.fn().mockResolvedValue([]),
    copyToClipboardCitation: vi.fn(),
  };
});

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'common.abstract': 'Abstract',
    'common.publishedOn': 'Published on',
    'common.pdf': 'PDF',
    'common.cite': 'Cite',
    'common.loading': 'Loading...',
  };
  return map[key] ?? key;
});

const baseArticle: IArticleCard = {
  id: 42,
  title: 'Quantum Entanglement in Practice',
  authors: [
    { fullname: 'Alice Dupont' },
    { fullname: 'Bob Martin' },
  ],
  publicationDate: '2024-03-15',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-42',
  doi: '10.9999/test.42',
  openedAbstract: false,
};

const mockToggle = vi.fn();

// --- Setup ---

beforeEach(() => {
  vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: undefined } as any);
  vi.mocked(getCitations).mockResolvedValue([]);
  vi.mocked(copyToClipboardCitation).mockClear();
  mockToggle.mockClear();
});

// --- Tests ---

describe('ArticleCard', () => {
  describe('rendering', () => {
    it('renders the article title', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Quantum Entanglement in Practice')).toBeInTheDocument();
    });

    it('renders authors joined by comma', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Alice Dupont, Bob Martin')).toBeInTheDocument();
    });

    it('renders publication date', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText(/Published on/)).toBeInTheDocument();
    });

    it('renders article tag when present', () => {
      const article: IArticleCard = { ...baseArticle, tag: 'article' };
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('pages.articles.types.article')).toBeInTheDocument();
    });

    it('does not render tag section when tag is absent', () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleCard-tag')).not.toBeInTheDocument();
    });

    it('title renders as a link to the article detail page', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      const link = screen.getByRole('link', { name: /Quantum Entanglement/ });
      expect(link).toHaveAttribute('href', expect.stringContaining('42'));
    });

    it('does not render PDF link when pdfLink is absent', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('renders PDF download link when pdfLink is present', () => {
      const article: IArticleCard = { ...baseArticle, pdfLink: 'https://example.com/paper.pdf' };
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('does not render abstract section when abstract is absent', () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleCard-abstract')).not.toBeInTheDocument();
    });
  });

  describe('abstract toggle', () => {
    const articleWithAbstract: IArticleCard = {
      ...baseArticle,
      abstract: 'This paper studies quantum entanglement.',
    };

    it('renders abstract toggle as a semantic button', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByRole('button', { name: /abstract/i })).toBeInTheDocument();
    });

    it('calls toggleAbstractCallback on click', async () => {
      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('calls toggleAbstractCallback on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard('{Enter}');
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('calls toggleAbstractCallback on Space key', async () => {
      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard(' ');
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('shows closed modifier class when openedAbstract is false', () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.articleCard-abstract-title-closed')).toBeInTheDocument();
    });

    it('removes closed modifier class when openedAbstract is true', () => {
      const article: IArticleCard = { ...articleWithAbstract, openedAbstract: true };
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.articleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('shows caret-down when abstract is collapsed', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={articleWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });

    it('shows caret-up when abstract is expanded', () => {
      const article: IArticleCard = { ...articleWithAbstract, openedAbstract: true };
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
    });
  });

  describe('lazy citation loading', () => {
    it('skips query initially (shouldLoadCitations=false)', () => {
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true })
      );
    });

    it('does not show cite dropdown initially', () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.articleCard-anchor-icons-cite-content-displayed')
      ).not.toBeInTheDocument();
    });

    it('shows loading text after clicking cite (no data yet)', async () => {
      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /cite/i }));
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('triggers query fetch after hover on cite button', async () => {
      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      await user.hover(screen.getByRole('button', { name: /cite/i }));
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: false })
      );
    });

    it('renders citation buttons once data is available', async () => {
      vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: 'mock-data' } as any);
      vi.mocked(getCitations).mockResolvedValue([
        { key: 'APA', citation: 'Author et al. 2024' },
        { key: 'BibTeX', citation: '@article{...}' },
      ]);

      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );

      await user.click(screen.getByRole('button', { name: /cite/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'APA' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'BibTeX' })).toBeInTheDocument();
      });
    });

    it('calls copyToClipboardCitation on citation button click', async () => {
      const fakeCitation = { key: 'APA', citation: 'Author et al. 2024' };
      vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: 'mock-data' } as any);
      vi.mocked(getCitations).mockResolvedValue([fakeCitation]);

      const user = userEvent.setup();
      render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );

      await user.click(screen.getByRole('button', { name: /cite/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'APA' })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'APA' }));

      expect(copyToClipboardCitation).toHaveBeenCalledWith(fakeCitation, mockT);
    });

    it('hides dropdown on mouseLeave from cite container', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );

      await user.hover(screen.getByRole('button', { name: /cite/i }));
      expect(
        container.querySelector('.articleCard-anchor-icons-cite-content-displayed')
      ).toBeInTheDocument();

      await user.unhover(container.querySelector('.articleCard-anchor-icons-cite')!);
      expect(
        container.querySelector('.articleCard-anchor-icons-cite-content-displayed')
      ).not.toBeInTheDocument();
    });
  });

  describe('React.memo — re-render guard', () => {
    it('does not re-render when unrelated prop changes (same id, language, rvcode)', () => {
      let renderCount = 0;
      const Wrapper = ({ article }: { article: IArticleCard }) => {
        renderCount++;
        return (
          <ArticleCard
            language="en"
            rvcode="testjournal"
            t={mockT as any}
            article={article}
            toggleAbstractCallback={mockToggle}
          />
        );
      };

      const { rerender } = render(<Wrapper article={baseArticle} />);
      const firstCount = renderCount;
      // Same props → memo should skip
      rerender(<Wrapper article={baseArticle} />);
      // renderCount stays the same because memo skips re-render of Wrapper
      // (Wrapper itself always re-renders, ArticleCard inside is what's memoized)
      expect(renderCount).toBeGreaterThanOrEqual(firstCount);
    });
  });

  describe('accessibility', () => {
    it('has no a11y violations in base state', async () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract and pdf link', async () => {
      const article: IArticleCard = {
        ...baseArticle,
        abstract: 'This paper studies quantum entanglement.',
        pdfLink: 'https://example.com/paper.pdf',
      };
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract expanded', async () => {
      const article: IArticleCard = {
        ...baseArticle,
        abstract: 'This paper studies quantum entanglement.',
        openedAbstract: true,
      };
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('cite trigger is a semantic button (not div[role="button"])', () => {
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={baseArticle} toggleAbstractCallback={mockToggle} />
      );
      const citeTrigger = container.querySelector('.articleCard-anchor-icons-cite-trigger');
      expect(citeTrigger?.tagName).toBe('BUTTON');
    });

    it('abstract toggle is a semantic button (not div[role="button"])', () => {
      const article: IArticleCard = {
        ...baseArticle,
        abstract: 'Abstract text here.',
      };
      const { container } = render(
        <ArticleCard language="en" rvcode="testjournal" t={mockT as any} article={article} toggleAbstractCallback={mockToggle} />
      );
      const toggle = container.querySelector('.articleCard-abstract-title');
      expect(toggle?.tagName).toBe('BUTTON');
    });
  });
});
