import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageInitializer } from '../LanguageInitializer';
import { setLanguage } from '@/store/features/i18n/i18n.slice';

const mockDispatch = vi.fn();
const mockUsePathname = vi.fn(() => '/fr/volumes');
const mockChangeLanguage = vi.fn();

vi.mock('@/hooks/store', () => ({
  useAppDispatch: () => mockDispatch,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('i18next', () => ({
  default: {
    get language() {
      return 'en';
    },
    changeLanguage: (lang: string) => mockChangeLanguage(lang),
  },
}));

describe('LanguageInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.lang = 'en';
    mockUsePathname.mockReturnValue('/fr/volumes');
  });

  it('syncs document.documentElement.lang with initialLanguage (WCAG 3.1.1)', async () => {
    render(<LanguageInitializer initialLanguage="fr" />);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fr');
    });
  });

  it('derives the language from the pathname when initialLanguage is absent', async () => {
    mockUsePathname.mockReturnValue('/fr/articles');
    render(<LanguageInitializer />);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fr');
    });
  });

  it('dispatches setLanguage to the store', async () => {
    render(<LanguageInitializer initialLanguage="fr" />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setLanguage('fr'));
    });
  });

  it('changes i18next language when it differs', async () => {
    render(<LanguageInitializer initialLanguage="fr" />);

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('fr');
    });
  });

  it('does not change i18next language when already in sync', async () => {
    render(<LanguageInitializer initialLanguage="en" />);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
    });
    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});
