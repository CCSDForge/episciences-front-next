'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from '@/config/theme-storage-key';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

const DEFAULT_PREFERENCE: ThemePreference = 'light';

// In-memory fallback for when localStorage is unavailable, so the menu keeps
// reflecting the preference applied to the page (it just won't survive a reload).
let memoryPreference: ThemePreference = DEFAULT_PREFERENCE;

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'system' ? value : DEFAULT_PREFERENCE;
  } catch {
    // localStorage throws in Safari private browsing / blocked storage.
    return memoryPreference;
  }
}

/**
 * Applies a preference to the document, mirroring the inline bootstrap script
 * (src/config/theme-bootstrap.ts): no attribute for the light default,
 * `data-theme="dark"|"system"` otherwise.
 */
function applyToDocument(preference: ThemePreference): void {
  const root = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

  if (preference === 'light') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = preference;
  }
  if (meta) {
    meta.content = preference === 'system' ? 'light dark' : preference;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  // Storage events fire cross-tab (not in the tab that made the change — that tab
  // dispatches one itself in setPreference()), keeping every open tab in sync.
  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    // Another tab changed the preference: its document was updated, not ours.
    applyToDocument(readPreference());
    onStoreChange();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function subscribeToSystem(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

/**
 * The 3-way theme preference: light (default), dark, or follow the system.
 * `resolvedScheme` is the scheme actually displayed.
 */
export function useColorScheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => DEFAULT_PREFERENCE);

  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystem,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false
  );

  const systemScheme = systemPrefersDark ? 'dark' : 'light';
  const resolvedScheme: 'light' | 'dark' = preference === 'system' ? systemScheme : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    try {
      if (next === DEFAULT_PREFERENCE) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage blocked (Safari private browsing): the choice still applies to
      // this page, it just won't survive a reload.
    }
    applyToDocument(next);
    // Same-tab: storage events don't fire in the tab that made the change.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return { preference, resolvedScheme, setPreference };
}
