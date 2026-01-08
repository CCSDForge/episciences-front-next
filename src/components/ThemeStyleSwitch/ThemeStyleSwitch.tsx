'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/hooks/store';
import applyThemeVariables from '@/config/theme';
import { selectJournalConfig } from '@/store/features/journal/journal.slice';

const ThemeStyleSwitch: React.FC = () => {
  const theme = useAppSelector(state => state.themeReducer?.theme || 'light');
  const journalConfig = useAppSelector(selectJournalConfig);

  useEffect(() => {
    // Appliquer les variables de couleur du journal avec la config dynamique
    applyThemeVariables(journalConfig);

    // Appliquer le thème au body
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [theme, journalConfig]);

  return null; // Ce composant n'affiche rien, il gère juste le thème
};

export default ThemeStyleSwitch;
