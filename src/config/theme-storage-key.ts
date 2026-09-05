/**
 * localStorage key for the pinned color scheme. Shared between the inline
 * bootstrap script (theme-bootstrap.ts, runs before hydration) and the
 * useColorScheme hook (runs after) so the two can never drift apart.
 */
export const THEME_STORAGE_KEY = 'episciences:color-scheme';
