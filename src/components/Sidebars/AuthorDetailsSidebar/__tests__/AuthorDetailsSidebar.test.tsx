import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthorDetailsSidebar from '../AuthorDetailsSidebar';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, className, target }: any) => (
    <a href={href} className={className} target={target}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: any) => <span data-testid="mathjax">{children}</span>,
}));

vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ onClick, ariaLabel, className }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} className={className} />
  ),
  CaretRightGreyIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
}));

vi.mock('@/config/paths', () => ({
  PATHS: { articles: 'articles' },
}));

vi.mock('@/utils/date', () => ({
  formatDate: (_date: string, _lang: string) => '15/01/2024',
}));

const mockUseFetchAuthorArticlesQuery = vi.fn();
vi.mock('@/store/features/author/author.query', () => ({
  useFetchAuthorArticlesQuery: (...args: any[]) => mockUseFetchAuthorArticlesQuery(...args),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const t: Record<string, string> = {
    'common.publishedOn': 'Published on',
    'common.doi': 'DOI',
    'common.seeMore': 'See more',
  };
  return t[key] ?? key;
});

const mockAuthor: any = {
  name: 'Jane Doe',
};

const mockArticle: any = {
  id: 42,
  title: 'Article Title With <em>Markup</em>',
  publicationDate: '2024-01-15',
  doi: '10.1234/test.doi',
};

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  rvcode: 'myjournal',
  expandedAuthor: mockAuthor,
  onCloseDetailsCallback: vi.fn(),
};

// --- Tests ---

describe('AuthorDetailsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFetchAuthorArticlesQuery.mockReturnValue({ data: undefined });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the sidebar container', () => {
      const { container } = render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(container.querySelector('.authorDetailsSidebar')).toBeInTheDocument();
    });

    it('renders the author name', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('renders no articles when query returns undefined', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.queryByTestId('mathjax')).not.toBeInTheDocument();
    });

    it('renders no articles when data.data is empty array', () => {
      mockUseFetchAuthorArticlesQuery.mockReturnValue({ data: { data: [] } });
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.queryByTestId('mathjax')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Articles list
  // ─────────────────────────────────────────────────────────────────────────
  describe('Articles list', () => {
    beforeEach(() => {
      mockUseFetchAuthorArticlesQuery.mockReturnValue({ data: { data: [mockArticle] } });
    });

    it('renders article title via MathJax', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByTestId('mathjax')).toBeInTheDocument();
      expect(screen.getByText('Article Title With <em>Markup</em>')).toBeInTheDocument();
    });

    it('renders formatted publication date', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Published on 15/01/2024')).toBeInTheDocument();
    });

    it('renders DOI link when doi is present', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('10.1234/test.doi')).toBeInTheDocument();
    });

    it('does not render DOI section when doi is absent', () => {
      const articleNoDoi = { ...mockArticle, doi: undefined };
      mockUseFetchAuthorArticlesQuery.mockReturnValue({ data: { data: [articleNoDoi] } });
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.queryByText('DOI')).not.toBeInTheDocument();
    });

    it('renders "See more" link for each article', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('See more')).toBeInTheDocument();
    });

    it('"See more" link points to the article page', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      const seeMoreLink = screen.getByText('See more').closest('a');
      expect(seeMoreLink).toHaveAttribute('href', 'articles/42');
    });

    it('renders multiple articles', () => {
      const articles = [
        mockArticle,
        { ...mockArticle, id: 43, title: 'Second Article', doi: undefined },
      ];
      mockUseFetchAuthorArticlesQuery.mockReturnValue({ data: { data: articles } });
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getAllByTestId('mathjax')).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Close button
  // ─────────────────────────────────────────────────────────────────────────
  describe('Close button', () => {
    it('renders the close button', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(screen.getByLabelText('Close author details')).toBeInTheDocument();
    });

    it('calls onCloseDetailsCallback when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<AuthorDetailsSidebar {...defaultProps} onCloseDetailsCallback={onClose} />);
      await user.click(screen.getByLabelText('Close author details'));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RTK Query parameters
  // ─────────────────────────────────────────────────────────────────────────
  describe('RTK Query parameters', () => {
    it('calls useFetchAuthorArticlesQuery with rvcode and fullname', () => {
      render(<AuthorDetailsSidebar {...defaultProps} />);
      expect(mockUseFetchAuthorArticlesQuery).toHaveBeenCalledWith(
        { rvcode: 'myjournal', fullname: 'Jane Doe' },
        { skip: false }
      );
    });

    it('skips query when rvcode is not provided', () => {
      render(<AuthorDetailsSidebar {...defaultProps} rvcode={undefined} />);
      expect(mockUseFetchAuthorArticlesQuery).toHaveBeenCalledWith(
        expect.anything(),
        { skip: true }
      );
    });
  });
});
