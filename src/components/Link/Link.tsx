'use client';

import { ComponentProps, forwardRef, useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useAppSelector } from '@/hooks/store';
import { getLocalizedPath, defaultLanguage, getLanguageFromPathname } from '@/utils/language-utils';

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
};

// Fonction utilitaire pour normaliser les chemins
function normalizePath(path: string): string {
  // Si c'est déjà une URL complète ou un mailto, ne pas modifier
  if (path.startsWith('http') || path.startsWith('//') || path.startsWith('mailto:') || path.startsWith('#')) {
    return path;
  }

  // Assurer que le chemin commence par un slash pour qu'il soit traité comme absolu
  const normalizedPath = path.startsWith('/') ? path : '/' + path;

  // Nettoyer le chemin en remplaçant les doubles slashes par des simples
  return normalizedPath.replace(/\/+/g, '/');
}

// Déterminer si on doit utiliser Next.js Link ou anchor standard
function shouldUseNextLink(href: string): boolean {
  // Utiliser Next.js Link pour les liens internes en mode développement
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isInternal = !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('#');

  return isDevelopment && isInternal;
}

// Hook to safely get language from Redux with SSR support
function useCurrentLanguage(): string {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState(defaultLanguage);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only access Redux after component is mounted on client
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      // Get language from URL pathname as fallback
      const pathLang = getLanguageFromPathname(window.location.pathname);
      setLanguage(pathLang);
    }
  }, [mounted]);

  return language;
}

// Composant Link personnalisé qui utilise Next.js Link en dev et anchor en production
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({
  href,
  children,
  ...props
}, ref) {
  const currentLanguage = useCurrentLanguage();

  // Normaliser le chemin
  const normalizedHref = normalizePath(href);

  // Localize the href only for internal links
  const isExternal = normalizedHref.startsWith('http') || normalizedHref.startsWith('//') || normalizedHref.startsWith('mailto:') || normalizedHref.startsWith('#');
  const localizedHref = isExternal ? normalizedHref : getLocalizedPath(normalizedHref, currentLanguage);

  // Filtrer les props spécifiques à Next.js qui ne sont pas valides pour les éléments <a>
  const { prefetch, scroll, replace, shallow, ...validProps } = props;

  // En développement, utiliser Next.js Link pour les liens internes
  if (shouldUseNextLink(localizedHref)) {
    return (
      <NextLink href={localizedHref} {...validProps}>
        {children}
      </NextLink>
    );
  }

  // En production ou pour les liens externes, utiliser un élément <a> standard
  return (
    <a
      ref={ref}
      href={localizedHref}
      {...validProps}
    >
      {children}
    </a>
  );
}); 