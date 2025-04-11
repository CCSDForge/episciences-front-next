/**
 * Serveur webhook pour la génération à la demande d'articles
 * Ce serveur expose une API REST qui permet de régénérer des articles spécifiques
 * après leur modification sans avoir à reconstruire l'ensemble du site.
 * 
 * Usage: node scripts/webhook-server.js
 * Ensuite, envoyez une requête POST à http://localhost:3001/rebuild-article avec un 
 * corps JSON contenant { "articleId": "12345" }
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Créer l'application Express
const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.WEBHOOK_PORT || 3001;
const BUILD_SCRIPT = path.join(__dirname, 'build-article.js');
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || null;

// Journal des activités
const LOG_FILE = path.join(__dirname, 'webhook-logs.txt');

// Fonction pour loguer les activités
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  
  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) console.error('Erreur d\'écriture dans le fichier de log:', err);
  });
}

// Route principale pour la régénération d'un article
app.post('/rebuild-article', (req, res) => {
  const { articleId } = req.body;
  
  if (!articleId) {
    log('Requête reçue sans ID d\'article');
    return res.status(400).json({ error: 'ID d\'article manquant' });
  }
  
  log(`Demande de régénération pour l'article ${articleId}`);
  
  // Exécuter le script de build pour cet article
  exec(`node ${BUILD_SCRIPT} ${articleId}`, (error, stdout, stderr) => {
    if (error) {
      log(`Erreur lors de la génération de l'article ${articleId}: ${error.message}`);
      return res.status(500).json({ error: 'Échec de la génération' });
    }
    
    log(`Article ${articleId} régénéré avec succès`);
    
    // Si un script de déploiement est configuré, l'exécuter
    if (DEPLOY_SCRIPT) {
      const journalCode = process.env.NEXT_PUBLIC_JOURNAL_CODE || 'default';
      const articlePath = path.join(process.cwd(), 'dist', journalCode, 'articles', articleId);
      
      log(`Déploiement de l'article ${articleId}...`);
      exec(`${DEPLOY_SCRIPT} ${articlePath}`, (deployError, deployStdout, deployStderr) => {
        if (deployError) {
          log(`Erreur lors du déploiement: ${deployError.message}`);
          return res.status(500).json({ error: 'Échec du déploiement' });
        }
        
        log(`Article ${articleId} déployé avec succès`);
        return res.status(200).json({ 
          message: `Article ${articleId} régénéré et déployé avec succès`,
          logs: stdout
        });
      });
    } else {
      // Pas de script de déploiement, terminer ici
      return res.status(200).json({ 
        message: `Article ${articleId} régénéré avec succès`,
        logs: stdout
      });
    }
  });
});

// Route pour vérifier l'état du serveur
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Le serveur webhook est opérationnel' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  log(`Serveur webhook démarré sur le port ${PORT}`);
  log(`Prêt à recevoir des demandes de régénération d'articles`);
  log(`Exemple: curl -X POST http://localhost:${PORT}/rebuild-article -H "Content-Type: application/json" -d '{"articleId":"12345"}'`);
}); 