'use client';

import { useIsHydrated } from '@/hooks/useIsHydrated';

interface ClientOnlyProps {
  readonly children: React.ReactNode;
}

/**
 * Ce composant permet de s'assurer que le contenu ne sera rendu que côté client.
 * Utile pour éviter les erreurs d'hydratation avec des bibliothèques comme i18n et redux.
 */
export default function ClientOnly({ children }: ClientOnlyProps) {
  const isMounted = useIsHydrated();

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}
