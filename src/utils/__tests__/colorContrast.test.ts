import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  ensureContrast,
  generateAccessibleColorVariants,
  getContrastingTextColor,
} from '../colorContrast';

describe('colorContrast utils', () => {
  describe('getContrastRatio', () => {
    it('returns 21 for black on white (maximum contrast)', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1 for identical colors (no contrast)', () => {
      const ratio = getContrastRatio('#ff0000', '#ff0000');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('returns a symmetric ratio (order of arguments does not matter)', () => {
      const ratio1 = getContrastRatio('#000000', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 10);
    });

    it('returns 1 for invalid hex (graceful fallback)', () => {
      const ratio = getContrastRatio('not-a-color', '#ffffff');
      expect(ratio).toBe(1);
    });

    it('returns ratio greater than 4.5 for black text on white (WCAG AA)', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeGreaterThan(4.5);
    });

    it('handles hex without # prefix (lowercase)', () => {
      const ratio = getContrastRatio('000000', 'ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });
  });

  describe('ensureContrast', () => {
    it('returns original color if contrast already meets target', () => {
      // Black on white already has ratio ~21 >> 4.5
      const result = ensureContrast('#000000', '#ffffff', 4.5);
      expect(result).toBe('#000000');
    });

    it('darkens color on light background to meet target', () => {
      // A very light color that does not meet WCAG AA on white
      const result = ensureContrast('#ffcc00', '#ffffff', 4.5);
      const ratio = getContrastRatio(result, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('lightens color on dark background to meet target', () => {
      // A dark color that does not meet WCAG AA on dark background
      const result = ensureContrast('#333333', '#000000', 4.5);
      const ratio = getContrastRatio(result, '#000000');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('returns original color for invalid hex input', () => {
      const result = ensureContrast('not-valid', '#ffffff', 4.5);
      expect(result).toBe('not-valid');
    });

    it('uses white as default background', () => {
      // Red on white has ratio ~3.99, which does not meet 4.5 → should be adjusted
      const result = ensureContrast('#ff0000');
      const ratio = getContrastRatio(result, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('uses 4.5 as default target ratio', () => {
      const result = ensureContrast('#ff0000', '#ffffff');
      const ratio = getContrastRatio(result, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('handles WCAG AAA target ratio (7:1)', () => {
      const result = ensureContrast('#666666', '#ffffff', 7);
      const ratio = getContrastRatio(result, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7);
    });
  });

  describe('generateAccessibleColorVariants', () => {
    const variants = generateAccessibleColorVariants('#c0392b'); // Episciences red

    it('returns an object with the primary color unchanged', () => {
      expect(variants.primary).toBe('#c0392b');
    });

    it('primaryTextOnWhite meets WCAG AA (4.5:1) on white', () => {
      const ratio = getContrastRatio(variants.primaryTextOnWhite, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('primaryTextOnWhiteAAA meets WCAG AAA (7:1) on white', () => {
      const ratio = getContrastRatio(variants.primaryTextOnWhiteAAA, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(7);
    });

    it('primaryLargeTextOnWhite meets large text threshold (3:1) on white', () => {
      const ratio = getContrastRatio(variants.primaryLargeTextOnWhite, '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('focusOnPrimary is white (hardcoded)', () => {
      expect(variants.focusOnPrimary).toBe('#ffffff');
    });

    it('focusOnDark is white (hardcoded)', () => {
      expect(variants.focusOnDark).toBe('#ffffff');
    });

    it('returns all expected keys', () => {
      const expectedKeys = [
        'primary',
        'primaryTextOnWhite',
        'primaryTextOnWhiteAAA',
        'primaryLargeTextOnWhite',
        'primaryTextOnLightGray',
        'primaryTextOnDark',
        'primaryBorder',
        'focusOnWhite',
        'focusOnPrimary',
        'focusOnDark',
      ];
      for (const key of expectedKeys) {
        expect(variants).toHaveProperty(key);
      }
    });
  });

  describe('getContrastingTextColor', () => {
    it('returns black (#000000) for white background', () => {
      expect(getContrastingTextColor('#ffffff')).toBe('#000000');
    });

    it('returns white (#ffffff) for black background', () => {
      expect(getContrastingTextColor('#000000')).toBe('#ffffff');
    });

    it('returns white for dark backgrounds', () => {
      // Dark blue/navy → white text
      expect(getContrastingTextColor('#003366')).toBe('#ffffff');
    });

    it('returns black for light backgrounds', () => {
      // Light yellow → black text
      expect(getContrastingTextColor('#ffff99')).toBe('#000000');
    });

    it('returns either black or white (never other values)', () => {
      for (const bg of ['#ff0000', '#00ff00', '#0000ff', '#888888']) {
        const result = getContrastingTextColor(bg);
        expect(['#000000', '#ffffff']).toContain(result);
      }
    });
  });
});
