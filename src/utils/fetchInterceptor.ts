/**
 * Global Fetch Interceptor
 *
 * This module automatically intercepts all fetch() calls in the application (server-side only)
 * and applies the following transformations:
 *
 * Features:
 * - Global timeout: 15 seconds for all requests
 * - Journal code substitution: Replaces rvcode=default with rvcode={JOURNAL_CODE}
 * - Redirect handling: Converts /default paths to /
 * - Error logging: Logs failed requests for debugging
 *
 * Note: This interceptor is applied globally on module import and affects all fetch()
 * calls in the application. It does not need to be explicitly invoked.
 */

import { getJournalCode } from './static-build';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'fetch-interceptor' });

// Save original fetch function before overriding
const originalFetch = globalThis.fetch;

// Global API configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || '',
  timeout: 15000, // Timeout in milliseconds
};

// Global fetch function replacement
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url = input.toString();
  const method = init?.method || 'GET';

  let journalCode = '';
  try {
    journalCode = getJournalCode();
  } catch (e) {
    // Ignore error if env var is missing (Multi-tenant build)
  }

  if (journalCode) {
    // Replace all occurrences of 'default' with the current journal code in the URL
    if (url.includes('rvcode=default')) {
      url = url.replace('rvcode=default', `rvcode=${journalCode}`);
    }
  }

  // Handle redirection of requests to /default
  if (url.endsWith('/default') || url === 'default') {
    url = url.replace('/default', '/').replace('default', '/');
  }

  log.debug(`${method} ${url}`);

  try {
    const response = (await Promise.race([
      originalFetch(url, init),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
      ),
    ])) as Response;

    log.debug(`${response.status} ${url}`);

    return response;
  } catch (error) {
    log.error(`${(error as Error).message} for ${url}`);
    throw error;
  }
};

// The fetch interceptor is automatically active on module import
// No additional setup required
