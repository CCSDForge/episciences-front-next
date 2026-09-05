import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorScheme } from '../useColorScheme';

const STORAGE_KEY = 'episciences:color-scheme';

function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;

  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    setMatches: (value: boolean) => {
      (mql as any).matches = value;
      listeners.forEach(cb => cb({ matches: value } as MediaQueryListEvent));
    },
  };
}

describe('useColorScheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unpinned (following the system) when nothing is stored', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.pinned).toBeNull();
    expect(result.current.resolvedScheme).toBe('light');
  });

  it('resolves to the system preference when unpinned', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.resolvedScheme).toBe('dark');
  });

  it('cycles null -> pinned -> null', () => {
    stubMatchMedia(false); // system is light
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.pinned).toBeNull();

    act(() => result.current.toggle());
    expect(result.current.pinned).toBe('dark');
    expect(result.current.resolvedScheme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    act(() => result.current.toggle());
    expect(result.current.pinned).toBeNull();
    expect(result.current.resolvedScheme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('stores a literal scheme, not "the opposite of the system"', () => {
    stubMatchMedia(true); // system is dark
    const { result } = renderHook(() => useColorScheme());

    act(() => result.current.toggle());
    // System is dark -> pinning the opposite means pinning light.
    expect(result.current.pinned).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('a system change while pinned does not change the stored/pinned value', () => {
    const media = stubMatchMedia(false); // system starts light
    const { result } = renderHook(() => useColorScheme());

    act(() => result.current.toggle()); // pins 'dark'
    expect(result.current.pinned).toBe('dark');

    act(() => media.setMatches(true)); // system flips to dark
    expect(result.current.pinned).toBe('dark');
    expect(result.current.resolvedScheme).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });
});
