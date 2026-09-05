# Accessible Color System

## Overview

Episciences hosts 64+ journals, each with a single custom brand color. From that one
color we derive, server-side, a full family of WCAG-compliant variants — for **both**
a light and a dark scheme — using a zero-dependency OKLCH engine
(`src/utils/oklch.ts` + `src/utils/colorContrast.ts`).

This document describes the current architecture. It replaces the pre-dark-mode
version — `src/config/theme.ts` (client-side `applyThemeVariables`) no longer exists;
everything is computed server-side in `src/app/sites/[journalId]/layout.tsx`.

## Three layers of tokens

**L0 — brand fact.** `--brand`: the raw journal hex. Never contrast-adjusted, never
consumed directly by component CSS.

**L1 — literal pairs, per journal.** Injected by `JournalLayout`'s `<style>` tag as
plain color literals (hex or `oklch()`), one `-light` and one `-dark` per token —
e.g. `--primary-light: #04005f; --primary-dark: #b7b8ff;`. No `var()`, no function:
this keeps the injected block trivially validated (see `safeColor` below) and
independent of the surrounding cascade order.

**L2 — semantic tokens**, resolved once in `src/styles/theme.scss` via
[`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark):

```scss
--primary: light-dark(var(--primary-light), var(--primary-dark));
```

`light-dark()` re-evaluates on its own whenever the effective scheme changes — no
per-theme duplication at the call site. Components only ever read L2 tokens.

`theme.scss` also declares a **default pair for every token** (matching an
achromatic `#000000` journal), so a route with no injected `<style>` (`/`, error
pages) never resolves an unset `var()` inside a `light-dark()` call — that would
make the whole custom property invalid, not just that token.

## Which scheme is active

```scss
:root                     { color-scheme: light dark; }  /* follows the OS */
:root[data-theme='light'] { color-scheme: only light; }
:root[data-theme='dark']  { color-scheme: only dark; }
```

`ThemeToggle` (`src/components/ThemeToggle/`) is a 2-state control: **follow the
system** ⇄ **pinned to a literal scheme**. A pin is stored in `localStorage`
(`episciences:color-scheme`) and applied before first paint by an inline bootstrap
script (`src/config/theme-bootstrap.ts`, injected in `src/app/layout.tsx`) — no
cookie, so the root layout stays fully static and ISR/SSG is untouched.

## Available CSS variables

| Variable                       | Light target        | Dark target (raised, see below) | Use case                            |
| ------------------------------- | -------------------- | -------------------------------- | ------------------------------------ |
| `--primary`                     | Original brand color | ≥4.5:1 on `--surface`            | Backgrounds, large areas             |
| `--primary-text`                | AA 4.5:1 on white     | AAA-ish 7:1 on `--surface`        | Normal text                          |
| `--primary-border`              | AA 3:1 on white       | 4.5:1 on `--surface`             | Borders, icons, UI components        |
| `--button-text-on-primary-bg`   | Auto black/white on `--primary` | same, recomputed per scheme | Text on a `--primary` background |
| `--focus-color`                 | AA 3:1 on white       | 4.5:1 on `--surface`             | Focus indicators                     |
| `--focus-color-on-primary`      | Auto on `--primary`   | same, recomputed per scheme      | Focus ring on a `--primary` bg       |
| `--focus-color-on-dark`         | `#ffffff` (fixed)      | same as `--focus-color`          | Focus ring on an explicit `.on-dark-surface` |
| `--accent-border`                | = `--primary`          | = `--primary`                    | Decorative stripes — never contrast-adjusted on its own |
| `--surface` / `--surface-2` / `--surface-raised` | white / #f5f5f5 / white | brand-hue-tinted anthracite | Page/card/popover backgrounds |
| `--text-strong` / `--text` / `--text-muted` | near-black / #4e4e5f / #757575 | brand-hue-tinted light grays | Text hierarchy |
| `--border`                      | #717193               | brand-hue-tinted                  | Hairlines, dividers                  |
| `--shadow` / `--overlay-scrim`  | subtle black           | subtle black at higher alpha / dark oklch | box-shadow, modal scrims |

Legacy names (`--white`, `--black`, `--grey*`, `--pure-white`, `--pure-black`,
`--black-shadow`) are kept as **aliases** onto the semantic tokens above — see
"Legacy aliases" below. New code should use the semantic names directly.

## Why dark-mode targets are higher than WCAG's minimum

WCAG 2.x's contrast formula underestimates *perceived* contrast on dark surfaces.
`src/utils/colorContrast.ts` compensates with an internal policy, on top of (never
instead of) the WCAG minimum:

1. **Raised targets** in dark schemes — e.g. normal text targets 7:1, not 4.5:1.
2. **A perceptual lightness floor** (`0.72` OKLCH `L` for text, `0.60` for UI/borders)
   applied after the contrast search, so a technically-compliant-but-low-`L` color
   never reads as muddy on anthracite.
3. **Chroma damping** (`× 0.9`, capped at `0.16`) — a very saturated color halates on
   a dark background for many readers.

We claim **WCAG 2.2 AA plus this internal policy** — not APCA, and no APCA
conformance is claimed.

## Dark surfaces are brand-hue-tinted, never pure black

`generateDarkSurfaces()` derives `--surface`/`--surface-2`/`--surface-raised` from
the journal's brand hue at a few percent of OKLCH chroma (capped at `0.012`) — an
anthracite that subtly reads as "this journal's dark mode", not a generic gray. An
achromatic brand (`chroma < 0.01`, including the `#000000` default) degrades to a
perfectly neutral gray.

## The OKLCH engine (`src/utils/oklch.ts`)

Pure math, zero npm dependency: `parseHex` / `toHex`, `rgbToOklch` / `oklchToRgb`,
and `oklchToSrgbClamped` (gamut mapping by descending-chroma bisection at fixed
`L`/`h`, preserving hue to <0.5°, unlike a per-channel clamp).

`ensureContrast(color, background, targetRatio)` searches OKLCH lightness by
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

## `@property` and `light-dark()` don't mix for tokens

`light-dark()` resolves at *computed-value time*. Registering a token via
`@property --surface { syntax: '<color>'; inherits: true; ... }` freezes it to
whichever branch was active when it computed — an island with a local
`color-scheme: only light` inside a globally dark page would then inherit the
**light** value and render (e.g.) black text on black. The codebase has no
`@property` today; a guard-rail test
(`src/styles/__tests__/theme-guardrails.test.ts`) fails the build if one appears on
a color token. The only legitimate use of `@property` for a color is as an
**animation target on a specific element** (interpolation requires it) — never a
shared token.

## Legacy aliases — migrate, don't invert

`--white`, `--black`, `--grey`, `--grey-light`, `--grey-dark`, `--grey-lighter`,
`--black-shadow` are aliased onto the new semantic tokens in `theme.scss` (e.g.
`--white: var(--surface);`). This is deliberate: `--white` meant "surface" at most
call sites but a literal white at a few (`focusOnPrimary`, selected bullets) — a
token that's sometimes literal and sometimes semantic can't be inverted safely in
one pass. `--pure-white` / `--pure-black` exist for the genuinely-literal cases.

Migrate call sites to the semantic name file-by-file as you touch them; there is no
deadline to remove the aliases.

## Cross-origin islands: `color-scheme: only light`

Two categories of content assume a white page and can't be made theme-aware:

- **Journal logos** (`public/logos/*.svg`, 75 files): polychrome SVGs designed for a
  white box. `filter: invert()` would wreck the non-black fills. `.header-journal-logo`,
  `.header-reduced-journal-logo` and `.footer-journal-logo` instead force
  `color-scheme: only light` + `background: var(--pure-white)` on the logo's own box
  — works for all 75 logos with zero per-journal work.
- **Cross-origin iframes** (`PDFProxyIframe`, `ExternalEmbedViewer`): the embedded
  document doesn't inherit the host's `color-scheme` anyway (Safari ignores it
  across origins), so the iframe element itself is pinned `only light`.

Any element with a local `color-scheme` override must re-declare `color` and
`accent-color` explicitly, even to the same value — inheritance doesn't cross a
`color-scheme` boundary the way you'd expect.

## Testing

```bash
npx vitest run src/utils/__tests__/oklch.test.ts
npx vitest run src/utils/__tests__/colorContrast.test.ts
npx vitest run src/utils/__tests__/reference-palette.test.ts   # all real journal brand colors
npx vitest run src/styles/__tests__/theme-guardrails.test.ts   # @property + undeclared var() traps
```

`reference-palette.test.ts` runs every real journal brand color (committed in
`src/utils/__tests__/fixtures/journal-brand-colors.ts`, since `.env.local.*` is
gitignored) through both schemes and asserts the targets above are met — this is
the actual regression net for a 64-tenant color system, not the handful of
hand-picked colors in `colorContrast.test.ts`.

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
(via `NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR`), not the scheme mechanism itself.

## References

- [WCAG 2.2 — Success Criterion 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 — Success Criterion 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [MDN — `light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
- [Björn Ottosson — Oklab](https://bottosson.github.io/posts/oklab/)

---

**Note**: This system is mandatory for all new components. Existing raw-color
components should be migrated progressively (see "Legacy aliases" above).
