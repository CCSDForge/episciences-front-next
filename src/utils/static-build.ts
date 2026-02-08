/**
 * Utilitaires pour le build statique
 * Fournit des données statiques pour les appels API pendant le build
 */

export const isStaticBuild = typeof window === 'undefined';

export const getJournalCode = (): string => {
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  if (!rvcode) {
    throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
  }
  return rvcode;
};
