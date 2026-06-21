'use client';

import {
  ensureContrast,
  generateAccessibleColorVariants,
  getContrastingTextColor,
} from '@/utils/colorContrast';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'theme' });

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

    // Récupérer les couleurs du journal
    const primaryColor = getValue('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR', '#000000');
    const primaryTextColorOverride = getValue('NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR', '');

    // Générer automatiquement les variantes accessibles depuis la couleur primaire
    const variants = generateAccessibleColorVariants(primaryColor);
    // Texte sur fond primary : couleur override (corrigée WCAG) ou auto noir/blanc
    const textOnPrimary = primaryTextColorOverride
      ? ensureContrast(primaryTextColorOverride, primaryColor, 4.5)
      : getContrastingTextColor(primaryColor);

    const textAA = variants.primaryTextOnWhite;
    const textAAA = variants.primaryTextOnWhiteAAA;
    const textLarge = variants.primaryLargeTextOnWhite;
    const textOnGray = variants.primaryTextOnLightGray;
    const textOnDark = variants.primaryTextOnDark;
    const borderColor = variants.primaryBorder;

    // Appliquer toutes les variables CSS
    root.style.setProperty('--primary', variants.primary);
    root.style.setProperty('--primary-text', textAA);
    root.style.setProperty('--primary-text-aaa', textAAA);
    root.style.setProperty('--primary-text-large', textLarge);
    root.style.setProperty('--primary-text-on-gray', textOnGray);
    root.style.setProperty('--primary-text-on-dark', textOnDark);
    root.style.setProperty('--primary-border', borderColor);

    // Variantes sémantiques
    root.style.setProperty('--link-color', textAA);
    root.style.setProperty('--link-hover-color', textAAA);
    root.style.setProperty('--heading-color', textAA);
    root.style.setProperty('--button-text-on-primary-bg', textOnPrimary);

    // Focus indicators (WCAG AA 3:1 for UI components)
    root.style.setProperty('--focus-color', variants.focusOnWhite);
    root.style.setProperty('--focus-color-on-primary', variants.focusOnPrimary);
    root.style.setProperty('--focus-color-on-dark', variants.focusOnDark);

    log.debug('Accessible colors generated:', {
      original: primaryColor,
      textOverride: primaryTextColorOverride || '(none)',
      variants: {
        text: textAA,
        textAAA: textAAA,
        largeText: textLarge,
        border: borderColor,
        onPrimaryBg: textOnPrimary,
        focus: {
          onWhite: variants.focusOnWhite,
          onPrimary: variants.focusOnPrimary,
          onDark: variants.focusOnDark,
        },
      },
    });
  }
};

export default applyThemeVariables;
