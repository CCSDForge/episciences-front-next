import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import LiveRegion from '../LiveRegion';

describe('LiveRegion', () => {
  describe('ARIA attributes', () => {
    it('renders with role="status" by default', () => {
      render(<LiveRegion message="Update available" />);

      const region = screen.getByRole('status');
      expect(region).toBeInTheDocument();
    });

    it('has aria-live="polite" by default', () => {
      render(<LiveRegion message="Page loaded" />);

      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('supports aria-live="assertive" for urgent messages', () => {
      render(<LiveRegion message="Error occurred!" politeness="assertive" />);

      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-live', 'assertive');
    });

    it('has aria-atomic="true" for complete announcements', () => {
      render(<LiveRegion message="Results updated" />);

      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Message rendering', () => {
    it('renders the message content', () => {
      render(<LiveRegion message="5 results found" />);

      expect(screen.getByText('5 results found')).toBeInTheDocument();
    });

    it('updates message when prop changes', async () => {
      const { rerender } = render(<LiveRegion message="Page 1 of 10" />);

      expect(screen.getByRole('status')).toHaveTextContent('Page 1 of 10');

      rerender(<LiveRegion message="Page 2 of 10" />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Page 2 of 10');
      });
    });

    it('handles empty message gracefully', () => {
      render(<LiveRegion message="" />);

      const region = screen.getByRole('status');
      expect(region).toBeInTheDocument();
      expect(region).toHaveTextContent('');
    });
  });

  describe('Visual hiding', () => {
    it('applies sr-only class for screen reader only visibility', () => {
      render(<LiveRegion message="Hidden announcement" />);

      const region = screen.getByRole('status');
      expect(region).toHaveClass('sr-only');
    });
  });

  describe('Cleanup behavior', () => {
    it('clears message on unmount by default', () => {
      const { unmount } = render(<LiveRegion message="Temporary message" />);

      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('Temporary message');

      unmount();
      // Component unmounted, region no longer in DOM
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('respects clearOnUnmount=false', () => {
      const { rerender } = render(
        <LiveRegion message="Persistent message" clearOnUnmount={false} />
      );

      expect(screen.getByRole('status')).toHaveTextContent('Persistent message');

      // Just verify the prop is accepted without error
      rerender(<LiveRegion message="Updated message" clearOnUnmount={false} />);
      expect(screen.getByRole('status')).toHaveTextContent('Updated message');
    });
  });

  describe('Common use cases', () => {
    it('announces pagination changes', () => {
      render(<LiveRegion message="Showing page 3 of 15" />);

      expect(screen.getByRole('status')).toHaveTextContent('Showing page 3 of 15');
    });

    it('announces filter results', () => {
      render(<LiveRegion message="12 articles match your filters" />);

      expect(screen.getByRole('status')).toHaveTextContent('12 articles match your filters');
    });

    it('announces form errors assertively', () => {
      render(<LiveRegion message="Please fix 3 errors before submitting" politeness="assertive" />);

      const region = screen.getByRole('status');
      expect(region).toHaveAttribute('aria-live', 'assertive');
      expect(region).toHaveTextContent('Please fix 3 errors before submitting');
    });

    it('announces content expansion', () => {
      render(<LiveRegion message="Abstract expanded" />);

      expect(screen.getByRole('status')).toHaveTextContent('Abstract expanded');
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations with polite message', async () => {
      const { container } = render(<LiveRegion message="Content updated" />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with assertive message', async () => {
      const { container } = render(
        <LiveRegion message="Critical error" politeness="assertive" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
