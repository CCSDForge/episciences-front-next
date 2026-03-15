import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import VolumeArticleCard from '../VolumeArticleCard';
import { IArticle } from '@/types/article';

// Mock Link — key: it must render an <a> so navigation is semantic
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

// Mock MathJax
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Mock icons
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

// Mock formatDate
vi.mock('@/utils/date', () => ({
  formatDate: vi.fn(() => 'Jan 1, 2024'),
}));

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.abstract': 'Abstract',
    'common.publishedOn': 'Published on',
    'common.pdf': 'PDF',
  };
  return translations[key] || key;
});

const baseArticle: IArticle = {
  id: 101,
  title: 'A Study on Quantum Computing',
  authors: [
    { id: 1, fullname: 'Alice Martin', affiliations: [] },
    { id: 2, fullname: 'Bob Smith', affiliations: [] },
  ],
  publicationDate: '2024-01-01',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-123',
  doi: '10.1234/test',
};

describe('VolumeArticleCard', () => {
  describe('rendering', () => {
    it('renders the article title', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText('A Study on Quantum Computing')).toBeInTheDocument();
    });

    it('renders authors joined by comma', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText('Alice Martin, Bob Smith')).toBeInTheDocument();
    });

    it('renders the publication date', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.getByText(/Published on/)).toBeInTheDocument();
    });

    it('does not render the download link when pdfLink is absent', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('renders the download link when pdfLink is present', () => {
      const articleWithPdf: IArticle = { ...baseArticle, pdfLink: 'https://example.com/paper.pdf' };
      render(<VolumeArticleCard language="en" t={mockT as any} article={articleWithPdf} />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('renders article tag when present', () => {
      // 'article' is a valid ARTICLE_TYPE value mapping to 'pages.articles.types.article'
      const articleWithTag: IArticle = { ...baseArticle, tag: 'article' };
      render(<VolumeArticleCard language="en" t={mockT as any} article={articleWithTag} />);
      // The mock t returns the key itself: 'pages.articles.types.article'
      expect(screen.getByText('pages.articles.types.article')).toBeInTheDocument();
    });

    it('does not render tag when absent', () => {
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      expect(container.querySelector('.volumeArticleCard-tag')).not.toBeInTheDocument();
    });
  });

  describe('title is a semantic link', () => {
    it('title renders as an anchor element', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      const link = screen.getByRole('link', { name: /A Study on Quantum Computing/ });
      expect(link).toBeInTheDocument();
    });

    it('title link points to the article detail page', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      const link = screen.getByRole('link', { name: /A Study on Quantum Computing/ });
      expect(link).toHaveAttribute('href', expect.stringContaining('101'));
    });

    it('does not use role="button" for the title', () => {
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      // No div[role="button"] for the title — only proper <a>
      const buttonDivs = Array.from(container.querySelectorAll('div[role="button"]'));
      // None should be the title
      const titleButtons = buttonDivs.filter(el => el.classList.contains('volumeArticleCard-title'));
      expect(titleButtons).toHaveLength(0);
    });
  });

  describe('abstract toggle', () => {
    const articleWithAbstract: IArticle = {
      ...baseArticle,
      abstract: 'This paper explores quantum computing algorithms.',
    };

    it('renders abstract toggle button when abstract is present', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      expect(screen.getByRole('button', { name: /Abstract/ })).toBeInTheDocument();
    });

    it('does not render abstract toggle when no abstract', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />);
      expect(screen.queryByRole('button', { name: /Abstract/ })).not.toBeInTheDocument();
    });

    it('abstract is collapsed initially', () => {
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );
      expect(
        container.querySelector('.volumeArticleCard-abstract-title-closed')
      ).toBeInTheDocument();
    });

    it('expands abstract on click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );

      await user.click(screen.getByRole('button', { name: /Abstract/ }));

      expect(
        container.querySelector('.volumeArticleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('collapses abstract on second click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );

      const toggle = screen.getByRole('button', { name: /Abstract/ });
      await user.click(toggle);
      await user.click(toggle);

      expect(
        container.querySelector('.volumeArticleCard-abstract-title-closed')
      ).toBeInTheDocument();
    });

    it('abstract toggle is keyboard accessible', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />
      );

      const toggle = screen.getByRole('button', { name: /Abstract/ });
      toggle.focus();
      await user.keyboard('{Enter}');

      expect(
        container.querySelector('.volumeArticleCard-abstract-title-closed')
      ).not.toBeInTheDocument();
    });

    it('shows caret-up icon when abstract is open', async () => {
      const user = userEvent.setup();
      render(<VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);

      await user.click(screen.getByRole('button', { name: /Abstract/ }));
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('shows caret-down icon when abstract is collapsed', () => {
      render(<VolumeArticleCard language="en" t={mockT as any} article={articleWithAbstract} />);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have no violations', async () => {
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={baseArticle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with abstract and pdf link', async () => {
      const fullArticle: IArticle = {
        ...baseArticle,
        abstract: 'This is the abstract text.',
        pdfLink: 'https://example.com/paper.pdf',
      };
      const { container } = render(
        <VolumeArticleCard language="en" t={mockT as any} article={fullArticle} />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
