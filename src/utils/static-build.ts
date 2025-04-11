/**
 * Utilitaires pour le build statique
 * Fournit des données statiques pour les appels API pendant le build
 */

export const isStaticBuild = typeof window === 'undefined';

/**
 * Récupère le code de la revue de manière sécurisée pour le build statique
 */
export function getJournalCode(): string {
  if (isStaticBuild) {
    // Valeur par défaut pour le build statique
    return process.env.NEXT_PUBLIC_JOURNAL_CODE || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'jips';
  }
  
  // En environnement client, utiliser la valeur de l'environnement
  return process.env.NEXT_PUBLIC_JOURNAL_CODE || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '';
}

/**
 * Crée un wrapper pour les appels fetch qui retourne des données statiques 
 * pendant le build et effectue l'appel réel en environnement client
 */
export async function safeFetch<T>(url: string, options?: RequestInit, staticData: T | null = null): Promise<T> {
  if (isStaticBuild) {
    // Pendant le build statique, retourner les données statiques
   // console.log(`[Static Build] Mock fetch pour: ${url}`);
    return staticData as T || {} as T;
  }
  
  // En environnement client, effectuer l'appel réel
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }
  
  return response.json();
} 