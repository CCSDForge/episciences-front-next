'use client';

import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';
import { getLocalizedPath, defaultLanguage } from '@/utils/language-utils';

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  ref?: React.Ref<HTMLAnchorElement>;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  lang?: string;
  [key: string]: any;
};

// Fonction utilitaire pour normaliser les chemins
function normalizePath(path: string): string {
  if (
    path.startsWith('http') ||
    path.startsWith('//') ||
    path.startsWith('mailto:') ||
    path.startsWith('#')
  ) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return normalizedPath.replace(/\/+/g, '/');
}

export function Link({ href, children, lang, ref, prefetch, scroll, replace, shallow, ...props }: LinkProps) {
  const { i18n } = useTranslation();
  // Ensure we always have a language, falling back to defaultLanguage
  const currentLanguage = lang || i18n.language || defaultLanguage;

  // Normaliser le chemin
  const normalizedHref = normalizePath(href);

  // Detect static file paths (PDF, images, archives, etc.) — must not be localized
  const pathWithoutQuery = normalizedHref.split(/[?#]/)[0];
  const isStaticFile = /\.[a-zA-Z0-9]{2,5}$/.test(pathWithoutQuery);

  // Détecter si lien externe
  const isExternal =
    normalizedHref.startsWith('http') ||
    normalizedHref.startsWith('//') ||
    normalizedHref.startsWith('mailto:') ||
    normalizedHref.startsWith('#') ||
    isStaticFile;

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
    <NextLink
      ref={ref}
      href={finalHref}
      prefetch={prefetch}
      scroll={scroll}
      replace={replace}
      shallow={shallow}
      {...props}
    >
      {children}
    </NextLink>
  );
}
