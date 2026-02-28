// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

// --- Mocks ---

// vi.mock('@/config/api') intercepts the static `import { API_ROOT_ENDPOINT }` in env-loader.ts
vi.mock('@/config/api', () => ({
  API_ROOT_ENDPOINT: 'https://api.default.example.com',
}));

// NOTE on fs mocking strategy:
// - `import * as fs from 'fs'` gives an ESM namespace with non-configurable props.
// - `vi.mock('fs')` does NOT intercept the dynamic `require('fs')` calls inside env-loader.ts.
// - `createRequire(import.meta.url)('fs')` returns the same CJS module singleton that
//   env-loader.ts's `require('fs')` returns (same module registry within the test file).
//   CJS module objects have configurable properties, so vi.spyOn works reliably.
const _require = createRequire(import.meta.url);
const fs = _require('fs') as typeof import('fs');

// --- Tests ---

describe('env-loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL_FORCE;
    delete process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getJournalsList
  // Uses vi.resetModules() so each test starts with an empty in-memory cache
  // ─────────────────────────────────────────────────────────────────────────
  describe('getJournalsList', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('reads, parses and trims entries from journals.txt', async () => {
      vi.spyOn(fs, 'readFileSync').mockReturnValue('episciences\nhal\n\n  arkiv\n' as any);
      const { getJournalsList } = await import('@/utils/env-loader');
      expect(getJournalsList()).toEqual(['episciences', 'hal', 'arkiv']);
    });

    it('returns empty array and logs a warning when the file cannot be read', async () => {
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getJournalsList } = await import('@/utils/env-loader');
      expect(getJournalsList()).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[env-loader]'),
        expect.any(Error)
      );
    });

    it('caches the result — readFileSync is called only once', async () => {
      const readSpy = vi
        .spyOn(fs, 'readFileSync')
        .mockReturnValue('journal1\njournal2' as any);
      const { getJournalsList } = await import('@/utils/env-loader');
      getJournalsList();
      getJournalsList();
      expect(readSpy).toHaveBeenCalledOnce();
    });

    it('returns empty array on the client-side (window is defined)', async () => {
      vi.stubGlobal('window', {});
      const { getJournalsList } = await import('@/utils/env-loader');
      expect(getJournalsList()).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // loadJournalConfig
  // Each test uses a unique journal code to avoid per-code cache collisions
  // ─────────────────────────────────────────────────────────────────────────
  describe('loadJournalConfig', () => {
    let loadJournalConfig: typeof import('@/utils/env-loader').loadJournalConfig;

    beforeEach(async () => {
      ({ loadJournalConfig } = await import('@/utils/env-loader'));
    });

    it('returns empty env when the env file does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const result = loadJournalConfig('journal-nofile');
      expect(result).toEqual({ code: 'journal-nofile', env: {} });
    });

    it('rejects invalid journal code and never touches the file system (path traversal)', () => {
      const existsSpy = vi.spyOn(fs, 'existsSync');
      const readSpy = vi.spyOn(fs, 'readFileSync');
      // '../etc/passwd' contains '/' and '.' → fails /^[a-z0-9-]{2,50}$/
      const result = loadJournalConfig('../etc/passwd');
      expect(result).toEqual({ code: '../etc/passwd', env: {} });
      expect(existsSpy).not.toHaveBeenCalled();
      expect(readSpy).not.toHaveBeenCalled();
    });

    it('parses KEY=VALUE pairs, ignoring comments and blank lines', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'KEY1=value1\nKEY2=value2\n# comment\n\nKEY3=value3' as any
      );
      const result = loadJournalConfig('journal-parse-basic');
      expect(result.env).toEqual({ KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' });
    });

    it('strips surrounding double-quotes from values', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('KEY="quoted value"' as any);
      const result = loadJournalConfig('journal-quotes-double');
      expect(result.env.KEY).toBe('quoted value');
    });

    it('strips surrounding single-quotes from values', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue("KEY='single quoted'" as any);
      const result = loadJournalConfig('journal-quotes-single');
      expect(result.env.KEY).toBe('single quoted');
    });

    it('preserves values that contain = signs (e.g. URLs with query strings)', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'URL=https://example.com/path?a=1&b=2' as any
      );
      const result = loadJournalConfig('journal-url-with-eq');
      expect(result.env.URL).toBe('https://example.com/path?a=1&b=2');
    });

    it('caches result — readFileSync is called only once per journal code', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('KEY=val' as any);
      loadJournalConfig('journal-cache-check');
      loadJournalConfig('journal-cache-check');
      expect(readSpy).toHaveBeenCalledOnce();
    });

    it('returns empty env on the client-side (window is defined)', () => {
      vi.stubGlobal('window', {});
      const result = loadJournalConfig('journal-client-side');
      expect(result).toEqual({ code: 'journal-client-side', env: {} });
    });

    it('logs an error and returns empty env when readFileSync throws', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = loadJournalConfig('journal-read-error');
      expect(result).toEqual({ code: 'journal-read-error', env: {} });
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[env-loader]'),
        expect.any(Error)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getPublicJournalConfig
  // ─────────────────────────────────────────────────────────────────────────
  describe('getPublicJournalConfig', () => {
    let getPublicJournalConfig: typeof import('@/utils/env-loader').getPublicJournalConfig;

    beforeEach(async () => {
      ({ getPublicJournalConfig } = await import('@/utils/env-loader'));
    });

    it('returns only NEXT_PUBLIC_ keys', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'NEXT_PUBLIC_KEY=public-value\nPRIVATE_KEY=secret\nANOTHER=data' as any
      );
      const result = getPublicJournalConfig('journal-public-filter');
      expect(result).toEqual({ NEXT_PUBLIC_KEY: 'public-value' });
      expect(result).not.toHaveProperty('PRIVATE_KEY');
    });

    it('returns empty object when no NEXT_PUBLIC_ keys are present', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'SECRET_KEY=secret\nDB_URL=postgres://...' as any
      );
      const result = getPublicJournalConfig('journal-no-public');
      expect(result).toEqual({});
    });

    it('returns empty object on the client-side', () => {
      vi.stubGlobal('window', {});
      const result = getPublicJournalConfig('journal-public-client');
      expect(result).toEqual({});
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getJournalApiUrl
  // ─────────────────────────────────────────────────────────────────────────
  describe('getJournalApiUrl', () => {
    let getJournalApiUrl: typeof import('@/utils/env-loader').getJournalApiUrl;

    beforeEach(async () => {
      ({ getJournalApiUrl } = await import('@/utils/env-loader'));
    });

    it('returns /api/proxy on the client-side', () => {
      vi.stubGlobal('window', {});
      expect(getJournalApiUrl('any-journal')).toBe('/api/proxy');
    });

    it('returns NEXT_PUBLIC_API_URL_FORCE when set (server-side)', () => {
      process.env.NEXT_PUBLIC_API_URL_FORCE = 'https://force-override.example.com';
      expect(getJournalApiUrl('any-journal-force')).toBe('https://force-override.example.com');
    });

    it('returns journal-specific API URL from config file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'NEXT_PUBLIC_API_ROOT_ENDPOINT=https://journal-api.example.com' as any
      );
      expect(getJournalApiUrl('journal-api-specific')).toBe('https://journal-api.example.com');
    });

    it('falls back to NEXT_PUBLIC_API_ROOT_ENDPOINT env var when no journal config', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT = 'https://global-api.example.com';
      expect(getJournalApiUrl('journal-api-global')).toBe('https://global-api.example.com');
    });

    it('falls back to API_ROOT_ENDPOINT constant when nothing else is set', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(getJournalApiUrl('journal-api-fallback')).toBe('https://api.default.example.com');
    });

    it('strips trailing slash from the returned URL', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        'NEXT_PUBLIC_API_ROOT_ENDPOINT=https://api.example.com/' as any
      );
      expect(getJournalApiUrl('journal-api-trailing-slash')).toBe('https://api.example.com');
    });
  });
});
