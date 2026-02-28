# Plan d'audit qualité — Episciences Front-Next

> Rédigé le 2026-02-27. Basé sur l'analyse statique du code (349 fichiers source, 84 fichiers de test).

---

## Résumé exécutif

| Métrique | Valeur |
|---|---|
| Fichiers source | 349 |
| Fichiers de test | 84 |
| Taux de couverture estimé | ~24 % |
| Bugs confirmés | 3 (dont 1 accessibilité critique) |
| Problèmes de performance | 2 |
| Composants sans aucun test | ~28 |

---

## Partie 1 — Bugs à corriger (priorité haute)

### BUG-01 · `key={index}` dans SearchResultCard — Anti-pattern React

**Fichier :** `src/components/Cards/SearchResultCard/SearchResultCard.tsx:230`

```tsx
// ❌ Actuel — clé instable, cause des recycages DOM incorrects
citations.map((citation, index) => (
  <span key={index} role="button" ...>

// ✅ Fix — utiliser la vraie clé métier
citations.map((citation) => (
  <span key={citation.key} role="button" ...>
```

**Impact :** Si le tableau `citations` se réordonne ou est mis à jour, React recycle les mauvais nœuds DOM. Les handlers `onClick` peuvent pointer vers la mauvaise citation.

**Effort :** 5 min.

---

### BUG-02 · `React.memo` comparateur incomplet dans `ArticleCard`

**Fichier :** `src/components/Cards/ArticleCard/ArticleCard.tsx:255-261`

```tsx
// ❌ Actuel — ignore les props language, rvcode, t, toggleAbstractCallback
export default React.memo(ArticleCard, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.openedAbstract === nextProps.article.openedAbstract
  );
});
```

**Impact :** Si la langue change (changement utilisateur), les traductions affichées restent obsolètes — le composant ne re-render pas car le comparateur dit "pareil".

**Fix :**

```tsx
export default React.memo(ArticleCard, (prevProps, nextProps) => {
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.openedAbstract === nextProps.article.openedAbstract &&
    prevProps.language === nextProps.language &&
    prevProps.rvcode === nextProps.rvcode
  );
});
```

**Effort :** 10 min.

---

### BUG-03 · `div[role="button"]` avec descendants interactifs dans SearchResultCard

**Fichier :** `src/components/Cards/SearchResultCard/SearchResultCard.tsx:~145`

Le bouton "Cite" est un `div[role="button"]` qui contient des `span[role="button"]` enfants. Ceci viole WCAG 4.1.1 (nested interactive) — le même problème qui avait été corrigé dans `MobileBurgerMenu`.

**Fix :** Remplacer le `div[role="button"]` externe par un `<button type="button">`, et les `span[role="button"]` internes par des `<button type="button">`.

**Effort :** 30 min.

---

## Partie 2 — Couverture de tests manquante (par priorité)

### Priorité 1 — Composants critiques utilisés partout

| Fichier | Raison |
|---|---|
| `src/components/Cards/ArticleCard/ArticleCard.tsx` | Composant central, logique de citation complexe, React.memo |
| `src/components/Cards/SearchResultCard/SearchResultCard.tsx` | Logique lazy-loading citations, interactions hover/click |
| `src/components/HomeClient/HomeClient.tsx` | Agrégateur de la page d'accueil |
| `src/components/Cards/ArticleAcceptedCard/ArticleAcceptedCard.tsx` | Similaire à ArticleCard |
| `src/components/Cards/SectionArticleCard/SectionArticleCard.tsx` | Carte article dans les sections |

**Ce qu'il faut tester :**
- Rendu conditionnel (abstract ouvert/fermé)
- Lazy loading des citations (hover → fetch déclenché, pas avant)
- Comportement avec `null` props ou données manquantes
- Accessibilité : boutons avec labels, tab order

### Priorité 2 — Utilitaires sans tests

| Fichier | Raison |
|---|---|
| `src/utils/env-loader.ts` | Critique côté serveur, cache en mémoire, lecture fichier |
| `src/utils/journal-filter.ts` | Détermine quels journaux sont buildés (prod vs preprod) |
| `src/utils/stat.ts` | Enums/constantes pour les statistiques |
| `src/utils/card.ts` | `RENDERING_MODE` enum |
| `src/utils/rendering.ts` | `RENDERING_MODE` enum (doublon à investiguer) |
| `src/utils/image-placeholders.ts` | Génération de placeholders |
| `src/utils/toast.ts` | Utilitaire toast, side effects |
| `src/utils/server-i18n.ts` | Traductions côté serveur |

**Ce qu'il faut tester :**
- `env-loader.ts` : `getJournalsList()` avec cache, `getJournalApiUrl()` avec validation, cas `window !== undefined`
- `journal-filter.ts` : filtre prod vs preprod selon `BUILD_ENV`

### Priorité 3 — Hooks sans tests

| Fichier | Raison |
|---|---|
| `src/hooks/journal.ts` | Hook central pour données journal |
| `src/hooks/lastVolume.ts` | Dernier volume, utilisé dans Header |
| `src/hooks/mathjax.ts` | Configuration MathJax |
| `src/hooks/store.ts` | Store Zustand ou Redux |

### Priorité 4 — Composants secondaires

| Fichier | Raison |
|---|---|
| `src/components/MathJax/MathJax.tsx` | Logique de montage complexe, hydratation |
| `src/components/ThemeStyleSwitch/ThemeStyleSwitch.tsx` | Toggle thème |
| `src/components/Modals/SearchResultsMobileModal/SearchResultsMobileModal.tsx` | Modal sans tests |
| `src/components/Modals/StatisticsMobileModal/StatisticsMobileModal.tsx` | Modal sans tests |
| `src/components/Modals/VolumeDetailsMobileModal/VolumeDetailsMobileModal.tsx` | Modal sans tests |
| `src/components/HomeSections/JournalSection/JournalSection.tsx` | Section accueil |
| `src/components/HomeSections/PresentationSection/PresentationSection.tsx` | Section accueil |
| `src/components/volumes/VolumeDetailsDesktop/VolumeDetailsDesktop.tsx` | Détails volume desktop |
| `src/components/Sidebars/AuthorDetailsSidebar/AuthorDetailsSidebar.tsx` | Sidebar détails auteur |
| `src/components/Sidebars/ForAuthorsSidebar/ForAuthorsSidebar.tsx` | Sidebar pour auteurs |
| `src/components/Sidebars/CreditsSidebar/CreditsSidebar.tsx` | Sidebar credits |

---

## Partie 3 — Problèmes de performance

### PERF-01 · Logique de citations dupliquée entre ArticleCard et SearchResultCard

Les deux composants implémentent exactement le même mécanisme :
- `shouldLoadCitations` state
- `hover` / `click` → déclenche le fetch
- Dropdown avec CSL + BibTeX

**Solution :** Extraire un hook `useCitationsDropdown(articleId, rvcode, lang)` partagé.

**Impact :** DRY, surface de test réduite, un seul endroit à corriger en cas de bug.

**Effort :** 2h.

---

### PERF-02 · `touchstart` écouteur avec mauvais tableau de dépendances

**Fichier :** `src/components/Cards/SearchResultCard/SearchResultCard.tsx` (et ArticleCard)

```tsx
useEffect(() => {
  const handleTouchOutside = (event: TouchEvent) => { ... };
  document.addEventListener('touchstart', handleTouchOutside);
  return () => document.removeEventListener('touchstart', handleTouchOutside);
}, [citationsDropdownRef]); // ❌ ref stable, ce tableau doit être []
```

La `ref` ne change jamais, mais inclure `citationsDropdownRef` dans les deps est trompeur et peut causer des ré-inscriptions inutiles si la ref change. Le bon tableau est `[]`.

**Effort :** 5 min.

---

## Partie 4 — Accessibilité (WCAG 2.1 AA)

### A11Y-01 · Semantic HTML — `div[role="button"]` (voir BUG-03)

Pattern répandu dans le codebase. Chaque occurrence doit être auditée :

```bash
grep -rn 'role="button"' src/components --include="*.tsx"
```

Remplacer systématiquement `div[role="button"]` et `span[role="button"]` par `<button type="button">` natifs.

### A11Y-02 · Modales sans tests d'accessibilité

`SearchResultsMobileModal`, `StatisticsMobileModal`, `VolumeDetailsMobileModal` — vérifier qu'elles ont :
- `role="dialog"` + `aria-labelledby`
- `FocusTrap` ou équivalent
- Fermeture `Escape`

Pattern de référence : `ArticlesMobileModal` (déjà corrigé).

### A11Y-03 · MathJax et lecteurs d'écran

`MathJax.tsx` utilise `suppressHydrationWarning` mais les formules mathématiques doivent avoir un `aria-label` ou `aria-describedby` pour les lecteurs d'écran. À investiguer selon les besoins des utilisateurs.

---

## Partie 5 — Plan de travail séquencé

### Sprint 1 — Bugs (< 1 jour) ✅ TERMINÉ

1. [x] **BUG-01** Fix `key={index}` → `key={citation.key}` dans ArticleCard + SearchResultCard
2. [x] **BUG-02** Fix comparateur React.memo dans ArticleCard (ajout `language`, `rvcode`)
3. [x] **BUG-03** `div[role="button"]` abstract toggle → `<button type="button">` dans ArticleCard + SearchResultCard
4. [x] **BUG-03** Restructuration section cite : trigger `<button>`, citations `<button>`, dropdown hors du bouton
5. [x] **PERF-02** Fix tableau de dépendances `useEffect` touchstart `[citationsDropdownRef]` → `[]`
6. [x] Import `handleKeyboardClick` inutilisé supprimé des deux fichiers
7. [x] CSS button reset ajouté dans ArticleCard.scss + SearchResultCard.scss
8. [x] 1276/1276 tests passent

### Sprint 2 — Tests priorité 1 (2-3 jours) ✅ TERMINÉ

6. [x] `ArticleCard.test.tsx` — rendu, abstract toggle, lazy citations, a11y, memo
7. [x] `SearchResultCard.test.tsx` — rendu, lazy citations hover/click, dropdown, a11y
8. [x] `ArticleAcceptedCard.test.tsx` — rendu, abstract toggle (callback), a11y
9. [x] `SectionArticleCard.test.tsx` — rendu, liens, a11y
   - Fix associé : `ArticleAcceptedCard` `div[role="button"]` → `<button type="button">` + CSS reset + suppression `handleKeyboardClick`
   - 1376 tests passent (88 fichiers)

### Sprint 3 — Tests priorité 2 (1-2 jours) ✅ PARTIELLEMENT TERMINÉ

10. [x] `env-loader.test.ts` — cache, validation (path traversal), server/client guard, API URL resolution
    - Technique : `createRequire(import.meta.url)` pour intercepter `require('fs')` dans les modules CJS/ESM
11. [x] `journal-filter.test.ts` — prod vs preprod, edge cases (liste vide, tout preprod)
    - Technique : `vi.hoisted()` + getter pour mutable mock de `journals`
12. [x] `stat.test.ts` — enums, `statTypes`, `statEvaluationTypes`, no duplicates
    - 1430 tests passent (91 fichiers)
13. [x] `hooks/journal.test.ts` — RTK Query call, dispatch conditionnel, guard re-dispatch
14. [x] `hooks/lastVolume.test.ts` — skip query, dispatch conditionnel (volumes vides, lastVolume déjà set)
    - 1448 tests passent (93 fichiers)

### Sprint 4 — Tests priorité 3 (2-3 jours) ✅ PARTIELLEMENT TERMINÉ

15. [x] `MathJax.test.tsx` — SSR via renderToString, mounted state, timer cleanup, window.MathJax mock
    - Technique : `renderToString` pour tester le state SSR `data-mathjax-state="not-mounted"`
    - `vi.useFakeTimers()` + `vi.advanceTimersByTime(50)` pour le timer de 50ms
    - 17 tests
16. [x] `SearchResultsMobileModal.test.tsx` — focus trap, a11y, Escape, body overflow, tags, apply, footer dispatch
    - 35 tests
17. [x] `StatisticsMobileModal.test.tsx` — focus trap, a11y, checkboxes, toggle section, apply, footer dispatch
    - Technique footer : `vi.spyOn(store, 'dispatch')` car `useEffect` re-dispatche `setFooterVisibility(false)` juste après
    - 19 tests
18. [x] `VolumeDetailsMobileModal.test.tsx` — focus trap, a11y, volume selection toggle, title/submit par VOLUME_TYPE, footer dispatch
    - 25 tests — 1544 tests passent (97 fichiers)
19. [x] `HomeClient.test.tsx` — rendu sections, désactivation via env var, lastInformation, emptyHomeData
    - Tous les enfants mockés (PresentationSection, NewsSection, etc.)
    - Blocs contrôlés via `process.env` (cleanup dans afterEach)
    - Bug documenté: `indexation = { content: {} }` par défaut → JournalSection toujours affichée sauf env var
    - 33 tests — 1577 tests passent (98 fichiers)

### Sprint 5 — Refactoring (optionnel, 1 jour) ✅ TERMINÉ

20. [x] **PERF-01** Extraire hook `useCitationsDropdown` partagé entre ArticleCard et SearchResultCard
    - `src/hooks/useCitationsDropdown.ts` — 3 états, 2 RTK queries, 2 useEffects, 3 handlers
    - ArticleCard.tsx et SearchResultCard.tsx réduits de ~80 lignes chacun
    - 20 tests dans `src/hooks/__tests__/useCitationsDropdown.test.tsx`
    - 1597 tests passent (99 fichiers)
21. [x] Supprimer doublon `src/utils/rendering.ts` (0 importeur) — `card.ts` conservé (6 importeurs)

---

## Références

- [Next.js Testing Docs](https://nextjs.org/docs/app/guides/testing)
- [WCAG 2.1 AA — Success Criterion 4.1.1](https://www.w3.org/WAI/WCAG21/Understanding/parsing.html)
- [WCAG 2.1 AA — Success Criterion 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
- [React memo comparator](https://react.dev/reference/react/memo#minimizing-props-changes)
- Patterns internes : `docs/ACCESSIBLE_COLOR_SYSTEM.md`, `docs/CODING_STANDARDS.md`
