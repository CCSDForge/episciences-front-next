# Architecture Hybride de Rendu (Hybrid Rendering)

## 📋 Vue d'ensemble

Ce document décrit l'architecture hybride de rendu mise en place pour optimiser les temps de mise à jour des pages statiques du projet Episciences.

### Problème Initial

Lors de la mise à jour d'une page statique depuis le back-office (ex: `/about`), le rebuild complet via `next build` prenait **~31 secondes**, créant une expérience utilisateur frustrante.

### Solution Mise en Place

Architecture hybride combinant :
- **HTML statique** (SEO-friendly, généré au build pour les bots AI)
- **Hydratation dynamique** (fetch API automatique côté client pour avoir les données les plus récentes)

### Résultat

- **Temps ressenti back-office** : < 2 secondes (sauvegarde API + réponse immédiate)
- **Temps ressenti site public** : < 1 seconde (HTML statique + fetch API)
- **SEO** : ✅ Préservé à 100% (HTML complet pour les bots)
- **Fraîcheur des données** : Immédiate (pas besoin d'attendre le rebuild)

---

## 🏗️ Architecture Technique

### Flux de Mise à Jour

```
┌─────────────────────────────────────────────────────┐
│ 1. USER édite page dans back-office                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌──────────────────────┐
         │ 2. API sauvegarde    │ < 1s
         └──────────┬───────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
   ┌────────────┐      ┌──────────────┐
   │ Réponse    │      │ Webhook      │
   │ user : ✓   │      │ (async)      │
   └────────────┘      └──────┬───────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Rebuild HTML     │ 31s
                    │ (arrière-plan)   │ (transparent)
                    └──────────────────┘

┌─────────────────────────────────────────────────────┐
│ 3. VISITEUR charge page publique                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
          ┌────────────────┐
          │ Apache sert    │ < 100ms
          │ HTML statique  │ ✅ SEO
          └────────┬───────┘
                   │
                   ▼
          ┌────────────────────┐
          │ Browser hydrate JS │
          └────────┬───────────┘
                   │
                   ▼
          ┌───────────────────────┐
          │ useClientSideFetch()  │ < 500ms
          │ fetch API             │
          └────────┬──────────────┘
                   │
            ┌──────┴──────┐
            │             │
            ▼             ▼
      [Identique]   [Différent]
            │             │
            ▼             ▼
       Rien ne      Mise à jour
       change       smooth
```

---

## 🔧 Composants Techniques

### 1. Hook `useClientSideFetch`

**Fichier** : `src/hooks/useClientSideFetch.ts`

Hook React réutilisable qui gère le fetch automatique côté client avec transition smooth.

**Paramètres** :
```typescript
{
  fetchFn: () => Promise<T>,      // Fonction de fetch
  initialData: T | null,           // Données HTML statiques (fallback)
  enabled?: boolean,               // Active/désactive le fetch
  onError?: (error: Error) => void // Callback erreur (optionnel)
}
```

**Retour** :
```typescript
{
  data: T | null,                  // Données actuelles
  isUpdating: boolean,             // Fetch en cours
  error: Error | null,             // Erreur éventuelle
  refetch: () => Promise<void>     // Force un re-fetch
}
```

**Exemple d'utilisation** :
```typescript
const { data: pageData, isUpdating } = useClientSideFetch({
  fetchFn: async () => {
    if (!rvcode) return null;
    return await fetchAboutPage(rvcode);
  },
  initialData: staticPageData,
  enabled: !!rvcode,
});
```

### 2. Transitions CSS

**Fichier** : `src/styles/transitions.scss`

Classes CSS pour transitions smooth lors des mises à jour :

```scss
.content-transition {
  transition: opacity 0.3s ease-in-out;
  will-change: opacity;

  &.updating {
    opacity: 0.95; // Dimming léger pendant le fetch
  }
}
```

**Utilisation** :
```jsx
<div className={`content content-transition ${isUpdating ? 'updating' : ''}`}>
  {/* Contenu */}
</div>
```

---

## 📄 Pages Concernées

L'architecture hybride est actuellement appliquée aux **6 pages statiques** suivantes :

| Page | Composant | Endpoint API | Description |
|------|-----------|-------------|-------------|
| `/about` | `AboutClient.tsx` | `fetchAboutPage()` | Page "À propos" |
| `/for-authors` | `ForAuthorsClient.tsx` | `fetchEditorialWorkflowPage()`<br/>`fetchEthicalCharterPage()`<br/>`fetchPrepareSubmissionPage()` | 3 sous-pages pour auteurs |
| `/boards` | `BoardsClient.tsx` | `fetchBoardPages()`<br/>`fetchBoardMembers()` | Membres du board |
| `/credits` | `CreditsClient.tsx` | `fetchCreditsPage()` | Page crédits |
| `/news` | `NewsClient.tsx` | `fetchNews()` | Liste des actualités |
| `/` (home) | `HomeClient.tsx` | `fetchHomeData()` | Page d'accueil |

### Pages NON Concernées

- **Articles** (`/articles/[id]`) : Gardent le système de rebuild ciblé existant
- **Volumes** (`/volumes/[id]`) : Contenu statique pur
- **Sections** (`/sections/[id]`) : Contenu statique pur

---

## 🛠️ Comment Ajouter une Nouvelle Page

Pour appliquer l'architecture hybride à une nouvelle page :

### Étape 1 : Importer le Hook

```typescript
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { fetchYourPageData } from '@/services/yourService';
import '@/styles/transitions.scss';
```

### Étape 2 : Utiliser le Hook dans le Composant

```typescript
export default function YourPageClient({ initialData }: Props) {
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // Architecture hybride
  const { data: pageData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return null;
      return await fetchYourPageData(rvcode);
    },
    initialData,
    enabled: !!rvcode,
  });

  // Utiliser pageData au lieu de initialData dans le reste du composant
  // ...
}
```

### Étape 3 : Ajouter les Classes CSS

```jsx
return (
  <main className={`your-page content-transition ${isUpdating ? 'updating' : ''}`}>
    {/* Contenu */}
  </main>
);
```

### Étape 4 : Mettre à Jour cette Documentation

Ajouter la nouvelle page dans la table "Pages Concernées" ci-dessus.

---

## ⚙️ Configuration Système

### Variables d'Environnement

Aucune variable d'environnement spécifique n'est requise. L'architecture utilise les variables existantes :

- `NEXT_PUBLIC_JOURNAL_RVCODE` : Code du journal
- `NEXT_PUBLIC_API_ROOT_ENDPOINT` : Endpoint de l'API
- `NEXT_PUBLIC_STATIC_BUILD` : Indique si c'est un build statique

### Webhook & Rebuild Arrière-Plan

Le système de webhook existant continue de fonctionner normalement :

```bash
# Rebuild d'une page spécifique (31s en arrière-plan)
node scripts/rebuild-resource.js --journal epijinfo --type static-page --page about
```

**Important** : Ce rebuild est maintenant **transparent** pour l'utilisateur. Le contenu frais est visible immédiatement via le fetch client, et le rebuild HTML se fait en arrière-plan pour maintenir le cache SEO.

---

## 🧪 Tests & Validation

### Tests Manuels Recommandés

1. **Test SEO** :
   ```bash
   # Vérifier que le HTML statique contient le contenu
   curl http://localhost:3000/en/about | grep "content-text"
   ```

2. **Test Fetch Dynamique** :
   - Éditer une page dans le back-office
   - Sans rebuild, visiter la page publique
   - Vérifier que le nouveau contenu s'affiche (< 1s)

3. **Test Fallback** :
   - Couper l'API backend
   - Visiter une page
   - Vérifier que le HTML statique s'affiche correctement

### Performance Attendue

| Métrique | Avant | Après (ressenti) | Après (réel) |
|----------|-------|------------------|--------------|
| **Sauvegarde back-office** | 31s | < 2s | < 2s |
| **Affichage site public** | Instantané | < 1s | < 1s |
| **SEO (bots AI)** | ✅ | ✅ | ✅ |
| **Fraîcheur données** | Après rebuild | Immédiate | Immédiate |
| **Rebuild HTML** | 31s (bloquant) | - | 31s (async) |

---

## 🐛 Dépannage

### Le contenu ne se met pas à jour

**Symptômes** : Après édition dans le back-office, le contenu reste ancien sur le site public.

**Causes possibles** :
1. L'API n'a pas sauvegardé les données
2. Le fetch client est désactivé (`enabled: false`)
3. Cache navigateur

**Solutions** :
```bash
# 1. Vérifier l'API directement
curl https://api.episciences.org/pages?page_code=about&rvcode=epijinfo

# 2. Vérifier le hook dans le code
console.log('isUpdating:', isUpdating);
console.log('data:', data);

# 3. Vider le cache navigateur
Ctrl+Shift+R (hard refresh)
```

### Erreur "Cannot read property 'content' of null"

**Cause** : L'API a retourné `null` et il n'y a pas de `initialData` en fallback.

**Solution** : Vérifier que le Server Component passe bien `initialData` :
```typescript
// page.tsx (Server Component)
const initialData = await fetchYourPageData(rvcode);
return <YourPageClient initialData={initialData} />;
```

### Le HTML statique est vide (pas de SEO)

**Cause** : Le Server Component ne fetch pas les données au build.

**Solution** : S'assurer que `page.tsx` utilise bien un Server Component qui fetch :
```typescript
// ✅ Correct
export default async function YourPage() {
  const data = await fetchYourPageData(rvcode);
  return <YourPageClient initialData={data} />;
}

// ❌ Incorrect
'use client';
export default function YourPage() {
  // Pas de fetch au build = pas de HTML statique
}
```

---

## 📚 Références

- **Hook Documentation** : `src/hooks/useClientSideFetch.ts` (commentaires internes)
- **CSS Transitions** : `src/styles/transitions.scss`
- **Example Implementation** : `src/app/[lang]/about/AboutClient.tsx`
- **Makefile Targets** : `Makefile` (commandes `make serve`, `make docker-test`)
- **Webhook System** : `WEBHOOKS.md`
- **Project Instructions** : `CLAUDE.md`

---

## 🎯 Bonnes Pratiques

### ✅ À Faire

- **Toujours** fournir `initialData` (données HTML statiques pour SEO)
- **Toujours** vérifier que `rvcode` existe avant de fetcher
- **Toujours** ajouter les classes `content-transition` pour UX smooth
- **Toujours** utiliser `graceful degradation` (fallback sur données statiques en cas d'erreur)
- **Toujours** tester le HTML statique avec `curl` ou `view-source:`

### ❌ À Éviter

- **Ne jamais** retirer le fetch Server Component (perte du SEO)
- **Ne jamais** bloquer l'UI avec un loader pendant le fetch client (transition invisible)
- **Ne jamais** supposer que le fetch réussira (toujours un fallback)
- **Ne pas** appliquer cette architecture aux pages articles (système ciblé existant)
- **Ne pas** oublier de mettre à jour cette documentation lors de l'ajout de nouvelles pages

---

## 📞 Contact & Support

Pour toute question ou amélioration sur cette architecture :
1. Consulter d'abord cette documentation
2. Vérifier les exemples d'implémentation existants
3. Tester en local avec `make serve`
4. Consulter les logs du webhook si nécessaire

---

**Dernière mise à jour** : 2025-01-22
**Version** : 1.0.0
**Auteur** : Generated with Claude Code
