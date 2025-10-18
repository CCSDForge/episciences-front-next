# Stratégie de Tests - Episciences Front Next.js

> Document de référence pour l'implémentation d'une suite de tests complète
> Date: 2025-10-04

## 📊 État actuel

### Ce qui existe
- ❌ **Aucun test** actuellement dans le projet
- ❌ Pas de framework de test configuré
- ❌ Pas de CI/CD pour les tests
- ✅ Docker test environment (Apache) - partiellement fonctionnel
- ✅ Makefile avec targets de build par journal

### Architecture du projet
- **Framework**: Next.js 14 avec App Router
- **Build**: Statique (output: 'export') multi-journal
- **State**: Redux Toolkit
- **i18n**: i18next / react-i18next
- **Styling**: SASS modules
- **TypeScript**: Activé (mais `ignoreBuildErrors: true` ⚠️)

### Particularités critiques à tester
1. **Build statique multi-journal** - chaque journal a sa config
2. **Génération .htaccess dynamique** (mono vs multi-langue)
3. **safeFetch()** qui mock les appels API pendant le build
4. **Configuration par variables d'environnement** (fichiers `.env.local.*`)
5. **Scripts de build personnalisés** (Makefile, Node.js scripts)

---

## 🎯 Stratégie globale recommandée

### Philosophie
1. **Progressive** - commencer par les fonctions pures (utils)
2. **ROI-driven** - tester ce qui casse le plus souvent
3. **Build-aware** - tester spécifiquement le système multi-journal
4. **Developer-friendly** - tests rapides, feedback clair

### Pyramide de tests adaptée

```
        ┌─────────────────┐
        │   E2E Build     │  ← Build multi-journal (UNIQUE)
        │   Tests (5%)    │     Playwright sur sites statiques
        └─────────────────┘
             ┌───────────────────┐
             │  Integration (15%)│  ← Redux + i18n + Pages
             │  Tests            │     Components complexes
             └───────────────────┘
                  ┌─────────────────────┐
                  │  Component (30%)    │  ← React Testing Library
                  │  Tests              │     Composants isolés
                  └─────────────────────┘
                       ┌──────────────────────────┐
                       │   Unit Tests (50%)       │  ← Utils, Services
                       │   Vitest                 │     Fonctions pures
                       └──────────────────────────┘
```

---

## 🛠 Stack technique recommandée

### Framework de test: **Vitest** (vs Jest)

**Pourquoi Vitest?**
- ✅ **Vitesse**: ~10x plus rapide que Jest
- ✅ **ESM natif**: Pas de transformation commonjs/esm
- ✅ **Compatible Next.js**: Fonctionne bien avec l'écosystème moderne
- ✅ **API compatible Jest**: Migration facile si nécessaire
- ✅ **UI intégrée**: Interface web pour debug (`vitest --ui`)
- ✅ **Watch mode intelligent**: Re-run seulement tests impactés
- ✅ **Coverage v8**: Plus rapide que Istanbul

**Alternative**: Jest (si équipe déjà familière, mais plus lent)

### Testing Library: **@testing-library/react**

**Pourquoi Testing Library?**
- ✅ Best practice React officielle
- ✅ Tests centrés utilisateur (pas sur implémentation)
- ✅ Force l'accessibilité
- ✅ Queries sémantiques (`getByRole`, `getByLabelText`)

### E2E: **Playwright** (vs Cypress)

**Pourquoi Playwright?**
- ✅ **Excellent pour sites statiques** (pas de backend requis)
- ✅ Multi-browser (Chromium, Firefox, WebKit)
- ✅ Tests de régression visuelle possibles
- ✅ Peut tester les builds Apache/Docker
- ✅ Meilleure parallélisation

### Mocking: **MSW (Mock Service Worker)**

**Pourquoi MSW?**
- ✅ Mock au niveau réseau (pas d'imports à modifier)
- ✅ Fonctionne en dev ET en tests
- ✅ Réutilisable entre tests et Storybook

---

## 📦 Installation initiale

### Packages à installer

```bash
# Core testing
npm install -D vitest @vitest/ui jsdom @vitest/coverage-v8

# React testing
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Mocking
npm install -D msw

# E2E (optionnel, phase 6)
npm install -D @playwright/test

# Types
npm install -D @types/testing-library__jest-dom
```

### Configuration Vitest

Créer `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.*',
        '**/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Créer `vitest.setup.ts`:

```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Cleanup après chaque test
afterEach(() => {
  cleanup()
})

// Mock variables d'environnement
process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'test-journal'
process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT = 'https://api.test.com'
process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE = 'en'
process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES = 'en,fr'
```

### Scripts package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

---

## 📋 Plan d'implémentation par phases

### Phase 1: Tests unitaires - Utilitaires (PRIORITÉ HAUTE)

**Objectif**: Tester les fonctions pures (faciles, ROI élevé)

#### Fichiers prioritaires

1. **`src/utils/date.ts`**
   - `parseDate()` - 3 formats différents
   - `formatDate()` - multilangue
   - **Tests**: ~10 cas (dates valides, invalides, formats différents, langues)

2. **`src/utils/static-build.ts`** ⚠️ CRITIQUE
   - `isStaticBuild` - détection environnement
   - `getJournalCode()` - gestion erreurs
   - `safeFetch()` - comportement build vs runtime
   - **Tests**: ~8 cas (mock window, env vars, fetch)

3. **`src/utils/pagination.ts`**
   - Types PaginatedResponse
   - Helpers de pagination
   - **Tests**: ~5 cas

4. **`src/utils/filter.ts`**
   - Logique de filtrage
   - **Tests**: ~6-8 cas

5. **`src/utils/article.ts`, `volume.ts`, `board.ts`**
   - Transformations de données
   - **Tests**: ~5 cas chacun

#### Exemple de test: `date.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { formatDate } from '@/utils/date'

describe('formatDate', () => {
  it('should format ISO date in English', () => {
    const result = formatDate('2024-03-15T10:00:00Z', 'en')
    expect(result).toBe('March 15, 2024')
  })

  it('should format ISO date in French', () => {
    const result = formatDate('2024-03-15T10:00:00Z', 'fr')
    expect(result).toBe('15 mars 2024')
  })

  it('should handle DD/MM/YYYY format', () => {
    const result = formatDate('15/03/2024', 'en')
    expect(result).toBe('March 15, 2024')
  })

  it('should handle YYYY-MM-DD format', () => {
    const result = formatDate('2024-03-15', 'en')
    expect(result).toBe('March 15, 2024')
  })

  it('should return empty string for invalid date', () => {
    const result = formatDate('invalid-date', 'en')
    expect(result).toBe('')
  })

  it('should return empty string for undefined', () => {
    const result = formatDate(undefined, 'en')
    expect(result).toBe('')
  })
})
```

#### Exemple: `static-build.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isStaticBuild, getJournalCode, safeFetch } from '@/utils/static-build'

describe('static-build utils', () => {
  describe('isStaticBuild', () => {
    it('should return true in Node.js environment', () => {
      expect(isStaticBuild).toBe(true)
    })
  })

  describe('getJournalCode', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_JOURNAL_RVCODE', 'test-journal')
    })

    it('should return journal code from env', () => {
      expect(getJournalCode()).toBe('test-journal')
    })

    it('should throw error if RVCODE is missing', () => {
      vi.stubEnv('NEXT_PUBLIC_JOURNAL_RVCODE', '')
      expect(() => getJournalCode()).toThrow('required')
    })
  })

  describe('safeFetch', () => {
    it('should return static data during build', async () => {
      const mockData = { id: 1, name: 'Test' }
      const result = await safeFetch('https://api.test.com/test', {}, mockData)
      expect(result).toEqual(mockData)
    })

    it('should return empty object if no static data provided', async () => {
      const result = await safeFetch('https://api.test.com/test')
      expect(result).toEqual({})
    })
  })
})
```

**Estimation**: 1-2 jours pour 15-20 fichiers de tests utilitaires

---

### Phase 2: Tests unitaires - Services API (PRIORITÉ MOYENNE)

**Objectif**: Tester les appels API et transformations de données

#### Fichiers prioritaires

1. **`src/services/api.helper.ts`** ⚠️ CRITIQUE
   - `apiCall()` - gestion erreurs HTTP
   - `fetchPaginatedResults()` - pagination Hydra
   - `fetchResourceById()` - récupération par ID

2. **`src/services/article.ts`**
   - Récupération articles
   - Transformations

3. **`src/services/volume.ts`, `author.ts`, `search.ts`**
   - Services métier

#### Stratégie de mocking

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiCall } from '@/services/api.helper'

// Mock global fetch
global.fetch = vi.fn()

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_API_ROOT_ENDPOINT', 'https://api.test.com')
  })

  it('should call API with correct URL and headers', async () => {
    const mockResponse = { data: 'test' }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await apiCall('/articles')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/articles',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/ld+json',
        }),
      })
    )
    expect(result).toEqual(mockResponse)
  })

  it('should throw error on HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response)

    await expect(apiCall('/not-found')).rejects.toThrow('API error: 404')
  })

  it('should handle network errors', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    await expect(apiCall('/articles')).rejects.toThrow('Network error')
  })
})
```

**Alternative avec MSW** (recommandé pour tests plus complexes):

```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('https://api.test.com/articles', () => {
    return HttpResponse.json({
      'hydra:member': [{ id: 1, title: 'Test' }],
      'hydra:totalItems': 1,
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Estimation**: 2-3 jours pour ~10 services

---

### Phase 3: Tests de composants (PRIORITÉ MOYENNE)

**Objectif**: Tester les composants React isolés

#### Composants prioritaires (du simple au complexe)

**Niveau 1 - Composants simples:**
1. `src/components/Button/Button.tsx`
2. `src/components/Tag/Tag.tsx`
3. `src/components/Checkbox/Checkbox.tsx`

**Niveau 2 - Composants avec logique:**
4. `src/components/Pagination/Pagination.tsx`
5. `src/components/Link/Link.tsx` (custom link component)

**Niveau 3 - Cards (affichage de données):**
6. `src/components/Cards/ArticleCard/ArticleCard.tsx`
7. `src/components/Cards/VolumeCard/VolumeCard.tsx`
8. `src/components/Cards/AuthorCard/AuthorCard.tsx`

#### Exemple: `Button.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<Button className="custom-class">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
```

#### Exemple: `ArticleCard.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleCard from './ArticleCard'

const mockArticle = {
  id: 123,
  title: 'Test Article Title',
  authors: ['Author 1', 'Author 2'],
  publicationDate: '2024-03-15',
  abstract: 'This is a test abstract',
}

describe('ArticleCard', () => {
  it('should render article title', () => {
    render(<ArticleCard article={mockArticle} />)
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })

  it('should render all authors', () => {
    render(<ArticleCard article={mockArticle} />)
    expect(screen.getByText(/Author 1/)).toBeInTheDocument()
    expect(screen.getByText(/Author 2/)).toBeInTheDocument()
  })

  it('should render publication date formatted', () => {
    render(<ArticleCard article={mockArticle} language="en" />)
    expect(screen.getByText(/March 15, 2024/)).toBeInTheDocument()
  })

  it('should link to article details page', () => {
    render(<ArticleCard article={mockArticle} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/articles/123'))
  })
})
```

#### Pattern pour composants avec i18n

```typescript
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'

// Helper pour wrapper avec i18n
function renderWithI18n(component: React.ReactElement, locale = 'en') {
  i18n.init({
    lng: locale,
    resources: {
      en: { translation: require('../../public/locales/en/translation.json') },
      fr: { translation: require('../../public/locales/fr/translation.json') },
    },
  })

  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  )
}
```

**Estimation**: 3-5 jours pour ~20 composants prioritaires

---

### Phase 4: Tests d'intégration (PRIORITÉ BASSE)

**Objectif**: Tester interactions entre composants, Redux, i18n

#### Scénarios

1. **Redux Store + Actions**
   - Tester le store Redux avec actions
   - Vérifier les reducers

2. **Pages complètes avec routing**
   - Mock Next.js router
   - Tester navigation

3. **Composants avec i18n**
   - Changement de langue
   - Vérifier traductions

#### Exemple: Redux integration test

```typescript
import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Exemple avec un composant qui utilise Redux
describe('Article filters with Redux', () => {
  it('should update filters in store when user interacts', async () => {
    const store = configureStore({
      reducer: { /* your reducers */ },
    })

    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <ArticleFilters />
      </Provider>
    )

    // Interaction
    await user.click(screen.getByLabelText(/filter by year/i))
    await user.selectOptions(screen.getByRole('combobox'), '2024')

    // Vérifier le state Redux
    expect(store.getState().filters.year).toBe('2024')
  })
})
```

**Estimation**: 2-3 jours

---

### Phase 5: Tests E2E - Build multi-journal (PRIORITÉ HAUTE - UNIQUE) ⭐

**Objectif**: Tester la spécificité critique de votre projet

#### 5.1 Tests de build statique (Scripts Bash)

Créer `tests/build/test-multi-journal-build.sh`:

```bash
#!/bin/bash
set -e

echo "=== Testing Multi-Journal Static Build ==="

JOURNALS=("epijinfo" "jsedi" "jips")
FAILURES=0

for JOURNAL in "${JOURNALS[@]}"; do
  echo ""
  echo "Testing journal: $JOURNAL"

  # Build
  make clean
  make $JOURNAL

  # Vérifications
  DIST_DIR="dist/$JOURNAL"

  # 1. Build directory existe
  if [ ! -d "$DIST_DIR" ]; then
    echo "❌ FAIL: $DIST_DIR not found"
    FAILURES=$((FAILURES + 1))
    continue
  fi
  echo "✅ Build directory exists"

  # 2. .htaccess généré
  if [ ! -f "$DIST_DIR/.htaccess" ]; then
    echo "❌ FAIL: .htaccess not found"
    FAILURES=$((FAILURES + 1))
  else
    echo "✅ .htaccess generated"

    # Vérifier contenu .htaccess
    if grep -q "RewriteEngine On" "$DIST_DIR/.htaccess"; then
      echo "✅ .htaccess contains RewriteEngine"
    else
      echo "❌ FAIL: .htaccess invalid"
      FAILURES=$((FAILURES + 1))
    fi
  fi

  # 3. Logos copiés
  if [ -f "$DIST_DIR/logos/logo-big.svg" ] && [ -f "$DIST_DIR/logos/logo-small.svg" ]; then
    echo "✅ Logos copied"
  else
    echo "❌ FAIL: Logos missing"
    FAILURES=$((FAILURES + 1))
  fi

  # 4. Locales copiés
  if [ -d "$DIST_DIR/locales" ]; then
    echo "✅ Locales directory exists"
  else
    echo "❌ FAIL: Locales missing"
    FAILURES=$((FAILURES + 1))
  fi

  # 5. HTML files générés
  HTML_COUNT=$(find "$DIST_DIR" -name "*.html" | wc -l)
  if [ "$HTML_COUNT" -gt 0 ]; then
    echo "✅ HTML files generated ($HTML_COUNT files)"
  else
    echo "❌ FAIL: No HTML files"
    FAILURES=$((FAILURES + 1))
  fi

  # 6. robots.txt et sitemap.xml
  if [ -f "$DIST_DIR/robots.txt" ]; then
    if grep -q "$JOURNAL.episciences.org" "$DIST_DIR/robots.txt"; then
      echo "✅ robots.txt contains correct domain"
    else
      echo "❌ FAIL: robots.txt has wrong domain"
      FAILURES=$((FAILURES + 1))
    fi
  fi
done

echo ""
echo "=== Build Tests Complete ==="
if [ $FAILURES -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ $FAILURES test(s) failed"
  exit 1
fi
```

Ajouter au `package.json`:

```json
{
  "scripts": {
    "test:build": "bash tests/build/test-multi-journal-build.sh",
    "test:build:quick": "JOURNALS='epijinfo' bash tests/build/test-multi-journal-build.sh"
  }
}
```

#### 5.2 Tests .htaccess mono vs multi-langue

Créer `tests/build/test-htaccess-generation.sh`:

```bash
#!/bin/bash

test_monolingual_htaccess() {
  JOURNAL="jsedi"  # Journal monolingue (EN only)
  make $JOURNAL

  HTACCESS="dist/$JOURNAL/.htaccess"

  # Vérifier mode monolingual
  if grep -q "Monolingual site" "$HTACCESS"; then
    echo "✅ Monolingual mode detected"
  else
    echo "❌ FAIL: Should be monolingual"
    return 1
  fi

  # Vérifier transparent rewrite (pas de redirect visible)
  if grep -q "RewriteRule.*\[L\]$" "$HTACCESS" && ! grep -q "\[R=" "$HTACCESS"; then
    echo "✅ Transparent rewrite (no redirect)"
  else
    echo "❌ FAIL: Should use transparent rewrite"
    return 1
  fi
}

test_multilingual_htaccess() {
  JOURNAL="epijinfo"  # Journal multilingue
  make $JOURNAL

  HTACCESS="dist/$JOURNAL/.htaccess"

  # Vérifier mode multilingual
  if grep -q "Multilingual site" "$HTACCESS"; then
    echo "✅ Multilingual mode detected"
  else
    echo "❌ FAIL: Should be multilingual"
    return 1
  fi

  # Vérifier redirect visible
  if grep -q "\[R=302,L\]" "$HTACCESS"; then
    echo "✅ Visible redirect to default language"
  else
    echo "❌ FAIL: Should redirect to language"
    return 1
  fi
}
```

#### 5.3 Tests E2E avec Playwright

Installer:
```bash
npm install -D @playwright/test
npx playwright install
```

Créer `tests/e2e/multi-journal.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const JOURNALS = ['epijinfo', 'jsedi', 'jips']

for (const journal of JOURNALS) {
  test.describe(`Journal: ${journal}`, () => {
    test.use({ baseURL: `http://localhost:8080` })

    test('should load homepage', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveTitle(new RegExp(journal, 'i'))
    })

    test('should have correct logo', async ({ page }) => {
      await page.goto('/')
      const logo = page.locator('img[src*="logo"]').first()
      await expect(logo).toBeVisible()
    })

    test('should navigate to articles page', async ({ page }) => {
      await page.goto('/')
      await page.click('a[href*="articles"]')
      await expect(page).toHaveURL(/\/articles/)
    })

    test('should handle 404 correctly', async ({ page }) => {
      const response = await page.goto('/non-existent-page')
      expect(response?.status()).toBe(404)
    })
  })
}
```

Tester un build complet:
```bash
# Build journal
make jsedi

# Start Apache Docker
make docker-test JOURNAL=jsedi PORT=8080

# Run E2E tests
npx playwright test tests/e2e/multi-journal.spec.ts

# Stop Apache
make docker-stop
```

**Estimation**: 1-2 jours pour scripts + E2E setup

---

### Phase 6: Tests de régression Apache/Docker (PRIORITÉ MOYENNE)

**Objectif**: Améliorer les tests Docker existants avec assertions automatiques

Créer `tests/docker/test-apache-config.sh`:

```bash
#!/bin/bash

JOURNAL=$1
PORT=${2:-8080}

if [ -z "$JOURNAL" ]; then
  echo "Usage: $0 <journal> [port]"
  exit 1
fi

# Start container
make docker-test JOURNAL=$JOURNAL PORT=$PORT &
DOCKER_PID=$!
sleep 5

echo "=== Testing Apache Configuration for $JOURNAL ==="

# Test 1: Homepage accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Homepage returns 200"
else
  echo "❌ Homepage returns $HTTP_CODE (expected 200)"
  make docker-stop
  exit 1
fi

# Test 2: Language redirect (pour multilingue)
REDIRECT=$(curl -s -o /dev/null -w "%{redirect_url}" -L http://localhost:$PORT/)
if [[ "$REDIRECT" =~ /en/ ]] || [[ "$REDIRECT" =~ /fr/ ]]; then
  echo "✅ Language redirect works"
else
  echo "⚠️  No language redirect (might be monolingual)"
fi

# Test 3: Old URL redirects
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/browse/latest)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  echo "✅ Old URL redirects work"
else
  echo "❌ Old URL redirect failed (got $HTTP_CODE)"
fi

# Test 4: Static assets accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/logos/logo-big.svg)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Static assets accessible"
else
  echo "❌ Static assets not accessible (got $HTTP_CODE)"
fi

# Cleanup
make docker-stop

echo "=== Apache Tests Complete ==="
```

**Estimation**: 0.5-1 jour

---

### Phase 7: CI/CD avec GitHub Actions (PRIORITÉ MOYENNE)

**Objectif**: Automatiser les tests sur chaque PR

Créer `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  build-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        journal: [epijinfo, jsedi, jips]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build ${{ matrix.journal }}
        run: make ${{ matrix.journal }}

      - name: Verify build artifacts
        run: |
          test -f dist/${{ matrix.journal }}/.htaccess
          test -f dist/${{ matrix.journal }}/robots.txt
          test -d dist/${{ matrix.journal }}/locales

      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ matrix.journal }}
          path: dist/${{ matrix.journal }}

  e2e-tests:
    runs-on: ubuntu-latest
    needs: build-tests

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          path: dist/

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**Estimation**: 0.5-1 jour

---

## 📊 Métriques et objectifs de coverage

### Objectifs de coverage par catégorie

```
src/utils/         → 80%+ (fonctions pures, faciles à tester)
src/services/      → 70%+ (API calls, logique métier)
src/components/    → 50%+ (UI, moins critique)
src/app/           → 30%+ (pages, routing Next.js)
scripts/           → 60%+ (build scripts Node.js)

GLOBAL TARGET: 60%+
```

### Métriques à suivre

- **Coverage total**: >60%
- **Vitesse des tests**: <10s pour suite complète unitaire
- **Flakiness**: 0% (tests déterministes)
- **Maintenance**: Tests clairs et bien organisés

### Commandes de vérification

```bash
# Coverage local
npm run test:coverage

# Coverage par fichier
npx vitest --coverage --reporter=verbose

# Tests spécifiques
npx vitest utils/date  # Seulement date.test.ts

# Watch mode
npm run test:watch
```

---

## 🎯 Quick Wins - Par où commencer?

### Semaine 1: Setup + Utils (5-8h)

**Jour 1-2: Infrastructure (2-3h)**
1. Installer Vitest + Testing Library
2. Créer `vitest.config.ts` et `vitest.setup.ts`
3. Ajouter scripts npm
4. Premier test simple (`Button.test.tsx`)

**Jour 3-4: Utils critiques (3-4h)**
1. `date.test.ts` - 10 tests
2. `static-build.test.ts` - 8 tests
3. `pagination.test.ts` - 5 tests

**Jour 5: Build tests (2h)**
1. Script `test-multi-journal-build.sh`
2. Vérifier .htaccess generation

### Semaine 2: Services + Composants (8-10h)

**Services API (4-5h)**
1. `api.helper.test.ts` - mock fetch
2. `article.test.ts` - transformations
3. `volume.test.ts`

**Composants simples (4-5h)**
1. `Button.test.tsx`
2. `Tag.test.tsx`
3. `Pagination.test.tsx`
4. `ArticleCard.test.tsx`

### Semaine 3+: Intégration + E2E

- Tests Redux
- Tests i18n
- Playwright E2E
- CI/CD GitHub Actions

---

## 🚨 Pièges à éviter

### 1. **TypeScript `ignoreBuildErrors: true`** ⚠️

Actuellement dans `next.config.js`:
```javascript
typescript: {
  ignoreBuildErrors: true,  // DANGEREUX!
}
```

**Problème**: Les tests révéleront des erreurs TypeScript masquées

**Solution**:
- Fixer progressivement les erreurs TS
- Ou utiliser `// @ts-expect-error` pour les cas legacy

### 2. **Mocking de `window` pour static build**

Tests doivent gérer `typeof window === 'undefined'`:

```typescript
// Mauvais
if (window.location) { ... }

// Bon
if (typeof window !== 'undefined' && window.location) { ... }
```

### 3. **Variables d'environnement**

Toujours mocker dans `vitest.setup.ts`:

```typescript
process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'test-journal'
```

### 4. **i18n dans les tests**

Utiliser un wrapper ou mocker i18next:

```typescript
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))
```

### 5. **Next.js Router**

Mocker le router Next.js:

```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}))
```

---

## 📚 Resources

### Documentation
- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)
- [MSW](https://mswjs.io/)

### Exemples de projets similaires
- [Next.js examples](https://github.com/vercel/next.js/tree/canary/examples/with-vitest)
- [Testing Library examples](https://github.com/testing-library/react-testing-library/tree/main/examples)

### Articles recommandés
- "Testing Next.js applications with Vitest"
- "Static site testing strategies"
- "Multi-tenant application testing"

---

## ✅ Checklist finale

Avant de commencer:

- [ ] Lire ce document en entier
- [ ] Décider des priorités business (utils? build? composants?)
- [ ] Allouer du temps dédié (ne pas faire "entre deux tâches")
- [ ] Installer Vitest localement et tester

Phase 1 complétée quand:

- [ ] Vitest configuré et fonctionnel
- [ ] Au moins 5 fichiers utils testés
- [ ] Coverage >70% sur `src/utils/`
- [ ] CI qui run les tests

Succès final quand:

- [ ] Coverage global >60%
- [ ] Build tests passent pour 3+ journaux
- [ ] E2E tests couvrent parcours critiques
- [ ] Équipe utilise TDD pour nouvelles features
- [ ] Tests <15s en local, <2min en CI

---

**Dernière mise à jour**: 2025-10-04
**Auteur**: Claude Code
**Version**: 1.0