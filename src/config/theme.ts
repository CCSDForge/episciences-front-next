'use client';

import { generateAccessibleColorVariants, getContrastingTextColor } from '@/utils/colorContrast';

/**
 * Applique les variables CSS pour le thème du journal avec génération automatique
 * de variantes accessibles conformes WCAG 2.2 AA/AAA.
 *
 * Priorité :
 * 1. Config dynamique passée en paramètre (chargée depuis external-assets)
 * 2. Variables d'environnement de build (process.env)
 * 3. Valeurs par défaut
 *
 * NOUVEAU : Génère automatiquement des variantes de couleur accessibles :
 * - --primary : Couleur originale (backgrounds)
 * - --primary-text : Version ajustée pour texte sur blanc (WCAG AA 4.5:1)
 * - --primary-text-aaa : Version haute contraste (WCAG AAA 7:1)
 * - --primary-text-large : Pour gros texte (WCAG AA 3:1)
 * - --primary-border : Pour composants UI (WCAG AA 3:1)
 * - --link-color, --heading-color : Variantes sémantiques
 * - --button-text-on-primary-bg : Noir ou blanc selon luminosité du primary
 *
 * @see docs/accessible_color_system.md
 */
const applyThemeVariables = (dynamicConfig?: Record<string, string>): void => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;

    // Helper pour récupérer la valeur
    const getValue = (key: string, fallback: string) => {
      return dynamicConfig?.[key] || process.env[key] || fallback;
    };

    // Récupérer la couleur primaire du journal
    const primaryColor = getValue('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR', '#000000');

    // Générer automatiquement les variantes accessibles
    const variants = generateAccessibleColorVariants(primaryColor);
    const textOnPrimary = getContrastingTextColor(primaryColor);

    // Appliquer toutes les variables CSS
    root.style.setProperty('--primary', variants.primary);
    root.style.setProperty('--primary-text', variants.primaryTextOnWhite);
    root.style.setProperty('--primary-text-aaa', variants.primaryTextOnWhiteAAA);
    root.style.setProperty('--primary-text-large', variants.primaryLargeTextOnWhite);
    root.style.setProperty('--primary-text-on-gray', variants.primaryTextOnLightGray);
    root.style.setProperty('--primary-text-on-dark', variants.primaryTextOnDark);
    root.style.setProperty('--primary-border', variants.primaryBorder);

    // Variantes sémantiques
    root.style.setProperty('--link-color', variants.primaryTextOnWhite);
    root.style.setProperty('--link-hover-color', variants.primaryTextOnWhiteAAA);
    root.style.setProperty('--heading-color', variants.primaryTextOnWhite);
    root.style.setProperty('--button-text-on-primary-bg', textOnPrimary);

    // Focus indicators (WCAG AA 3:1 for UI components)
    root.style.setProperty('--focus-color', variants.focusOnWhite);
    root.style.setProperty('--focus-color-on-primary', variants.focusOnPrimary);
    root.style.setProperty('--focus-color-on-dark', variants.focusOnDark);

    // Log pour debug (seulement en dev)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Theme] Accessible colors generated:', {
        original: primaryColor,
        variants: {
          text: variants.primaryTextOnWhite,
          textAAA: variants.primaryTextOnWhiteAAA,
          largeText: variants.primaryLargeTextOnWhite,
          border: variants.primaryBorder,
          onPrimaryBg: textOnPrimary,
          focus: {
            onWhite: variants.focusOnWhite,
            onPrimary: variants.focusOnPrimary,
            onDark: variants.focusOnDark,
          },
        },
      });
    }
  }
};

export default applyThemeVariables;
