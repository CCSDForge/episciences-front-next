'use client';

import LanguageDropdown from '@/components/LanguageDropdown/LanguageDropdown';

interface LanguageDropdownWrapperProps {
  lang?: string;
}

export default function LanguageDropdownWrapper({ lang }: LanguageDropdownWrapperProps): JSX.Element {
  // Toujours rendre le dropdown pour éviter les erreurs d'hydratation
  // Le dropdown lui-même gérera la synchronisation avec Redux
  return <LanguageDropdown initialLanguage={lang} />;
}
