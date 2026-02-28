# Sprint 6 — Plan Qualité & Couverture de Tests

> Généré le 2026-02-28 à partir d'un audit complet du code source.
> Référence : Context7 / Next.js 16 + React best practices.

---

## Contexte

- **316 fichiers source** (`.tsx`/`.ts`)
- **99 suites de tests, 1597 tests** — tous au vert
- **Couverture estimée** : ~31 % des fichiers source
- Priorité : bugs critiques d'abord, puis tests des composants à fort risque,
  puis améliorations de performance/accessibilité.

---

## Phase 1 — Bugs Critiques à Corriger

### B1 — Non-null assertion dangereuse après optional chaining (5 fichiers)

**Priorité : HIGH**

Pattern dangereux présent dans toutes les card components :
```typescript
// ❌ Actuel — labelPath! peut crasher si find() retourne undefined
t(articleTypes.find(tag => tag.value === article.tag)?.labelPath!)
```

**Fichiers concernés :**
- `src/components/Cards/ArticleCard/ArticleCard.tsx:59`
- `src/components/Cards/ArticleAcceptedCard/ArticleAcceptedCard.tsx:36`
- `src/components/Cards/SearchResultCard/SearchResultCard.tsx:64`
- `src/components/Cards/SectionArticleCard/SectionArticleCard.tsx:36`
- `src/components/Cards/VolumeArticleCard/VolumeArticleCard.tsx:38`

**Fix proposé :** helper `getArticleTypeLabel(tag, articleTypes)` qui retourne `''` si non trouvé.

---

### B2 — InteractiveDropdown : setState après unmount + pas d'AbortController

**Priorité : HIGH**

**Fichier :** `src/app/sites/[journalId]/[lang]/articles/[id]/components/InteractiveDropdown.tsx`

**Problèmes :**
1. `generateCitationsOnDemand` est async sans AbortController → appelle `setCitations` / `setIsLoadingCitations` même si le composant est démonté avant la fin du fetch.
2. `downloadMetadata` idem — crée un `<a>` dans le DOM sans cleanup si le composant est démonté.
3. Aucun handler `Escape` pour fermer le dropdown → violation WCAG 2.1 (pattern ARIA Menu Button).
4. Le `useEffect` pour `touchstart` n'a pas `showDropdown` comme dépendance mais s'enregistre une seule fois → listener toujours actif même dropdown fermé (minor perf).

**Fixes :**
- Utiliser `useRef<AbortController>` pour les fetches async, annuler dans le cleanup.
- Ajouter `Escape` dans `onKeyDown` du bouton trigger.
- Conditionner le listener `touchstart` sur `showDropdown` (ou remplacer par click-outside pattern existant avec `showDropdown` dep).

---

### B3 — `as any` dans des fichiers de production

**Priorité : MEDIUM**

Fichiers avec `as any` non justifié :
- `src/components/Cards/NewsCard/NewsCard.tsx`
- `src/components/LanguageInitializer/LanguageInitializer.tsx`
- `src/utils/article.ts`

**Fix :** typer correctement, extraire les types manquants.

---

## Phase 2 — Tests Manquants (composants à fort risque)

> Règle : un composant est "à fort risque" s'il a de la logique métier, de l'état,
> de l'accessibilité complexe, ou s'il est utilisé dans de nombreuses pages.

### T1 — Modals sans tests (4 composants)

| Composant | LOC | Risque | Complexité |
|---|---|---|---|
| `NewsMobileModal` | ~250 | HIGH | FocusTrap, years filter, footer dispatch |
| `ArticlesAcceptedMobileModal` | ~300 | HIGH | FocusTrap, type filter, tags |
| `ArticlesMobileModal` | ~384 | HIGH | FocusTrap, multi-filter |
| `VolumesMobileModal` | ~370 | HIGH | FocusTrap, section toggle |

**Pattern à suivre :** `StatisticsMobileModal.test.tsx` (19 tests) & `SearchResultsMobileModal.test.tsx` (35 tests).

Chaque suite doit couvrir :
- [ ] role="dialog" + aria-labelledby accessible
- [ ] FocusTrap actif
- [ ] Escape ferme la modal
- [ ] Lock/unlock body scroll
- [ ] Chaque section de filtre ouvre/ferme
- [ ] Sélection/désélection des filtres
- [ ] Bouton Apply callback
- [ ] Footer dispatch (`setFooterVisibility`)

---

### T2 — InteractiveDropdown (article detail)

**Fichier :** `src/app/sites/[journalId]/[lang]/articles/[id]/components/InteractiveDropdown.tsx`

Tests à couvrir :
- [ ] Type `cite` : affiche le loader, puis les citations après fetch
- [ ] Type `cite` : ne refetch pas si déjà généré (`citationsGenerated`)
- [ ] Type `metadata` : télécharge le metadata, déclenche le download
- [ ] Type `share` : affiche les boutons réseaux sociaux avec URLs corrects
- [ ] Dropdown s'ouvre/ferme au clic et Escape
- [ ] `aria-expanded` reflète l'état
- [ ] Pas de setState si composant démonté pendant fetch (abort)
- [ ] Retourne null si pas de données disponibles

---

### T3 — HomeSections non testées (3 composants)

| Composant | Description | Tests prioritaires |
|---|---|---|
| `IssuesSection` | Affiche les numéros de volume avec Image next/image | rendering, image alt, lien vers volume |
| `JournalSection` | Section "indexation" conditionelle | env var disable, rendering avec/sans contenu |
| `PresentationSection` | Section de présentation du journal | rendering avec/sans contenu |

---

### T4 — AuthorCard & SectionCard

- `AuthorCard` : memo, affichage ORCID/ROR conditionnel, liens sociaux
- `SectionCard` : memo, affichage avec/sans image, lien sémantique

---

### T5 — Sidebars prioritaires

| Sidebar | LOC | Logique principale |
|---|---|---|
| `ArticleDetailsSidebar` | ~593 | Dropdowns, liens, focus management |
| `VolumeDetailsSidebar` | ~250 | Filtres, navigation |
| `AuthorDetailsSidebar` | ~200 | Liens ORCID/ROR, institutions |

---

### T6 — Hooks manquants

| Hook | Description |
|---|---|
| `useClientSideFetch` | Déjà testé partiellement — compléter AbortController tests |

---

## Phase 3 — Performance

### P1 — Suspense boundaries pour les dynamic imports

Next.js 16 recommande d'envelopper les `dynamic()` dans `<Suspense>`.
**Fichiers :** tous les appels `dynamic(() => import(...), { ssr: false })` sans Suspense wrapper.

**Pattern recommandé :**
```tsx
<Suspense fallback={<Loader />}>
  <DynamicComponent />
</Suspense>
```

### P2 — Memoization des composants de liste

Les composants suivants sont rendus dans des listes sans `React.memo` :
- `SwiperArticleCard`
- `SwiperArticleAcceptedCard`
- `SwiperNewsCard`
- `SwiperBoardCard`

Ces cartes sont utilisées dans des Swipers qui re-renderisent souvent → ajouter `memo()`.

### P3 — useCallback manquant dans InteractiveDropdown

`generateCitationsOnDemand` et `downloadMetadata` sont recréées à chaque render — les wrapper avec `useCallback`.

---

## Phase 4 — Accessibilité Résiduelle

### A1 — InteractiveDropdown keyboard nav

- Ajouter Escape pour fermer (WCAG 2.1 — 2.1.1 Keyboard)
- Vérifier que `aria-haspopup="menu"` + `aria-expanded` est bien restitué par les lecteurs d'écran
- Navigation clavier dans le menu (Arrow Down/Up entre les `menuitem`)

### A2 — Pages sans loading/error boundaries

Les pages statiques (about, credits, indexing, etc.) n'ont pas de `loading.tsx` / `error.tsx`.
Recommandation : ajouter `loading.tsx` léger avec skeleton pour chaque sous-route.

**Pages concernées :**
- `about/`
- `acknowledgements/`
- `credits/`
- `indexing/`
- `for-authors/`
- `for-reviewers/`
- `for-conference-organisers/`
- `accessibility/`
- `ethical-charter/`
- `sections/`
- `search/`
- `statistics/`

---

## Récapitulatif — Ordre d'Exécution

```
Phase 1 — Bugs (à faire en priorité)
  [B1] Fix ?.labelPath! dans 5 card components
  [B2] Fix InteractiveDropdown : AbortController + Escape
  [B3] Nettoyer les `as any`

Phase 2 — Tests
  [T1] NewsMobileModal tests
  [T1] ArticlesAcceptedMobileModal tests
  [T1] ArticlesMobileModal tests (compléter)
  [T1] VolumesMobileModal tests
  [T2] InteractiveDropdown tests
  [T3] IssuesSection, JournalSection, PresentationSection tests
  [T4] AuthorCard, SectionCard tests
  [T5] ArticleDetailsSidebar tests
  [T5] VolumeDetailsSidebar tests

Phase 3 — Performance
  [P1] Suspense boundaries pour dynamic imports
  [P2] React.memo pour SwiperCards
  [P3] useCallback dans InteractiveDropdown

Phase 4 — Accessibilité
  [A1] Keyboard nav dans InteractiveDropdown
  [A2] loading.tsx pour pages statiques
```

---

## Métriques Cibles

| Métrique | Actuel | Cible Sprint 6 |
|---|---|---|
| Tests | 1597 | ~1850+ |
| Suites de test | 99 | ~115+ |
| Couverture fichiers | ~31% | ~40% |
| Bugs critiques ouverts | 3 | 0 |
| Modals sans tests | 4 | 0 |

---

## Références Best Practices Utilisées

- [Next.js 16 Testing Guide (Vitest)](https://nextjs.org/docs/app/guides/testing/vitest)
- WCAG 2.1 — 2.1.1 Keyboard, 4.1.2 Name Role Value
- ARIA Authoring Practices Guide — Menu Button Pattern
- React 19 — Server Components testing (E2E pour async SC, unit pour sync SC)
- Context7 `/vercel/next.js` — Vitest + React Testing Library patterns
