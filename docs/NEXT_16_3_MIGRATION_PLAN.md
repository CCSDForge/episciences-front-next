# Plan de migration vers Next.js 16.3

> **Sources** : [`docs/next-16-3-blog-post.md`](./next-16-3-blog-post.md) (annonce officielle scrapée),
> [`docs/next-16-3.md`](./next-16-3.md) (résumé de faisabilité), et les docs versionnées livrées dans
> `node_modules/next/dist/docs/` (16.2.6, installée localement) — notamment
> `01-app/02-guides/upgrading/version-16.md`, `.../cacheComponents.md` et `.../migrating-to-cache-components.md`.

## État actuel du projet

| Élément                    | Valeur constatée                                                  |
| --------------------------- | ------------------------------------------------------------------ |
| `next` (package.json)       | `^16.2.2`                                                          |
| `next` installé             | `16.2.6`                                                            |
| `react` / `react-dom`       | `^19.2.6`                                                           |
| `typescript`                | déclaré `^5.2.2`, réellement installé `5.9.3`                      |
| `engines.node`               | `>=22.0.0` — mais le Node local de cette session est `v20.19.6`    |
| CI (`ci.yml`)                | Node `22.x` uniquement, ne fait **que** lint + test, jamais de build |
| Runtime middleware           | `src/middleware.ts` (nom **pré-16**, Edge runtime, pas encore renommé `proxy.ts`) |
| Cache handler                | `src/lib/cache-handler.js` custom (Valkey/ioredis), activé via `VALKEY_ENABLED=true` |
| Stratégie ISR                | `export const revalidate` par page (false / 3600 / 86400 / 604800), voir `docs/ISR_STRATEGY.md` |
| `cacheComponents` / PPR      | **non utilisé** actuellement                                       |
| `'use cache'` / `cacheLife` / `cacheTag` | **non utilisé** actuellement                            |
| React Compiler               | non activé                                                          |
| Playwright                   | absent du projet (tests = Vitest uniquement)                       |
| Build Docker                 | `docker/Dockerfile`, une seule étape `RUN npm run build`, pas de cache persistant entre builds |

**Constat clé** : le projet n'utilise aucune des fonctionnalités expérimentales de la 16.x
(`cacheComponents`, `'use cache'`, PPR). La 16.3 est donc, pour l'essentiel, une **mise à jour mineure
à faible risque** — sauf pour deux points spécifiques à ce dépôt détaillés ci-dessous.

---

## 1. Ce qui s'applique automatiquement (zéro changement de code)

Ces gains sont inclus dès l'upgrade de version, sans rien changer dans le projet :

- Mémoire de dev réduite (cache disque Turbopack + éviction mémoire) — bénéfice direct pour les dev locaux.
- SSR plus rapide (streams Node natifs au lieu de web streams) — profite à toutes les pages, y compris
  celles avec des services `safeFetchData` existants.
- Assets statiques immuables réutilisables entre déploiements.
- `AGENTS.md` versionné généré par `next dev` (remplace les Skills externes) — pertinent puisque le
  projet est piloté par des agents IA (CLAUDE.md).

**Action recommandée** : aucune, sauf vérifier après upgrade que le gain mémoire/SSR se confirme en
local (`make build && make up`).

## 2. Ce qui est opt-in à faible risque — candidats à évaluer

### 2.1 Turbopack FileSystem Cache pour `next build`

Le blog 16.3 dit ce cache est "activé par défaut" pour `next build`. Mais les docs 16.2.6 précisent
que `turbopackFileSystemCacheForBuild` reste **opt-in** (`experimental.turbopackFileSystemCacheForBuild`)
alors que celui du dev (`turbopackFileSystemCacheForDev`) l'est déjà par défaut. À vérifier au moment
de l'upgrade réelle en lisant le changelog exact de 16.3 (le statut par défaut peut avoir changé
précisément dans cette version).

**Point d'attention propre à ce projet** : `docker/Dockerfile` build en une seule étape jetable
(`RUN npm run build`), sans volume ni cache BuildKit persistant. Un cache disque Turbopack **n'apporte
aucun gain** dans ce contexte — chaque build Docker part d'un système de fichiers vierge. Pour en
profiter réellement il faudrait soit :
- ajouter un `RUN --mount=type=cache,target=/app/.next/cache` (BuildKit) dans `docker/Dockerfile`, ou
- persister `.next/cache` sur l'agent CI/CD entre déploiements (hors GitHub Actions actuel, qui ne
  build pas — voir `.github/workflows/ci.yml`).

Sans l'un de ces deux changements, activer ce flag est inutile pour les déploiements — seulement utile
en dev local (`npm run dev`).

### 2.2 TypeScript 7 pour le type-checking de build

`typescript` installé est déjà en `5.9.3` (pas `5.2.2` comme le laisse penser package.json). TS7 est un
portage natif Rust très récent, publié le mois dernier. Avant d'activer `useTypeScriptCli` :

- Vérifier la compatibilité de `typescript-eslint` / `eslint-config-next` (Flat Config, déjà en place
  depuis Next 16) avec TS7 — l'écosystème `@typescript-eslint` a historiquement mis plusieurs mois à
  suivre les nouvelles majors de TS.
- Tester isolément sur une branche (`pnpm add -D typescript@^7`) et lancer `make sonar` + `npm run test:coverage`
  avant d'envisager la CI.

**Recommandation** : ne pas bloquer la migration 16.3 sur ce point ; le traiter comme un chantier séparé.

### 2.3 Custom error boundary (`catchError`)

Les docs locales (16.2.6) exposent déjà `unstable_catchError` (import `next/error`). La 16.3 le
stabilise en `catchError` (sans préfixe). C'est directement pertinent pour ce projet : le pattern
`error.tsx` actuel (voir CLAUDE.md — Error Handling, et les `error.tsx` créés pour `articles/`, `news/`,
`volumes/`) ne peut aujourd'hui que réinitialiser l'état client et ne peut pas relancer le rendu d'un
Server Component. `catchError` + `retry()` permettrait de re-fetcher les données ayant échoué (ex. API
Episciences temporairement indisponible) sans recharger toute la page, en cohérence avec le principe
"Graceful Degradation" déjà documenté dans `ISR_STRATEGY.md`.

**Action recommandée** : POC sur une page à fort risque d'échec réseau (ex. `articles/[id]`, qui a déjà
eu des correctifs de logging d'erreurs — commit `1e6d504`), en complément des `error.tsx` existants,
pas en remplacement.

### 2.4 Root params (`next/root-params`)

Très pertinent pour ce dépôt : l'architecture multi-tenant repose sur `[journalId]/[lang]` propagés
aujourd'hui **par props** depuis les pages serveur vers les Client Components (pattern documenté dans
CLAUDE.md : "Translations MUST be passed server-side as props", "Client components use `lang` prop from
server"). `next/root-params` permettrait de lire `lang` (et potentiellement `journalId` si le routing
middleware était adapté) directement dans n'importe quel Server Component profondément imbriqué, sans
prop-drilling.

**Limites actuelles à connaître avant d'investir** :
- Seulement disponible dans les Server Components pour l'instant (pas encore les Route Handlers ni les
  Server Actions) — les routes `api/revalidate`, `api/proxy/[...path]`, `api/pdf-proxy` n'en bénéficieront
  pas dans un premier temps.
- Ne remplace pas le besoin de passer `lang` aux Client Components (contrainte d'hydratation déjà
  documentée) — le gain porte uniquement sur la partie Server Components.

**Action recommandée** : POC ciblé sur une page avec beaucoup de composants serveur imbriqués recevant
`lang`/`rvcode` en props (ex. arborescence de `MarkdownPageWithSidebar`), pas un big-bang sur tout le repo.

### 2.5 React Compiler (Rust, expérimental)

Gain mesuré par Vercel sur `next dev` uniquement (34-46% plus rapide au démarrage). Aucune fonctionnalité
manquante actuellement ne le requiert. À activer isolément si le confort de dev le justifie, sans lien
avec la production.

### 2.6 `useOffline` / résilience réseau

Aucun besoin identifié dans le projet (pas de PWA, pas d'exigence offline documentée). À ignorer pour
l'instant.

---

## 3. Ce qu'il ne faut PAS activer dans ce cycle : Instant Navigations / `cacheComponents`

Le blog présente `cacheComponents: true` + `partialPrefetching: true` comme la grande nouveauté 16.3.
D'après `migrating-to-cache-components.md` (doc locale), activer `cacheComponents` **remplace entièrement**
le modèle `export const dynamic` / `export const revalidate` par `'use cache'` + `cacheLife()` + `cacheTag()`
au niveau composant/fonction. Or toute la stratégie ISR de ce projet — documentée en détail dans
`docs/ISR_STRATEGY.md` — repose sur :

- des exports `revalidate` par page (false / 3600 / 86400 / 604800),
- des tags de fetch (`articles-{rvcode}`, `volume-{id}`, etc.) consommés par le cache handler Valkey
  custom (`src/lib/cache-handler.js`) et par le endpoint `api/revalidate` (webhooks Symfony/ZF1, voir
  `docs/REVALIDATION_IMPLEMENTATION_SPEC_*.md`).

Activer `cacheComponents` reviendrait à réécrire cette stratégie dans son intégralité (toutes les pages
listées dans `ISR_STRATEGY.md`, tous les services `safeFetchData`), avec un changement de sémantique de
`revalidateTag` (deuxième argument obligatoire — déjà correctement anticipé dans ce repo via
`revalidateTag(tag, { expire: 0 })`, voir `src/app/api/revalidate/route.ts:95`) et un risque direct sur
la production multi-tenant (45+ journaux).

**Recommandation** : traiter `cacheComponents`/Instant Navigations comme un **chantier séparé et
ultérieur**, avec sa propre RFC interne, après avoir stabilisé la 16.3 de base. Ne pas le mélanger à
cette migration.

---

## 4. Point d'attention spécifique : `middleware.ts` → `proxy.ts`

Non lié à la 16.3 en tant que tel (déprécié depuis la 16.0), mais **directement pertinent** compte tenu
de l'incident du dernier commit (`a287ae8`, 2026-08-05) : `cache-handler.js` a crashé en préprod car il
utilisait `node:fs`/`node:path`, et **le runtime Edge** (utilisé par `middleware.ts`) n'auto-polyfill que
le spécificateur nu (`fs`, `path`), pas le préfixe `node:`.

`src/middleware.ts` (routing multi-tenant : détection `journalId`, gestion des langues, rewrites vers
`/sites/[journalId]/[lang]/...`) tourne aujourd'hui sur le runtime Edge. En renommant vers `proxy.ts`
(convention Next 16+), **le runtime devient Node.js et n'est plus configurable** — ce qui élimine
structurellement toute la classe de bug rencontrée (`node:fs` fonctionne nativement en runtime Node).

**Action recommandée** (indépendante de la 16.3, mais à faire dans la foulée) :
1. Renommer `middleware.ts` → `proxy.ts`, `export function middleware` → `export function proxy`.
2. Renommer le flag déjà présent dans `next.config.js` : `skipMiddlewareUrlNormalize` n'est pas utilisé
   ici, mais vérifier qu'aucune référence résiduelle au nom `middleware` ne subsiste dans la config.
3. Revalider tout le comportement multi-tenant (tests d'intégration + `make build && make up`) avant
   déploiement, car ce fichier est sur le chemin critique de **toutes** les requêtes.
4. Le codemod officiel `npx @next/codemod@canary upgrade latest` gère ce renommage automatiquement —
   à utiliser plutôt qu'un renommage manuel.

---

## 5. Plan d'exécution par phases

### Phase 0 — Pré-requis (avant tout upgrade)
- [ ] Vérifier que l'environnement de dev local tourne en Node ≥ 22 (actuellement `v20.19.6` détecté
      dans cette session — à corriger, `engines.node` l'exige déjà).
- [ ] `git status` propre, branche dédiée pour la migration.

### Phase 1 — Upgrade de base — ✅ effectuée le 2026-08-05

- [x] `npx @next/codemod@canary upgrade latest` — a bumpé `next`→16.3.0, `react`/`react-dom`→19.2.8,
      mais **a échoué à l'étape `npm install`** : il pousse aussi `eslint` 8→10 et
      `eslint-config-next` 14→16.3 alors que le projet était encore en `.eslintrc.json` (legacy),
      un format qu'ESLint 10 ne lit plus du tout (flat config obligatoire). Le renommage
      `middleware`→`proxy` **n'a pas été appliqué** par cette exécution (l'installation a échoué
      avant l'étape de transformation de fichiers) — reste à faire, voir section 4.
- [x] **Migration Flat Config faite manuellement** : `.eslintrc.json` supprimé, `eslint.config.js`
      créé (`eslint-config-next` + `eslint-config-prettier` + règles a11y custom conservées à l'identique).
- [x] **Découverte** : `eslint-config-next@16.3.0` dépend en dur de `eslint-plugin-react-hooks@^7.0.0`,
      qui plante avec ESLint 10 (`TypeError: contextOrFilename.getFilename is not a function` — bug
      amont, `eslint-plugin-react@7.37.5` ne supporte pas encore ESLint 10 malgré ce que suggère le
      peerDependency `>=9.0.0` d'`eslint-config-next`). **Correctif** : `eslint` pinné sur `^9.39.5`
      (dernière 9.x) plutôt que 10 — la flat config est strictement identique sous ESLint 9 (défaut
      depuis la v9), aucun changement d'API pour nous.
- [x] **Découverte** : `eslint-plugin-react-hooks@7` ajoute 4 nouvelles règles "React Compiler
      readiness" (`set-state-in-effect`, `error-boundaries`, `immutability`,
      `preserve-manual-memoization`) activées en `error` par défaut dans le preset recommandé —
      92 violations détectées d'un coup, dont ~62 sur le pattern `isMounted` (hydration guard)
      documenté dans CLAUDE.md/mémoire. Le projet n'active pas `reactCompiler` : ces 4 règles ont été
      repassées en `warn` dans `eslint.config.js` (commentaire explicatif inclus) plutôt que de forcer
      une réécriture de ~90 sites hors périmètre de cette migration.
- [x] `npm run lint` → propre.
- [x] `npm run test:run` → 3170/3170 tests verts (221 fichiers).
- [x] `npm run build` → OK, Turbopack (défaut Next 16), 1097 pages générées, **aucun conflit** avec le
      bloc `webpack: (config, { isServer }) => {...}` existant dans `next.config.js` (le garde-fou
      "custom webpack config fails the build" documenté dans le guide d'upgrade v16 ne s'est pas
      déclenché ici).
- [x] `make build && make up` → build Docker OK, stack Nginx + Valkey (cluster Sentinel complet)
      saine, `curl -H "Host: epijinfo.episciences.test" http://localhost:8080/en/` → 200 après le
      redirect 308 attendu du middleware. `revalidate-worker` crash-loop observé, **sans lien avec la
      migration** : `REVALIDATION_SECRET` non configuré dans cet environnement de test local.
- [ ] `make sonar` — non exécuté, nécessite un serveur SonarQube local sur `localhost:9000` non
      disponible dans cet environnement ; à lancer manuellement quand l'instance est up.

### Phase 2 — Validation du gain "zero-code"
- [ ] Comparer mémoire `next dev` avant/après sur une session longue.
- [ ] Comparer temps de build (`make build`) avant/après.
- [ ] Vérifier les logs `[CacheHandler]` (Valkey) inchangés en comportement (revalidation, tags).

### Phase 3 — `proxy.ts` (voir section 4)
- [ ] Renommage + tests de routing multi-tenant sur plusieurs journaux (`epijinfo`, un journal avec
      config de langues custom).

### Phase 4 — POCs opt-in (chacun sur une branche courte, isolée, jetable si non concluant)
- [ ] `catchError` sur `articles/[id]` en complément de `error.tsx`.
- [ ] `next/root-params` sur une arborescence de pages statiques (`about`/`credits`/`indexing`).
- [ ] Cache mount BuildKit pour `docker/Dockerfile` si le FileSystem Cache de build s'avère bénéfique
      une fois mesuré.

### Phase 5 — Hors scope de ce cycle
- `cacheComponents` / Instant Navigations / Partial Prefetching : RFC séparée, à ne pas engager avant
  d'avoir un retour d'expérience stable sur la 16.3 de base en production.
- TypeScript 7 : chantier séparé, conditionné à la compatibilité `typescript-eslint`.

---

## 6. Checklist de rollback

Compte tenu de l'incident récent sur `cache-handler.js` (commit `a287ae8`), traiter cette migration
avec la même prudence :
- Déployer d'abord en préprod, jamais directement en prod (cohérent avec le nom des commits récents
  `fix(preprod): ...`).
- Confirmer que `deployment/ansible/rollback.yml` redémarre bien le service systemd après un rollback
  (corrigé dans `a287ae8`) avant de considérer le rollback comme un filet de sécurité fiable.
- Garder `VALKEY_ENABLED=false` disponible comme interrupteur de secours si le cache handler custom
  interagit mal avec un changement de runtime (`proxy.ts`) ou de streaming SSR.