const fs = require('fs');
const path = require('path');

// Chemins
const ASSETS_DIR = path.resolve(__dirname, '../../episciences-front-assets');
const TARGET_DIR = path.resolve(__dirname, '../external-assets');

// Vérifier que les dossiers existent
function ensureDirectories() {
  const dirs = [
    TARGET_DIR,
    path.join(TARGET_DIR, 'logos')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Créé le dossier: ${dir}`);
    }
  });
}

// Fonction pour convertir le contenu du fichier
function convertEnvContent(content) {
  // Remplacer VITE_ par NEXT_PUBLIC_
  let converted = content.replace(/VITE_/g, 'NEXT_PUBLIC_');
  
  // Supprimer les commentaires de type ###> ###
  converted = converted.replace(/###>.*?###/gs, '');
  
  // Supprimer les lignes vides multiples
  converted = converted.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return converted.trim();
}

// Fonction pour copier et convertir un fichier .env
function copyAndConvertEnv(journal) {
  const sourceFile = path.join(ASSETS_DIR, `.env.local.${journal}`);
  const targetFile = path.join(TARGET_DIR, `.env.local.${journal}`); // Garder le même nom de fichier

  try {
    // Vérifier que le fichier source existe
    if (!fs.existsSync(sourceFile)) {
      console.error(`❌ Fichier source non trouvé: ${sourceFile}`);
      return;
    }

    const content = fs.readFileSync(sourceFile, 'utf8');
    const convertedContent = convertEnvContent(content);
    
    // Vérifier que le contenu converti n'est pas vide
    if (!convertedContent.trim()) {
      console.error(`❌ Contenu vide après conversion pour ${journal}`);
      return;
    }

    fs.writeFileSync(targetFile, convertedContent);
    console.log(`✅ Converti ${journal}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la conversion de ${journal}:`, error.message);
  }
}

// Fonction pour copier les logos
function copyLogos() {
  const sourceLogoDir = path.join(ASSETS_DIR, 'logos');
  const targetLogoDir = path.join(TARGET_DIR, 'logos');

  try {
    // Vérifier que le dossier source existe
    if (!fs.existsSync(sourceLogoDir)) {
      console.error(`❌ Dossier source des logos non trouvé: ${sourceLogoDir}`);
      return;
    }

    // Lire la liste des logos
    const logos = fs.readdirSync(sourceLogoDir);
    
    if (logos.length === 0) {
      console.warn(`⚠️ Aucun logo trouvé dans ${sourceLogoDir}`);
      return;
    }

    // Copier chaque logo
    logos.forEach(logo => {
      const sourcePath = path.join(sourceLogoDir, logo);
      const targetPath = path.join(targetLogoDir, logo);
      
      // Vérifier que c'est bien un fichier SVG
      if (!logo.endsWith('.svg')) {
        console.warn(`⚠️ Ignoré ${logo} (pas un SVG)`);
        return;
      }

      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copié ${logo}`);
    });

    console.log(`✅ ${logos.length} logos copiés`);
  } catch (error) {
    console.error('❌ Erreur lors de la copie des logos:', error.message);
  }
}

// Fonction principale
async function main() {
  try {
    console.log('🚀 Début de la conversion...');
    
    // Vérifier que le dossier des assets existe
    if (!fs.existsSync(ASSETS_DIR)) {
      throw new Error(`Dossier des assets non trouvé: ${ASSETS_DIR}`);
    }

    // Créer les dossiers nécessaires
    ensureDirectories();

    // Copier le fichier journals.txt
    fs.copyFileSync(
      path.join(ASSETS_DIR, 'journals.txt'),
      path.join(TARGET_DIR, 'journals.txt')
    );
    console.log('✅ Copié journals.txt');

    // Lire la liste des journaux
    const journals = fs.readFileSync(path.join(ASSETS_DIR, 'journals.txt'), 'utf8')
      .split('\n')
      .map(j => j.trim())
      .filter(Boolean);

    if (journals.length === 0) {
      throw new Error('Aucun journal trouvé dans journals.txt');
    }

    console.log(`📚 ${journals.length} journaux trouvés`);

    // Convertir chaque fichier .env
    journals.forEach(copyAndConvertEnv);

    // Copier les logos
    copyLogos();

    console.log('✨ Conversion terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer le script
main(); 