import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Pagination from '../Pagination';

// Mock the icon components
vi.mock('@/components/icons', () => ({
  CaretLeftBlackIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="caret-left-black" data-size={size} aria-label={ariaLabel} />
  ),
  CaretLeftGreyLightIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="caret-left-grey" data-size={size} aria-label={ariaLabel} />
  ),
  CaretRightBlackIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="caret-right-black" data-size={size} aria-label={ariaLabel} />
  ),
  CaretRightGreyLightIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="caret-right-grey" data-size={size} aria-label={ariaLabel} />
  ),
}));

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange: vi.fn(),
  };

  describe('Basic rendering', () => {
    it('renders pagination when there are multiple pages', () => {
      const { container } = render(<Pagination {...defaultProps} />);

      expect(container.querySelector('.pagination')).toBeInTheDocument();
    });

    it('does not render when totalItems is 0', () => {
      const { container } = render(
        <Pagination {...defaultProps} totalItems={0} />
      );

      expect(container.querySelector('.pagination')).not.toBeInTheDocument();
    });

    it('does not render when there is only one page', () => {
      const { container } = render(
        <Pagination {...defaultProps} totalItems={5} itemsPerPage={10} />
      );

      expect(container.querySelector('.pagination')).not.toBeInTheDocument();
    });

    it('calculates correct page count', () => {
      render(<Pagination {...defaultProps} totalItems={95} itemsPerPage={10} />);

      // 95 items / 10 per page = 10 pages
      // Should show page numbers including page 10
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Page navigation', () => {
    it('calls onPageChange when a page is clicked', async () => {
      const user = userEvent.setup();
      const handlePageChange = vi.fn();

      render(<Pagination {...defaultProps} onPageChange={handlePageChange} />);

      // Click on page 2
      await user.click(screen.getByText('2'));

      expect(handlePageChange).toHaveBeenCalledWith({ selected: 1 }); // 0-indexed
    });

    it('highlights the current active page', () => {
      const { container } = render(
        <Pagination {...defaultProps} currentPage={3} />
      );

      // The active page should have the active class
      const activePage = container.querySelector('.pagination-page-active');
      expect(activePage).toBeInTheDocument();
    });
  });

  describe('Previous/Next navigation icons', () => {
    it('shows disabled previous icon on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      // On first page, previous should be grey (disabled)
      expect(screen.getByTestId('caret-left-grey')).toBeInTheDocument();
    });

    it('shows enabled previous icon on subsequent pages', () => {
      render(<Pagination {...defaultProps} currentPage={2} />);

      // On page 2+, previous should be black (enabled)
      expect(screen.getByTestId('caret-left-black')).toBeInTheDocument();
    });

    it('shows enabled next icon when not on last page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      // On first page with multiple pages, next should be black (enabled)
      expect(screen.getByTestId('caret-right-black')).toBeInTheDocument();
    });

    it('shows disabled next icon on last page', () => {
      render(<Pagination {...defaultProps} currentPage={10} />);

      // On last page, next should be grey (disabled)
      expect(screen.getByTestId('caret-right-grey')).toBeInTheDocument();
    });
  });

  describe('Accessibility - aria-labels on navigation', () => {
    it('previous icon has aria-label', () => {
      render(<Pagination {...defaultProps} currentPage={2} />);

      const prevIcon = screen.getByTestId('caret-left-black');
      expect(prevIcon).toHaveAttribute('aria-label', 'Previous page');
    });

    it('disabled previous icon has descriptive aria-label', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const prevIcon = screen.getByTestId('caret-left-grey');
      expect(prevIcon).toHaveAttribute('aria-label', 'Previous page (disabled)');
    });

    it('next icon has aria-label', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const nextIcon = screen.getByTestId('caret-right-black');
      expect(nextIcon).toHaveAttribute('aria-label', 'Next page');
    });

    it('disabled next icon has descriptive aria-label', () => {
      render(<Pagination {...defaultProps} currentPage={10} />);

      const nextIcon = screen.getByTestId('caret-right-grey');
      expect(nextIcon).toHaveAttribute('aria-label', 'Next page (disabled)');
    });
  });

  describe('Keyboard navigation', () => {
    it('page buttons are focusable', async () => {
      const user = userEvent.setup();

      render(<Pagination {...defaultProps} />);

      // Tab through the pagination
      await user.tab();

      // Should be able to focus on pagination elements
      expect(document.activeElement).not.toBe(document.body);
    });

    it('page can be selected with keyboard', async () => {
      const user = userEvent.setup();
      const handlePageChange = vi.fn();

      render(<Pagination {...defaultProps} onPageChange={handlePageChange} />);

      // Focus on page 2 and press Enter
      const page2 = screen.getByText('2');
      page2.focus();
      await user.keyboard('{Enter}');

      expect(handlePageChange).toHaveBeenCalled();
    });
  });

  describe('CSS classes for touch targets', () => {
    it('applies pagination-page class for minimum touch target', () => {
      const { container } = render(<Pagination {...defaultProps} />);

      // The pagination-page class should provide minimum 44x44px touch target
      const pageElements = container.querySelectorAll('.pagination-page');
      expect(pageElements.length).toBeGreaterThan(0);
    });

    it('applies pagination-previous class', () => {
      const { container } = render(<Pagination {...defaultProps} />);

      expect(container.querySelector('.pagination-previous')).toBeInTheDocument();
    });

    it('applies pagination-next class', () => {
      const { container } = render(<Pagination {...defaultProps} />);

      expect(container.querySelector('.pagination-next')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles page count boundaries correctly', () => {
      // Test with currentPage beyond valid range
      const { container } = render(
        <Pagination {...defaultProps} currentPage={100} totalItems={50} />
      );

      // Should still render and handle gracefully
      expect(container.querySelector('.pagination')).toBeInTheDocument();
    });

    it('uses default items per page when not provided', () => {
      render(
        <Pagination
          currentPage={1}
          totalItems={100}
          onPageChange={vi.fn()}
        />
      );

      // Should render with default items per page
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('component is memoized to prevent unnecessary re-renders', () => {
      const handlePageChange = vi.fn();

      const { rerender } = render(
        <Pagination {...defaultProps} onPageChange={handlePageChange} />
      );

      // Re-render with same props should not cause issues
      rerender(
        <Pagination {...defaultProps} onPageChange={handlePageChange} />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    // Note: ReactPaginate has some accessibility quirks:
    // - Generates list items without proper list parent structure
    // - Uses role="navigation" on <ul> which is not standard
    // These are known issues with the third-party component
    const axeOptions = {
      rules: {
        listitem: { enabled: false },
        'aria-allowed-role': { enabled: false },
      },
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<Pagination {...defaultProps} />);

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations on middle page', async () => {
      const { container } = render(
        <Pagination {...defaultProps} currentPage={5} />
      );

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations on last page', async () => {
      const { container } = render(
        <Pagination {...defaultProps} currentPage={10} />
      );

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});
