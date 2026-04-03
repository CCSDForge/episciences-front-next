/**
 * Cache TTL configuration
 *
 * All durations are in seconds. Set to "false" to cache indefinitely (no
 * time-based revalidation — on-demand revalidation via revalidateTag only).
 *
 * Configured via environment variables; defaults to 3600 (1 hour) when unset.
 */

const DEFAULT_TTL = 3600;

function parseTTL(value: string | undefined): number | false {
  if (!value) return DEFAULT_TTL;
  if (value === 'false') return false;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TTL;
}

export const CACHE_TTL = {
  news: parseTTL(process.env.CACHE_TTL_NEWS),
  volumes: parseTTL(process.env.CACHE_TTL_VOLUMES),
  articles: parseTTL(process.env.CACHE_TTL_ARTICLES),
  pages: parseTTL(process.env.CACHE_TTL_PAGES),
  statistics: parseTTL(process.env.CACHE_TTL_STATISTICS),
  members: parseTTL(process.env.CACHE_TTL_MEMBERS),
  sections: parseTTL(process.env.CACHE_TTL_SECTIONS),
  sitemap: parseTTL(process.env.CACHE_TTL_SITEMAP),
};
