import fs from 'fs';
import path from 'path';
import { loadJournalConfig, getJournalsList, JournalConfig } from './env-loader';

export { loadJournalConfig, getJournalsList };
export type { JournalConfig };

/**
 * Génère les chemins statiques pour un journal
 */
export async function generateStaticPaths(journalCode: string) {
  const config = loadJournalConfig(journalCode);

  // TODO: Implémenter la logique de génération des chemins
  // Cette fonction sera utilisée dans getStaticPaths de chaque page

  return {
    paths: [],
    fallback: false,
  };
}

/**
 * Vérifie si un journal existe
 */
export function journalExists(journalCode: string): boolean {
  const journals = getJournalsList();
  return journals.includes(journalCode);
}

/**
 * Retourne la liste des codes de journaux pour la génération statique
 */
export function getStaticJournalCodes(): string[] {
  const journalCode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  if (!journalCode) {
    throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
  }
  return [journalCode];
}
