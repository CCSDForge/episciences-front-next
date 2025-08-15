const path = require('path');
const fs = require('fs-extra');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

function validateEnv() {
  if (!process.env.NEXT_PUBLIC_JOURNAL_RVCODE) {
    throw new Error("NEXT_PUBLIC_JOURNAL_RVCODE est requis");
  }
  return process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
}

function generateSitemap(journalCode) {
  if (!journalCode) {
    throw new Error("Code journal requis pour générer le sitemap");
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${journalCode}.episciences.org/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

function updateRobotsTxt() {
  try {
    const journalCode = validateEnv();
    const distDir = path.resolve(__dirname, '..', `dist/${journalCode}`);
    
    if (!fs.existsSync(distDir)) {
      throw new Error(`Le répertoire de build n'existe pas: ${distDir}`);
    }

    // Mise à jour du robots.txt
    const robotsContent = `User-agent: *
Allow: /
Sitemap: https://${journalCode}.episciences.org/sitemap.xml`;
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsContent);

    // Génération du sitemap
    const sitemapContent = generateSitemap(journalCode);
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapContent);

    console.log('Robots.txt et sitemap.xml ont été mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des fichiers:', error);
    process.exit(1);
  }
}

updateRobotsTxt(); 