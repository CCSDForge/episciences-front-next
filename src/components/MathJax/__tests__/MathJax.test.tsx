import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MathJax from '../MathJax';

const { MockMathJaxBaseContext } = vi.hoisted(() => ({
  MockMathJaxBaseContext: require('react').createContext(undefined),
}));

vi.mock('better-react-mathjax', () => ({
  MathJaxBaseContext: MockMathJaxBaseContext,
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

  // ─────────────────────────────────────────────────────────────────────────
  // MathJax loading — BetterMathJax must not mount before MathJax starts up
  // ─────────────────────────────────────────────────────────────────────────
  describe('waiting for MathJax startup', () => {
    // Fresh module per test: the "started up" flag is shared across instances.
    const loadFreshMathJax = async () => {
      vi.resetModules();
      return (await import('../MathJax')).default;
    };

    const createDeferredContext = () => {
      let resolveStartup!: () => void;
      const startupPromise = new Promise<void>(resolve => {
        resolveStartup = resolve;
      });
      const value = {
        version: 3,
        promise: Promise.resolve({ startup: { promise: startupPromise } }),
      };
      return { value, resolveStartup };
    };

    it('keeps plain children until MathJax has started up', async () => {
      const FreshMathJax = await loadFreshMathJax();
      const { value, resolveStartup } = createDeferredContext();

      render(
        <MockMathJaxBaseContext.Provider value={value}>
          <FreshMathJax>formula</FreshMathJax>
        </MockMathJaxBaseContext.Provider>
      );

      await act(async () => {});
      expect(screen.queryByTestId('better-mathjax')).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();

      await act(async () => {
        resolveStartup();
      });
      expect(screen.getByTestId('better-mathjax')).toHaveTextContent('formula');
    });

    it('renders BetterMathJax immediately for instances mounted after startup', async () => {
      const FreshMathJax = await loadFreshMathJax();
      const { value, resolveStartup } = createDeferredContext();

      const first = render(
        <MockMathJaxBaseContext.Provider value={value}>
          <FreshMathJax>first</FreshMathJax>
        </MockMathJaxBaseContext.Provider>
      );
      await act(async () => {
        resolveStartup();
      });
      first.unmount();

      render(
        <MockMathJaxBaseContext.Provider value={value}>
          <FreshMathJax>second</FreshMathJax>
        </MockMathJaxBaseContext.Provider>
      );
      expect(screen.getByTestId('better-mathjax')).toHaveTextContent('second');
    });

    it('does not update state when unmounted before MathJax starts up', async () => {
      const FreshMathJax = await loadFreshMathJax();
      const { value, resolveStartup } = createDeferredContext();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = render(
        <MockMathJaxBaseContext.Provider value={value}>
          <FreshMathJax>formula</FreshMathJax>
        </MockMathJaxBaseContext.Provider>
      );
      unmount();

      await act(async () => {
        resolveStartup();
      });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('stays on plain children when MathJax fails to load', async () => {
      const FreshMathJax = await loadFreshMathJax();
      const value = { version: 3, promise: Promise.reject(new Error('network')) };

      render(
        <MockMathJaxBaseContext.Provider value={value}>
          <FreshMathJax>formula</FreshMathJax>
        </MockMathJaxBaseContext.Provider>
      );

      await act(async () => {});
      expect(screen.queryByTestId('better-mathjax')).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
    });
  });
});
