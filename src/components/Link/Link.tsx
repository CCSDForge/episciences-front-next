'use client';

import { ComponentProps, forwardRef } from 'react';
import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';
import { getLocalizedPath, defaultLanguage } from '@/utils/language-utils';

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  lang?: string; // Optional lang prop to force a specific language
  [key: string]: any;
};

// Fonction utilitaire pour normaliser les chemins
function normalizePath(path: string): string {
  if (path.startsWith('http') || path.startsWith('//') || path.startsWith('mailto:') || path.startsWith('#')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return normalizedPath.replace(/\/+/g, '/');
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({
  href,
  children,
  lang,
  ...props
}, ref) {
  const { i18n } = useTranslation();
  // Ensure we always have a language, falling back to defaultLanguage
  const currentLanguage = lang || i18n.language || defaultLanguage;

  // Normaliser le chemin
  const normalizedHref = normalizePath(href);

  // Détecter si lien externe
  const isExternal = normalizedHref.startsWith('http') || normalizedHref.startsWith('//') || normalizedHref.startsWith('mailto:') || normalizedHref.startsWith('#');
  
  // Localiser le chemin interne
  const finalHref = isExternal ? normalizedHref : getLocalizedPath(normalizedHref, currentLanguage);

  if (isExternal) {
    return (
      <a ref={ref} href={finalHref} {...props}>
        {children}
      </a>
    );
  }

  return (
    <NextLink ref={ref} href={finalHref} {...props}>
      {children}
    </NextLink>
  );
});
 