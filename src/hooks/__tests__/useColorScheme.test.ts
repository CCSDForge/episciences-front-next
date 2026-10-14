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
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="color-scheme" content="light">';
  });

  it('defaults to light when nothing is stored, even on a dark OS', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.preference).toBe('light');
    expect(result.current.resolvedScheme).toBe('light');
  });

  it('reads a stored "dark" preference', () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.preference).toBe('dark');
    expect(result.current.resolvedScheme).toBe('dark');
  });

  it('falls back to light for an unknown stored value', () => {
    stubMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, 'sepia');
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.preference).toBe('light');
  });

  it('"system" resolves to the OS scheme and follows its changes', () => {
    const media = stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'system');
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.resolvedScheme).toBe('light');

    act(() => media.setMatches(true));
    expect(result.current.preference).toBe('system');
    expect(result.current.resolvedScheme).toBe('dark');
  });

  it('an OS change does not affect an explicit "dark" or "light" choice', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useColorScheme());

    act(() => result.current.setPreference('dark'));
    act(() => media.setMatches(false));
    expect(result.current.resolvedScheme).toBe('dark');

    act(() => result.current.setPreference('light'));
    act(() => media.setMatches(true));
    expect(result.current.resolvedScheme).toBe('light');
  });

  it('setPreference persists the choice and updates data-theme and the meta tag', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useColorScheme());
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!;

    act(() => result.current.setPreference('dark'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    expect(meta.content).toBe('dark');

    act(() => result.current.setPreference('system'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
    expect(root.dataset.theme).toBe('system');
    expect(meta.content).toBe('light dark');

    act(() => result.current.setPreference('light'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(meta.content).toBe('light');
    expect(result.current.preference).toBe('light');
  });

  it('keeps reporting the chosen preference when localStorage is blocked', () => {
    stubMatchMedia(false);
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    try {
      const { result } = renderHook(() => useColorScheme());

      act(() => result.current.setPreference('dark'));
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(result.current.preference).toBe('dark');

      act(() => result.current.setPreference('light'));
      expect(result.current.preference).toBe('light');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('applies a preference changed in another tab to this document', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useColorScheme());

    act(() => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.preference).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('ignores storage events for unrelated keys', () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'dark');
    renderHook(() => useColorScheme());

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }));
    });

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
