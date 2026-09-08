/**
 * Frozen snapshot of the pre-OKLCH `colorContrast.ts` algorithm (step-based
 * darken/lighten loop against a 0.03928 luminance threshold), kept ONLY as a
 * baseline for the Phase 1 regression test — never imported by production code.
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function legacyGetContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor
  );
}

export function legacyEnsureContrast(
  color: string,
  background: string = '#ffffff',
  targetRatio: number = 4.5
): string {
  let adjustedColor = color;
  let ratio = legacyGetContrastRatio(adjustedColor, background);

  if (ratio >= targetRatio) {
    return color;
  }

  const rgb = hexToRgb(background);
  if (!rgb) return color;

  const bgLuminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isLightBg = bgLuminance > 0.5;

  let step = 5;
  let attempts = 0;
  const maxAttempts = 20;

  while (ratio < targetRatio && attempts < maxAttempts) {
    if (isLightBg) {
      adjustedColor = darkenColor(adjustedColor, step);
    } else {
      adjustedColor = lightenColor(adjustedColor, step);
    }

    ratio = legacyGetContrastRatio(adjustedColor, background);
    attempts++;
    step += 2;
  }

  return adjustedColor;
}
