import { useState, useEffect, useRef } from 'react';

/**
 * Hook pour fetcher les données côté client avec transition smooth
 *
 * Architecture Hybride :
 * - Au build : HTML statique généré avec données (SEO-friendly)
 * - Au runtime : Fetch automatique pour avoir les données les plus récentes
 * - Transition invisible : pas de flash, mise à jour smooth
 *
 * @example
 * ```typescript
 * const { data, isUpdating } = useClientSideFetch({
 *   fetchFn: () => fetchAboutPage(rvcode),
 *   initialData: staticPageData,
 *   enabled: true
 * });
 * ```
 */

interface UseClientSideFetchOptions<T> {
  /** Fonction qui fetch les données depuis l'API */
  fetchFn: () => Promise<T>;

  /** Données initiales provenant du HTML statique (fallback) */
  initialData: T | null;

  /** Active ou désactive le fetch automatique (défaut: true) */
  enabled?: boolean;

  /** Callback appelé en cas d'erreur (optionnel) */
  onError?: (error: Error) => void;
}

interface UseClientSideFetchReturn<T> {
  /** Données actuelles (statiques puis mises à jour si disponibles) */
  data: T | null;

  /** Indique si un fetch est en cours */
  isUpdating: boolean;

  /** Erreur éventuelle (null si pas d'erreur) */
  error: Error | null;

  /** Fonction pour forcer un re-fetch manuel */
  refetch: () => Promise<void>;
}

export function useClientSideFetch<T>({
  fetchFn,
  initialData,
  enabled = true,
  onError,
}: UseClientSideFetchOptions<T>): UseClientSideFetchReturn<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Éviter les double-fetch en mode strict
  const hasFetched = useRef(false);

  const performFetch = async (force = false, signal?: AbortSignal) => {
    if (!enabled && !force) return;

    try {
      setIsUpdating(true);
      setError(null);

      const freshData = await fetchFn();

      if (signal?.aborted) return;

      // Mise à jour seulement si les données ont changé
      if (JSON.stringify(freshData) !== JSON.stringify(data)) {
        setData(freshData);
      }
    } catch (err) {
      if (signal?.aborted) return;

      const fetchError = err instanceof Error ? err : new Error('Unknown error during fetch');

      // Ignorer les erreurs d'abandon (composant démonté)
      if (fetchError.name === 'AbortError') return;

      setError(fetchError);

      console.warn(
        '[useClientSideFetch] Fetch failed, using static data as fallback:',
        fetchError.message
      );

      if (onError) {
        onError(fetchError);
      }
    } finally {
      if (!signal?.aborted) {
        setIsUpdating(false);
      }
    }
  };

  useEffect(() => {
    // Protection contre le double-fetch en React StrictMode (dev)
    if (hasFetched.current) return;
    hasFetched.current = true;

    const controller = new AbortController();
    performFetch(false, controller.signal);

    return () => controller.abort();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isUpdating,
    error,
    refetch: () => performFetch(true),
  };
}
