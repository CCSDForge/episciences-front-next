#!/usr/bin/env node

/**
 * Targeted resource rebuild script
 * Regenerates a specific resource (article, volume, section, static-page) or performs a full rebuild
 * for a given journal without rebuilding the entire static site.
 *
 * Usage:
 *   node scripts/rebuild-resource.js --journal <code> --type <type> [--id <id>] [--page <page>]
 *
 * Arguments:
 *   --journal <code>  Journal code (e.g., 'epijinfo', 'dmtcs')
 *   --type <type>     Resource type: 'article', 'volume', 'section', 'static-page', or 'full'
 *   --id <id>         Resource ID (required for article/volume/section, not for full/static-page)
 *   --page <page>     Page name (required for static-page, e.g., 'about', 'news', 'home')
 *
 * Examples:
 *   node scripts/rebuild-resource.js --journal epijinfo --type article --id 12345
 *   node scripts/rebuild-resource.js --journal dmtcs --type static-page --page about
 *   node scripts/rebuild-resource.js --journal dmtcs --type full
 *
 * Exit codes:
 *   0 - Success
 *   1 - Build error (Next.js build failed)
 *   2 - API error (unable to fetch resource data)
 *   3 - Invalid arguments or configuration
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // For loading base .env if needed

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      parsed[key] = value;
      i++; // Skip next arg as it's the value
    }
  }

  return parsed;
}

const args = parseArgs();
const { journal: journalCode, type: resourceType, id: resourceId, page: pageName } = args;

// Validate arguments
if (!journalCode) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: 'Missing required argument: --journal'
  }));
  console.error('\nUsage: node scripts/rebuild-resource.js --journal <code> --type <type> [--id <id>]');
  process.exit(3);
}

if (!resourceType) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: 'Missing required argument: --type'
  }));
  console.error('\nValid types: article, volume, section, full');
  process.exit(3);
}

const validTypes = ['article', 'volume', 'section', 'static-page', 'full'];
if (!validTypes.includes(resourceType)) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: `Invalid resource type: ${resourceType}. Must be one of: ${validTypes.join(', ')}`
  }));
  process.exit(3);
}

if (resourceType === 'static-page' && !pageName) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: `Page name is required for type 'static-page'`
  }));
  console.error('\nUsage: node scripts/rebuild-resource.js --journal <code> --type static-page --page <page>');
  process.exit(3);
}

if (['article', 'volume', 'section'].includes(resourceType) && !resourceId) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: `Resource ID is required for type '${resourceType}'`
  }));
  console.error('\nUsage: node scripts/rebuild-resource.js --journal <code> --type <type> --id <id>');
  process.exit(3);
}

// Check if journal environment file exists
const envFilePath = path.join(process.cwd(), 'external-assets', `.env.local.${journalCode}`);
if (!fs.existsSync(envFilePath)) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'validation',
    message: `Journal environment file not found: ${envFilePath}`,
    journalCode
  }));
  process.exit(3);
}

// Log build start
console.log(JSON.stringify({
  type: 'build_start',
  phase: 'initialization',
  journalCode,
  resourceType,
  resourceId: resourceId || null,
  pageName: pageName || null,
  timestamp: new Date().toISOString()
}));

// Load journal-specific environment variables
const envConfig = require('dotenv').config({ path: envFilePath });
if (envConfig.error) {
  console.error(JSON.stringify({
    type: 'error',
    phase: 'env_loading',
    message: `Failed to load environment file: ${envConfig.error.message}`,
    journalCode
  }));
  process.exit(3);
}

console.log(JSON.stringify({
  type: 'env_loaded',
  phase: 'initialization',
  message: `Environment loaded for journal: ${journalCode}`
}));

// Build environment variables for the Next.js build
const buildEnv = {
  ...process.env,
  ...envConfig.parsed,
  NEXT_PUBLIC_JOURNAL_CODE: journalCode,
  NEXT_PUBLIC_JOURNAL_RVCODE: journalCode,
};

// Set targeted build environment variable based on resource type
if (resourceType === 'article') {
  buildEnv.ONLY_BUILD_ARTICLE_ID = resourceId;
} else if (resourceType === 'volume') {
  buildEnv.ONLY_BUILD_VOLUME_ID = resourceId;
} else if (resourceType === 'section') {
  buildEnv.ONLY_BUILD_SECTION_ID = resourceId;
} else if (resourceType === 'static-page') {
  buildEnv.ONLY_BUILD_STATIC_PAGE = pageName;
}
// For 'full' type, no targeted env var is set

// Prepare environment string for cross-platform compatibility
const envVars = Object.entries(buildEnv)
  .map(([key, value]) => `${key}="${value}"`)
  .join(' ');

console.log(JSON.stringify({
  type: 'build_config',
  phase: 'preparation',
  message: resourceType === 'full'
    ? `Building complete journal: ${journalCode}`
    : resourceType === 'static-page'
    ? `Building static page ${pageName} for journal: ${journalCode}`
    : `Building ${resourceType} ${resourceId} for journal: ${journalCode}`,
  config: {
    journalCode,
    resourceType,
    resourceId: resourceId || 'N/A',
    pageName: pageName || 'N/A',
    targetedBuild: resourceType !== 'full'
  }
}));

// Measure build time
const startTime = Date.now();

// Execute the Next.js build with the appropriate environment
const buildCommand = `npx next build`;

console.log(JSON.stringify({
  type: 'build_executing',
  phase: 'building',
  message: 'Executing Next.js build...'
}));

const childProcess = exec(buildCommand, {
  env: buildEnv,
  maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large builds
  cwd: process.cwd()
});

// Stream stdout
childProcess.stdout.on('data', (data) => {
  // Forward Next.js build output, but filter some verbose logs if needed
  const output = data.toString().trim();
  if (output) {
    // Check for API errors in build output
    if (output.includes('ECONNREFUSED') || output.includes('ETIMEDOUT') || output.includes('fetch failed')) {
      console.error(JSON.stringify({
        type: 'api_error',
        phase: 'building',
        message: 'API connection error detected during build',
        details: output
      }));
    }
    console.log(output);
  }
});

// Stream stderr
childProcess.stderr.on('data', (data) => {
  const error = data.toString().trim();
  if (error) {
    console.error(error);
  }
});

// Handle build completion
childProcess.on('close', (code) => {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  if (code === 0) {
    // Build succeeded
    let outputPath;
    if (resourceType === 'full') {
      outputPath = `dist/${journalCode}`;
    } else if (resourceType === 'static-page') {
      outputPath = `dist/${journalCode}/${pageName}`;
    } else {
      outputPath = `dist/${journalCode}/${getResourcePath(resourceType)}/${resourceId}`;
    }

    console.log(JSON.stringify({
      type: 'build_success',
      phase: 'completed',
      message: `Build completed successfully in ${duration}s`,
      journalCode,
      resourceType,
      resourceId: resourceId || null,
      pageName: pageName || null,
      duration: `${duration}s`,
      outputPath,
      timestamp: new Date().toISOString()
    }));

    process.exit(0);
  } else {
    // Build failed
    console.error(JSON.stringify({
      type: 'build_failed',
      phase: 'building',
      message: `Build failed with exit code ${code}`,
      journalCode,
      resourceType,
      resourceId: resourceId || null,
      pageName: pageName || null,
      duration: `${duration}s`,
      exitCode: code,
      timestamp: new Date().toISOString()
    }));

    // Exit with code 1 for build errors
    process.exit(1);
  }
});

// Handle unexpected errors
childProcess.on('error', (error) => {
  console.error(JSON.stringify({
    type: 'process_error',
    phase: 'building',
    message: `Unexpected process error: ${error.message}`,
    error: error.toString(),
    timestamp: new Date().toISOString()
  }));
  process.exit(1);
});

// Helper function to get resource path in dist directory
function getResourcePath(type) {
  const paths = {
    'article': 'articles',
    'volume': 'volumes',
    'section': 'sections'
  };
  return paths[type] || type;
}
