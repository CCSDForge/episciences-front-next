import { useEffect, useState } from 'react';

export function useBaseUrl() {
  // En mode développement, retourner directement l'URL du serveur de développement
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/';
  }

  // En mode production, utiliser l'URL du site configurée ou une valeur par défaut
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Si aucune URL n'est configurée et que nous sommes dans le navigateur, utiliser l'URL actuelle
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}/`;
  }

  // Valeur par défaut pour le rendu côté serveur
  return '/';
}
