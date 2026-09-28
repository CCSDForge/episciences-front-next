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
        'components.themeToggle.system': 'System',
        'components.themeToggle.selectTheme': 'Choose theme',
      };
      return map[key] ?? key;
    },
  }),
}));

const STORAGE_KEY = 'episciences:color-scheme';

function stubMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

function getTrigger(): HTMLElement {
  return screen.getByRole('button', { name: /^Theme/ });
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    stubMatchMedia(true);
  });

  it('shows the light default, even on a dark OS', () => {
    render(<ThemeToggle />);

    expect(getTrigger()).toHaveAccessibleName('Theme: Light');
    expect(getTrigger()).toHaveTextContent('Light');
  });

  it('reflects a stored preference', () => {
    localStorage.setItem(STORAGE_KEY, 'system');
    render(<ThemeToggle />);

    expect(getTrigger()).toHaveAccessibleName('Theme: System');
  });

  it('opens a menu with the three choices, the current one checked', () => {
    render(<ThemeToggle />);
    const trigger = getTrigger();

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitemradio');
    expect(items.map(i => i.textContent)).toEqual(['Light', 'Dark', 'System']);
    expect(items[0]).toHaveAttribute('aria-checked', 'true');
    expect(items[1]).toHaveAttribute('aria-checked', 'false');
  });

  it.each([
    ['Dark', 'dark', 'dark'],
    ['System', 'system', 'system'],
  ])('selecting "%s" stores it and sets data-theme', (label, stored, theme) => {
    render(<ThemeToggle />);
    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByRole('menuitemradio', { name: label }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe(stored);
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(screen.getByRole('menu', { hidden: true })).not.toBeVisible();
    expect(getTrigger()).toHaveFocus();
  });

  it('selecting "Light" clears the stored preference and data-theme', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle />);

    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Light' }));

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('supports keyboard navigation: open on current item, arrows wrap, Escape closes', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    render(<ThemeToggle />);
    const trigger = getTrigger();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const items = screen.getAllByRole('menuitemradio');
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: 'ArrowDown' });
    expect(items[2]).toHaveFocus();
    fireEvent.keyDown(items[2], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[2]).toHaveFocus();
    fireEvent.keyDown(items[2], { key: 'Home' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0], { key: 'End' });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('selects with Enter from the keyboard', () => {
    render(<ThemeToggle />);
    fireEvent.keyDown(getTrigger(), { key: 'Enter' });
    const items = screen.getAllByRole('menuitemradio');
    fireEvent.keyDown(items[0], { key: 'End' });
    fireEvent.keyDown(items[2], { key: 'Enter' });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('system');
  });

  it('closes when clicking outside', () => {
    render(<ThemeToggle />);
    fireEvent.click(getTrigger());
    fireEvent.mouseDown(document.body);

    expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('has no accessibility violations, closed or open', async () => {
    const { container } = render(<ThemeToggle />);
    expect(await checkA11y(container)).toHaveNoViolations();

    fireEvent.click(getTrigger());
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
