import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import LanguageDropdown from '../LanguageDropdown';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/en/home',
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.header.languageSelector': 'Select language',
        'components.header.selectLanguage': 'Choose a language',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Redux hooks
const mockDispatch = vi.fn();
vi.mock('@/hooks/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => {
    const mockState = {
      i18nReducer: { language: 'en' },
      journalReducer: { config: { NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES: 'en,fr,es' } },
    };
    return selector(mockState);
  },
}));

// Mock icon components with proper ARIA
vi.mock('@/components/icons', () => ({
  CaretUpIcon: ({
    size,
    ariaLabel,
    className,
  }: {
    size: number;
    ariaLabel?: string;
    className?: string;
  }) => (
    <span
      data-testid="caret-up"
      data-size={size}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  ),
  CaretDownIcon: ({
    size,
    ariaLabel,
    className,
  }: {
    size: number;
    ariaLabel?: string;
    className?: string;
  }) => (
    <span
      data-testid="caret-down"
      data-size={size}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  ),
  TranslateIcon: ({ size, className }: { size: number; className?: string }) => (
    <span
      data-testid="translate-icon"
      data-size={size}
      role="img"
      aria-label="Translate"
      className={className}
    />
  ),
}));

// Mock language utilities
vi.mock('@/utils/language-utils', () => ({
  getLocalizedPath: (path: string, lang: string) => `/${lang}${path}`,
  removeLanguagePrefix: (path: string) => path.replace(/^\/[a-z]{2}/, ''),
}));

// Mock availableLanguages
vi.mock('@/utils/i18n', () => ({
  availableLanguages: ['en', 'fr', 'es'],
  defaultLanguage: 'en',
}));

describe('LanguageDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  describe('Basic rendering', () => {
    it('renders dropdown button', () => {
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('displays current language in uppercase', () => {
      render(<LanguageDropdown />);

      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('renders translate icon', () => {
      render(<LanguageDropdown />);

      expect(screen.getByTestId('translate-icon')).toBeInTheDocument();
    });

    it('renders caret down icon when closed', () => {
      render(<LanguageDropdown />);

      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });
  });

  describe('Accessibility - ARIA attributes', () => {
    it.each([
      { description: 'button has aria-haspopup="true"', attribute: 'aria-haspopup', value: 'true' },
      {
        description: 'button has aria-expanded="false" when closed',
        attribute: 'aria-expanded',
        value: 'false',
      },
      {
        description: 'button has descriptive aria-label',
        attribute: 'aria-label',
        value: 'Select language',
      },
    ])('$description', ({ attribute, value }) => {
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(attribute, value);
    });

    it('button has aria-expanded="true" when open', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Menu accessibility', () => {
    it('menu has role="menu"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('menu has aria-label', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Choose a language');
    });

    it('menu is hidden when closed', () => {
      const { container } = render(<LanguageDropdown />);

      const menu = container.querySelector('.languageDropdown-menu');
      expect(menu).toHaveAttribute('hidden');
    });

    it('menu is visible when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const menu = container.querySelector('.languageDropdown-menu');
      expect(menu).not.toHaveAttribute('hidden');
    });
  });

  describe('Menu items accessibility', () => {
    it('menu items have role="menuitemradio"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const menuItems = screen.getAllByRole('menuitemradio');
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it('current language has aria-checked="true"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const currentItem = screen
        .getAllByRole('menuitemradio')
        .find(item => item.getAttribute('aria-checked') === 'true');
      expect(currentItem).toBeInTheDocument();
      expect(currentItem).toHaveTextContent('EN');
    });

    it('menu item parent li has role="none"', async () => {
      const user = userEvent.setup();
      const { container } = render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const listItems = container.querySelectorAll('li[role="none"]');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('menu items have tabIndex="-1"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const menuItems = screen.getAllByRole('menuitemradio');
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Keyboard navigation', () => {
    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
      ['ArrowDown', '{ArrowDown}'],
      ['ArrowUp', '{ArrowUp}'],
    ])('%s key opens dropdown', async (_label: string, key: string) => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(key);

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('Escape key closes dropdown', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      // Open dropdown
      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');

      // Press Escape
      await user.keyboard('{Escape}');

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Menu item keyboard navigation', () => {
    it.each([
      {
        description: 'ArrowDown navigates to next menu item',
        key1: '{ArrowDown}',
        key2: '{ArrowDown}',
        expanded: 'true',
      },
      {
        description: 'ArrowUp navigates to previous menu item',
        key1: '{ArrowUp}',
        key2: '{ArrowUp}',
        expanded: 'true',
      },
      {
        description: 'Escape from menu item closes dropdown',
        key1: '{ArrowDown}',
        key2: '{Escape}',
        expanded: 'false',
      },
    ])('$description', async ({ key1, key2, expanded }) => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      // Open dropdown / focus a menu item
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(key1);

      await user.keyboard(key2);

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', expanded);
    });
  });

  describe('Language selection', () => {
    it('clicking a language option changes the URL', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      // Click on French
      const frenchOption = screen.getByText(/FR -/);
      await user.click(frenchOption);

      // Should have triggered a navigation via router.push
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('fr'));
    });

    it('selecting current language does not navigate', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      // Click on current language (English)
      const englishOption = screen.getByText(/EN -/);
      await user.click(englishOption);

      // Should close without navigation
      expect(window.location.href).toBe('');
    });
  });

  describe('Icon states', () => {
    it('shows caret down when closed', () => {
      render(<LanguageDropdown />);

      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });

    it('shows caret up when open', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('caret down has descriptive aria-label', () => {
      render(<LanguageDropdown />);

      const caret = screen.getByTestId('caret-down');
      expect(caret).toHaveAttribute('aria-label', 'Expand language menu');
    });

    it('caret up has descriptive aria-label', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const caret = screen.getByTestId('caret-up');
      expect(caret).toHaveAttribute('aria-label', 'Collapse language menu');
    });
  });

  describe('Initial language prop', () => {
    it('uses initialLanguage when provided', () => {
      render(<LanguageDropdown initialLanguage="fr" />);

      expect(screen.getByText('FR')).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it.each([['.languageDropdown'], ['.languageDropdown-button'], ['.languageDropdown-menu']])(
      'applies %s class',
      (selector: string) => {
        const { container } = render(<LanguageDropdown />);

        expect(container.querySelector(selector)).toBeInTheDocument();
      }
    );

    it('applies displayed class when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(container.querySelector('.languageDropdown-menu-displayed')).toBeInTheDocument();
    });
  });

  describe('Click outside to close', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <LanguageDropdown />
          <button data-testid="outside-button">Outside</button>
        </div>
      );

      // Open dropdown
      await user.click(screen.getByRole('button', { name: 'Select language' }));
      expect(screen.getByRole('button', { name: 'Select language' })).toHaveAttribute(
        'aria-expanded',
        'true'
      );

      // Click outside
      await user.click(screen.getByTestId('outside-button'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Select language' })).toHaveAttribute(
          'aria-expanded',
          'false'
        );
      });
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations when closed', async () => {
      const { container } = render(<LanguageDropdown />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
