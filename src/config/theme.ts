'use client';

/**
 * Applique les variables CSS pour le thème du journal.
 * Priorité :
 * 1. Config dynamique passée en paramètre (chargée depuis external-assets)
 * 2. Variables d'environnement de build (process.env)
 * 3. Valeurs par défaut
 */
const applyThemeVariables = (dynamicConfig?: Record<string, string>): void => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;

    // Helper pour récupérer la valeur
    const getValue = (key: string, fallback: string) => {
      return dynamicConfig?.[key] || process.env[key] || fallback;
    };

    root.style.setProperty('--primary', getValue('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR', '#000000'));
    root.style.setProperty(
      '--primary-text',
      getValue('NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR', '#ffffff')
    );
  }
};

export default applyThemeVariables;
