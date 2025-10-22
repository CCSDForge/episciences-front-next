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

  const performFetch = async () => {
    if (!enabled) return;

    try {
      setIsUpdating(true);
      setError(null);

      const freshData = await fetchFn();

      // Mise à jour seulement si les données ont changé
      // Note: comparaison simple, peut être améliorée avec deep equality si nécessaire
      if (JSON.stringify(freshData) !== JSON.stringify(data)) {
        setData(freshData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during fetch');
      setError(error);

      // Log l'erreur pour debug, mais ne pas casser l'UI
      console.warn('[useClientSideFetch] Fetch failed, using static data as fallback:', error.message);

      // Appeler le callback d'erreur si fourni
      if (onError) {
        onError(error);
      }

      // Garder les données initiales en cas d'erreur (graceful degradation)
      // setData reste inchangé, on utilise le fallback HTML statique
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    // Protection contre le double-fetch en React StrictMode (dev)
    if (hasFetched.current) return;
    hasFetched.current = true;

    performFetch();

    // Cleanup si nécessaire (abort controller pour annuler les fetches en cours)
    return () => {
      // Pas de cleanup spécial nécessaire pour l'instant
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: On ignore volontairement fetchFn et initialData pour éviter les re-fetch inutiles

  return {
    data,
    isUpdating,
    error,
    refetch: performFetch,
  };
}
