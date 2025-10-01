'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import i18next from 'i18next';
import { useAppDispatch } from '@/hooks/store';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import { getLanguageFromPathname } from '@/utils/language-utils';

interface LanguageInitializerProps {
  initialLanguage?: string;
}

/**
 * Initialize the language from URL pathname
 *
 * This component detects the language from the URL and initializes
 * both Redux state and i18next accordingly.
 *
 * Only runs on client-side after mount to avoid SSR issues with Redux store.
 */
export function LanguageInitializer({ initialLanguage }: LanguageInitializerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render the actual initializer after mounting
  if (!mounted) {
    return null;
  }

  return <LanguageInitializerClient initialLanguage={initialLanguage} />;
}

function LanguageInitializerClient({ initialLanguage }: LanguageInitializerProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  useEffect(() => {
    // Determine language from pathname or use initial language
    const lang = initialLanguage || getLanguageFromPathname(pathname || '/');

    // Update Redux state
    dispatch(setLanguage(lang as any));

    // Update i18next and wait for translations to load
    if (i18next.language !== lang) {
      i18next.changeLanguage(lang);
    }
  }, [pathname, initialLanguage, dispatch]);

  return null;
}
