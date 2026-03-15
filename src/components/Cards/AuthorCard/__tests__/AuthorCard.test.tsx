import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthorCard from '../AuthorCard';

// --- Mocks ---

vi.mock('@/components/icons', () => ({
  CaretDownBlackIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-down" aria-label={ariaLabel} />
  ),
  CaretRightBlackIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-right" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/utils/keyboard', () => ({
  handleKeyboardClick: vi.fn((e: React.KeyboardEvent, cb: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') cb();
  }),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.articles': 'articles',
    'common.article': 'article',
  };
  return translations[key] ?? key;
});

const singleArticleAuthor = { name: 'Alice Martin', count: 1 };
const multiArticleAuthor = { name: 'Bob Dupont', count: 5 };

const defaultProps = {
  t: mockT,
  author: singleArticleAuthor,
  expandedCard: false,
  setExpandedAuthorIndexCallback: vi.fn(),
};

// --- Tests ---

describe('AuthorCard', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the author name', () => {
      render(<AuthorCard {...defaultProps} />);
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    });

    it('shows singular article count when count is 1', () => {
      render(<AuthorCard {...defaultProps} />);
      expect(screen.getByText('1 article')).toBeInTheDocument();
    });

    it('shows plural article count when count > 1', () => {
      render(<AuthorCard {...defaultProps} author={multiArticleAuthor} />);
      expect(screen.getByText('5 articles')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Collapsed state (expandedCard = false)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Collapsed state', () => {
    it('shows caret-right when not expanded', () => {
      render(<AuthorCard {...defaultProps} expandedCard={false} />);
      expect(screen.getByTestId('caret-right')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
    });

    it('caret-right has appropriate aria-label', () => {
      render(<AuthorCard {...defaultProps} expandedCard={false} />);
      expect(screen.getByTestId('caret-right')).toHaveAttribute('aria-label', 'Expand author');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Expanded state (expandedCard = true)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Expanded state', () => {
    it('shows caret-down when expanded', () => {
      render(<AuthorCard {...defaultProps} expandedCard={true} />);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-right')).not.toBeInTheDocument();
    });

    it('caret-down has appropriate aria-label', () => {
      render(<AuthorCard {...defaultProps} expandedCard={true} />);
      expect(screen.getByTestId('caret-down')).toHaveAttribute('aria-label', 'Collapse author');
    });

    it('applies expanded CSS class to name when expanded', () => {
      render(<AuthorCard {...defaultProps} expandedCard={true} />);
      expect(screen.getByText('Alice Martin')).toHaveClass('authorCard-title-name-text-expanded');
    });

    it('does not apply expanded CSS class when collapsed', () => {
      render(<AuthorCard {...defaultProps} expandedCard={false} />);
      expect(screen.getByText('Alice Martin')).not.toHaveClass('authorCard-title-name-text-expanded');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Interaction
  // ─────────────────────────────────────────────────────────────────────────
  describe('Interaction', () => {
    it('calls setExpandedAuthorIndexCallback when the name area is clicked', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<AuthorCard {...defaultProps} setExpandedAuthorIndexCallback={callback} />);
      await user.click(screen.getByRole('button', { name: /Alice Martin/ }));
      expect(callback).toHaveBeenCalledOnce();
    });

    it('calls setExpandedAuthorIndexCallback on Enter key', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<AuthorCard {...defaultProps} setExpandedAuthorIndexCallback={callback} />);
      screen.getByRole('button', { name: /Alice Martin/ }).focus();
      await user.keyboard('{Enter}');
      expect(callback).toHaveBeenCalled();
    });

    it('calls setExpandedAuthorIndexCallback on Space key', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(<AuthorCard {...defaultProps} setExpandedAuthorIndexCallback={callback} />);
      screen.getByRole('button', { name: /Alice Martin/ }).focus();
      await user.keyboard(' ');
      expect(callback).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('name area has role="button" and tabIndex={0}', () => {
      render(<AuthorCard {...defaultProps} />);
      const nameBtn = screen.getByRole('button', { name: /Alice Martin/ });
      expect(nameBtn).toHaveAttribute('tabindex', '0');
    });
  });
});
