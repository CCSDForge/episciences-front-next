import { describe, it, expect, vi, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { t, hasMultipleLanguages, getLocalePaths, getServerTranslations } from '../server-i18n';

describe('server-i18n t()', () => {
  const translations = {
    pages: {
      home: { title: 'Home' },
    },
    withParams: 'Hello {{name}}',
  };

  it('resolves a nested key', () => {
    expect(t('pages.home.title', translations)).toBe('Home');
  });

  it('returns the key itself when not found', () => {
    expect(t('pages.missing.key', translations)).toBe('pages.missing.key');
  });

  it('returns the key when the resolved value is not a string', () => {
    expect(t('pages.home', translations)).toBe('pages.home');
  });

  it('substitutes {{param}} placeholders', () => {
    expect(t('withParams', translations, { name: 'Jane' })).toBe('Hello Jane');
  });

  it('leaves unmatched placeholders untouched', () => {
    expect(t('withParams', translations, {})).toBe('Hello {{name}}');
  });
});

describe('server-i18n hasMultipleLanguages / getLocalePaths', () => {
  it('reflects the configured availableLanguages (defaults to en+fr)', () => {
    expect(hasMultipleLanguages()).toBe(true);
    expect(getLocalePaths()).toEqual(['en', 'fr']);
  });
});

// `vi.mock('node:fs', ...)` does not intercept this module's calls (Vite/Vitest treats
// Node builtins as external for SSR), so we spy directly on the shared `fs.promises`
// singleton instead — the same object instance server-i18n.ts binds to.
describe('server-i18n getServerTranslations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    vi.spyOn(fs, 'readFile').mockResolvedValue('{"hello":"world"}' as never);

    const result = await getServerTranslations('en');
    expect(result).toEqual({ hello: 'world' });
  });

  it('falls back to the default language when the requested locale fails', async () => {
    vi.spyOn(fs, 'readFile')
      .mockRejectedValueOnce(new Error('missing locale'))
      .mockResolvedValueOnce('{"fallback":true}' as never);

    const result = await getServerTranslations('xx');
    expect(result).toEqual({ fallback: true });
  });

  it('returns an empty object when both the locale and the fallback fail', async () => {
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('disk error'));

    const result = await getServerTranslations('xx');
    expect(result).toEqual({});
  });

  it('returns an empty object when the default locale itself fails (no fallback attempt)', async () => {
    const spy = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('disk error'));

    const result = await getServerTranslations('en');
    expect(result).toEqual({});
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
