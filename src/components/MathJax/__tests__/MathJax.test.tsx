import { render, screen, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MathJax from '../MathJax';
import { MathJaxReadyContext, MathJaxReadyProvider } from '../MathJaxProvider';

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

    const renderWithMathJax = (value: unknown, children: React.ReactNode) =>
      render(
        <MockMathJaxBaseContext.Provider value={value}>
          <MathJaxReadyProvider>{children}</MathJaxReadyProvider>
        </MockMathJaxBaseContext.Provider>
      );

    it('keeps plain children while the readiness context is false', () => {
      render(
        <MathJaxReadyContext value={false}>
          <MathJax>formula</MathJax>
        </MathJaxReadyContext>
      );
      expect(screen.queryByTestId('better-mathjax')).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
    });

    it('keeps plain children until MathJax has started up', async () => {
      const { value, resolveStartup } = createDeferredContext();

      renderWithMathJax(value, <MathJax>formula</MathJax>);

      await act(async () => {});
      expect(screen.queryByTestId('better-mathjax')).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();

      await act(async () => {
        resolveStartup();
      });
      expect(screen.getByTestId('better-mathjax')).toHaveTextContent('formula');
    });

    it('renders BetterMathJax immediately for instances mounted after startup', async () => {
      const { value, resolveStartup } = createDeferredContext();
      const Toggle = ({ show }: { show: boolean }) => (show ? <MathJax>second</MathJax> : null);

      const { rerender } = renderWithMathJax(value, <Toggle show={false} />);
      await act(async () => {
        resolveStartup();
      });

      rerender(
        <MockMathJaxBaseContext.Provider value={value}>
          <MathJaxReadyProvider>
            <Toggle show />
          </MathJaxReadyProvider>
        </MockMathJaxBaseContext.Provider>
      );
      expect(screen.getByTestId('better-mathjax')).toHaveTextContent('second');
    });

    it('subscribes to the startup promise once for all instances', async () => {
      const { value, resolveStartup } = createDeferredContext();
      const then = vi.spyOn(value.promise, 'then');

      renderWithMathJax(
        value,
        <>
          <MathJax>a</MathJax>
          <MathJax>b</MathJax>
          <MathJax>c</MathJax>
        </>
      );
      await act(async () => {
        resolveStartup();
      });

      expect(then).toHaveBeenCalledOnce();
      expect(screen.getAllByTestId('better-mathjax')).toHaveLength(3);
    });

    it('does not update state when unmounted before MathJax starts up', async () => {
      const { value, resolveStartup } = createDeferredContext();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = renderWithMathJax(value, <MathJax>formula</MathJax>);
      unmount();

      await act(async () => {
        resolveStartup();
      });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('stays on plain children when MathJax fails to load', async () => {
      const value = { version: 3, promise: Promise.reject(new Error('network')) };

      renderWithMathJax(value, <MathJax>formula</MathJax>);

      await act(async () => {});
      expect(screen.queryByTestId('better-mathjax')).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
    });
  });
});
