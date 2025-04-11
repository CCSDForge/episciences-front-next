'use client';

import { ComponentProps, forwardRef } from 'react';

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

// Composant Link personnalisé qui génère des liens HTML standards
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ 
  href, 
  children,
  ...props 
}, ref) {
  // Normaliser le chemin
  const normalizedHref = normalizePath(href);
  
  // Utiliser un élément <a> standard avec le chemin normalisé
  return (
    <a 
      ref={ref}
      href={normalizedHref} 
      {...props}
    >
      {children}
    </a>
  );
}); 