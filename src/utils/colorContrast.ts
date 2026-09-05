/**
 * Color contrast utilities for WCAG 2.2 compliance
 * Automatically adjusts colors to meet accessibility standards
 *
 * @see https://www.w3.org/TR/WCAG22/
 */

import { logger } from '@/lib/logger';
import {
  parseColor,
  toHex,
  rgbToOklch,
  oklchToSrgbClamped,
  withLightness,
  srgbToLinear,
  compositeOver,
  type Rgb,
  type Oklch,
} from './oklch';

const log = logger.child({ service: 'colorContrast' });

export type ColorScheme = 'light' | 'dark' | 'lightMore' | 'darkMore';

/** WCAG 2.x underestimates perceived contrast on dark surfaces — raised internally. */
const TARGETS: Record<ColorScheme, { text: number; large: number; ui: number }> = {
  light: { text: 4.5, large: 3, ui: 3 },
  dark: { text: 7, large: 4.5, ui: 4.5 },
  lightMore: { text: 7, large: 4.5, ui: 4.5 },
  darkMore: { text: 10, large: 7, ui: 7 },
};

/** Perceptual lightness floors so a dark-scheme token never reads as "muddy" even though it is WCAG-compliant. */
const DARK_TEXT_LIGHTNESS_FLOOR = 0.72;
const DARK_UI_LIGHTNESS_FLOOR = 0.6;
const DARK_CHROMA_DAMPING = 0.9;
const DARK_CHROMA_CAP = 0.16;

/**
 * Calculate relative luminance (WCAG formula)
 * @see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
function getLuminance(rgb: Rgb): number {
  const rs = srgbToLinear(rgb.r / 255);
  const gs = srgbToLinear(rgb.g / 255);
  const bs = srgbToLinear(rgb.b / 255);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 * @returns Contrast ratio (1 to 21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return 1;

  // Alpha isn't a WCAG concept — composite over an assumed-opaque white page
  // background first so a translucent color contributes its *effective* color,
  // not the fully-opaque one `getLuminance` would otherwise assume.
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const bg = compositeOver(rgb2, white);
  const fg = compositeOver(rgb1, bg);

  const lum1 = getLuminance(fg);
  const lum2 = getLuminance(bg);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Automatically adjust color to meet a WCAG contrast ratio against a background,
 * by searching along OKLCH lightness at fixed hue/chroma (gamut-mapped at every probe).
 * @param color - The color to adjust (hex)
 * @param background - The background color (hex)
 * @param targetRatio - WCAG target ratio (4.5 for AA normal text, 3 for AA large text, 7 for AAA)
 * @returns Adjusted color that meets the target ratio
 */
export function ensureContrast(
  color: string,
  background: string = '#ffffff',
  targetRatio: number = 4.5
): string {
  const rgb = parseColor(color);
  if (!rgb) return color;

  const bgRgb = parseColor(background);
  if (!bgRgb) return color;

  const bgHex = toHex(bgRgb);
  const colorHex = toHex(rgb);
  const initialRatio = getContrastRatio(colorHex, bgHex);
  if (initialRatio >= targetRatio) return color;

  const original = rgbToOklch(rgb);

  const contrastAtL = (l: number): number => {
    const candidate = oklchToSrgbClamped(withLightness(original, l));
    return getContrastRatio(toHex(candidate), bgHex);
  };

  // Luminance-threshold heuristics (e.g. "background luminance > 0.5 ⇒ go dark")
  // pick the wrong extremity for a wide mid-range of background luminances,
  // because relative luminance isn't linear in perceived lightness — a background
  // can read as "dark" by the >0.5 rule while black (L=0) still contrasts far
  // better against it than white (L=1). Compare both extremities directly instead.
  const contrastAtBlack = contrastAtL(0);
  const contrastAtWhite = contrastAtL(1);
  const extremityL = contrastAtBlack >= contrastAtWhite ? 0 : 1;
  const extremityRatio = Math.max(contrastAtBlack, contrastAtWhite);
  if (extremityRatio < targetRatio) {
    log.warn('Unable to reach target contrast ratio even at the lightness extremity', {
      color,
      background,
      targetRatio,
      achieved: extremityRatio,
    });
    return toHex(oklchToSrgbClamped(withLightness(original, extremityL)));
  }

  // Contrast is monotonic in L (at fixed h/c, post gamut-mapping) between the original
  // lightness (infeasible, by the check above) and the extremity (feasible, just checked).
  // Bisection converges to the boundary closest to the original — minimal perceptual deviation.
  let feasibleL = extremityL;
  let infeasibleL = original.l;
  for (let i = 0; i < 24; i++) {
    const mid = (feasibleL + infeasibleL) / 2;
    if (contrastAtL(mid) >= targetRatio) {
      feasibleL = mid;
    } else {
      infeasibleL = mid;
    }
  }

  return toHex(oklchToSrgbClamped(withLightness(original, feasibleL)));
}

/**
 * Generate accessible color variants for multi-tenant theming
 * @param primaryColor - Journal's primary color (hex)
 * @returns Object with accessible color variants
 */
export function generateAccessibleColorVariants(primaryColor: string) {
  return {
    // Original primary (for backgrounds)
    primary: primaryColor,

    // Text on white background (WCAG AA - 4.5:1)
    primaryTextOnWhite: ensureContrast(primaryColor, '#ffffff', 4.5),

    // Text on white background (WCAG AAA - 7:1)
    primaryTextOnWhiteAAA: ensureContrast(primaryColor, '#ffffff', 7),

    // Large text on white (WCAG AA - 3:1)
    primaryLargeTextOnWhite: ensureContrast(primaryColor, '#ffffff', 3),

    // Text on light gray background
    primaryTextOnLightGray: ensureContrast(primaryColor, '#f5f5f5', 4.5),

    // Text on dark background
    primaryTextOnDark: ensureContrast(primaryColor, '#333333', 4.5),

    // For borders and UI components (WCAG AA - 3:1)
    primaryBorder: ensureContrast(primaryColor, '#ffffff', 3),

    // Focus indicators on different backgrounds (WCAG AA - 3:1 for UI components)
    focusOnWhite: ensureContrast(primaryColor, '#ffffff', 3),
    focusOnPrimary: '#ffffff', // Always white on primary background
    focusOnDark: '#ffffff', // Always white on dark backgrounds
  };
}

/**
 * Determine if text should be black or white on a given background
 * @param backgroundColor - Background color (hex)
 * @returns '#000000' or '#ffffff'
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const blackContrast = getContrastRatio(backgroundColor, '#000000');
  const whiteContrast = getContrastRatio(backgroundColor, '#ffffff');

  return blackContrast > whiteContrast ? '#000000' : '#ffffff';
}

function applyDarkPolicy(c: Oklch, floor: number): Oklch {
  const chroma = Math.min(c.c * DARK_CHROMA_DAMPING, DARK_CHROMA_CAP);
  return { ...c, l: Math.max(c.l, floor), c: chroma };
}

/**
 * Anthracite surfaces tinted by the journal's brand hue (a few % of chroma in OKLCH),
 * never pure black. An achromatic brand (chroma < 0.01, including the #000000 default)
 * degrades to a perfectly neutral gray.
 */
export function generateDarkSurfaces(brandColor: string) {
  const rgb = parseColor(brandColor) ?? { r: 0, g: 0, b: 0 };
  const brand = rgbToOklch(rgb);
  const tint = brand.c < 0.01 ? 0 : Math.min(0.012, brand.c * 0.1);
  const h = brand.h;

  const toHexSafe = (l: number, c: number) => toHex(oklchToSrgbClamped({ l, c, h }));

  return {
    // L=0.213 (~#191919 achromatic) rather than near-black L=0.165 (~#0e0e0e):
    // still unambiguously "dark mode", less harsh than true black.
    surface: toHexSafe(0.213, tint),
    surface2: toHexSafe(0.253, tint * 0.9),
    surfaceRaised: toHexSafe(0.293, tint * 0.8),
    textStrong: toHexSafe(0.96, tint * 0.3),
    text: toHexSafe(0.85, tint * 0.3),
    textMuted: toHexSafe(Math.max(0.65, DARK_TEXT_LIGHTNESS_FLOOR), tint * 0.3),
    border: toHexSafe(Math.max(0.4, DARK_UI_LIGHTNESS_FLOOR), tint * 0.4),
    shadow: '#00000073',
    overlayScrim: 'oklch(0.1 0 0 / 55%)',
  };
}

/**
 * Generate the full accessible variant set for a given color scheme, applying the
 * raised WCAG targets, lightness floor and chroma damping policy for dark schemes.
 * Light schemes are byte-identical to `generateAccessibleColorVariants` (no behavior change).
 */
export function generateSchemePalette(
  color: string,
  scheme: ColorScheme,
  opts: { surface?: string } = {}
) {
  if (scheme === 'light' || scheme === 'lightMore') {
    const targets = TARGETS[scheme];
    return {
      primary: color,
      primaryTextOnWhite: ensureContrast(color, '#ffffff', targets.text),
      primaryTextOnWhiteAAA: ensureContrast(color, '#ffffff', 7),
      primaryLargeTextOnWhite: ensureContrast(color, '#ffffff', targets.large),
      primaryTextOnLightGray: ensureContrast(color, '#f5f5f5', targets.text),
      primaryTextOnDark: ensureContrast(color, '#333333', targets.text),
      primaryBorder: ensureContrast(color, '#ffffff', targets.ui),
      focusOnWhite: ensureContrast(color, '#ffffff', targets.ui),
      focusOnPrimary: '#ffffff',
      focusOnDark: '#ffffff',
    };
  }

  const targets = TARGETS[scheme];
  const surface = opts.surface ?? generateDarkSurfaces(color).surface;
  const rgb = parseColor(color);
  const brand = rgb ? rgbToOklch(rgb) : { l: 0, c: 0, h: 0 };

  const policedContrast = (targetRatio: number, floor: number): string => {
    const adjustedHex = ensureContrast(color, surface, targetRatio);
    const adjustedRgb = parseColor(adjustedHex);
    if (!adjustedRgb) return adjustedHex;
    const adjustedOklch = rgbToOklch(adjustedRgb);
    const policed = applyDarkPolicy(withLightness(brand, Math.max(adjustedOklch.l, floor)), floor);
    const policedHex = toHex(oklchToSrgbClamped(policed));
    // The floor/damping pass must not undercut the WCAG target it was meant to protect.
    return getContrastRatio(policedHex, surface) >= targetRatio ? policedHex : adjustedHex;
  };

  return {
    primary: policedContrast(targets.ui, DARK_UI_LIGHTNESS_FLOOR),
    primaryTextOnWhite: ensureContrast(color, '#ffffff', 4.5),
    primaryTextOnWhiteAAA: ensureContrast(color, '#ffffff', 7),
    primaryLargeTextOnWhite: ensureContrast(color, '#ffffff', 3),
    primaryTextOnLightGray: ensureContrast(color, '#f5f5f5', 4.5),
    primaryTextOnDark: policedContrast(targets.text, DARK_TEXT_LIGHTNESS_FLOOR),
    primaryBorder: policedContrast(targets.ui, DARK_UI_LIGHTNESS_FLOOR),
    focusOnWhite: ensureContrast(color, '#ffffff', 3),
    focusOnPrimary: '#ffffff',
    focusOnDark: policedContrast(targets.ui, DARK_UI_LIGHTNESS_FLOOR),
  };
}

/** All four schemes for one journal color, ready to feed the L1 token layer. */
export function generateJournalPalettes(color: string) {
  const surfaces = generateDarkSurfaces(color);
  return {
    light: generateSchemePalette(color, 'light'),
    dark: generateSchemePalette(color, 'dark', { surface: surfaces.surface }),
    lightMore: generateSchemePalette(color, 'lightMore'),
    darkMore: generateSchemePalette(color, 'darkMore', { surface: surfaces.surface }),
    surfaces,
  };
}
