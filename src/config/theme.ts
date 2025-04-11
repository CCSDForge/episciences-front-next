'use client';

const applyThemeVariables = (): void => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--primary', process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR || '#000000');
    root.style.setProperty('--primary-text', process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR || '#ffffff');
  }
};

if (typeof window !== 'undefined') {
  applyThemeVariables();
}

export default applyThemeVariables; 