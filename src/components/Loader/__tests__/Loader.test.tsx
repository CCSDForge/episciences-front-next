import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  const mockGetComputedStyle = vi.fn();

  beforeEach(() => {
    // Mock getComputedStyle
    mockGetComputedStyle.mockReturnValue({
      getPropertyValue: vi.fn().mockReturnValue('#3498db'),
    });
    vi.stubGlobal('getComputedStyle', mockGetComputedStyle);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    it('uses CSS variable --primary for color', async () => {
      render(<Loader />);

      await waitFor(() => {
        const loader = screen.getByTestId('tailspin-loader');
        expect(loader).toHaveAttribute('data-color', '#3498db');
      });
    });

    it('falls back to default color if CSS variable is empty', async () => {
      mockGetComputedStyle.mockReturnValue({
        getPropertyValue: vi.fn().mockReturnValue(''),
      });

      render(<Loader />);

      // Initial render uses default #000000
      const loader = screen.getByTestId('tailspin-loader');
      expect(loader).toHaveAttribute('data-color', '#000000');
    });

    it('reads color from document.documentElement', () => {
      render(<Loader />);

      expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement);
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
