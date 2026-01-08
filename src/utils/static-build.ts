/**
 * Utilitaires pour le build statique
 * Fournit des données statiques pour les appels API pendant le build
 */

export const isStaticBuild = typeof window === 'undefined';

/**
 * Récupère le code de la revue de manière sécurisée pour le build statique
 */
export function getJournalCode(): string {
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

  if (!rvcode) {
    throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
  }

  return rvcode;
}

/**
 * Crée un wrapper pour les appels fetch qui retourne des données statiques
 * pendant le build et effectue l'appel réel en environnement client
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  staticData: T | null = null
): Promise<T> {
  if (isStaticBuild) {
    // Pendant le build statique, retourner les données statiques
    // console.log(`[Static Build] Mock fetch pour: ${url}`);
    return (staticData as T) || ({} as T);
  }

  // En environnement client, effectuer l'appel réel
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }

  return response.json();
}
