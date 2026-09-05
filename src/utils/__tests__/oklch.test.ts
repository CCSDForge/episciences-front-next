import { describe, it, expect } from 'vitest';
import {
  parseHex,
  parseOklch,
  parseColor,
  toHex,
  compositeOver,
  rgbToOklch,
  oklchToRgb,
  oklchToSrgbClamped,
  withLightness,
} from '../oklch';

describe('oklch', () => {
  describe('parseHex', () => {
    it('parses 6-digit hex with #', () => {
      expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 6-digit hex without #', () => {
      expect(parseHex('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses 3-digit shorthand', () => {
      expect(parseHex('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
    });

    it('parses 4-digit shorthand with alpha', () => {
      expect(parseHex('#abcd')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 0xdd / 255 });
    });

    it('parses 8-digit hex with alpha', () => {
      expect(parseHex('#aabbccdd')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 0xdd / 255 });
    });

    it('returns null for invalid input', () => {
      expect(parseHex('not-a-color')).toBeNull();
    });
  });

  describe('rgbToOklch reference values', () => {
    it('white -> L≈1, C≈0', () => {
      const { l, c } = rgbToOklch({ r: 255, g: 255, b: 255 });
      expect(l).toBeCloseTo(1, 2);
      expect(c).toBeCloseTo(0, 2);
    });

    it('blue #0000ff -> L≈0.452, C≈0.313, h≈264.05°', () => {
      const { l, c, h } = rgbToOklch({ r: 0, g: 0, b: 255 });
      expect(l).toBeCloseTo(0.452, 2);
      expect(c).toBeCloseTo(0.313, 2);
      expect(h).toBeCloseTo(264.05, 0);
    });
  });

  describe('round trip rgb -> oklch -> rgb', () => {
    it('stays within ±1/255 on a grid of colors', () => {
      for (let r = 0; r <= 255; r += 17) {
        for (let g = 0; g <= 255; g += 17) {
          for (let b = 0; b <= 255; b += 17) {
            const oklch = rgbToOklch({ r, g, b });
            const back = oklchToSrgbClamped(oklch);
            expect(Math.abs(back.r - r)).toBeLessThanOrEqual(1);
            expect(Math.abs(back.g - g)).toBeLessThanOrEqual(1);
            expect(Math.abs(back.b - b)).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('oklchToSrgbClamped gamut mapping', () => {
    it('never returns a channel outside [0, 255]', () => {
      const outOfGamut = { l: 0.9, c: 0.4, h: 30 };
      const rgb = oklchToSrgbClamped(outOfGamut);
      for (const channel of [rgb.r, rgb.g, rgb.b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    });

    it('preserves hue within 0.5° across large lightness swings', () => {
      const base = rgbToOklch({ r: 4, g: 0, b: 95 }); // deep saturated navy
      for (const l of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const shifted = withLightness(base, l);
        const clamped = oklchToSrgbClamped(shifted);
        const back = rgbToOklch(clamped);
        if (back.c < 0.005) continue; // hue undefined near-achromatic, skip
        let delta = Math.abs(back.h - base.h);
        if (delta > 180) delta = 360 - delta;
        expect(delta).toBeLessThan(0.5);
      }
    });
  });

  describe('toHex', () => {
    it('rounds and clamps channels', () => {
      expect(toHex({ r: -5, g: 128.6, b: 300 })).toBe('#0081ff');
    });

    it('omits the alpha byte when opaque', () => {
      expect(toHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
    });

    it('appends the alpha byte when translucent', () => {
      expect(toHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080');
    });
  });

  describe('compositeOver', () => {
    it('returns the foreground unchanged when fully opaque', () => {
      expect(compositeOver({ r: 10, g: 20, b: 30, a: 1 }, { r: 255, g: 255, b: 255 })).toEqual({
        r: 10,
        g: 20,
        b: 30,
      });
    });

    it('returns the background unchanged when fully transparent', () => {
      expect(compositeOver({ r: 10, g: 20, b: 30, a: 0 }, { r: 255, g: 255, b: 255 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
    });

    it('linearly blends at partial alpha', () => {
      const result = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 });
      expect(result.r).toBeCloseTo(127.5, 1);
    });
  });

  describe('parseOklch', () => {
    it('parses raw L/C/H with no alpha', () => {
      const rgb = parseOklch('oklch(1 0 0)');
      expect(rgb).toEqual(oklchToSrgbClamped({ l: 1, c: 0, h: 0 }));
    });

    it('parses a percentage lightness and an alpha channel', () => {
      const rgb = parseOklch('oklch(50% 0.1 250 / 50%)');
      expect(rgb?.a).toBeCloseTo(0.5, 5);
    });

    it('returns null for a non-oklch string', () => {
      expect(parseOklch('#ffffff')).toBeNull();
    });
  });

  describe('parseColor', () => {
    it('falls back to parseHex for hex input', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('falls back to parseOklch for oklch() input', () => {
      expect(parseColor('oklch(1 0 0)')).toEqual(oklchToSrgbClamped({ l: 1, c: 0, h: 0 }));
    });

    it('returns null when neither parser matches', () => {
      expect(parseColor('not-a-color')).toBeNull();
    });
  });

  describe('oklchToRgb (unclamped)', () => {
    it('can return out-of-gamut channels', () => {
      const rgb = oklchToRgb({ l: 0.9, c: 0.4, h: 30 });
      const outOfGamut = rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255;
      expect(outOfGamut).toBe(true);
    });
  });
});
