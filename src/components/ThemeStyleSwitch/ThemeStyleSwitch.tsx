'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/hooks/store';
import applyThemeVariables from '@/config/theme';

const ThemeStyleSwitch: React.FC = () => {
  const theme = useAppSelector(state => state.themeReducer?.theme || 'light');
  
  useEffect(() => {
    // Appliquer les variables de couleur du journal
    applyThemeVariables();
    
    // Appliquer le thème au body
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  return null; // Ce composant n'affiche rien, il gère juste le thème
};

export default ThemeStyleSwitch; 