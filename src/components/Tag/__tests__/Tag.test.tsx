import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Tag from '../Tag';

// Mock the icon component
vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ size }: { size: number }) => (
    <span data-testid="close-icon" data-size={size} />
  ),
}));

describe('Tag', () => {
  describe('Basic rendering', () => {
    it('renders tag with text content', () => {
      render(<Tag text="JavaScript" onCloseCallback={vi.fn()} />);

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<Tag text="Filter" onCloseCallback={vi.fn()} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<Tag text="Test" onCloseCallback={vi.fn()} />);

      expect(container.querySelector('.tag')).toBeInTheDocument();
      expect(container.querySelector('.tag-text')).toBeInTheDocument();
      expect(container.querySelector('.tag-close')).toBeInTheDocument();
    });
  });

  describe('Close button functionality', () => {
    it('calls onCloseCallback when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<Tag text="Remove me" onCloseCallback={handleClose} />);

      await user.click(screen.getByRole('button'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('close button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<Tag text="Test" onCloseCallback={handleClose} />);

      const closeButton = screen.getByRole('button');
      closeButton.focus();
      await user.keyboard('{Enter}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('close button responds to Space key', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      render(<Tag text="Test" onCloseCallback={handleClose} />);

      const closeButton = screen.getByRole('button');
      closeButton.focus();
      await user.keyboard(' ');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility - aria-label', () => {
    it('close button has descriptive aria-label with tag text', () => {
      render(<Tag text="2024" onCloseCallback={vi.fn()} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('aria-label', 'Remove 2024 filter');
    });

    it('aria-label updates based on tag text', () => {
      const { rerender } = render(<Tag text="Article" onCloseCallback={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Remove Article filter'
      );

      rerender(<Tag text="Review" onCloseCallback={vi.fn()} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Remove Review filter'
      );
    });
  });

  describe('Accessibility - Touch target size (WCAG 2.5.5)', () => {
    it('close button has type="button"', () => {
      render(<Tag text="Test" onCloseCallback={vi.fn()} />);

      const closeButton = screen.getByRole('button');
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('close button has tag-close class for 44x44px minimum target', () => {
      const { container } = render(<Tag text="Test" onCloseCallback={vi.fn()} />);

      // The .tag-close class should provide minimum 44x44px touch target
      // via padding and positioning in CSS
      const closeButton = container.querySelector('.tag-close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Text variations', () => {
    it('handles short text', () => {
      render(<Tag text="JS" onCloseCallback={vi.fn()} />);
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('handles long text', () => {
      const longText = 'Very Long Filter Name That Should Still Work';
      render(<Tag text={longText} onCloseCallback={vi.fn()} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('handles numeric text', () => {
      render(<Tag text="2024" onCloseCallback={vi.fn()} />);
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('handles special characters', () => {
      render(<Tag text="C++ & C#" onCloseCallback={vi.fn()} />);
      expect(screen.getByText('C++ & C#')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Tag text="Test Filter" onCloseCallback={vi.fn()} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with different text content', async () => {
      const { container } = render(
        <div>
          <Tag text="Article" onCloseCallback={vi.fn()} />
          <Tag text="2024" onCloseCallback={vi.fn()} />
          <Tag text="Special Issue" onCloseCallback={vi.fn()} />
        </div>
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
