'use client';

import { ComponentProps, forwardRef } from 'react';
import NextLink from 'next/link';

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

// Composant Link personnalisé qui utilise Next.js Link en dev et anchor en production
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ 
  href, 
  children,
  ...props 
}, ref) {
  // Normaliser le chemin
  const normalizedHref = normalizePath(href);
  
  // Filtrer les props spécifiques à Next.js qui ne sont pas valides pour les éléments <a>
  const { prefetch, scroll, replace, shallow, ...validProps } = props;
  
  // En développement, utiliser Next.js Link pour les liens internes
  if (shouldUseNextLink(normalizedHref)) {
    return (
      <NextLink href={normalizedHref} {...validProps}>
        {children}
      </NextLink>
    );
  }
  
  // En production ou pour les liens externes, utiliser un élément <a> standard
  return (
    <a 
      ref={ref}
      href={normalizedHref} 
      {...validProps}
    >
      {children}
    </a>
  );
}); 