import fs from 'fs';
import path from 'path';

interface JournalConfig {
  code: string;
  env: Record<string, string>;
}

/**
 * Lit la liste des journaux depuis le fichier journals.txt
 */
export function getJournalsList(): string[] {
  const journalsPath = path.join(process.cwd(), 'external-assets/journals.txt');
  const content = fs.readFileSync(journalsPath, 'utf-8');
  return content.split('\n').filter(Boolean);
}

/**
 * Charge la configuration d'un journal
 */
export function loadJournalConfig(journalCode: string): JournalConfig {
  const envPath = path.join(process.cwd(), `external-assets/.env.local.${journalCode}`);
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const env = envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=').map(part => part.trim());
      if (key && value) {
        acc[key] = value.replace(/["']/g, '');
      }
      return acc;
    }, {} as Record<string, string>);

  return {
    code: journalCode,
    env
  };
}

/**
 * Génère les chemins statiques pour un journal
 */
export async function generateStaticPaths(journalCode: string) {
  const config = loadJournalConfig(journalCode);
  
  // TODO: Implémenter la logique de génération des chemins
  // Cette fonction sera utilisée dans getStaticPaths de chaque page
  
  return {
    paths: [],
    fallback: false
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