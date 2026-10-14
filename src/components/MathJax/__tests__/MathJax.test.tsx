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
}));

// MathJax components only typeset once MathJax has started up.
const renderReady = (ui: React.ReactElement) =>
  render(<MathJaxReadyContext value={true}>{ui}</MathJaxReadyContext>);

const mountedSpan = () => document.querySelector('[data-mathjax-state="mounted"]');
const mountedSpans = () => document.querySelectorAll('[data-mathjax-state="mounted"]');

// Typesetting runs on a promise queue: let it drain.
const flushTypesetting = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

describe('MathJax', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

    it('does not render the mounted state during SSR', () => {
      const html = renderToString(<MathJax>formula</MathJax>);
      expect(html).not.toContain('data-mathjax-state="mounted"');
    });

    it('renders children in the not-mounted container', () => {
      const html = renderToString(<MathJax>E = mc²</MathJax>);
      expect(html).toContain('E = mc²');
    });

    it('renders the not-mounted span as a block', () => {
      const html = renderToString(<MathJax>content</MathJax>);
      expect(html).toContain('display:block');
    });

    it('keeps plain children outside of MathJaxProvider', () => {
      render(<MathJax>formula</MathJax>);
      expect(mountedSpan()).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
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
      renderReady(<MathJax>E = mc²</MathJax>);
      expect(document.querySelector('[data-mathjax-state="mounted"]')).toBeInTheDocument();
    });

    it('does not show not-mounted state after mount', () => {
      renderReady(<MathJax>E = mc²</MathJax>);
      expect(document.querySelector('[data-mathjax-state="not-mounted"]')).not.toBeInTheDocument();
    });

    it('renders children in the mounted container', () => {
      renderReady(<MathJax>E = mc²</MathJax>);
      expect(mountedSpan()).toHaveTextContent('E = mc²');
    });

    it('passes className to the container', () => {
      renderReady(<MathJax className="my-class">formula</MathJax>);
      expect(mountedSpan()).toHaveClass('my-class');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Typesetting
  // ─────────────────────────────────────────────────────────────────────────
  describe('typesetting', () => {
    const installMathJax = () => {
      const typesetClear = vi.fn();
      const typesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = { typesetClear, typesetPromise };
      return { typesetClear, typesetPromise };
    };

    const readyTree = (ui: React.ReactElement) => (
      <MathJaxReadyContext value={true}>{ui}</MathJaxReadyContext>
    );

    it('typesets the container once MathJax is ready', async () => {
      const { typesetClear, typesetPromise } = installMathJax();

      renderReady(<MathJax>formula</MathJax>);
      await flushTypesetting();

      expect(typesetClear).toHaveBeenCalledWith([mountedSpan()]);
      expect(typesetPromise).toHaveBeenCalledOnce();
      expect(typesetPromise).toHaveBeenCalledWith([mountedSpan()]);
    });

    it('does not typeset before MathJax is ready', async () => {
      const { typesetPromise } = installMathJax();

      render(<MathJax>formula</MathJax>);
      await flushTypesetting();

      expect(typesetPromise).not.toHaveBeenCalled();
    });

    it('re-typesets when the children change', async () => {
      const { typesetPromise } = installMathJax();

      const { rerender } = renderReady(<MathJax>formula</MathJax>);
      await flushTypesetting();
      rerender(readyTree(<MathJax>other formula</MathJax>));
      await flushTypesetting();

      expect(typesetPromise).toHaveBeenCalledTimes(2);
    });

    it('does not re-typeset a non-dynamic instance whose children are unchanged', async () => {
      const { typesetPromise } = installMathJax();

      const { rerender } = renderReady(<MathJax>formula</MathJax>);
      await flushTypesetting();
      rerender(readyTree(<MathJax>formula</MathJax>));
      await flushTypesetting();

      expect(typesetPromise).toHaveBeenCalledOnce();
    });

    it('re-typesets a dynamic instance on every render', async () => {
      const { typesetPromise } = installMathJax();

      const { rerender } = renderReady(<MathJax dynamic>formula</MathJax>);
      await flushTypesetting();
      rerender(readyTree(<MathJax dynamic>formula</MathJax>));
      await flushTypesetting();

      expect(typesetPromise).toHaveBeenCalledTimes(2);
    });

    it('skips an element unmounted before its turn instead of passing null to MathJax', async () => {
      const { typesetClear, typesetPromise } = installMathJax();

      const { unmount } = renderReady(<MathJax>formula</MathJax>);
      unmount();
      await flushTypesetting();

      expect(typesetClear).not.toHaveBeenCalled();
      expect(typesetPromise).not.toHaveBeenCalled();
    });

    it('waits for the previous typesetting to finish before starting the next', async () => {
      const { typesetPromise } = installMathJax();
      let finishFirst!: () => void;
      typesetPromise.mockImplementationOnce(
        () => new Promise<void>(resolve => (finishFirst = resolve))
      );

      renderReady(
        <>
          <MathJax>a</MathJax>
          <MathJax>b</MathJax>
        </>
      );
      await flushTypesetting();
      expect(typesetPromise).toHaveBeenCalledOnce();

      finishFirst();
      await flushTypesetting();
      expect(typesetPromise).toHaveBeenCalledTimes(2);
    });

    it('logs a typesetting failure instead of rejecting', async () => {
      const { typesetPromise } = installMathJax();
      typesetPromise.mockRejectedValueOnce(new Error('bad TeX'));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderReady(<MathJax>a</MathJax>);
      await flushTypesetting();

      expect(warn).toHaveBeenCalled();
    });

    it('does not throw when window.MathJax is undefined', async () => {
      expect(() => renderReady(<MathJax>formula</MathJax>)).not.toThrow();
      await flushTypesetting();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MathJax loading — no typesetting before MathJax starts up
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
      expect(mountedSpan()).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
    });

    it('keeps plain children until MathJax has started up', async () => {
      const { value, resolveStartup } = createDeferredContext();

      renderWithMathJax(value, <MathJax>formula</MathJax>);

      await act(async () => {});
      expect(mountedSpan()).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();

      await act(async () => {
        resolveStartup();
      });
      expect(mountedSpan()).toHaveTextContent('formula');
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
      expect(mountedSpan()).toHaveTextContent('second');
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
      expect(mountedSpans()).toHaveLength(3);
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
      expect(mountedSpan()).not.toBeInTheDocument();
      expect(screen.getByText('formula')).toBeInTheDocument();
    });
  });
});
