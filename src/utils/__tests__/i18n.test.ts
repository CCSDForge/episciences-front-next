import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTranslations, fetchTranslations } from '../i18n';

describe('i18n - getTranslations / fetchTranslations', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getTranslations returns the parsed JSON on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch;

    const result = await getTranslations('en');
    expect(result).toEqual({ hello: 'world' });
  });

  it('getTranslations throws when the response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(getTranslations('en')).rejects.toThrow(
      'Failed to fetch translations for language en'
    );
  });

  it('fetchTranslations returns the translations on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch;

    const result = await fetchTranslations('fr');
    expect(result).toEqual({ hello: 'world' });
  });

  it('fetchTranslations returns null and logs on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const result = await fetchTranslations('fr');
    expect(result).toBeNull();
  });
});
