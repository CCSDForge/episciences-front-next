# 🚀 Episciences Front Next.js

## 📝 Description
Next.js 15 (App Router) version of Episciences front-end, migrated from React (Vite). This version is configured for Full Static rendering.

## 🛠 Technologies
- Next.js 15 (App Router)
- TypeScript
- SCSS
- i18next for internationalization

## 🚦 Prerequisites
- Node.js >= 18.17.0
- npm >= 9.x.x

## 🏁 Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Run development server
npm run dev

# Production build
npm run build
```

## 📁 Project Structure
```
episciences-front-next/
├── src/
│   ├── app/           # Routes and pages (App Router)
│   ├── components/    # Reusable React components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # Services and API calls
│   ├── styles/        # Global styles and SCSS variables
│   ├── types/         # TypeScript types
│   └── utils/         # Utilities and helpers
├── public/            # Static assets
└── config/           # Configuration files
```

## 🔧 Available Scripts
- `npm run dev` : Start development server
- `npm run build` : Build for production
- `npm run start` : Run production version
- `npm run lint` : Run ESLint checks
- `make epijinfo` : Specific build for epijinfo
- `npm run build:article <id>` : Build a specific article only
- `npm run webhook` : Start webhook server for on-demand article generation

## 🔄 Génération ciblée d'articles

Cette fonctionnalité permet de régénérer un article spécifique après sa modification, sans avoir à reconstruire l'ensemble du site statique.

### Utilisation directe

Pour générer un article spécifique (remplacer `12345` par l'ID de l'article) :

```bash
npm run build:article 12345
```

Cela va déclencher une génération Next.js optimisée qui ne produira que les fichiers HTML et assets nécessaires pour cet article spécifique.

### Serveur Webhook pour déclenchement à distance

Un serveur webhook est inclus pour permettre la régénération à la demande d'articles.

#### Démarrage du serveur

```bash
npm run webhook
```

Le serveur démarre par défaut sur le port 3001 et expose les endpoints suivants :
- `POST /rebuild-article` : Régénère un article spécifique
- `GET /health` : Vérifie l'état du serveur

#### Exemple d'utilisation avec CURL

```bash
curl -X POST http://localhost:3001/rebuild-article \
  -H "Content-Type: application/json" \
  -d '{"articleId":"12345"}'
```

#### Configuration du webhook

Vous pouvez configurer le serveur avec les variables d'environnement suivantes :
- `WEBHOOK_PORT` : Port d'écoute du serveur (défaut: 3001)
- `DEPLOY_SCRIPT` : Chemin vers un script de déploiement à exécuter après la génération

#### Intégration avec un CMS

Pour automatiser le processus, configurez votre CMS ou système de gestion de contenu pour appeler ce webhook lorsqu'un article est modifié.

Exemple de configuration dans un hook post-publication :

```javascript
// Exemple de hook exécuté après modification d'un article
async function onArticleUpdate(article) {
  // Notifier le webhook pour régénérer l'article
  await fetch('http://votre-serveur:3001/rebuild-article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId: article.id })
  });
}
```

### Fonctionnement technique

Le système utilise l'approche suivante :

1. Modification de `generateStaticParams` pour ne générer qu'un article spécifique si `ONLY_BUILD_ARTICLE_ID` est défini
2. Script Node.js qui définit cette variable d'environnement et lance le build
3. Serveur webhook optionnel pour déclencher la génération à distance

Cette approche est compatible avec le mode statique de Next.js (`output: 'export'`) et permet une mise à jour rapide et économe en ressources.

## 🔧 Conversion des fichiers d'environnement

Le projet inclut un script `convert-env.js` qui permet de convertir les fichiers d'environnement et les assets du format Vite vers Next.js.

### Prérequis

- Le dossier `episciences-front-assets` doit être présent au même niveau que le projet
- Le dossier doit contenir :
  - Les fichiers `.env.local.[JOURNAL]` pour chaque revue
  - Un fichier `journals.txt` listant les codes des revues
  - Un dossier `logos` contenant les logos SVG des revues

### Utilisation

```bash
# Se placer dans le dossier scripts
cd scripts

# Exécuter le script
node convert-env.js
```

### Fonctionnalités

Le script effectue automatiquement :
1. La conversion des préfixes `VITE_` en `NEXT_PUBLIC_` dans les fichiers .env
2. La suppression des commentaires spéciaux (###> ###)
3. La copie des logos SVG vers le dossier `external-assets`
4. La copie du fichier `journals.txt`

### Structure résultante

```
external-assets/
├── .env.local.[JOURNAL]  # Fichiers d'environnement convertis
├── journals.txt          # Liste des codes de revues
└── logos/               # Logos SVG des revues
    ├── logo-[JOURNAL]-big.svg
    └── logo-[JOURNAL]-small.svg
```

### Messages de statut

- ✅ Succès de l'opération
- ⚠️ Avertissement (fichier ignoré ou manquant)
- ❌ Erreur (échec de conversion ou fichier non trouvé)

## 🚀 Déploiement Full Static

Le projet est configuré pour un déploiement en mode Full Static, ce qui signifie que tout le site est pré-généré au moment du build.

### Configuration requise

- Un serveur web statique (nginx, Apache, etc.)
- Node.js >= 18.17.0 (pour le build)
- Espace disque suffisant pour les fichiers générés

### Étapes de déploiement

1. **Préparation du build**
```bash
# Installation des dépendances
npm install

# Configuration des variables d'environnement
cp .env.example .env.production
# Éditer .env.production avec les valeurs de production
```

2. **Génération du site statique**
```bash
# Build de production
npm run build

# Les fichiers statiques seront générés dans le dossier 'dist/[JOURNAL_CODE]'
# où [JOURNAL_CODE] est la valeur de NEXT_PUBLIC_JOURNAL_CODE
```

3. **Déploiement**
- Copier le contenu du dossier `dist/[JOURNAL_CODE]` vers votre serveur web
- Configurer votre serveur web pour servir les fichiers statiques
- Configurer la réécriture d'URL pour gérer les routes Next.js

### Exemple de configuration Nginx

```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    root /chemin/vers/dossier/dist/[JOURNAL_CODE];
    
    location / {
        try_files $uri $uri.html $uri/index.html =404;
    }
    
    # Gestion du cache
    location /_next/static {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Mise à jour du contenu

Pour mettre à jour le contenu déployé :

1. Générer un nouvel article spécifique :
```bash
npm run build:article <id>
```

2. Copier uniquement les fichiers modifiés vers le serveur :
```bash
rsync -avz --delete dist/[JOURNAL_CODE]/ user@serveur:/chemin/vers/dossier/dist/[JOURNAL_CODE]/
```

### Points importants

- Vérifier que toutes les URLs externes sont absolues
- Tester la navigation et les liens après déploiement
- Vérifier que le cache du navigateur est correctement configuré
- S'assurer que les redirections fonctionnent correctement

## 🤝 Contributing
Please follow the code conventions and migration rules defined in the documentation files. 