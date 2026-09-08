# Accessible Color System

## Overview

Episciences hosts 64+ journals, each with a single custom brand color. From that one
color we derive, server-side, a full family of WCAG-compliant variants — for **both**
a light and a dark scheme — using a zero-dependency OKLCH engine
([`src/utils/oklch.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts) + [`src/utils/colorContrast.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/colorContrast.ts)).

This document describes the current architecture. It replaces the pre-dark-mode
version — `src/config/theme.ts` (client-side `applyThemeVariables`) no longer exists;
everything is computed server-side in [`src/app/sites/[journalId]/layout.tsx`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/app/sites/[journalId]/layout.tsx).

## Plain-Language Explanation: How It Works & Why

If you are not a frontend specialist or color scientist, here is the intuitive picture behind this system.

### 1. The challenge: 60+ journals, each with a single color
Episciences hosts dozens of independent scientific journals. Each has its own visual identity, defined by **a single brand color**: deep navy for one, burgundy for another, golden yellow or emerald green for others.
- On a traditional white web page, writing text in pale yellow or orange is **illegible**.
- In **dark mode** (dark gray/anthracite background), a dark navy or deep burgundy text becomes **completely invisible**.
- Asking every journal editorial board to manually design and maintain 15 different color swatches for both day and night would be error-prone and unsustainable.

### 2. The solution: An automated, accessible "color factory"
Instead of manual palettes, the system uses an intelligent mathematical engine running on the server:
- **The journal provides just one color** (its raw brand color).
- **The engine automatically generates the full wardrobe**: text colors, button states, focus outlines, borders, and card backgrounds, for **both light and dark themes**.
- **100% legibility is mathematically guaranteed**: Before rendering, the engine calculates the contrast ratio against the background. If a color falls short of international accessibility standards (WCAG 2.2 AA), it automatically adjusts the brightness until it is perfectly readable.

### 3. How Light Mode works (Daytime)
- The page background is crisp white or light pearl gray.
- If the journal's color is naturally dark (e.g. deep blue), the system keeps it untouched.
- If the color is too bright or pale (e.g. golden yellow), the algorithm **darkens it just enough** to make it crisp and comfortable to read, while retaining its original color hue.

### 4. How Dark Mode works (Nighttime)
Dark mode is not simply "pitch black with white text", which causes eye fatigue and harsh visual vibration:
- **No pitch-black void**: Backgrounds never use pure `#000000`. Instead, they use a soft, modern **anthracite dark gray subtly tinted** with a small touch of the journal's brand hue. Every journal gets its own harmonious dark ambiance.
- **Brightened, but not neon**: On dark surfaces, the brand color is automatically lightened so it pops nicely. To prevent glowing "neon halos" that strain the eyes, the system dampens color saturation.
- **Stricter contrast rules**: The human eye has a harder time discerning contrast on dark surfaces than on white paper. The algorithm is deliberately tuned with higher contrast thresholds for dark mode (targeting 7:1 for text instead of the usual 4.5:1 minimum).

### 5. Why the OKLCH engine?
In conventional digital color systems (sRGB), brightening a color distorts its appearance: orange quickly turns into muddy brown or beige, and blue shifts towards purple.
Episciences uses **OKLCH**, a modern color model engineered to match **human visual perception**:
- It cleanly separates **perceived lightness** from the **color hue**.
- This enables the algorithm to increase brightness for dark mode **without ever altering the journal's true brand identity**.

### 6. "Light Islands" for journal logos
Many academic logos were created years ago for white paper or white headers, often featuring black lettering or intricate dark shapes:
- Inverting them like a photo negative (`filter: invert()`) would distort emblems and corrupt colored elements.
- Placing them directly on an anthracite background would make black parts vanish.
- **The solution**: The system automatically houses these logos inside a discreet, clean **"light island"** (a small white box with subtle padding and rounded corners). The original logo remains 100% intact and legible with zero manual graphic work required from the journal.

### 7. The user experience (Sun / Moon toggle)
- **Follows your device by default**: If your computer or phone is set to dark mode, the journal automatically loads in dark mode. If set to light mode, it loads in light mode.
- **Instant manual override**: Clicking the Sun/Moon button allows any reader to pin their personal preference, saved instantly in the browser without cookies or tracking.
- **Zero flash of white (FOUC)**: A tiny script runs in a fraction of a millisecond before the page starts painting, eliminating jarring white flashes when opening a link at night.

---

## Three layers of tokens

**L0 — brand facts & scheme-invariant brand tokens.**
- `--brand`: the raw journal hex. Never contrast-adjusted, never consumed directly by general component CSS. Used for brand identity and metadata.
- `--text-on-brand`: text color computed against `--brand` to ensure WCAG AA contrast (4.5:1).
- `--focus-color-on-brand`: focus ring color on a `--brand` background (3:1).
Both `--text-on-brand` and `--focus-color-on-brand` remain scheme-invariant so the journal's top header banner (`.header-journal-title`, `.header-reduced-journal-blank`) preserves its literal brand appearance in both light and dark themes.

**L1 — literal pairs, per journal.** Injected by `JournalLayout`'s `<style>` tag as
plain color literals (hex or `oklch()`), one `-light` and one `-dark` per token —
e.g. `--primary-light: #04005f; --primary-dark: #b7b8ff;`. No `var()`, no function:
this keeps the injected block trivially validated (see `safeColor` below) and
independent of the surrounding cascade order.

**L2 — semantic tokens**, resolved once in [`src/styles/theme.scss`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/theme.scss) via
[`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark):

```scss
--primary: light-dark(var(--primary-light), var(--primary-dark));
```

`light-dark()` re-evaluates on its own whenever the effective scheme changes — no
per-theme duplication at the call site. Components only ever read L2 tokens.

[`src/styles/theme.scss`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/theme.scss) also declares a **default pair for every token** (matching an
achromatic `#000000` journal), so a route with no injected `<style>` (`/`, error
pages) never resolves an unset `var()` inside a `light-dark()` call — that would
make the whole custom property invalid, not just that token.

## Which scheme is active

```scss
:root                     { color-scheme: light dark; }  /* follows the OS */
:root[data-theme='light'] { color-scheme: only light; }
:root[data-theme='dark']  { color-scheme: only dark; }
```

[`ThemeToggle`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/components/ThemeToggle/ThemeToggle.tsx) (`src/components/ThemeToggle/`) is a 2-state control: **follow the
system** ⇄ **pinned to a literal scheme**. A pin is stored in `localStorage`
([`THEME_STORAGE_KEY`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/config/theme-storage-key.ts) = `'episciences:color-scheme'`) and applied before first paint by an inline blocking bootstrap
script ([`src/config/theme-bootstrap.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/config/theme-bootstrap.ts), injected in [`src/app/layout.tsx`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/app/layout.tsx)) — no
cookie, so the root layout stays fully static and ISR/SSG is untouched.

The active scheme is tracked and synchronized across components and browser tabs via the [`useColorScheme`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/hooks/useColorScheme.ts) hook (`useSyncExternalStore`).

## Available CSS variables

| Variable | Light target | Dark target (raised policy) | Use case |
| ------------------------------- | -------------------- | -------------------------------- | ------------------------------------ |
| `--brand` | Original brand color | Same (`#000000` default) | Header banner background, brand identity |
| `--text-on-brand` | WCAG AA ≥4.5:1 on `--brand` | Same | Text on header banner |
| `--focus-color-on-brand` | WCAG AA ≥3:1 on `--brand` | Same | Focus indicator on header banner |
| `--primary` | Original brand color | ≥4.5:1 on `--surface` | Backgrounds, large areas, decorative accents |
| `--primary-text` | AA 4.5:1 on white | AAA-ish 7:1 on `--surface` | Normal text |
| `--heading-color` | = `--primary-text` | = `--primary-text` | Section and article headings |
| `--primary-border` | AA 3:1 on white | 4.5:1 on `--surface` | Borders, icons, UI components |
| `--button-text-on-primary-bg` | Auto black/white on `--primary` (or env override) | Recomputed on `--primary-dark` | Text on a `--primary` background |
| `--focus-color` | AA 3:1 on white | 4.5:1 on `--surface` | Focus indicators |
| `--focus-color-on-primary` | Auto on `--primary` | Recomputed on `--primary-dark` (≥3:1) | Focus ring on a `--primary` background |
| `--focus-color-on-dark` | `#ffffff` (fixed) | Same as `--focus-color` | Focus ring on an explicit `.on-dark-surface` |
| `--accent-border` | = `--primary` | = `--primary` | Decorative stripes — never contrast-adjusted on its own |
| `--blue-navy` | `#04005f` (`$blue-navy`) | `#5276d4` (AA ≥4.5:1 on dark `--surface`) | Brand-independent blue (HAL icons, citations) |
| `--surface` / `--surface-2` / `--surface-raised` | `#ffffff` / `#f5f5f5` / `#ffffff` | Brand-hue-tinted anthracite | Page / card / popover backgrounds |
| `--text-strong` / `--text` / `--text-muted` | `#000000` / `#4e4e5f` / `#757575` | Brand-hue-tinted light grays | Text hierarchy |
| `--border` | `#717193` (`$grey-light`) | Brand-hue-tinted (≥0.60 L) | Hairlines, dividers |
| `--shadow` / `--overlay-scrim` | `#0000001f` / `rgba(0, 0, 0, 0.35)` | `#00000073` / `oklch(0.1 0 0 / 55%)` | Box shadows, modal backdrops |
| `--badge-bg` / `--badge-text` | `#757575` / `#ffffff` | Same (scheme-invariant) | Chips, language tags, category badges |

### Compatibility and legacy variables

1. **Variables previously used but undeclared** (now safely aliased in `theme.scss` to prevent flash bugs):
   - `--primary-background: var(--surface-2);`
   - `--text-color: var(--text-strong);`
   - `--text-primary: var(--text-strong);`
   - `--text-secondary: var(--text-muted);`

2. **Legacy aliases** (`--white`, `--black`, `--grey*`, `--pure-white`, `--pure-black`, `--black-shadow`) are kept as aliases onto the semantic tokens above — see [Legacy aliases](#legacy-aliases--migrate-dont-invert) below.

## Why dark-mode targets are higher than WCAG's minimum

WCAG 2.x's contrast formula underestimates *perceived* contrast on dark surfaces.
[`src/utils/colorContrast.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/colorContrast.ts) compensates with an internal policy, on top of (never
instead of) the WCAG minimum:

1. **Raised targets** in dark schemes:
   - Normal text targets **7:1**, not 4.5:1.
   - UI components and borders target **4.5:1**, not 3:1.
2. **A perceptual lightness floor**:
   - `0.72` OKLCH `L` for text tokens.
   - `0.60` OKLCH `L` for UI, focus and border tokens.
   Applied after the contrast search, ensuring a technically-compliant-but-low-`L` color never reads as muddy on anthracite.
3. **Chroma damping** (`× 0.9`, capped at `0.16`):
   Very saturated colors halate on dark backgrounds for many readers; damping preserves hue while minimizing visual vibration.

We claim **WCAG 2.2 AA plus this internal policy** — not APCA, and no APCA
conformance is claimed.

## Dark surfaces are brand-hue-tinted, never pure black

[`generateDarkSurfaces()`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/colorContrast.ts#L201) derives `--surface`/`--surface-2`/`--surface-raised` from
the journal's brand hue at a few percent of OKLCH chroma (capped at `0.012`):
- `--surface`: `L = 0.213` (~`#191919` achromatic), rather than near-black `L = 0.165` (~`#0e0e0e`).
- `--surface-2`: `L = 0.253` (~`#222222`).
- `--surface-raised`: `L = 0.293` (~`#2c2c2c`).

This produces an anthracite that subtly reads as "this journal's dark mode", not a generic gray. An
achromatic brand (`chroma < 0.01`, including the `#000000` default) degrades to a
perfectly neutral gray.

## The OKLCH engine (`src/utils/oklch.ts`)

Pure math, zero npm dependency: [`parseHex`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts#L33) / [`toHex`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts#L61), [`rgbToOklch`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts#L106) / [`oklchToRgb`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts#L140),
and [`oklchToSrgbClamped`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/oklch.ts#L159) (gamut mapping by descending-chroma bisection at fixed
`L`/`h`, preserving hue to <0.5°, unlike a per-channel clamp).

[`ensureContrast(color, background, targetRatio)`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/colorContrast.ts#L85) searches OKLCH lightness by
bisection (fixed hue/chroma, gamut-mapped at every probe) between the original
color and whichever lightness extreme (`0` or `1`) increases contrast against
`background`:

- Already compliant → returns the input **unchanged, byte-for-byte**. Most light-mode
  journals see zero diff from this migration.
- Otherwise converges to the lightness **closest to the original** that clears the
  target — minimal perceptual deviation from the brand color.
- **Never silently under-delivers**: if even the extreme lightness can't reach the
  target, it's returned anyway (the maximum achievable contrast) with a
  `logger.warn` — not a value that quietly falls short.

## Server-side validation (`safeColor`)

CSS variables injected server-side in [`src/app/sites/[journalId]/layout.tsx`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/app/sites/[journalId]/layout.tsx#L18-L21) are validated through `safeColor(value, fallback)`:

```ts
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OKLCH_COLOR =
  /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i;

export const safeColor = (value: string, fallback: string): string => {
  const v = value.trim();
  return HEX_COLOR.test(v) || OKLCH_COLOR.test(v) ? v : fallback;
};
```

Validating against exact hex/oklch patterns rather than stripping characters makes `</style>` escapes or CSS-injection impossible by construction (neither pattern allows `<` or `/`). Invalid values safely drop to the fallback color.

## SCSS Mixins for theming (`src/styles/_mixins.scss`)

Several SCSS mixins in [`src/styles/_mixins.scss`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/_mixins.scss) facilitate theme styling:

1. **`@mixin light-island`**: Opts a box out of dark mode entirely (see [Logos & light islands](#logos) below):
   ```scss
   @mixin light-island {
     color-scheme: only light;
     background: var(--pure-white);
     color: var(--pure-black);
     accent-color: auto;
   }
   ```
2. **`@mixin when-dark` / `@mixin when-light`**: Targets rules that `light-dark()` cannot express (such as icons, SVG fills, filters):
   ```scss
   .icon-moon {
     display: none;
     @include mixins.when-dark { display: block; }
   }
   ```
3. **`@mixin elevated-card`**: In light mode, maintains border-only separation with transparent background; in dark mode, elevates onto `var(--surface-2)` with a soft translucent border (`rgba(255, 255, 255, 0.12)`).

## Fallback for engines without `light-dark()` support

[`src/styles/theme.scss`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/theme.scss#L182-L212) provides a manual fallback cascade using `@supports not (color: light-dark(#fff, #000))` for older rendering engines:

```scss
@supports not (color: light-dark(#fff, #000)) {
  :root {
    @each $token in $theme-tokens {
      --#{$token}: var(--#{$token}-light);
    }
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      @each $token in $theme-tokens {
        --#{$token}: var(--#{$token}-dark);
      }
    }
  }

  :root[data-theme='dark'] {
    @each $token in $theme-tokens {
      --#{$token}: var(--#{$token}-dark);
    }
  }
}
```

## `@property` and `light-dark()` don't mix for tokens

`light-dark()` resolves at *computed-value time*. Registering a token via
`@property --surface { syntax: '<color>'; inherits: true; ... }` freezes it to
whichever branch was active when it computed — an island with a local
`color-scheme: only light` inside a globally dark page would then inherit the
**light** value and render (e.g.) black text on black. The codebase has no
`@property` today; a guard-rail test
([`src/styles/__tests__/theme-guardrails.test.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/__tests__/theme-guardrails.test.ts)) fails the build if one appears on
a color token. The only legitimate use of `@property` for a color is as an
**animation target on a specific element** (interpolation requires it) — never a
shared token.

## Legacy aliases — migrate, don't invert

`--white`, `--black`, `--grey`, `--grey-light`, `--grey-dark`, `--grey-darker`,
`--grey-lighter`, `--black-shadow` are aliased onto the new semantic tokens in `theme.scss`:
- `--white: var(--surface);`
- `--black: var(--text-strong);`
- `--grey: var(--text-muted);`
- `--grey-light: var(--border);`
- `--grey-dark: var(--text);`
- `--grey-darker: var(--text-strong);`
- `--grey-lighter: var(--surface-2);`
- `--black-shadow: var(--shadow);`
- `--pure-white: #fff;`
- `--pure-black: #000;`

This is deliberate: `--white` meant "surface" at most call sites but a literal white at a few (`focusOnPrimary`, selected bullets) — a token that's sometimes literal and sometimes semantic can't be inverted safely in one pass. `--pure-white` / `--pure-black` exist for the genuinely-literal cases.

Migrate call sites to the semantic name file-by-file as you touch them; there is no
deadline to remove the aliases.

## Cross-origin islands: `color-scheme: only light`

<a id="logos"></a>
### Logos & light islands

Polychrome SVGs designed for a white background cannot be inverted safely with `filter: invert()` (which would corrupt brand colors). They are wrapped in a light island via the `@include mixins.light-island` mixin:
- **Journal logos**: `.header-journal-logo`, `.header-reduced-journal-logo`, and `.footer-journal-logo`.
- **Episciences wordmark**: `.header-preheader-logo`.

This forces `color-scheme: only light`, `background: var(--pure-white)`, `color: var(--pure-black)`, and `accent-color: auto` on the logo box with zero per-journal adjustments.

### Cross-origin iframes

- **`PDFProxyIframe`**, **`ExternalEmbedViewer`**: Embedded documents do not inherit the host's `color-scheme` across origins (Safari ignores it anyway), so these iframe containers are pinned to `only light`.

Any element with a local `color-scheme` override must re-declare `color` and
`accent-color` explicitly, even to the same value — inheritance doesn't cross a
`color-scheme` boundary the way you'd expect.

## Advanced accessibility features (`src/styles/accessibility.scss`)

[`src/styles/accessibility.scss`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/styles/accessibility.scss) implements enhanced accessibility modes:

1. **High Contrast Mode (`prefers-contrast: more`)**:
   - Surfaces are pushed to maximum contrast extremes:
     - `--surface-light: #ffffff;`
     - `--surface-dark: #0a0a0c;`
   - Interactive elements receive a 1px transparent outline (which becomes visible in high-contrast displays).
   - Focus rings increase in thickness to 3px/4px solid.
2. **Forced Colors Mode (`forced-colors: active` / Windows High Contrast)**:
   - `color-scheme` and `light-dark()` are ignored by the browser under forced colors.
   - The system palette is applied using standard CSS system colors: `outline-color: Highlight;` and `border: 1px solid transparent;` on form controls and buttons.
3. **Reduced Motion (`prefers-reduced-motion`)**:
   - **No global color transitions**: Color properties on `:root` and `body` deliberately avoid `transition: color, background-color` on scheme toggle. Animating global theme switches impairs Interaction to Next Paint (INP) and triggers motion sensitivity.
   - `scrollbar-color` is never animated (prevents WebKit flickering bugs).
4. **Targeted focus on dark surfaces**:
   - Elements marked with `.on-dark-surface`, `.dark-bg`, or `.footer` apply `--focus-color-on-dark` on `:focus-visible`.

## Journal configuration and overrides

- **`NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR`**: Defines the journal brand hex color.
- **`NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR`**: Optional override for text on the primary brand background. When supplied, it is automatically passed through [`ensureContrast(override, primary, 4.5)`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/app/sites/[journalId]/layout.tsx#L39-L44) for both light and dark primary variants.

## Testing

```bash
# Color engine unit tests
npx vitest run src/utils/__tests__/oklch.test.ts
npx vitest run src/utils/__tests__/colorContrast.test.ts

# Reference palette regression test (all real journal brand colors)
npx vitest run src/utils/__tests__/reference-palette.test.ts

# SCSS guard rails (@property and undeclared var() check)
npx vitest run src/styles/__tests__/theme-guardrails.test.ts

# Bootstrap script unit tests (localStorage, Safari private browsing fallback)
npx vitest run src/config/__tests__/theme-bootstrap.test.ts

# Theme toggle UI & accessibility tests (axe-core a11y, aria-pressed)
npx vitest run src/components/ThemeToggle/__tests__/ThemeToggle.test.tsx
```

[`reference-palette.test.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/__tests__/reference-palette.test.ts) runs every real journal brand color (committed in
[`src/utils/__tests__/fixtures/journal-brand-colors.ts`](file:///home/tournoy/WebstormProjects/episciences-front-next/src/utils/__tests__/fixtures/journal-brand-colors.ts), since `.env.local.*` is
gitignored) through both schemes and asserts the targets above are met — this is
the actual regression net for a multi-tenant color system.

Not testable in vitest (happy-dom doesn't implement `light-dark()`/`color-scheme`
resolution): FOUC-on-load, `@supports not (color: light-dark(...))`, and
`prefers-contrast`/`forced-colors` rendering — verify those with real Chrome
(chrome-devtools MCP's `emulate` + a screenshot) when touching this area.

## FAQ

**Why not just use `--primary` for text everywhere?** A light brand color on white
can be under 2:1 contrast — invisible to low-vision users. Use `--primary-text`.

**Does dark mode change my component's light-mode appearance?** It shouldn't — every
token's light branch is either byte-identical to its pre-dark-mode value or a
one-line alias to something that is. If you see a light-mode diff while touching
this system, that's a bug, not an intentional tradeoff.

**Can a journal opt out of dark mode?** No — the toggle and the `prefers-color-scheme`
default apply uniformly. A journal can only affect its own brand-derived tokens
(via `NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR` or `NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR`), not the scheme mechanism itself.

## References

- [WCAG 2.2 — Success Criterion 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 — Success Criterion 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [MDN — `light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
- [Björn Ottosson — Oklab](https://bottosson.github.io/posts/oklab/)

---

**Note**: This system is mandatory for all new components. Existing raw-color
components should be migrated progressively (see [Legacy aliases](#legacy-aliases--migrate-dont-invert) above).
