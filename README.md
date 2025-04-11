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

## 🤝 Contributing
Please follow the code conventions and migration rules defined in the documentation files. 