/**
 * Allowed PDF domains — worker-side copy.
 *
 * The pdf-cache worker runs standalone via `node scripts/pdf-cache-worker.mjs`,
 * outside the Next.js build (see scripts/revalidate-worker.mjs for the same
 * pattern with the Valkey Sentinel client). It cannot import TypeScript from
 * src/, so it reads the same JSON file src/utils/pdf.ts imports from —
 * src/config/allowed-pdf-domains.json is the single source of truth for the
 * *list*; this module only duplicates the *check logic*, which is cheap to
 * keep in sync and low-risk if it briefly drifts.
 *
 * A pub/sub message is not authenticated, so this check — re-run independently
 * by the worker rather than trusted from the message payload — is the real
 * security boundary for what the worker will fetch.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', '..', 'src', 'config', 'allowed-pdf-domains.json');

const { domains } = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

export const ALLOWED_PDF_DOMAINS = domains;

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isAllowedPdfDomain(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') return false;
    const hostname = urlObj.hostname;
    return ALLOWED_PDF_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
