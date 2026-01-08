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

// Save original fetch function before overriding
const originalFetch = globalThis.fetch;

// Global API configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || '',
  timeout: 15000 // Timeout in milliseconds
};

// Function to log requests (currently disabled)
const logRequest = (method: string, url: string): void => {
 // console.log(`🚀 Fetch: ${method} ${url}`);
};

// Function to log responses (currently disabled)
const logResponse = (status: number, url: string): void => {
 // console.log(`✅ Response: ${status} from ${url}`);
};

// Function to log errors (currently disabled)
const logError = (error: Error, url: string): void => {
 // console.error(`❌ Error: ${error.message} for ${url}`);
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
   // console.log(`🔀 Redirecting request from /default to /`);
    url = url.replace('/default', '/').replace('default', '/');
  }

  // Log the request
  logRequest(method, url);

  try {
    const response = await Promise.race([
      originalFetch(url, init),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
      ),
    ]) as Response;

    // Log the response
    logResponse(response.status, url);

    return response;
  } catch (error) {
    // Log the error
    logError(error as Error, url);
    throw error;
  }
};

// The fetch interceptor is automatically active on module import
// No additional setup required 