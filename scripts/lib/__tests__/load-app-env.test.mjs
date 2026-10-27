import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MODULE_URL = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'load-app-env.mjs')
).href;

/**
 * Runs loadAppEnv() in a fresh Node process, as the worker does at startup
 * (@next/env caches its result per process), from `cwd`, and returns the
 * loaded files plus the requested variables.
 */
function runInFreshProcess(cwd, keys, extraEnv = {}) {
  const script = `
    const { loadAppEnv } = await import(${JSON.stringify(MODULE_URL)});
    const loaded = loadAppEnv();
    const values = Object.fromEntries(${JSON.stringify(keys)}.map(k => [k, process.env[k]]));
    console.log(JSON.stringify({ loaded, values }));
  `;
  // No NODE_ENV, like the systemd unit: production rules (vitest's
  // NODE_ENV=test would make @next/env skip .env.local).
  const { NODE_ENV: _omit, ...env } = process.env;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    env: { ...env, ...extraEnv },
    encoding: 'utf8',
  });
  return JSON.parse(out.trim().split('\n').pop());
}

describe('loadAppEnv', () => {
  let dir;

  beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'load-app-env-test-'));
  });

  afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  it('reads the same files as Next.js in production, most specific first', async () => {
    await fsp.writeFile(path.join(dir, '.env'), 'T_BASE=base\nT_SHARED=base\nT_PROD=base\n');
    await fsp.writeFile(path.join(dir, '.env.production'), 'T_PROD=production\n');
    await fsp.writeFile(path.join(dir, '.env.local'), 'T_SHARED=local\nT_EXPANDED=$T_SHARED-x\n');

    const { loaded, values } = runInFreshProcess(dir, ['T_BASE', 'T_SHARED', 'T_PROD', 'T_EXPANDED']);

    expect(loaded).toEqual(['.env.local', '.env.production', '.env']);
    expect(values).toEqual({ T_BASE: 'base', T_SHARED: 'local', T_PROD: 'production', T_EXPANDED: 'local-x' });
  });

  it('never overrides a variable already set in the process environment (worker.env override)', async () => {
    await fsp.writeFile(path.join(dir, '.env.local'), 'T_PRESET=from-file\n');

    const { values } = runInFreshProcess(dir, ['T_PRESET'], { T_PRESET: 'from-systemd' });

    expect(values.T_PRESET).toBe('from-systemd');
  });

  it('loads nothing, without failing, when there is no env file', () => {
    expect(runInFreshProcess(dir, []).loaded).toEqual([]);
  });
});
