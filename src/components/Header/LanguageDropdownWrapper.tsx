'use client';

import { useEffect, useState } from 'react';
import LanguageDropdown from '@/components/LanguageDropdown/LanguageDropdown';

export default function LanguageDropdownWrapper(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <LanguageDropdown />;
}
