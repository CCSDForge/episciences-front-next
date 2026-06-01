import { loadJournalConfig } from '@/utils/env-loader';
import { ensureContrast, generateAccessibleColorVariants, getContrastingTextColor } from '@/utils/colorContrast';

interface JournalLayoutProps {
  children: React.ReactNode;
  params: Promise<{ journalId: string }>;
}

// Strip characters that could break out of a <style> tag (e.g. </style>)
const sanitizeCssValue = (value: string): string => value.replace(/[^#a-zA-Z0-9%.,() ]/g, '');

export default async function JournalLayout(props: JournalLayoutProps) {
  const { journalId } = await props.params;
  const { children } = props;

  const config = loadJournalConfig(journalId);
  const primaryColor = config.env['NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR'] ?? '#000000';
  const primaryTextOverride = config.env['NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR'] ?? '';

  const variants = generateAccessibleColorVariants(primaryColor);

  const textAA = primaryTextOverride ? ensureContrast(primaryTextOverride, '#ffffff', 4.5) : variants.primaryTextOnWhite;
  const textAAA = primaryTextOverride ? ensureContrast(primaryTextOverride, '#ffffff', 7) : variants.primaryTextOnWhiteAAA;
  const textLarge = primaryTextOverride ? ensureContrast(primaryTextOverride, '#ffffff', 3) : variants.primaryLargeTextOnWhite;
  const textOnGray = primaryTextOverride ? ensureContrast(primaryTextOverride, '#f5f5f5', 4.5) : variants.primaryTextOnLightGray;
  const textOnDark = primaryTextOverride ? ensureContrast(primaryTextOverride, '#333333', 4.5) : variants.primaryTextOnDark;
  const borderColor = primaryTextOverride ? ensureContrast(primaryTextOverride, '#ffffff', 3) : variants.primaryBorder;
  const textOnPrimary = primaryTextOverride
    ? ensureContrast(primaryTextOverride, primaryColor, 4.5)
    : getContrastingTextColor(primaryColor);

  const cssVars = [
    `--primary:${sanitizeCssValue(variants.primary)}`,
    `--primary-text:${sanitizeCssValue(textAA)}`,
    `--primary-text-aaa:${sanitizeCssValue(textAAA)}`,
    `--primary-text-large:${sanitizeCssValue(textLarge)}`,
    `--primary-text-on-gray:${sanitizeCssValue(textOnGray)}`,
    `--primary-text-on-dark:${sanitizeCssValue(textOnDark)}`,
    `--primary-border:${sanitizeCssValue(borderColor)}`,
    `--link-color:${sanitizeCssValue(textAA)}`,
    `--link-hover-color:${sanitizeCssValue(textAAA)}`,
    `--heading-color:${sanitizeCssValue(textAA)}`,
    `--button-text-on-primary-bg:${sanitizeCssValue(textOnPrimary)}`,
    `--focus-color:${sanitizeCssValue(variants.focusOnWhite)}`,
    `--focus-color-on-primary:${sanitizeCssValue(variants.focusOnPrimary)}`,
    `--focus-color-on-dark:${sanitizeCssValue(variants.focusOnDark)}`,
  ].join(';');

  // Inject CSS custom properties before first paint to prevent CLS.
  // Values are sanitized to prevent </style> injection.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }} />
      {children}
    </>
  );
}
