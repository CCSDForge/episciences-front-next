#!/usr/bin/env node

/**
 * Interactive and CLI script to add a new journal configuration or convert
 * a preproduction journal (-preprod) into a production journal.
 *
 * Usage:
 *   npm run add-journal
 *   npm run add-journal -- --code my-journal --env both -y
 *   npm run add-journal -- --convert rdm-preprod -y
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'external-assets');
const LOGOS_DIR = path.join(ASSETS_DIR, 'logos');
const JOURNALS_TXT = path.join(ASSETS_DIR, 'journals.txt');
const ENV_EXAMPLE = path.join(ASSETS_DIR, '.env.example');

// ANSI styles
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Journal ID validation regex (from src/utils/validation.ts)
const JOURNAL_ID_REGEX = /^[a-z0-9-]{2,50}$/;

// -----------------------------------------------------------------------------
// Color Utilities
// -----------------------------------------------------------------------------

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = v => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const cVal = (1 - Math.abs(2 * l - 1)) * s;
  const xVal = cVal * (1 - Math.abs(((h / 60) % 2) - 1));
  const mVal = l - cVal / 2;

  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (h < 60) [r1, g1, b1] = [cVal, xVal, 0];
  else if (h < 120) [r1, g1, b1] = [xVal, cVal, 0];
  else if (h < 180) [r1, g1, b1] = [0, cVal, xVal];
  else if (h < 240) [r1, g1, b1] = [0, xVal, cVal];
  else if (h < 300) [r1, g1, b1] = [xVal, 0, cVal];
  else [r1, g1, b1] = [cVal, 0, xVal];

  return {
    r: Math.round((r1 + mVal) * 255),
    g: Math.round((g1 + mVal) * 255),
    b: Math.round((b1 + mVal) * 255),
  };
}

// Low-cost perceptual color distance (Redmean metric)
function colorDistance(rgb1, rgb2) {
  const rmean = (rgb1.r + rgb2.r) / 2;
  const r = rgb1.r - rgb2.r;
  const g = rgb1.g - rgb2.g;
  const b = rgb1.b - rgb2.b;
  return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

// WCAG relative luminance
function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(cVal => {
    const s = cVal / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// WCAG recommended text color on primary background
function getBestTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const lum = getLuminance(rgb);
  const contrastWhite = 1.05 / (lum + 0.05);
  const contrastBlack = (lum + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? '#ffffff' : '#000000';
}

// -----------------------------------------------------------------------------
// API Verification
// -----------------------------------------------------------------------------

async function verifyJournalApi(journalCode, isPreprod) {
  const domain = isPreprod ? 'https://api-preprod.episciences.org' : 'https://api.episciences.org';
  const url = `${domain}/api/journals/${journalCode}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json, application/ld+json',
      },
    });

    if (res.status === 200) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, name: data.name || journalCode, rvid: data.rvid, url };
    }

    return { ok: false, status: res.status, url };
  } catch (err) {
    return { ok: false, error: err.message, url };
  }
}

async function checkAndValidateApi(code, isPreprod, skipCheck) {
  if (skipCheck) {
    console.log(`  ${c.dim}ℹ API verification disabled (--skip-api-check).${c.reset}`);
    return { ok: true, name: code };
  }
  process.stdout.write(
    `  ⏳ Checking existence in ${isPreprod ? 'preproduction' : 'production'} API... `
  );
  const result = await verifyJournalApi(code, isPreprod);
  if (result.ok) {
    console.log(
      `${c.green}✓${c.reset} Found in database: ${c.bold}"${result.name}"${c.reset}${
        result.rvid ? ` (ID: ${result.rvid})` : ''
      }`
    );
    return result;
  }
  console.log(`${c.red}✗${c.reset}`);
  if (result.status === 404) {
    console.log(
      `  ${c.red}❌ Journal '${code}' does not exist on the ${
        isPreprod ? 'preproduction' : 'production'
      } API.${c.reset}`
    );
    console.log(`  ${c.dim}Tested URL: ${result.url}${c.reset}`);
    console.log(
      `  ${c.yellow}The journal must first be created in the Episciences database.${c.reset}`
    );
  } else if (result.error) {
    console.log(`  ${c.red}❌ Network error while verifying '${code}': ${result.error}${c.reset}`);
  } else {
    console.log(`  ${c.red}❌ Unexpected API response (${result.status}) for '${code}'.${c.reset}`);
  }
  return result;
}

/**
 * Read a text file, returning null when it does not exist.
 * Avoids the existsSync-then-read pattern (TOCTOU race).
 */
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    env[key] = raw.replace(/^["']|["']$/g, '');
  }
  return env;
}

function getExistingColors() {
  if (!fs.existsSync(ASSETS_DIR)) return [];
  const files = fs.readdirSync(ASSETS_DIR).filter(f => f.startsWith('.env.local.'));
  const colors = [];
  for (const file of files) {
    const env = parseEnvFile(path.join(ASSETS_DIR, file));
    const color = env['NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR'];
    if (color && hexToRgb(color)) {
      colors.push({ color, rgb: hexToRgb(color), file });
    }
  }
  return colors;
}

function generateDistinctRandomColor(existingColors) {
  // Generate a pool of varied candidates tailored for academic / editorial brand identities
  // Avoid fluorescent, neon, or overly bright colors (e.g. #3fed1d)
  const candidates = [];
  for (let hue = 0; hue < 360; hue += 5) {
    const isGreenOrYellow = hue >= 40 && hue <= 165;
    // Restrict saturation and lightness to avoid neon/fluorescent tones, especially in green/yellow
    const satOptions = isGreenOrYellow ? [35, 45, 52] : [45, 60, 70];
    const lightOptions = isGreenOrYellow ? [25, 30, 35] : [26, 33, 40];

    for (const sat of satOptions) {
      for (const light of lightOptions) {
        const rgb = hslToRgb(hue, sat, light);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        candidates.push({ hex, rgb });
      }
    }
  }

  if (existingColors.length === 0) {
    const random = candidates[Math.floor(Math.random() * candidates.length)];
    return random.hex;
  }

  // Calculate minimum distance to any existing color for each candidate
  const scored = candidates.map(cand => {
    let minD = Infinity;
    for (const ext of existingColors) {
      const d = colorDistance(cand.rgb, ext.rgb);
      if (d < minD) minD = d;
    }
    return { ...cand, minD };
  });

  // Sort descending by distance from existing colors
  scored.sort((a, b) => b.minD - a.minD);

  // Pick randomly among top 12 best spaced colors for variety
  const topPool = scored.slice(0, Math.min(12, scored.length));
  const picked = topPool[Math.floor(Math.random() * topPool.length)];
  return picked.hex;
}

// -----------------------------------------------------------------------------
// Journal Assets Helpers
// -----------------------------------------------------------------------------

function getExistingJournals() {
  if (!fs.existsSync(ASSETS_DIR)) return [];
  const files = fs.readdirSync(ASSETS_DIR).filter(f => f.startsWith('.env.local.'));
  return files.map(f => f.replace('.env.local.', '')).sort();
}

function getExistingPreprodJournals() {
  return getExistingJournals().filter(j => j.endsWith('-preprod'));
}

function updateJournalsTxt(journalCodesToAdd) {
  const raw = readFileIfExists(JOURNALS_TXT) ?? '';
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));

  const set = new Set(lines);
  for (const code of journalCodesToAdd) {
    set.add(code);
  }

  const sorted = Array.from(set).sort();
  fs.writeFileSync(JOURNALS_TXT, sorted.join('\n') + '\n', 'utf-8');
}

function buildEnvContent({
  baseEnvContent,
  journalCode,
  isPreprod,
  primaryColor,
  primaryTextColor,
  acceptedLanguages,
  defaultLanguage,
}) {
  let content = baseEnvContent;

  const apiRoot = isPreprod
    ? 'https://api-preprod.episciences.org/api'
    : 'https://api.episciences.org/api';
  const apiDomain = isPreprod
    ? 'https://api-preprod.episciences.org'
    : 'https://api.episciences.org';
  const inboxUrl = isPreprod
    ? 'https://inbox-preprod.episciences.org/'
    : 'https://inbox.episciences.org/';
  const managerUrl = isPreprod
    ? 'https://manager-preprod.episciences.org'
    : 'https://manager.episciences.org';
  const allowIndexing = isPreprod ? 'false' : 'true';

  const replaceOrAppend = (key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}="${value}"`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  };

  const replaceOrAppendRaw = (key, rawValue) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const line = `${key}=${rawValue}`;
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content += `\n${line}`;
    }
  };

  replaceOrAppend('NEXT_PUBLIC_API_ROOT_ENDPOINT', apiRoot);
  replaceOrAppend('NEXT_PUBLIC_API_DOMAIN', apiDomain);
  replaceOrAppend('NEXT_PUBLIC_COAR_NOTIFY_INBOX_URL', inboxUrl);
  replaceOrAppend('NEXT_PUBLIC_EPISCIENCES_MANAGER', managerUrl);
  replaceOrAppendRaw('NEXT_PUBLIC_JOURNAL_ALLOW_INDEXING', allowIndexing);

  replaceOrAppend('NEXT_PUBLIC_JOURNAL_RVCODE', journalCode);
  if (primaryColor) replaceOrAppend('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR', primaryColor);
  if (primaryTextColor) replaceOrAppend('NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR', primaryTextColor);
  if (acceptedLanguages)
    replaceOrAppend('NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES', acceptedLanguages);
  if (defaultLanguage) replaceOrAppend('NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE', defaultLanguage);

  return content.trim() + '\n';
}

function handleLogoCopy(sourcePath, targetFileName) {
  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }

  const targetPath = path.join(LOGOS_DIR, targetFileName);
  const defaultLogo = path.join(LOGOS_DIR, 'logo-default.svg');

  // If a source path was provided and exists
  if (sourcePath && fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`  ${c.green}✓${c.reset} Logo copied from ${sourcePath} to ${targetFileName}`);
    return true;
  }

  // Fallback: systematically use external-assets/logos/logo-default.svg
  if (fs.existsSync(defaultLogo)) {
    fs.copyFileSync(defaultLogo, targetPath);
    console.log(
      `  ${c.yellow}ℹ${c.reset} No logo provided: default logo (${c.bold}logo-default.svg${c.reset}) applied to ${targetFileName}`
    );
    return true;
  }

  console.warn(
    `  ${c.yellow}⚠️${c.reset} Default logo not found at ${defaultLogo}. Please add ${targetFileName} to external-assets/logos/`
  );
  return false;
}

function setLocalEnvJournal(journalCode) {
  const rootEnvLocal = path.join(ROOT_DIR, '.env.local');
  let content = readFileIfExists(rootEnvLocal) ?? '';

  const regex = /^NEXT_PUBLIC_JOURNAL_RVCODE=.*$/m;
  const line = `NEXT_PUBLIC_JOURNAL_RVCODE=${journalCode}`;

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = `${line}\n${content}`;
  }

  fs.writeFileSync(rootEnvLocal, content.trim() + '\n', 'utf-8');
  console.log(
    `\n  ${c.green}✓${c.reset} ${c.bold}.env.local${c.reset} updated with ${c.cyan}${line}${c.reset}`
  );
  console.log(
    `  ${c.green}ℹ${c.reset} You can now run ${c.bold}npm run dev${c.reset} to test this journal locally!`
  );
}

function runPostSync() {
  console.log(`\n${c.bold}${c.cyan}🔄 Synchronizing project...${c.reset}`);
  const scripts = [
    { name: 'Generate journals list', cmd: 'node scripts/generate-journals.js' },
    {
      name: 'Generate language configurations',
      cmd: 'node scripts/generate-journals-languages.js',
    },
    { name: 'Copy logos to public/logos', cmd: 'node scripts/copy-logos.js' },
  ];

  for (const s of scripts) {
    try {
      execSync(s.cmd, { stdio: 'inherit', cwd: ROOT_DIR });
    } catch (e) {
      console.error(`  ${c.red}✗ Failed during '${s.name}':${c.reset}`, e.message || e);
    }
  }

  // Also regenerate sample overview if script exists
  const samplesScript = path.join(ASSETS_DIR, '.github/scripts/generate-samples.js');
  if (fs.existsSync(samplesScript)) {
    try {
      execSync(`node .github/scripts/generate-samples.js`, {
        stdio: 'inherit',
        cwd: ASSETS_DIR,
      });
      console.log(`  ${c.green}✓${c.reset} Swatches and sample.md regenerated.`);
    } catch {
      // Non-blocking
    }
  }
}

// -----------------------------------------------------------------------------
// CLI Arguments Parsing
// -----------------------------------------------------------------------------

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: null, // 'create' | 'convert'
    convertCode: null,
    code: null,
    template: null,
    env: null, // 'prod' | 'preprod' | 'both'
    color: null,
    textColor: null,
    languages: null,
    defaultLanguage: null,
    logo: null,
    skipApiCheck: false,
    setCurrent: false,
    dev: false,
    yes: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--skip-api-check') {
      options.skipApiCheck = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '-s' || arg === '--set-current') {
      options.setCurrent = true;
    } else if (arg === '-d' || arg === '--dev') {
      options.dev = true;
    } else if (arg === '--create') {
      options.mode = 'create';
    } else if (arg === '--convert') {
      options.mode = 'convert';
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options.convertCode = args[++i];
      }
    } else if (arg.startsWith('--convert=')) {
      options.mode = 'convert';
      options.convertCode = arg.split('=')[1];
    } else if (arg === '-c' || arg === '--code') {
      options.code = args[++i];
    } else if (arg.startsWith('--code=')) {
      options.code = arg.split('=')[1];
    } else if (arg === '-t' || arg === '--template') {
      options.template = args[++i];
    } else if (arg.startsWith('--template=')) {
      options.template = arg.split('=')[1];
    } else if (arg === '-e' || arg === '--env') {
      options.env = args[++i];
    } else if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1];
    } else if (arg === '--color') {
      options.color = args[++i];
    } else if (arg.startsWith('--color=')) {
      options.color = arg.split('=')[1];
    } else if (arg === '--text-color') {
      options.textColor = args[++i];
    } else if (arg.startsWith('--text-color=')) {
      options.textColor = arg.split('=')[1];
    } else if (arg === '--langs' || arg === '--languages') {
      options.languages = args[++i];
    } else if (arg.startsWith('--langs=')) {
      options.languages = arg.split('=')[1];
    } else if (arg === '--default-lang' || arg === '--default-language') {
      options.defaultLanguage = args[++i];
    } else if (arg.startsWith('--default-lang=')) {
      options.defaultLanguage = arg.split('=')[1];
    } else if (arg === '--logo') {
      options.logo = args[++i];
    } else if (arg.startsWith('--logo=')) {
      options.logo = arg.split('=')[1];
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${c.bold}Episciences - Journal Addition & Conversion Assistant${c.reset}

${c.bold}Usage:${c.reset}
  npm run add-journal [options]
  node scripts/add-journal.mjs [options]

${c.bold}Modes:${c.reset}
  --create                  Create a new journal configuration (default mode)
  --convert [preprod-code]  Convert an existing preproduction journal into production

${c.bold}Options:${c.reset}
  -c, --code <journal-code> Unique journal code (e.g. 'my-journal', lowercase, digits, hyphens)
  -t, --template <name>     Template journal (e.g. 'arima') or '.env.example' (default)
  -e, --env <target>        Target environment: 'prod', 'preprod', or 'both' (default: 'both')
  --color <#hex>            Primary brand hex color (e.g. '#248386').
                            ${c.dim}If omitted: a random distinct, non-fluorescent color is generated.${c.reset}
  --text-color <#hex>       Text color on primary background.
                            ${c.dim}If omitted: automatically calculated for WCAG 2.2 AA compliance.${c.reset}
  --langs <list>            Accepted languages comma-separated (default: 'en,fr')
  --default-lang <lang>     Default language (default: 'en')
  --logo <path/to/file.svg> Path to local SVG file for journal logo
                            ${c.dim}If omitted: external-assets/logos/logo-default.svg is used by default.${c.reset}
  -s, --set-current         Set NEXT_PUBLIC_JOURNAL_RVCODE in root .env.local for immediate testing
  -d, --dev                 Automatically launch 'npm run dev' upon completion
  --skip-api-check          Bypass database existence verification against the Episciences API
  -y, --yes                 Non-interactive mode: accept defaults without prompting
  -h, --help                Show this help message

${c.bold}Examples:${c.reset}
  # 1. Fully interactive mode (recommended)
  npm run add-journal

  # 2. Fast non-interactive creation with auto-generated distinct color & default logo
  npm run add-journal -- --code my-journal --env both -y

  # 3. Direct conversion from preproduction to production
  npm run add-journal -- --convert rdm-preprod -y
`);
}

// -----------------------------------------------------------------------------
// Interactive Prompts
// -----------------------------------------------------------------------------

async function askQuestion(rl, promptText, defaultValue = '') {
  const displayPrompt = defaultValue ? `${promptText} [${defaultValue}]: ` : `${promptText}: `;
  const answer = (await rl.question(displayPrompt)).trim();
  return answer || defaultValue;
}

async function askConfirmation(rl, promptText, defaultYes = true) {
  const hint = defaultYes ? '(Y/n)' : '(y/N)';
  const answer = (await rl.question(`${promptText} ${hint} `)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui';
}

// -----------------------------------------------------------------------------
// Main Workflows
// -----------------------------------------------------------------------------

async function handleConversion(cli, rl) {
  console.log(
    `\n${c.bold}${c.magenta}=== Convert a Preproduction Journal to Production ===${c.reset}\n`
  );

  const preprodJournals = getExistingPreprodJournals();
  if (preprodJournals.length === 0) {
    console.log(
      `${c.yellow}⚠️ No preproduction (-preprod) journals found in external-assets/.${c.reset}`
    );
    return null;
  }

  let sourcePreprod = cli.convertCode;
  if (!sourcePreprod || !preprodJournals.includes(sourcePreprod)) {
    if (cli.yes && sourcePreprod) {
      console.error(
        `${c.red}Error: Preproduction journal '${sourcePreprod}' was not found.${c.reset}`
      );
      process.exit(1);
    }

    console.log(`${c.cyan}Available preproduction journals:${c.reset}`);
    preprodJournals.forEach((j, idx) => {
      console.log(`  ${c.dim}${idx + 1}.${c.reset} ${j}`);
    });

    while (!sourcePreprod || !preprodJournals.includes(sourcePreprod)) {
      const choice = await askQuestion(
        rl,
        `Select the number or code of the preproduction journal`
      );
      const num = parseInt(choice, 10);
      if (!isNaN(num) && num >= 1 && num <= preprodJournals.length) {
        sourcePreprod = preprodJournals[num - 1];
      } else if (preprodJournals.includes(choice)) {
        sourcePreprod = choice;
      } else {
        console.log(`${c.red}Invalid selection.${c.reset}`);
      }
    }
  }

  const preprodEnvFile = path.join(ASSETS_DIR, `.env.local.${sourcePreprod}`);
  const preprodEnv = parseEnvFile(preprodEnvFile);
  const baseContent = fs.readFileSync(preprodEnvFile, 'utf-8');

  // Determine production code
  const defaultProdCode = sourcePreprod.replace(/-preprod$/, '');
  let prodCode = cli.code || defaultProdCode;

  if (!cli.yes) {
    prodCode = await askQuestion(rl, 'Production journal code', prodCode);
  }

  if (!JOURNAL_ID_REGEX.test(prodCode)) {
    console.error(
      `${c.red}Error: Code '${prodCode}' is invalid (must match /^[a-z0-9-]{2,50}$/).${c.reset}`
    );
    process.exit(1);
  }

  // Verify that target prodCode exists in prod database
  console.log(`\n${c.bold}Verifying journal existence in production database:${c.reset}`);
  const prodApiRes = await checkAndValidateApi(prodCode, false, cli.skipApiCheck);
  if (!prodApiRes.ok) {
    console.error(
      `\n${c.red}Aborted: Journal '${prodCode}' has not been created in the production database yet.${c.reset}`
    );
    console.log(
      `${c.yellow}The journal must first be initialized in the Episciences production database before conversion.${c.reset}\n`
    );
    process.exit(1);
  }

  const targetEnvFile = path.join(ASSETS_DIR, `.env.local.${prodCode}`);
  // Existence is detected from the directory listing (not a check on targetEnvFile itself);
  // the final write uses the 'wx' flag unless overwrite was allowed, so it fails safely
  // if the file appeared in the meantime.
  const targetExists = getExistingJournals().includes(prodCode);
  let allowOverwrite = cli.yes;
  if (targetExists && !cli.yes) {
    const overwrite = await askConfirmation(
      rl,
      `${c.yellow}File .env.local.${prodCode} already exists. Overwrite?${c.reset}`,
      false
    );
    if (!overwrite) {
      console.log('Operation cancelled.');
      return null;
    }
    allowOverwrite = true;
  }

  // Color handling
  let primaryColor = cli.color || preprodEnv['NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR'];
  if (!cli.yes && !cli.color) {
    const keepColor = await askConfirmation(
      rl,
      `Keep preproduction primary color (${primaryColor || 'undefined'})?`,
      true
    );
    if (!keepColor) {
      const existingColors = getExistingColors();
      const suggestedColor = generateDistinctRandomColor(existingColors);
      const userColor = await askQuestion(
        rl,
        `Enter new primary hex color (leave empty for ${suggestedColor})`,
        suggestedColor
      );
      primaryColor = userColor;
    }
  }

  let primaryTextColor = cli.textColor;
  if (!primaryTextColor) {
    primaryTextColor = getBestTextColor(primaryColor);
  }

  // Logo handling
  const preprodLogoPath = path.join(LOGOS_DIR, `logo-${sourcePreprod}.svg`);
  const prodLogoPath = path.join(LOGOS_DIR, `logo-${prodCode}.svg`);
  let logoSource = cli.logo;

  if (!logoSource && !fs.existsSync(prodLogoPath)) {
    if (fs.existsSync(preprodLogoPath)) {
      logoSource = preprodLogoPath;
    }
  }

  if (!cli.yes && !cli.logo && !fs.existsSync(prodLogoPath)) {
    const hint = logoSource
      ? ` (leave empty to reuse ${path.basename(logoSource)})`
      : ` (leave empty to use logo-default.svg)`;
    const customLogo = await askQuestion(rl, `Path to production SVG logo${hint}`, '');
    if (customLogo) logoSource = customLogo;
  }

  // Summary
  console.log(`\n${c.bold}Conversion summary:${c.reset}`);
  console.log(`  - Source preprod journal : ${c.cyan}${sourcePreprod}${c.reset}`);
  console.log(`  - Target prod journal    : ${c.green}${prodCode}${c.reset}`);
  console.log(`  - Primary color          : ${primaryColor}`);
  console.log(`  - Text color             : ${primaryTextColor}`);
  console.log(`  - Endpoints              : Production gateway (api.episciences.org)`);
  console.log(`  - Indexing               : true`);

  if (!cli.yes) {
    const proceed = await askConfirmation(rl, 'Confirm creation of production journal?', true);
    if (!proceed) {
      console.log('Operation cancelled.');
      return null;
    }
  }

  // Build prod env
  const prodContent = buildEnvContent({
    baseEnvContent: baseContent,
    journalCode: prodCode,
    isPreprod: false,
    primaryColor,
    primaryTextColor,
  });

  try {
    fs.writeFileSync(targetEnvFile, prodContent, {
      encoding: 'utf-8',
      flag: allowOverwrite ? 'w' : 'wx',
    });
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.error(
        `${c.red}Error: .env.local.${prodCode} was created concurrently; aborting without overwriting.${c.reset}`
      );
      process.exit(1);
    }
    throw err;
  }
  console.log(`\n  ${c.green}✓${c.reset} File created: external-assets/.env.local.${prodCode}`);

  if (!fs.existsSync(prodLogoPath) || cli.logo) {
    handleLogoCopy(logoSource, `logo-${prodCode}.svg`);
  }

  updateJournalsTxt([prodCode]);
  console.log(`  ${c.green}✓${c.reset} ${prodCode} registered in journals.txt`);

  runPostSync();
  console.log(
    `\n${c.bold}${c.green}🎉 Conversion completed successfully for ${prodCode}!${c.reset}\n`
  );

  let configuredCode = null;
  if (!cli.yes) {
    const setLocal = await askConfirmation(
      rl,
      `Would you like to set NEXT_PUBLIC_JOURNAL_RVCODE=${prodCode} in .env.local for immediate testing?`,
      true
    );
    if (setLocal) {
      setLocalEnvJournal(prodCode);
      configuredCode = prodCode;
    }
  } else if (cli.setCurrent) {
    setLocalEnvJournal(prodCode);
    configuredCode = prodCode;
  }

  return configuredCode;
}

async function handleCreation(cli, rl) {
  console.log(`\n${c.bold}${c.blue}=== Create a New Journal ===${c.reset}\n`);

  // 1. Journal code & Target environment with API validation
  let baseCode = '';
  let prodCode = '';
  let preprodCode = '';
  let envTarget = cli.env;

  while (true) {
    let journalCode = cli.code;
    while (!journalCode || !JOURNAL_ID_REGEX.test(journalCode)) {
      if (journalCode && !JOURNAL_ID_REGEX.test(journalCode)) {
        console.log(
          `${c.red}Invalid code. Only lowercase letters, digits, and hyphens allowed (2 to 50 characters).${c.reset}`
        );
      }
      if (cli.yes && !journalCode) {
        console.error(`${c.red}Error: --code is required in non-interactive mode (-y).${c.reset}`);
        process.exit(1);
      }
      journalCode = await askQuestion(rl, 'Unique journal code (e.g. new-journal)');
    }

    baseCode = journalCode.endsWith('-preprod') ? journalCode.slice(0, -8) : journalCode;
    prodCode = baseCode;
    preprodCode = `${baseCode}-preprod`;

    // 2. Target environment
    const validEnvs = ['prod', 'preprod', 'both'];
    if (!envTarget || !validEnvs.includes(envTarget)) {
      if (cli.yes) {
        envTarget = 'both';
      } else {
        console.log(`\nTarget environment:`);
        console.log(`  1. Both (Production and Preproduction) [recommended]`);
        console.log(`  2. Production only`);
        console.log(`  3. Preproduction only`);
        const choice = await askQuestion(rl, 'Your choice (1/2/3)', '1');
        if (choice === '2' || choice === 'prod') envTarget = 'prod';
        else if (choice === '3' || choice === 'preprod') envTarget = 'preprod';
        else envTarget = 'both';
      }
    }

    // 3. API existence verification
    console.log(`\n${c.bold}Verifying journal existence in database API:${c.reset}`);
    let prodOk = true;
    let preprodOk = true;

    if (envTarget === 'prod' || envTarget === 'both') {
      const res = await checkAndValidateApi(prodCode, false, cli.skipApiCheck);
      prodOk = res.ok;
    }

    if (envTarget === 'preprod' || envTarget === 'both') {
      const res = await checkAndValidateApi(preprodCode, true, cli.skipApiCheck);
      preprodOk = res.ok;
    }

    if (envTarget === 'both' && !prodOk && preprodOk) {
      if (cli.yes) {
        console.error(
          `\n${c.red}Aborted: Journal '${prodCode}' was not found on the production API.${c.reset}`
        );
        console.error(
          `${c.yellow}To create the preproduction version only, use '--env preprod'.${c.reset}\n`
        );
        process.exit(1);
      }
      const switchPreprod = await askConfirmation(
        rl,
        `The journal only exists in preproduction. Would you like to create the PREPRODUCTION version only (${preprodCode})?`,
        true
      );
      if (switchPreprod) {
        envTarget = 'preprod';
        break;
      }
    } else if (envTarget === 'both' && prodOk && !preprodOk) {
      if (cli.yes) {
        console.error(
          `\n${c.red}Aborted: Journal '${preprodCode}' was not found on the preproduction API.${c.reset}`
        );
        console.error(
          `${c.yellow}To create the production version only, use '--env prod'.${c.reset}\n`
        );
        process.exit(1);
      }
      const switchProd = await askConfirmation(
        rl,
        `The journal only exists in production. Would you like to create the PRODUCTION version only (${prodCode})?`,
        true
      );
      if (switchProd) {
        envTarget = 'prod';
        break;
      }
    } else if (
      (envTarget === 'prod' && !prodOk) ||
      (envTarget === 'preprod' && !preprodOk) ||
      (envTarget === 'both' && !prodOk && !preprodOk)
    ) {
      if (cli.yes) {
        console.error(
          `\n${c.red}Aborted: Journal not found in database for the requested environment.${c.reset}\n`
        );
        process.exit(1);
      }
      const retry = await askConfirmation(
        rl,
        `Journal does not exist in database. Would you like to try with another journal code?`,
        true
      );
      if (!retry) {
        console.log('Operation cancelled.');
        return null;
      }
      cli.code = null;
      envTarget = cli.env;
      continue;
    } else {
      break;
    }
  }

  // 3. Template selection
  const existingJournals = getExistingJournals().filter(j => !j.endsWith('-preprod'));
  let baseContent = '';
  let templateName = cli.template;

  if (templateName) {
    const tmplFile =
      templateName === '.env.example'
        ? ENV_EXAMPLE
        : path.join(ASSETS_DIR, `.env.local.${templateName}`);
    if (fs.existsSync(tmplFile)) {
      baseContent = fs.readFileSync(tmplFile, 'utf-8');
    } else {
      console.warn(
        `${c.yellow}⚠️ Template '${templateName}' not found. Using .env.example by default.${c.reset}`
      );
      baseContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
      templateName = '.env.example';
    }
  } else if (cli.yes) {
    baseContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
    templateName = '.env.example';
  } else {
    console.log(`\nConfiguration template:`);
    console.log(`  1. external-assets/.env.example [standard]`);
    console.log(`  2. Start from an existing journal as a template`);
    const tmplChoice = await askQuestion(rl, 'Your choice (1/2)', '1');

    if (tmplChoice === '2') {
      console.log(
        `${c.dim}Available journals: ${existingJournals.slice(0, 15).join(', ')}...${c.reset}`
      );
      const chosenJournal = await askQuestion(
        rl,
        'Template journal name',
        existingJournals[0] || 'arima'
      );
      const chosenFile = path.join(ASSETS_DIR, `.env.local.${chosenJournal}`);
      if (fs.existsSync(chosenFile)) {
        baseContent = fs.readFileSync(chosenFile, 'utf-8');
        templateName = chosenJournal;
      } else {
        console.log(`${c.yellow}File not found, falling back to .env.example.${c.reset}`);
        baseContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
        templateName = '.env.example';
      }
    } else {
      baseContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
      templateName = '.env.example';
    }
  }

  // 4. Color selection
  const existingColors = getExistingColors();
  let primaryColor = cli.color;

  if (!primaryColor) {
    const suggestedColor = generateDistinctRandomColor(existingColors);
    if (cli.yes) {
      primaryColor = suggestedColor;
    } else {
      const colorInput = await askQuestion(
        rl,
        `Primary hex color (leave empty for distinct random color: ${suggestedColor})`,
        suggestedColor
      );
      primaryColor = colorInput.trim();
      if (!hexToRgb(primaryColor)) {
        console.log(`${c.yellow}Invalid color format. Using ${suggestedColor}.${c.reset}`);
        primaryColor = suggestedColor;
      }
    }
  }

  let primaryTextColor = cli.textColor;
  if (!primaryTextColor) {
    primaryTextColor = getBestTextColor(primaryColor);
    if (!cli.yes) {
      primaryTextColor = await askQuestion(
        rl,
        `Text color on primary background (leave empty for WCAG calculation: ${primaryTextColor})`,
        primaryTextColor
      );
    }
  }

  // 5. Languages
  let acceptedLanguages = cli.languages;
  let defaultLanguage = cli.defaultLanguage;
  if (!cli.yes) {
    if (!acceptedLanguages) {
      acceptedLanguages = await askQuestion(rl, 'Accepted languages (comma-separated)', 'en,fr');
    }
    if (!defaultLanguage) {
      defaultLanguage = await askQuestion(rl, 'Default language', 'en');
    }
  } else {
    acceptedLanguages = acceptedLanguages || 'en,fr';
    defaultLanguage = defaultLanguage || 'en';
  }

  // 6. Logo
  let logoPath = cli.logo;
  if (!cli.yes && !logoPath) {
    const logoInput = await askQuestion(
      rl,
      'Path to local SVG logo (leave empty to use external-assets/logos/logo-default.svg)',
      ''
    );
    if (logoInput) logoPath = logoInput;
  }

  // Summary
  console.log(`\n${c.bold}Creation summary:${c.reset}`);
  console.log(`  - Base code         : ${c.green}${baseCode}${c.reset}`);
  console.log(`  - Target environment: ${envTarget}`);
  if (envTarget === 'prod' || envTarget === 'both') {
    console.log(`  - Production code   : ${prodCode}`);
  }
  if (envTarget === 'preprod' || envTarget === 'both') {
    console.log(`  - Preproduction code: ${preprodCode}`);
  }
  console.log(`  - Template source   : ${templateName}`);
  console.log(`  - Primary color     : ${primaryColor}`);
  console.log(`  - Text color        : ${primaryTextColor}`);
  console.log(`  - Languages         : ${acceptedLanguages} (default: ${defaultLanguage})`);

  if (!cli.yes) {
    const proceed = await askConfirmation(rl, 'Confirm creation?', true);
    if (!proceed) {
      console.log('Operation cancelled.');
      return null;
    }
  }

  // Generate files
  const codesCreated = [];

  if (envTarget === 'prod' || envTarget === 'both') {
    const prodFile = path.join(ASSETS_DIR, `.env.local.${prodCode}`);
    const content = buildEnvContent({
      baseEnvContent: baseContent,
      journalCode: prodCode,
      isPreprod: false,
      primaryColor,
      primaryTextColor,
      acceptedLanguages,
      defaultLanguage,
    });
    fs.writeFileSync(prodFile, content, 'utf-8');
    codesCreated.push(prodCode);
    console.log(`\n  ${c.green}✓${c.reset} File created: external-assets/.env.local.${prodCode}`);

    handleLogoCopy(logoPath, `logo-${prodCode}.svg`);
  }

  if (envTarget === 'preprod' || envTarget === 'both') {
    const preprodFile = path.join(ASSETS_DIR, `.env.local.${preprodCode}`);
    const content = buildEnvContent({
      baseEnvContent: baseContent,
      journalCode: preprodCode,
      isPreprod: true,
      primaryColor,
      primaryTextColor,
      acceptedLanguages,
      defaultLanguage,
    });
    fs.writeFileSync(preprodFile, content, 'utf-8');
    codesCreated.push(preprodCode);
    console.log(`  ${c.green}✓${c.reset} File created: external-assets/.env.local.${preprodCode}`);

    handleLogoCopy(logoPath, `logo-${preprodCode}.svg`);
  }

  updateJournalsTxt(codesCreated);
  console.log(`  ${c.green}✓${c.reset} journals.txt updated.`);

  runPostSync();
  console.log(
    `\n${c.bold}${c.green}🎉 Journal(s) created successfully: ${codesCreated.join(', ')}!${c.reset}\n`
  );

  let configuredCode = null;
  if (!cli.yes) {
    if (codesCreated.length === 1) {
      const targetCode = codesCreated[0];
      const setLocal = await askConfirmation(
        rl,
        `Would you like to set NEXT_PUBLIC_JOURNAL_RVCODE=${targetCode} in .env.local for immediate testing?`,
        true
      );
      if (setLocal) {
        setLocalEnvJournal(targetCode);
        configuredCode = targetCode;
      }
    } else if (codesCreated.length > 1) {
      console.log(`\n${c.bold}Local test configuration:${c.reset}`);
      console.log(`  1. Set production version (${prodCode}) in .env.local [recommended]`);
      console.log(`  2. Set preproduction version (${preprodCode}) in .env.local`);
      console.log(`  3. Do not modify .env.local`);
      const choice = await askQuestion(rl, 'Your choice (1/2/3)', '1');
      if (choice === '1' || choice === prodCode) {
        setLocalEnvJournal(prodCode);
        configuredCode = prodCode;
      } else if (choice === '2' || choice === preprodCode) {
        setLocalEnvJournal(preprodCode);
        configuredCode = preprodCode;
      }
    }
  } else if (cli.setCurrent && codesCreated.length > 0) {
    setLocalEnvJournal(codesCreated[0]);
    configuredCode = codesCreated[0];
  }

  return configuredCode;
}

// -----------------------------------------------------------------------------
// Entry Point
// -----------------------------------------------------------------------------

async function main() {
  const cli = parseCliArgs();

  if (cli.help) {
    showHelp();
    process.exit(0);
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(
      `${c.red}Error: Directory 'external-assets' not found. Make sure it exists at project root.${c.reset}`
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    let mode = cli.mode;

    if (!mode) {
      if (cli.convertCode) {
        mode = 'convert';
      } else if (cli.yes) {
        mode = 'create';
      } else {
        console.log(`\n${c.bold}What would you like to do?${c.reset}`);
        console.log(`  1. Add a new journal (production / preproduction)`);
        console.log(`  2. Convert a preproduction journal (-preprod) to production`);
        const choice = await askQuestion(rl, 'Your choice (1/2)', '1');
        mode = choice === '2' ? 'convert' : 'create';
      }
    }

    let configuredCode = null;
    if (mode === 'convert') {
      configuredCode = await handleConversion(cli, rl);
    } else {
      configuredCode = await handleCreation(cli, rl);
    }

    let shouldLaunchDev = cli.dev;
    if (configuredCode && !cli.yes && !cli.dev) {
      shouldLaunchDev = await askConfirmation(
        rl,
        `Would you like to start the development server now (npm run dev)?`,
        true
      );
    }

    if (shouldLaunchDev) {
      console.log(`\n${c.bold}${c.green}🚀 Starting npm run dev...${c.reset}`);
      console.log(`  ${c.cyan}Open http://localhost:5000 in your browser${c.reset}\n`);
      rl.close();
      execSync('npm run dev', { stdio: 'inherit', cwd: ROOT_DIR });
      return;
    } else if (configuredCode) {
      console.log(`\n${c.bold}To test your journal whenever you are ready:${c.reset}`);
      console.log(`  1. Run: ${c.cyan}npm run dev${c.reset}`);
      console.log(`  2. Open: ${c.cyan}http://localhost:5000${c.reset}\n`);
    }
  } catch (err) {
    console.error(`\n${c.red}An error occurred:${c.reset}`, err.message || err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
