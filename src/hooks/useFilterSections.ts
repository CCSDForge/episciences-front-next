'use client';

import { useState } from 'react';

interface FilterSection<K> {
  key: K;
  isOpened: boolean;
}

/**
 * Manages collapsible filter section state for mobile modals.
 * Replaces the repetitive `openedSections` state + `toggleSection` + `isOpenedSection` pattern.
 */
export function useFilterSections<K extends string>(initialSections: FilterSection<K>[]) {
  const [sections, setSections] = useState<FilterSection<K>[]>(initialSections);

  const toggle = (key: K) => {
    setSections(prev => prev.map(s => (s.key === key ? { ...s, isOpened: !s.isOpened } : s)));
  };

  const isOpened = (key: K): boolean =>
    sections.find(s => s.key === key)?.isOpened ?? false;

  return { toggle, isOpened };
}
