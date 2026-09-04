import { describe, it, expect, vi } from 'vitest';
import { THEME_BOOTSTRAP } from '../theme-bootstrap';

/**
 * Executes the literal bootstrap script string against a stubbed
 * document/localStorage — this is the actual string injected in
 * src/app/layout.tsx, not a re-implementation of it.
 */
function runBootstrap(stubs: { localStorage: Storage; documentElement: any; querySelector: any }) {
  const fn = new Function(
    'localStorage',
    'document',
    `${THEME_BOOTSTRAP}\nreturn;`
  );
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
  it('pins data-theme and updates the color-scheme meta when a scheme is stored', () => {
    const documentElement = { dataset: {} as Record<string, string> };
    const meta = { content: 'light dark' };
    const querySelector = vi.fn().mockReturnValue(meta);

    runBootstrap({
      localStorage: makeStorage({ 'episciences:color-scheme': 'dark' }),
      documentElement,
      querySelector,
    });

    expect(documentElement.dataset.theme).toBe('dark');
    expect(meta.content).toBe('dark');
  });

  it('does nothing when no scheme is stored (follows the system)', () => {
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

  it('does nothing for a stored value that is neither "light" nor "dark"', () => {
    const documentElement = { dataset: {} as Record<string, string> };

    runBootstrap({
      localStorage: makeStorage({ 'episciences:color-scheme': 'sepia' }),
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
        localStorage: makeStorage({ 'episciences:color-scheme': 'light' }),
        documentElement,
        querySelector: () => null,
      })
    ).not.toThrow();
    expect(documentElement.dataset.theme).toBe('light');
  });
});
