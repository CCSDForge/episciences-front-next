import { loadJournalConfig } from '@/utils/env-loader';
import { ensureContrast, generateJournalPalettes, getContrastingTextColor } from '@/utils/colorContrast';

interface JournalLayoutProps {
  readonly children: React.ReactNode;
  readonly params: Promise<{ journalId: string }>;
}

// Validates rather than strips: a value that fails is dropped for a safe fallback
// instead of being mutilated into a different-but-still-valid string. Stripping
// (the previous approach) could silently turn a hostile input into another valid
// one; validation makes a </style> or CSS-injection escape impossible by
// construction, since neither pattern can contain '<' or '/'.
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const OKLCH_COLOR =
  /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$/i;

export const safeColor = (value: string, fallback: string): string => {
  const v = value.trim();
  return HEX_COLOR.test(v) || OKLCH_COLOR.test(v) ? v : fallback;
};

export default async function JournalLayout(props: JournalLayoutProps) {
  const { journalId } = await props.params;
  const { children } = props;

  const config = loadJournalConfig(journalId);
  const primaryColor = config.env['NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR'] ?? '#000000';
  const primaryTextOverride = config.env['NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR'] ?? '';

  const { light, dark, surfaces } = generateJournalPalettes(primaryColor);

  // getContrastingTextColor picks whichever of black/white contrasts better, but
  // doesn't guarantee a WCAG ratio on its own — ensureContrast closes that gap
  // (a no-op when the pick already clears the target).
  const contrastingText = (bg: string, targetRatio: number): string =>
    ensureContrast(getContrastingTextColor(bg), bg, targetRatio);

  const textOnPrimaryLight = primaryTextOverride
    ? ensureContrast(primaryTextOverride, light.primary, 4.5)
    : contrastingText(light.primary, 4.5);
  const textOnPrimaryDark = primaryTextOverride
    ? ensureContrast(primaryTextOverride, dark.primary, 4.5)
    : contrastingText(dark.primary, 4.5);
  const focusOnPrimaryDark = contrastingText(dark.primary, 3);

  const c = (value: string, fallback: string) => safeColor(value, fallback);

  const cssVars = [
    // Scheme-invariant on purpose: the header banner keeps the journal's literal
    // brand color in both themes rather than the dark-lightened --primary used
    // for surface-contrast-sensitive roles (borders, focus rings). Its on-brand
    // text/focus values are identical to the light-scheme ones since the
    // background they're computed against never changes.
    `--brand:${c(light.primary, '#000000')}`,
    `--text-on-brand:${c(textOnPrimaryLight, '#ffffff')}`,
    `--focus-color-on-brand:${c(light.focusOnPrimary, '#ffffff')}`,
    `--primary-light:${c(light.primary, '#000000')}`,
    `--primary-dark:${c(dark.primary, '#808080')}`,
    `--primary-text-light:${c(light.primaryTextOnWhite, '#000000')}`,
    `--primary-text-dark:${c(dark.primaryTextOnDark, '#a4a4a4')}`,
    `--primary-border-light:${c(light.primaryBorder, '#000000')}`,
    `--primary-border-dark:${c(dark.primaryBorder, '#808080')}`,
    `--button-text-on-primary-bg-light:${c(textOnPrimaryLight, '#ffffff')}`,
    `--button-text-on-primary-bg-dark:${c(textOnPrimaryDark, '#000000')}`,
    `--focus-color-light:${c(light.focusOnWhite, '#000000')}`,
    `--focus-color-dark:${c(dark.focusOnDark, '#808080')}`,
    `--focus-color-on-primary-light:${c(light.focusOnPrimary, '#ffffff')}`,
    `--focus-color-on-primary-dark:${c(focusOnPrimaryDark, '#000000')}`,
    `--focus-color-on-dark-dark:${c(dark.focusOnDark, '#808080')}`,
    `--surface-dark:${c(surfaces.surface, '#191919')}`,
    `--surface-2-dark:${c(surfaces.surface2, '#222222')}`,
    `--surface-raised-dark:${c(surfaces.surfaceRaised, '#2c2c2c')}`,
    `--text-strong-dark:${c(surfaces.textStrong, '#f2f2f2')}`,
    `--text-dark:${c(surfaces.text, '#cecece')}`,
    `--text-muted-dark:${c(surfaces.textMuted, '#a4a4a4')}`,
    `--border-dark:${c(surfaces.border, '#808080')}`,
  ].join(';');

  // Inject CSS custom properties before first paint to prevent CLS.
  // Values are validated (see safeColor) to prevent </style> injection.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }} />
      {children}
    </>
  );
}
