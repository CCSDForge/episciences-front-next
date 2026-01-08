/**
 * Copy journal logos from external-assets to public directory
 *
 * This script copies all SVG logos from the external-assets/logos directory
 * (a separate private Git repository) to the public/logos directory.
 * This ensures license compliance by not committing journal-specific logos
 * to the main codebase.
 *
 * Run automatically via:
 * - predev script (before npm run dev)
 * - prebuild script (before npm run build)
 *
 * Or manually with: npm run copy-logos
 */

const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../external-assets/logos');
const TARGET_DIR = path.join(__dirname, '../public/logos');

async function copyLogos() {
  try {
    // Ensure target directory exists
    await fs.ensureDir(TARGET_DIR);

    // Check if source directory exists
    if (!(await fs.pathExists(SOURCE_DIR))) {
      console.warn('⚠️  external-assets/logos not found. Skipping logo copy.');
      console.warn('   Multi-tenant logos will not be available.');
      console.warn('   Make sure external-assets repository is cloned.');
      return;
    }

    // Get all SVG files from source
    const files = await fs.readdir(SOURCE_DIR);
    const logoFiles = files.filter(file => file.endsWith('.svg'));

    if (logoFiles.length === 0) {
      console.warn('⚠️  No SVG files found in external-assets/logos');
      return;
    }

    // Copy each logo
    let copiedCount = 0;
    for (const file of logoFiles) {
      const sourcePath = path.join(SOURCE_DIR, file);
      const targetPath = path.join(TARGET_DIR, file);

      await fs.copy(sourcePath, targetPath, { overwrite: true });
      copiedCount++;
    }

    console.log(`✅ Copied ${copiedCount} journal logos to public/logos/`);
  } catch (error) {
    console.error('❌ Error copying logos:', error.message);
    process.exit(1);
  }
}

copyLogos();
