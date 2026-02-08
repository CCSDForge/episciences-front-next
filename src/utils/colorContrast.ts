/**
 * Color contrast utilities for WCAG 2.2 compliance
 * Automatically adjusts colors to meet accessibility standards
 *
 * @see https://www.w3.org/TR/WCAG22/
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Calculate relative luminance (WCAG formula)
 * @see https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 * @returns Contrast ratio (1 to 21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darken a color by a percentage (0-100)
 */
function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

/**
 * Lighten a color by a percentage (0-100)
 */
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

/**
 * Automatically adjust color to meet WCAG contrast ratio
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
  let adjustedColor = color;
  let ratio = getContrastRatio(adjustedColor, background);

  // If already meets ratio, return original
  if (ratio >= targetRatio) {
    return color;
  }

  const rgb = hexToRgb(background);
  if (!rgb) return color;

  const bgLuminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isLightBg = bgLuminance > 0.5;

  // Try darkening/lightening in steps
  let step = 5;
  let attempts = 0;
  const maxAttempts = 20; // Prevent infinite loop

  while (ratio < targetRatio && attempts < maxAttempts) {
    if (isLightBg) {
      // Light background - darken the color
      adjustedColor = darkenColor(adjustedColor, step);
    } else {
      // Dark background - lighten the color
      adjustedColor = lightenColor(adjustedColor, step);
    }

    ratio = getContrastRatio(adjustedColor, background);
    attempts++;
    step += 2; // Increase step size for faster convergence
  }

  return adjustedColor;
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
