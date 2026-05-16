import { loadJournalConfig } from '@/utils/env-loader';
import { generateAccessibleColorVariants, getContrastingTextColor } from '@/utils/colorContrast';

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
  const variants = generateAccessibleColorVariants(primaryColor);
  const textOnPrimary = getContrastingTextColor(primaryColor);

  const cssVars = [
    `--primary:${sanitizeCssValue(variants.primary)}`,
    `--primary-text:${sanitizeCssValue(variants.primaryTextOnWhite)}`,
    `--primary-text-aaa:${sanitizeCssValue(variants.primaryTextOnWhiteAAA)}`,
    `--primary-text-large:${sanitizeCssValue(variants.primaryLargeTextOnWhite)}`,
    `--primary-text-on-gray:${sanitizeCssValue(variants.primaryTextOnLightGray)}`,
    `--primary-text-on-dark:${sanitizeCssValue(variants.primaryTextOnDark)}`,
    `--primary-border:${sanitizeCssValue(variants.primaryBorder)}`,
    `--link-color:${sanitizeCssValue(variants.primaryTextOnWhite)}`,
    `--link-hover-color:${sanitizeCssValue(variants.primaryTextOnWhiteAAA)}`,
    `--heading-color:${sanitizeCssValue(variants.primaryTextOnWhite)}`,
    `--button-text-on-primary-bg:${sanitizeCssValue(textOnPrimary)}`,
    `--focus-color:${sanitizeCssValue(variants.focusOnWhite)}`,
    `--focus-color-on-primary:${sanitizeCssValue(variants.focusOnPrimary)}`,
    `--focus-color-on-dark:${sanitizeCssValue(variants.focusOnDark)}`,
  ].join(';');

  // Injecting CSS custom properties server-side prevents CLS caused by applyThemeVariables()
  // running in a useEffect after hydration. Values are sanitized to prevent </style> injection.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }} />
      {children}
    </>
  );
}
