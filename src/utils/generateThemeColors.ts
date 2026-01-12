/**
 * Generate CSS custom properties for accessible colors
 * Used for multi-tenant theming with automatic WCAG compliance
 */

import {
  generateAccessibleColorVariants,
  getContrastingTextColor,
} from './colorContrast';

/**
 * Generate CSS custom properties string for accessible colors
 * To be injected in <style> tag for each journal
 *
 * @param primaryColor - Journal's primary color (hex format)
 * @returns CSS string with custom properties
 *
 * @example
 * ```tsx
 * const css = generateAccessibleCSSVariables('#87CEEB');
 * <style dangerouslySetInnerHTML={{ __html: css }} />
 * ```
 */
export function generateAccessibleCSSVariables(primaryColor: string): string {
  const variants = generateAccessibleColorVariants(primaryColor);
  const textOnPrimary = getContrastingTextColor(primaryColor);

  return `
    :root {
      /* ============================================
         ACCESSIBLE COLOR SYSTEM
         Auto-generated from primary: ${primaryColor}
         ============================================ */

      /* Original primary color (use for backgrounds, large areas) */
      --primary: ${variants.primary};

      /* Accessible text variants (automatically adjusted for WCAG compliance) */
      --primary-text: ${variants.primaryTextOnWhite};
      --primary-text-aaa: ${variants.primaryTextOnWhiteAAA};
      --primary-text-large: ${variants.primaryLargeTextOnWhite};
      --primary-text-on-gray: ${variants.primaryTextOnLightGray};
      --primary-text-on-dark: ${variants.primaryTextOnDark};

      /* UI components */
      --primary-border: ${variants.primaryBorder};

      /* Semantic variants for common use cases */
      --link-color: ${variants.primaryTextOnWhite};
      --link-hover-color: ${variants.primaryTextOnWhiteAAA};
      --heading-color: ${variants.primaryTextOnWhite};
      --button-text-on-primary-bg: ${textOnPrimary};

      /* Focus indicators (must meet 3:1 contrast) */
      --focus-color: ${variants.primaryBorder};
    }
  `.trim();
}

/**
 * Generate inline style object for React components
 * Useful for dynamically themed components
 *
 * @param primaryColor - Journal's primary color (hex format)
 * @returns Object with CSS custom properties
 */
export function generateAccessibleStyleObject(
  primaryColor: string
): Record<string, string> {
  const variants = generateAccessibleColorVariants(primaryColor);
  const textOnPrimary = getContrastingTextColor(primaryColor);

  return {
    '--primary': variants.primary,
    '--primary-text': variants.primaryTextOnWhite,
    '--primary-text-aaa': variants.primaryTextOnWhiteAAA,
    '--primary-text-large': variants.primaryLargeTextOnWhite,
    '--primary-text-on-gray': variants.primaryTextOnLightGray,
    '--primary-text-on-dark': variants.primaryTextOnDark,
    '--primary-border': variants.primaryBorder,
    '--link-color': variants.primaryTextOnWhite,
    '--link-hover-color': variants.primaryTextOnWhiteAAA,
    '--heading-color': variants.primaryTextOnWhite,
    '--button-text-on-primary-bg': textOnPrimary,
    '--focus-color': variants.primaryBorder,
  } as Record<string, string>;
}
