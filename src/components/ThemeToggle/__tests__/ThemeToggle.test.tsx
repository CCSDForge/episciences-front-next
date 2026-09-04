import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import ThemeToggle from '../ThemeToggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'components.themeToggle.label': 'Theme',
        'components.themeToggle.light': 'Light',
        'components.themeToggle.dark': 'Dark',
        'components.themeToggle.switchToDark': 'Switch to dark theme',
        'components.themeToggle.switchToLight': 'Switch to light theme',
      };
      return map[key] ?? key;
    },
  }),
}));

function stubMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
  });

  it('is a native button with aria-pressed reflecting the pinned state', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the current scheme as visible text', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('toggles the pinned scheme on click and updates aria-pressed', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(localStorage.getItem('episciences:color-scheme')).toBe('dark');
  });

  it('toggles via keyboard activation (native button semantics)', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    button.focus();

    fireEvent.click(button); // native <button> activates on Enter/Space -> click

    expect(localStorage.getItem('episciences:color-scheme')).toBe('dark');
  });

  it('describes the action, not just the current state, in its accessible name', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ThemeToggle />);
    const results = await checkA11y(container);
    expect(results).toHaveNoViolations();
  });
});
