import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Loader from '../Loader';

// Mock react-loader-spinner
vi.mock('react-loader-spinner', () => ({
  TailSpin: ({ color, width }: { color: string; width: number }) => (
    <div data-testid="tailspin-loader" data-color={color} data-width={width} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  ),
}));

describe('Loader', () => {
  describe('Basic rendering', () => {
    it('renders the loader container', () => {
      const { container } = render(<Loader />);

      expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('renders TailSpin component', () => {
      render(<Loader />);

      expect(screen.getByTestId('tailspin-loader')).toBeInTheDocument();
    });

    it('applies correct width to TailSpin', () => {
      render(<Loader />);

      const loader = screen.getByTestId('tailspin-loader');
      expect(loader).toHaveAttribute('data-width', '60');
    });
  });

  describe('Color handling', () => {
    // The CSS variable is handed straight to the SVG `stroke` attribute, so the spinner
    // follows the journal theme without any DOM read — and from the very first render.
    it('passes the --primary CSS variable through to TailSpin', () => {
      render(<Loader />);

      const loader = screen.getByTestId('tailspin-loader');
      expect(loader).toHaveAttribute('data-color', 'var(--primary)');
    });

    it('does not read the computed style of the document', () => {
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');

      render(<Loader />);

      expect(getComputedStyleSpy).not.toHaveBeenCalledWith(document.documentElement);

      getComputedStyleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Loader />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('contains status role for screen readers', () => {
      render(<Loader />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('CSS class structure', () => {
    it('has correct wrapper class', () => {
      const { container } = render(<Loader />);

      expect(container.firstChild).toHaveClass('loader');
    });
  });
});
