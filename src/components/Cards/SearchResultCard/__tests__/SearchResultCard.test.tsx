import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SearchResultCard, { ISearchResultCard } from '../SearchResultCard';
import { getCitations, copyToClipboardCitation } from '@/utils/article';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    lang,
  }: {
    href: string;
    children: React.ReactNode;
    lang?: string;
  }) => <a href={href} lang={lang}>{children}</a>,
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
  formatDate: vi.fn(() => 'Mar 15, 2024'),
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

const baseResult: ISearchResultCard = {
  id: 77,
  title: 'Neural Networks for Climate Modeling',
  authors: [{ fullname: 'Claire Moreau' }, { fullname: 'David Lee' }],
  publicationDate: '2024-03-15',
  repositoryName: 'arXiv',
  repositoryIdentifier: 'arxiv-77',
  doi: '10.0000/arxiv.77',
  openedAbstract: false,
};

const mockToggle = vi.fn();

beforeEach(() => {
  vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: undefined } as any);
  vi.mocked(getCitations).mockResolvedValue([]);
  vi.mocked(copyToClipboardCitation).mockClear();
  mockToggle.mockClear();
});

// --- Tests ---

describe('SearchResultCard', () => {
  describe('rendering', () => {
    it('renders the article title', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Neural Networks for Climate Modeling')).toBeInTheDocument();
    });

    it('renders authors joined by comma', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Claire Moreau, David Lee')).toBeInTheDocument();
    });

    it('renders publication date', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText(/Published on/)).toBeInTheDocument();
    });

    it('renders article tag when present', () => {
      const result: ISearchResultCard = { ...baseResult, tag: 'article' };
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('pages.articles.types.article')).toBeInTheDocument();
    });

    it('does not render tag when absent', () => {
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(container.querySelector('.searchResultCardTag')).not.toBeInTheDocument();
    });

    it('title renders as a link to the article detail page', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      const link = screen.getByRole('link', { name: /Neural Networks/ });
      expect(link).toHaveAttribute('href', expect.stringContaining('77'));
    });

    it('does not render PDF link when pdfLink is absent', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('renders PDF download link when pdfLink is present', () => {
      const result: ISearchResultCard = { ...baseResult, pdfLink: 'https://example.com/p.pdf' };
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  describe('abstract toggle', () => {
    const resultWithAbstract: ISearchResultCard = {
      ...baseResult,
      abstract: 'This study models climate with neural networks.',
    };

    it('renders abstract toggle as a semantic button', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={resultWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByRole('button', { name: /abstract/i })).toBeInTheDocument();
    });

    it('calls toggleAbstractCallback on click', async () => {
      const user = userEvent.setup();
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={resultWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /abstract/i }));
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('calls toggleAbstractCallback on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={resultWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      screen.getByRole('button', { name: /abstract/i }).focus();
      await user.keyboard('{Enter}');
      expect(mockToggle).toHaveBeenCalledOnce();
    });

    it('shows closed modifier class when openedAbstract is false', () => {
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={resultWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.searchResultCardAbstractTitleClosed')
      ).toBeInTheDocument();
    });

    it('removes closed modifier class when openedAbstract is true', () => {
      const result: ISearchResultCard = { ...resultWithAbstract, openedAbstract: true };
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.searchResultCardAbstractTitleClosed')
      ).not.toBeInTheDocument();
    });

    it('shows caret-down when abstract is collapsed', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={resultWithAbstract} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });

    it('shows caret-up when abstract is expanded', () => {
      const result: ISearchResultCard = { ...resultWithAbstract, openedAbstract: true };
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('handles abstract as an object (language fallback)', () => {
      const result: ISearchResultCard = {
        ...resultWithAbstract,
        abstract: { en: 'English abstract', fr: 'Résumé français' },
        openedAbstract: true,
      };
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('English abstract')).toBeInTheDocument();
    });

    it('falls back to other language when requested language is absent', () => {
      const result: ISearchResultCard = {
        ...resultWithAbstract,
        abstract: { fr: 'Résumé uniquement en français' } as any,
        openedAbstract: true,
      };
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      expect(screen.getByText('Résumé uniquement en français')).toBeInTheDocument();
    });
  });

  describe('lazy citation loading', () => {
    it('skips query initially', () => {
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true })
      );
    });

    it('does not show cite dropdown initially', () => {
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      expect(
        container.querySelector('.searchResultCardAnchorIconsCiteContentDisplayed')
      ).not.toBeInTheDocument();
    });

    it('shows loading text after clicking cite before data arrives', async () => {
      const user = userEvent.setup();
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /cite/i }));
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('activates query fetch after hover on cite button', async () => {
      const user = userEvent.setup();
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
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
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );

      await user.click(screen.getByRole('button', { name: /cite/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'APA' })).toBeInTheDocument();
      });
    });

    it('calls copyToClipboardCitation on citation button click', async () => {
      const fakeCitation = { key: 'APA', citation: 'Author 2024' };
      vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: 'mock-data' } as any);
      vi.mocked(getCitations).mockResolvedValue([fakeCitation]);

      const user = userEvent.setup();
      render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      await user.click(screen.getByRole('button', { name: /cite/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'APA' })).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'APA' }));

      expect(copyToClipboardCitation).toHaveBeenCalledWith(fakeCitation, mockT);
    });
  });

  describe('accessibility', () => {
    it('has no a11y violations in base state', async () => {
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('has no a11y violations with abstract and pdf link', async () => {
      const result: ISearchResultCard = {
        ...baseResult,
        abstract: 'Abstract text.',
        pdfLink: 'https://example.com/p.pdf',
      };
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('cite trigger is a semantic button', () => {
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={baseResult} toggleAbstractCallback={mockToggle} />
      );
      const citeTrigger = container.querySelector('.searchResultCardAnchorIconsCiteTrigger');
      expect(citeTrigger?.tagName).toBe('BUTTON');
    });

    it('abstract toggle is a semantic button', () => {
      const result: ISearchResultCard = { ...baseResult, abstract: 'Abstract text.' };
      const { container } = render(
        <SearchResultCard language="en" rvcode="testjournal" t={mockT as any} searchResult={result} toggleAbstractCallback={mockToggle} />
      );
      const toggle = container.querySelector('.searchResultCardAbstractTitle');
      expect(toggle?.tagName).toBe('BUTTON');
    });
  });
});
