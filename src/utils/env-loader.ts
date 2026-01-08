import path from 'path';
import { isValidJournalId } from './validation';
// On évite l'import statique de fs pour ne pas casser le build client
// import fs from 'fs';

export interface JournalConfig {
  code: string;
  env: Record<string, string>;
}

/**
 * In-memory cache for journal configurations
 * Prevents repeated file I/O operations for the same journal
 * Cache persists for the lifetime of the Node.js process
 */
const configCache = new Map<string, JournalConfig>();

/**
 * In-memory cache for journals list
 * Loaded once and reused to avoid repeated file reads
 */
let journalsListCache: string[] | null = null;

/**
 * Get the list of journals from journals.txt
 * Uses in-memory cache to avoid repeated file reads
 * (Server-side only)
 */
export function getJournalsList(): string[] {
  if (typeof window !== 'undefined') return [];

  // Return cached list if available
  if (journalsListCache !== null) {
    return journalsListCache;
  }

  try {
    const fs = require('fs');
    const journalsPath = path.join(process.cwd(), 'external-assets/journals.txt');
    const content = fs.readFileSync(journalsPath, 'utf-8');
    const journals = content.split('\n').map((j: string) => j.trim()).filter(Boolean);

    // Cache the result
    journalsListCache = journals;
    return journals;
  } catch (error) {
    console.warn('[env-loader] Could not read journals.txt', error);
    // Cache empty array to avoid repeated failed attempts
    journalsListCache = [];
    return [];
  }
}

/**
 * Load journal-specific configuration from external-assets/.env.local.<code>
 * Uses in-memory cache to avoid repeated file reads
 * (Server-side only)
 */
export function loadJournalConfig(journalCode: string): JournalConfig {
  if (typeof window !== 'undefined') {
    return { code: journalCode, env: {} };
  }

  // Validate journal code format to prevent path traversal attacks
  if (!isValidJournalId(journalCode)) {
    console.warn(`[env-loader] Invalid journal code format: ${journalCode}`);
    const emptyConfig = { code: journalCode, env: {} };
    configCache.set(journalCode, emptyConfig);
    return emptyConfig;
  }

  // Return cached config if available
  if (configCache.has(journalCode)) {
    return configCache.get(journalCode)!;
  }

  try {
    const fs = require('fs');
    const envPath = path.join(process.cwd(), `external-assets/.env.local.${journalCode}`);

    // If file doesn't exist, cache and return empty config
    if (!fs.existsSync(envPath)) {
      const emptyConfig = { code: journalCode, env: {} };
      configCache.set(journalCode, emptyConfig);
      return emptyConfig;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');

    const env = envContent
        .split('\n')
        .filter((line: string) => line && !line.trim().startsWith('#'))
        .reduce((acc: Record<string, string>, line: string) => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                if (key && value) {
                    acc[key] = value.replace(/^["']|["']$/g, '');
                }
            }
            return acc;
        }, {} as Record<string, string>);

    const config = {
        code: journalCode,
        env
    };

    // Cache the loaded config
    configCache.set(journalCode, config);
    return config;

  } catch (error) {
    console.error(`[env-loader] Error loading config for ${journalCode}`, error);
    const errorConfig = { code: journalCode, env: {} };
    // Cache the error result to avoid repeated failed attempts
    configCache.set(journalCode, errorConfig);
    return errorConfig;
  }
}

/**
 * Get only public configuration (safe for client-side)
 * Filters variables starting with NEXT_PUBLIC_
 */
export function getPublicJournalConfig(journalCode: string): Record<string, string> {
  if (typeof window !== 'undefined') return {};

  const config = loadJournalConfig(journalCode);
  const publicConfig: Record<string, string> = {};

  Object.keys(config.env).forEach(key => {
    if (key.startsWith('NEXT_PUBLIC_')) {
      publicConfig[key] = config.env[key];
    }
  });

  return publicConfig;
}

/**
 * Get API URL for a journal
 * Server-side: loads from journal-specific config file
 * Client-side: uses global env var (API endpoint should be set via server props)
 *
 * IMPORTANT: For client-side components that need the API URL,
 * pass it as a prop from the Server Component instead of calling this function
 */
export function getJournalApiUrl(journalCode: string): string {
  // Server-side: load from journal-specific config
  if (typeof window === 'undefined') {
    // 1. Force Override (Local Dev / Special CI)
    if (process.env.NEXT_PUBLIC_API_URL_FORCE) {
      return process.env.NEXT_PUBLIC_API_URL_FORCE;
    }

    // 2. Journal Specific Config
    const config = loadJournalConfig(journalCode);
    const url = config.env.NEXT_PUBLIC_API_ROOT_ENDPOINT ||
                process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT ||
                'https://api-preprod.episciences.org/api';

    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // Client-side: use global env var
  // Note: For multi-tenant, the correct API URL should be passed from server as prop
  // This fallback is for backward compatibility only
  return process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || 'https://api-preprod.episciences.org/api';
}
