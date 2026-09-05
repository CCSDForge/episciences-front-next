'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from '@/config/theme-storage-key';

export type PinnedScheme = 'light' | 'dark' | null;

function readPinned(): PinnedScheme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // localStorage throws in Safari private browsing / blocked storage.
    return null;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Storage events fire cross-tab (not in the tab that made the change — that tab
  // calls onStoreChange itself via toggle()), keeping every open tab in sync.
  window.addEventListener('storage', onStoreChange);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

function getServerSnapshot(): PinnedScheme {
  return null;
}

/**
 * The 2-state color scheme toggle: "follows the system" (pinned === null) or
 * "pinned" to a literal scheme. A pin survives a later OS-level scheme change —
 * see tmp/PLAN_DARK_MODE.md §2 "Le cycle à 2 états".
 */
export function useColorScheme() {
  const pinned = useSyncExternalStore(subscribe, readPinned, getServerSnapshot);

  const systemPrefersDark = useSyncExternalStore(
    onChange => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false
  );

  const resolvedScheme: 'light' | 'dark' = pinned ?? (systemPrefersDark ? 'dark' : 'light');

  const toggle = useCallback(() => {
    const current = readPinned();
    try {
      if (current) {
        localStorage.removeItem(STORAGE_KEY);
        document.documentElement.removeAttribute('data-theme');
      } else {
        // Store a literal scheme, never "the opposite of the system" — a later OS
        // change must leave a pin exactly where the user left it.
        const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const next: 'light' | 'dark' = sysDark ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        document.documentElement.dataset.theme = next;
      }
    } catch {
      // Storage blocked (Safari private browsing): the toggle becomes a no-op —
      // there is nowhere durable to remember the pin.
    }
    // Same-tab: storage events don't fire in the tab that made the change.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return { pinned, resolvedScheme, toggle };
}
