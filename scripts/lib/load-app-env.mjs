/**
 * Loads the app's .env* files into process.env for the pdf-cache worker.
 *
 * The worker runs from the app's release directory (WorkingDirectory in
 * pdf-cache-worker.service), so it reads the same files as Next.js, with the
 * same loader (@next/env) and the same rules: .env.production.local,
 * .env.local, .env.production, .env, first match wins, `$VAR` expansion.
 * The PDF cache settings therefore live in one place, the .env.local that
 * Ansible deploys, instead of being duplicated in a systemd EnvironmentFile
 * where they could silently diverge from the app (a different
 * PDF_CACHE_CHANNEL and the worker never receives a job; a different
 * PDF_CACHE_ROOT and it writes where the app never reads).
 *
 * A variable already set in the process environment (e.g. by the optional
 * /etc/episciences/worker.env) is never overwritten: it acts as an override.
 */

import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

/**
 * @param {string} [dir] directory holding the .env* files
 * @returns {string[]} the files that were loaded, most specific first
 */
export function loadAppEnv(dir = process.cwd()) {
  // dev=false: production rules, as for `next start`. Meant to be called
  // once per process, at startup: @next/env snapshots the initial
  // environment on its first call and caches the result.
  const { loadedEnvFiles } = loadEnvConfig(dir, false, { info() {}, error: console.error });
  return loadedEnvFiles.map(file => file.path);
}
