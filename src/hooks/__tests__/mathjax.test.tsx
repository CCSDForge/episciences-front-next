import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MathjaxRefresh from '../mathjax';

const mockPathname = vi.fn(() => '/en/home');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

const warnMock = vi.fn();

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      warn: (...args: unknown[]) => warnMock(...args),
    }),
  },
}));

describe('MathjaxRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    warnMock.mockClear();
    mockPathname.mockReturnValue('/en/home');
    delete (window as any).MathJax;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as any).MathJax;
  });

  it('renders null', () => {
    const { container } = render(<MathjaxRefresh />);
    expect(container.firstChild).toBeNull();
  });

  it('calls typesetPromise and clears the interval after the first tick when it resolves', () => {
    const typesetPromise = vi.fn().mockResolvedValue(undefined);
    (window as any).MathJax = { typesetPromise };
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    render(<MathjaxRefresh />);
    vi.advanceTimersByTime(200);

    expect(typesetPromise).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalled();

    // Further ticks should not call typesetPromise again since interval was cleared
    vi.advanceTimersByTime(1000);
    expect(typesetPromise).toHaveBeenCalledTimes(1);
  });

  it('logs a warning via logger.warn when typesetPromise rejects, and still clears the interval', async () => {
    const typesetPromise = vi.fn().mockRejectedValue(new Error('typeset failed'));
    (window as any).MathJax = { typesetPromise };
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    render(<MathjaxRefresh />);

    await vi.advanceTimersByTimeAsync(200);

    expect(typesetPromise).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith('Typeset error:', 'typeset failed');
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('calls the synchronous typeset() fallback when typesetPromise is absent, and clears the interval', () => {
    const typeset = vi.fn();
    (window as any).MathJax = { typeset };
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    render(<MathjaxRefresh />);
    vi.advanceTimersByTime(200);

    expect(typeset).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('catches and logs errors thrown by the synchronous typeset() fallback', () => {
    const error = new Error('sync typeset failed');
    const typeset = vi.fn(() => {
      throw error;
    });
    (window as any).MathJax = { typeset };
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    render(<MathjaxRefresh />);
    vi.advanceTimersByTime(200);

    expect(typeset).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith('Typeset error:', error);
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('polls up to MAX_ATTEMPTS (10) times then stops when MathJax never becomes available', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    render(<MathjaxRefresh />);

    // attempts starts at 0 and increments after each check, so the 11th tick is the
    // first where `attempts >= MAX_ATTEMPTS` (10) is true and clearInterval fires.
    vi.advanceTimersByTime(200 * 10);
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200); // 11th tick -> attempts reaches MAX_ATTEMPTS, should clear
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    // Extra ticks afterward must not call clearInterval again (interval already cleared)
    vi.advanceTimersByTime(200 * 5);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<MathjaxRefresh />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does not set up an interval when pathname is falsy', () => {
    mockPathname.mockReturnValue('');
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(<MathjaxRefresh />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
