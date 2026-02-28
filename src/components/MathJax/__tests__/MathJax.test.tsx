import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MathJax from '../MathJax';

vi.mock('better-react-mathjax', () => ({
  MathJax: ({ children, dynamic, ...props }: any) => (
    <div data-testid="better-mathjax" data-dynamic={String(dynamic)} {...props}>
      {children}
    </div>
  ),
}));

describe('MathJax', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (window as any).MathJax;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SSR — not-mounted state
  // ─────────────────────────────────────────────────────────────────────────
  describe('SSR (not-mounted) state', () => {
    it('renders with data-mathjax-state="not-mounted" during SSR', () => {
      const html = renderToString(<MathJax>E = mc²</MathJax>);
      expect(html).toContain('data-mathjax-state="not-mounted"');
    });

    it('does not render BetterMathJax during SSR', () => {
      const html = renderToString(<MathJax>formula</MathJax>);
      expect(html).not.toContain('data-testid="better-mathjax"');
    });

    it('renders children in the not-mounted container', () => {
      const html = renderToString(<MathJax>E = mc²</MathJax>);
      expect(html).toContain('E = mc²');
    });

    it('uses "span" as default component for not-mounted state', () => {
      const html = renderToString(<MathJax>content</MathJax>);
      expect(html).toMatch(/^<span[^>]*data-mathjax-state="not-mounted"/);
    });

    it('uses custom component for not-mounted state when component prop is provided', () => {
      const html = renderToString(<MathJax component="div">content</MathJax>);
      expect(html).toMatch(/^<div[^>]*data-mathjax-state="not-mounted"/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CSR — mounted state
  // ─────────────────────────────────────────────────────────────────────────
  describe('CSR (mounted) state', () => {
    it('renders with data-mathjax-state="mounted" after mount', () => {
      render(<MathJax>E = mc²</MathJax>);
      expect(document.querySelector('[data-mathjax-state="mounted"]')).toBeInTheDocument();
    });

    it('does not show not-mounted state after mount', () => {
      render(<MathJax>E = mc²</MathJax>);
      expect(document.querySelector('[data-mathjax-state="not-mounted"]')).not.toBeInTheDocument();
    });

    it('renders BetterMathJax after mount', () => {
      render(<MathJax>E = mc²</MathJax>);
      expect(screen.getByTestId('better-mathjax')).toBeInTheDocument();
    });

    it('passes children to BetterMathJax', () => {
      render(<MathJax>E = mc²</MathJax>);
      expect(screen.getByTestId('better-mathjax')).toHaveTextContent('E = mc²');
    });

    it('passes dynamic=false by default', () => {
      render(<MathJax>formula</MathJax>);
      expect(screen.getByTestId('better-mathjax')).toHaveAttribute('data-dynamic', 'false');
    });

    it('passes dynamic=true when prop is true', () => {
      render(<MathJax dynamic={true}>formula</MathJax>);
      expect(screen.getByTestId('better-mathjax')).toHaveAttribute('data-dynamic', 'true');
    });

    it('passes className to BetterMathJax', () => {
      render(<MathJax className="my-class">formula</MathJax>);
      expect(screen.getByTestId('better-mathjax')).toHaveClass('my-class');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Timer behaviour (MathJax typesetting)
  // ─────────────────────────────────────────────────────────────────────────
  describe('MathJax typesetting timer', () => {
    it('calls window.MathJax.typesetPromise after 50ms when mounted', async () => {
      vi.useFakeTimers();
      const typesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = { typesetPromise };

      render(<MathJax>formula</MathJax>);
      expect(typesetPromise).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(50);
      });

      expect(typesetPromise).toHaveBeenCalledOnce();
    });

    it('does not call typesetPromise before 50ms', async () => {
      vi.useFakeTimers();
      const typesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = { typesetPromise };

      render(<MathJax>formula</MathJax>);

      await act(async () => {
        vi.advanceTimersByTime(49);
      });

      expect(typesetPromise).not.toHaveBeenCalled();
    });

    it('does not throw when window.MathJax is undefined', async () => {
      vi.useFakeTimers();
      delete (window as any).MathJax;

      expect(() => render(<MathJax>formula</MathJax>)).not.toThrow();

      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    });

    it('does not throw when window.MathJax.typesetPromise is missing', async () => {
      vi.useFakeTimers();
      (window as any).MathJax = {};

      expect(() => render(<MathJax>formula</MathJax>)).not.toThrow();

      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    });

    it('cleans up timer on unmount — typesetPromise is not called', async () => {
      vi.useFakeTimers();
      const typesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = { typesetPromise };

      const { unmount } = render(<MathJax>formula</MathJax>);
      unmount();

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(typesetPromise).not.toHaveBeenCalled();
    });
  });
});
