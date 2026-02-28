import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ScrollManager from '../scrollManager';

// Mock next/navigation
const mockPathname = vi.fn(() => '/en/home');
const mockSearchParams = vi.fn(() => ({}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

describe('ScrollManager', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;
  let getElementByIdMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    scrollToMock = vi.fn();
    getElementByIdMock = vi.fn();

    vi.stubGlobal('scrollTo', scrollToMock);
    vi.spyOn(document, 'getElementById').mockImplementation(getElementByIdMock);

    // Default: no hash in URL
    Object.defineProperty(window, 'location', {
      value: { hash: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('rendering', () => {
    it('renders without errors and returns null', () => {
      const { container } = render(<ScrollManager />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('scroll to top (no hash)', () => {
    it('scrolls to top when there is no hash', () => {
      Object.defineProperty(window, 'location', {
        value: { hash: '' },
        writable: true,
        configurable: true,
      });

      render(<ScrollManager />);

      expect(scrollToMock).toHaveBeenCalledWith(0, 0);
    });

    it('scrolls to top when hash is empty', () => {
      window.location = { hash: '' } as Location;

      render(<ScrollManager />);

      expect(scrollToMock).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('scroll to hash element', () => {
    it('scrolls to element when hash target is found immediately', () => {
      Object.defineProperty(window, 'location', {
        value: { hash: '#my-section' },
        writable: true,
        configurable: true,
      });

      const mockElement = { scrollIntoView: vi.fn() };
      getElementByIdMock.mockReturnValue(mockElement);

      render(<ScrollManager />);

      // Trigger the first interval tick
      vi.advanceTimersByTime(200);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('retries scrolling until element appears', () => {
      Object.defineProperty(window, 'location', {
        value: { hash: '#late-section' },
        writable: true,
        configurable: true,
      });

      const mockElement = { scrollIntoView: vi.fn() };
      // Return null first 3 times, then return element
      getElementByIdMock
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValue(mockElement);

      render(<ScrollManager />);

      // Run 4 interval ticks (3 failures + 1 success)
      vi.advanceTimersByTime(200 * 4);

      expect(mockElement.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('stops retrying after MAX_ATTEMPTS (10 attempts)', () => {
      Object.defineProperty(window, 'location', {
        value: { hash: '#never-found' },
        writable: true,
        configurable: true,
      });

      getElementByIdMock.mockReturnValue(null);

      render(<ScrollManager />);

      // Run more than 10 interval ticks
      vi.advanceTimersByTime(200 * 15);

      // Should have stopped after 10 attempts
      expect(getElementByIdMock).toHaveBeenCalledTimes(10);
    });

    it('cleans up interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      Object.defineProperty(window, 'location', {
        value: { hash: '#section' },
        writable: true,
        configurable: true,
      });

      getElementByIdMock.mockReturnValue(null);

      const { unmount } = render(<ScrollManager />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
