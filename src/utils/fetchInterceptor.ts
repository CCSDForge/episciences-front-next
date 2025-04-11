/**
 * Intercepteur pour le fetch API qui enregistre les requêtes
 */

import { getJournalCode } from './static-build';

// Sauvegarde de la fonction fetch originale
const originalFetch = globalThis.fetch;

// Configuration globale pour l'API
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || '',
  timeout: 15000 // Timeout en ms
};

// Fonction pour journaliser la requête
const logRequest = (method: string, url: string): void => {
 // console.log(`🚀 Fetch: ${method} ${url}`);
};

// Fonction pour journaliser la réponse
const logResponse = (status: number, url: string): void => {
 // console.log(`✅ Response: ${status} from ${url}`);
};

// Fonction pour journaliser les erreurs
const logError = (error: Error, url: string): void => {
 // console.error(`❌ Error: ${error.message} for ${url}`);
};

// Remplacement de la fonction fetch globale
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url = input.toString();
  const method = init?.method || 'GET';

  const journalCode = getJournalCode();
  if (!journalCode) {
    throw new Error('Journal code is not defined in environment variables');
  }

  // Remplacer toutes les occurrences de 'default' par le code de revue actuel dans l'URL
  if (url.includes('rvcode=default')) {
    url = url.replace('rvcode=default', `rvcode=${journalCode}`);
  }
  
  // Gérer la redirection des requêtes vers /default
  if (url.endsWith('/default') || url === 'default') {
   // console.log(`🔀 Redirecting request from /default to /`);
    url = url.replace('/default', '/').replace('default', '/');
  }

  // Log de la requête
  logRequest(method, url);

  try {
    const response = await Promise.race([
      originalFetch(url, init),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
      ),
    ]) as Response;

    // Log de la réponse
    logResponse(response.status, url);

    return response;
  } catch (error) {
    // Log de l'erreur
    logError(error as Error, url);
    throw error;
  }
};

export function createFetchInterceptor() {
  const originalFetch = global.fetch;

  global.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url = input instanceof Request ? input.url : input.toString();
    const method = init?.method || 'GET';
    
    // Gérer la redirection des requêtes vers /default
    if (url.endsWith('/default') || url === 'default') {
     // console.log(`🔀 Redirecting request from /default to /`);
      url = url.replace('/default', '/').replace('default', '/');
      
      // Mettre à jour l'input si nécessaire
      if (input instanceof Request) {
        input = new Request(url, input);
      } else if (typeof input === 'string') {
        input = url;
      } else {
        // Si c'est une URL, créer une nouvelle URL
        input = new URL(url);
      }
    }
    
    try {
      const response = await originalFetch(input, init);
      const status = response.status;
      
      // Cloner la réponse pour pouvoir la retourner
      return response.clone();
    } catch (error) {
      // En cas d'erreur de fetch, la propager
      console.error(`Fetch error for ${method} ${url}:`, error);
      throw error;
    }
  };

  return () => {
    global.fetch = originalFetch;
  };
} 