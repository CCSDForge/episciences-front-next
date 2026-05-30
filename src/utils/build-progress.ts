/**
 * Build progress tracking utility
 * Used during static site generation to display progress messages
 */
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'build' });

let totalArticles = 0;
let initialized = false;

/**
 * Initialize the build progress with total article count
 */
export function initBuildProgress(total: number): void {
  // Only initialize once (Next.js may call generateStaticParams multiple times)
  if (initialized) {
    return;
  }

  totalArticles = total;
  initialized = true;

  log.info(`✓ Génération de ${total} articles (pages principales + téléchargement)`);
}

// Track which articles have been logged to avoid duplicates
const loggedArticles = new Set<string>();

/**
 * Log progress for a single article generation
 */
export function logArticleProgress(
  articleId: string,
  lang: string,
  pageType: 'main' | 'download' | 'preview' = 'main'
): void {
  // Create unique key for this article/lang/type combination
  const key = `${articleId}-${lang}-${pageType}`;

  // Skip if already logged (Next.js calls page functions multiple times)
  if (loggedArticles.has(key)) {
    return;
  }
  loggedArticles.add(key);

  // Simple message: just show what's being generated
  if (pageType === 'download') {
    log.info(`  └─ téléchargement → Article ${articleId}`);
  } else if (pageType === 'preview') {
    log.info(`  └─ preview → Article ${articleId}`);
  } else {
    log.info(`  ✓ Article ${articleId} (${lang})`);
  }
}
