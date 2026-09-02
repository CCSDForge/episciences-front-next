import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useIframeLoadState } from '../useIframeLoadState';

describe('useIframeLoadState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));
    expect(result.current.status).toBe('loading');
  });

  it('moves to loaded on handleLoad', () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));

    act(() => {
      result.current.handleLoad();
    });

    expect(result.current.status).toBe('loaded');
  });

  it('moves to error on handleError', () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));

    act(() => {
      result.current.handleError();
    });

    expect(result.current.status).toBe('error');
  });

  it('moves to error after the timeout elapses without load/error', async () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.status).toBe('error');
  });

  it('does not error if load happens before the timeout', async () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));

    act(() => {
      result.current.handleLoad();
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.status).toBe('loaded');
  });

  it('resets to loading and increments retryKey on retry', () => {
    const { result } = renderHook(() => useIframeLoadState('https://example.com', 5000));

    act(() => {
      result.current.handleError();
    });
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.retry();
    });

    expect(result.current.status).toBe('loading');
    expect(result.current.retryKey).toBe(1);
  });

  it('resets status to loading when src changes', () => {
    const { result, rerender } = renderHook(({ src }) => useIframeLoadState(src, 5000), {
      initialProps: { src: 'https://example.com/a' },
    });

    act(() => {
      result.current.handleLoad();
    });
    expect(result.current.status).toBe('loaded');

    rerender({ src: 'https://example.com/b' });
    expect(result.current.status).toBe('loading');
  });
});
