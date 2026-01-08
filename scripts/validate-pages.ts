#!/usr/bin/env tsx

/**
 * ISR Page Configuration Validation Script
 *
 * Verifies that each page in the application has a proper ISR configuration.
 * Each page must have either:
 * - export const revalidate (ISR with automatic revalidation)
 * - await connection() (fully dynamic rendering)
 *
 * Usage:
 *   npm run validate:pages
 *   tsx scripts/validate-pages.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PAGES_DIR = 'src/app/sites/[journalId]/[lang]';
const BASE_PATH = process.cwd();

interface ValidationResult {
  path: string;
  hasRevalidate: boolean;
  hasConnection: boolean;
  isValid: boolean;
  reason?: string;
}

/**
 * Recursively find all page.tsx files in a directory
 */
function findPageFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (!file.startsWith('.') && !file.startsWith('_')) {
        findPageFiles(filePath, fileList);
      }
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Validate a single page file
 */
function validatePage(filePath: string): ValidationResult {
  const content = readFileSync(filePath, 'utf-8');

  // Check for revalidate export
  const hasRevalidate = /export\s+const\s+revalidate\s*=/.test(content);

  // Check for connection() usage
  const hasConnection = /await\s+connection\(\)/.test(content);

  // A page is valid if it has at least one of these configurations
  const isValid = hasRevalidate || hasConnection;

  let reason: string | undefined;
  if (!isValid) {
    reason = 'Missing ISR config (no revalidate or connection())';
  }

  return {
    path: filePath,
    hasRevalidate,
    hasConnection,
    isValid,
    reason,
  };
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating ISR configuration for all pages...\n');

  const pagesDir = join(BASE_PATH, PAGES_DIR);
  const pageFiles = findPageFiles(pagesDir);

  if (pageFiles.length === 0) {
    console.log('⚠️  No page.tsx files found!');
    process.exit(1);
  }

  console.log(`Found ${pageFiles.length} page files to validate\n`);

  const results: ValidationResult[] = pageFiles.map(validatePage);
  const invalidPages = results.filter(r => !r.isValid);
  const revalidatePages = results.filter(r => r.hasRevalidate);
  const dynamicPages = results.filter(r => r.hasConnection);

  // Display statistics
  console.log('📊 Statistics:');
  console.log(`   Total pages: ${results.length}`);
  console.log(`   With revalidate: ${revalidatePages.length}`);
  console.log(`   With connection(): ${dynamicPages.length}`);
  console.log(`   Invalid: ${invalidPages.length}\n`);

  // Display invalid pages
  if (invalidPages.length > 0) {
    console.error('❌ Pages with missing ISR configuration:\n');
    invalidPages.forEach(page => {
      const relativePath = page.path.replace(BASE_PATH + '/', '');
      console.error(`   ${relativePath}`);
      if (page.reason) {
        console.error(`      → ${page.reason}`);
      }
    });
    console.error('');
    console.error('💡 Fix: Each page must have either:');
    console.error('   - export const revalidate = <seconds>');
    console.error('   - await connection() for dynamic rendering');
    console.error('');
    console.error('📖 See docs/ISR_STRATEGY.md for detailed guidance\n');
    process.exit(1);
  }

  // Success
  console.log('✅ All pages have valid ISR configuration!');
  console.log('');
  console.log('📋 Configuration Summary:');

  // Group pages by revalidate value
  const revalidateGroups: Record<string, string[]> = {};
  results.forEach(result => {
    if (result.hasRevalidate) {
      const content = readFileSync(result.path, 'utf-8');
      const match = content.match(/export\s+const\s+revalidate\s*=\s*([^;\n]+)/);
      if (match) {
        const value = match[1].trim();
        if (!revalidateGroups[value]) {
          revalidateGroups[value] = [];
        }
        revalidateGroups[value].push(result.path.replace(BASE_PATH + '/', ''));
      }
    }
  });

  Object.entries(revalidateGroups).forEach(([value, paths]) => {
    let label = value;
    if (value === 'false') {
      label = 'false (static)';
    } else if (value === '3600') {
      label = '3600 (1h)';
    } else if (value === '86400') {
      label = '86400 (24h)';
    } else if (value === '604800') {
      label = '604800 (7d)';
    }

    console.log(`\n   revalidate = ${label}:`);
    paths.forEach(path => {
      console.log(`      - ${path}`);
    });
  });

  if (dynamicPages.length > 0) {
    console.log('\n   Dynamic (connection()):');
    dynamicPages.forEach(page => {
      const relativePath = page.path.replace(BASE_PATH + '/', '');
      console.log(`      - ${relativePath}`);
    });
  }

  console.log('\n✨ Validation complete!\n');
  process.exit(0);
}

// Run validation
main();
