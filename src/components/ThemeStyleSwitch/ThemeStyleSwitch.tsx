'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/hooks/store';

// CSS custom properties are injected server-side in JournalLayout via <style>:root{...}</style>.
// This component only handles body class switching for light/dark mode toggling.
const ThemeStyleSwitch: React.FC = () => {
  const theme = useAppSelector(state => state.themeReducer?.theme || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  return null;
};

export default ThemeStyleSwitch;
