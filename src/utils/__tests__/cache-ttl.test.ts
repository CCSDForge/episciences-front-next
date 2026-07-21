import { describe, it, expect, afterEach, vi } from 'vitest';

const ENV_KEYS = [
  'CACHE_TTL_NEWS',
  'CACHE_TTL_VOLUMES',
  'CACHE_TTL_ARTICLES',
  'CACHE_TTL_PAGES',
  'CACHE_TTL_STATISTICS',
  'CACHE_TTL_MEMBERS',
  'CACHE_TTL_SECTIONS',
];

async function loadCacheTtl() {
  vi.resetModules();
  return (await import('../cache-ttl')).CACHE_TTL;
}

describe('CACHE_TTL', () => {
  afterEach(() => {
    ENV_KEYS.forEach(key => delete process.env[key]);
  });

  it('defaults to 3600 when the env var is unset', async () => {
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.news).toBe(3600);
  });

  it('resolves to false (no time-based revalidation) when set to "false"', async () => {
    process.env.CACHE_TTL_NEWS = 'false';
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.news).toBe(false);
  });

  it('parses a valid numeric value', async () => {
    process.env.CACHE_TTL_VOLUMES = '120';
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.volumes).toBe(120);
  });

  it('falls back to the default for a non-numeric value', async () => {
    process.env.CACHE_TTL_ARTICLES = 'not-a-number';
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.articles).toBe(3600);
  });

  it('falls back to the default for a negative value', async () => {
    process.env.CACHE_TTL_PAGES = '-5';
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.pages).toBe(3600);
  });

  it('accepts zero as a valid TTL', async () => {
    process.env.CACHE_TTL_STATISTICS = '0';
    const CACHE_TTL = await loadCacheTtl();
    expect(CACHE_TTL.statistics).toBe(0);
  });
});
