/**
 * OKLCH color engine — pure math, zero dependency.
 *
 * Conversions follow Björn Ottosson's Oklab reference matrices
 * @see https://bottosson.github.io/posts/oklab/
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
  a?: number;
}

const HEX8 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX6 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX4 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i;

/** Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, with or without the leading `#`. */
export function parseHex(hex: string): Rgb | null {
  const v = hex.trim();

  let m = HEX8.exec(v);
  if (m) {
    return {
      r: Number.parseInt(m[1], 16),
      g: Number.parseInt(m[2], 16),
      b: Number.parseInt(m[3], 16),
      a: Number.parseInt(m[4], 16) / 255,
    };
  }

  m = HEX6.exec(v);
  if (m) {
    return {
      r: Number.parseInt(m[1], 16),
      g: Number.parseInt(m[2], 16),
      b: Number.parseInt(m[3], 16),
    };
  }

  m = HEX4.exec(v);
  if (m) {
    return {
      r: Number.parseInt(m[1] + m[1], 16),
      g: Number.parseInt(m[2] + m[2], 16),
      b: Number.parseInt(m[3] + m[3], 16),
      a: Number.parseInt(m[4] + m[4], 16) / 255,
    };
  }

  m = HEX3.exec(v);
  if (m) {
    return {
      r: Number.parseInt(m[1] + m[1], 16),
      g: Number.parseInt(m[2] + m[2], 16),
      b: Number.parseInt(m[3] + m[3], 16),
    };
  }

  return null;
}

export function toHex(rgb: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const channel = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

/** sRGB transfer function (EOTF), shared with getLuminance so both stay in sync. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Inverse sRGB transfer function (OETF). */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function linearRgbToOklab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToLinearRgb(l: number, a: number, b: number): { r: number; g: number; b: number } {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const ll = l_ ** 3;
  const mm = m_ ** 3;
  const ss = s_ ** 3;

  return {
    r: 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss,
    g: -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
    b: -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
  };
}

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);

  const { l, a, b: ob } = linearRgbToOklab(r, g, b);

  const c = Math.sqrt(a * a + ob * ob);
  let h = (Math.atan2(ob, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return rgb.a === undefined ? { l, c, h } : { l, c, h, a: rgb.a };
}

function oklchToLinearRgb(c: Oklch): { r: number; g: number; b: number } {
  const hRad = (c.h * Math.PI) / 180;
  const a = c.c * Math.cos(hRad);
  const b = c.c * Math.sin(hRad);
  return oklabToLinearRgb(c.l, a, b);
}

/** Direct conversion — the result may fall outside the sRGB gamut (channels <0 or >1). */
export function oklchToRgb(c: Oklch): Rgb {
  const linear = oklchToLinearRgb(c);
  const rgb = {
    r: linearToSrgb(linear.r) * 255,
    g: linearToSrgb(linear.g) * 255,
    b: linearToSrgb(linear.b) * 255,
  };
  return c.a === undefined ? rgb : { ...rgb, a: c.a };
}

function isInGamut(linear: { r: number; g: number; b: number }, eps = 1e-4): boolean {
  return (
    linear.r >= -eps &&
    linear.r <= 1 + eps &&
    linear.g >= -eps &&
    linear.g <= 1 + eps &&
    linear.b >= -eps &&
    linear.b <= 1 + eps
  );
}

function linearToRgb255(linear: { r: number; g: number; b: number }, a?: number): Rgb {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const rgb = {
    r: linearToSrgb(clamp01(linear.r)) * 255,
    g: linearToSrgb(clamp01(linear.g)) * 255,
    b: linearToSrgb(clamp01(linear.b)) * 255,
  };
  return a === undefined ? rgb : { ...rgb, a };
}

/**
 * Gamut mapping by descending chroma bisection at fixed L/h (≤16 iterations),
 * then a final channel clamp. Preserves hue to <0.5° — a per-channel clamp alone
 * would shift it.
 */
export function oklchToSrgbClamped(c: Oklch): Rgb {
  const direct = oklchToLinearRgb(c);
  if (isInGamut(direct)) {
    return linearToRgb255(direct, c.a);
  }

  let lo = 0;
  let hi = c.c;
  let bestLinear = direct;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const candidate = oklchToLinearRgb({ l: c.l, c: mid, h: c.h });
    if (isInGamut(candidate)) {
      lo = mid;
      bestLinear = candidate;
    } else {
      hi = mid;
    }
  }

  return linearToRgb255(bestLinear, c.a);
}

export function withLightness(c: Oklch, l: number): Oklch {
  return { ...c, l };
}
