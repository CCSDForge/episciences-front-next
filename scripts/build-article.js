/**
 * Script de génération ciblée d'un article spécifique
 * Permet de reconstruire un seul article sans régénérer tout le site
 */

const { exec } = require('child_process');
const path = require('path');

// Récupérer l'ID de l'article depuis les arguments de ligne de commande
const articleId = process.argv[2];

if (!articleId) {
  console.error('\x1b[31m%s\x1b[0m', 'ERREUR: Veuillez spécifier un ID d\'article.');
  console.error('\x1b[33m%s\x1b[0m', 'Exemple: node scripts/build-article.js 12345');
  process.exit(1);
}

console.log('\x1b[36m%s\x1b[0m', `Démarrage de la génération ciblée de l'article ${articleId}...`);

// Définir la variable d'environnement pour le build ciblé
process.env.ONLY_BUILD_ARTICLE_ID = articleId;

// Préparer la commande de build avec cross-env pour la compatibilité multi-plateforme
const cmd = `cross-env ONLY_BUILD_ARTICLE_ID=${articleId} npm run build`;

// Horodatage pour mesurer la durée
const startTime = new Date();

// Exécuter la commande
exec(cmd, (error, stdout, stderr) => {
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // en secondes

  if (error) {
    console.error('\x1b[31m%s\x1b[0m', `Erreur lors de la génération: ${error.message}`);
    return;
  }

  // Afficher les logs de build
  console.log(stdout);
  
  if (stderr) {
    console.warn('\x1b[33m%s\x1b[0m', `Avertissements:`);
    console.warn(stderr);
  }

  console.log('\x1b[32m%s\x1b[0m', `Article ${articleId} généré avec succès en ${duration.toFixed(2)} secondes.`);
  
  // Indiquer où l'article a été généré
  const journalCode = process.env.NEXT_PUBLIC_JOURNAL_CODE || 'default';
  const articlePath = path.join(process.cwd(), 'dist', journalCode, 'articles', articleId);
  console.log('\x1b[36m%s\x1b[0m', `Article généré dans: ${articlePath}`);
  
  console.log('\x1b[36m%s\x1b[0m', 'Vous pouvez maintenant déployer ce dossier sur votre serveur web.');
}); 