import { describe, it, expect, vi } from 'vitest';
import { THEME_BOOTSTRAP } from '../theme-bootstrap';

/**
 * Executes the literal bootstrap script string against a stubbed
 * document/localStorage — this is the actual string injected in
 * src/app/layout.tsx, not a re-implementation of it.
 */
function runBootstrap(stubs: { localStorage: Storage; documentElement: any; querySelector: any }) {
  const fn = new Function('localStorage', 'document', `${THEME_BOOTSTRAP}\nreturn;`);
  fn(stubs.localStorage, {
    documentElement: stubs.documentElement,
    querySelector: stubs.querySelector,
  });
}

function makeStorage(initial: Record<string, string> = {}): Storage {
  const store = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    key: () => null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('THEME_BOOTSTRAP', () => {
  it('sets data-theme="dark" and a "dark" color-scheme meta for a stored dark preference', () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const meta = { content: 'light' };
    const querySelector = vi.fn().mockReturnValue(meta);

    runBootstrap({
      localStorage: makeStorage({ 'episciences:color-scheme': 'dark' }),
      documentElement,
      querySelector,
    });

    expect(documentElement.dataset.theme).toBe('dark');
    expect(meta.content).toBe('dark');
  });

  it('sets data-theme="system" and a "light dark" meta for a stored system preference', () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const meta = { content: 'light' };

    runBootstrap({
      localStorage: makeStorage({ 'episciences:color-scheme': 'system' }),
      documentElement,
      querySelector: vi.fn().mockReturnValue(meta),
    });

    expect(documentElement.dataset.theme).toBe('system');
    expect(meta.content).toBe('light dark');
  });

  it('leaves the light default untouched when nothing is stored', () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const querySelector = vi.fn();

    runBootstrap({
      localStorage: makeStorage(),
      documentElement,
      querySelector,
    });

    expect(documentElement.dataset.theme).toBeUndefined();
    expect(querySelector).not.toHaveBeenCalled();
  });

  it.each(['light', 'sepia'])('leaves the light default untouched for "%s"', value => {
    const documentElement = { dataset: {} as Record<string, string> };

    runBootstrap({
      localStorage: makeStorage({ 'episciences:color-scheme': value }),
      documentElement,
      querySelector: vi.fn(),
    });

    expect(documentElement.dataset.theme).toBeUndefined();
  });

  it('never throws when localStorage.getItem throws (Safari private browsing)', () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const throwingStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;

    expect(() =>
      runBootstrap({ localStorage: throwingStorage, documentElement, querySelector: vi.fn() })
    ).not.toThrow();
    expect(documentElement.dataset.theme).toBeUndefined();
  });

  it('tolerates a missing color-scheme meta tag', () => {
    const documentElement = { dataset: {} as Record<string, string> };

    expect(() =>
      runBootstrap({
        localStorage: makeStorage({ 'episciences:color-scheme': 'dark' }),
        documentElement,
        querySelector: () => null,
      })
    ).not.toThrow();
    expect(documentElement.dataset.theme).toBe('dark');
  });
});
