import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function findScssFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findScssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Two cheap, repo-wide guard rails for the light/dark token architecture
 * (tmp/PLAN_DARK_MODE.md §6 "Deux garde-fous bon marché"):
 *
 * 1. No token gets registered via `@property` as a `<color>` — light-dark()
 *    resolves at computed-value time, so a registered inherits:true color
 *    freezes a branch and breaks any `color-scheme` island (see
 *    docs/ACCESSIBLE_COLOR_SYSTEM.md).
 * 2. No `var(--foo)` in any .scss file references a custom property that is
 *    never declared anywhere — this is exactly what would have caught the 5
 *    variables that were used but never declared before this migration.
 */

const SCSS_FILES = findScssFiles(path.join(process.cwd(), 'src'));

// theme.scss declares these dynamically via `--#{$token}` / `--#{$token}-light` /
// `--#{$token}-dark` inside a SCSS @each loop (the @supports fallback block) —
// a plain-text scan can't see through the interpolation, so they're allowlisted
// here instead of taught to a full SCSS parser for a two-guard-rail test.
const DYNAMIC_THEME_TOKENS = [
  'primary',
  'primary-text',
  'primary-border',
  'button-text-on-primary-bg',
  'focus-color',
  'focus-color-on-primary',
  'focus-color-on-dark',
  'surface',
  'surface-2',
  'surface-raised',
  'text-strong',
  'text',
  'text-muted',
  'border',
];
const ALLOWLISTED_DECLARATIONS = new Set([
  ...DYNAMIC_THEME_TOKENS.flatMap(token => [token, `${token}-light`, `${token}-dark`]),
  // Set inline, per-toast, by react-toastify itself at runtime — never declared statically.
  'toastify-timer',
]);

describe('theme token guard rails', () => {
  it('never registers a token as @property with a <color> syntax', () => {
    const offenders: string[] = [];

    for (const file of SCSS_FILES) {
      const content = readFileSync(file, 'utf-8');
      // A conservative scan: any @property block whose syntax mentions <color>.
      const propertyBlocks = content.matchAll(/@property\s+--[\w-]+\s*\{([^}]*)\}/g);
      for (const match of propertyBlocks) {
        if (/syntax\s*:\s*['"]<color>['"]/.test(match[0])) {
          offenders.push(`${path.relative(process.cwd(), file)}: ${match[0].slice(0, 80)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('never references an undeclared CSS custom property', () => {
    const declared = new Set(ALLOWLISTED_DECLARATIONS);
    const used = new Map<string, string>(); // name -> first file it's used in

    for (const file of SCSS_FILES) {
      const content = readFileSync(file, 'utf-8');

      for (const match of content.matchAll(/--([a-zA-Z][\w-]*)\s*:/g)) {
        declared.add(match[1]);
      }
      for (const match of content.matchAll(/var\(\s*--([a-zA-Z][\w-]*)/g)) {
        if (!used.has(match[1])) {
          used.set(match[1], path.relative(process.cwd(), file));
        }
      }
    }

    const undeclared = [...used.entries()].filter(([name]) => !declared.has(name));

    expect(undeclared).toEqual([]);
  });
});
