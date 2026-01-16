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
  CaretUpBlackIcon: ({ size, ariaLabel, className }: { size: number; ariaLabel?: string; className?: string }) => (
    <span data-testid="caret-up-black" data-size={size} role="img" aria-label={ariaLabel} className={className} />
  ),
  CaretDownBlackIcon: ({ size, ariaLabel, className }: { size: number; ariaLabel?: string; className?: string }) => (
    <span data-testid="caret-down-black" data-size={size} role="img" aria-label={ariaLabel} className={className} />
  ),
  CaretUpWhiteIcon: ({ size, ariaLabel, className }: { size: number; ariaLabel?: string; className?: string }) => (
    <span data-testid="caret-up-white" data-size={size} role="img" aria-label={ariaLabel} className={className} />
  ),
  CaretDownWhiteIcon: ({ size, ariaLabel, className }: { size: number; ariaLabel?: string; className?: string }) => (
    <span data-testid="caret-down-white" data-size={size} role="img" aria-label={ariaLabel} className={className} />
  ),
  TranslateIcon: ({ size, className }: { size: number; className?: string }) => (
    <span data-testid="translate-icon" data-size={size} role="img" aria-label="Translate" className={className} />
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

      expect(screen.getByTestId('caret-down-black')).toBeInTheDocument();
    });
  });

  describe('Accessibility - ARIA attributes', () => {
    it('button has aria-haspopup="true"', () => {
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('button has aria-expanded="false" when closed', () => {
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('button has aria-expanded="true" when open', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('button has descriptive aria-label', () => {
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Select language');
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
    it('menu items have role="menuitem"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it('current language has aria-current="true"', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const currentItem = screen.getAllByRole('menuitem').find(
        item => item.getAttribute('aria-current') === 'true'
      );
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

      const menuItems = screen.getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Keyboard navigation', () => {
    it('Enter key opens dropdown', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('Space key opens dropdown', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

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

    it('ArrowDown opens dropdown and focuses first item', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowUp opens dropdown and focuses last item', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowUp}');

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Menu item keyboard navigation', () => {
    it('ArrowDown navigates to next menu item', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      // Open dropdown with ArrowDown to focus first item
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowDown}');

      // Navigate down
      await user.keyboard('{ArrowDown}');

      // Menu should still be open
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowUp navigates to previous menu item', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      // Open dropdown with ArrowUp to focus last item
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowUp}');

      // Navigate up
      await user.keyboard('{ArrowUp}');

      // Menu should still be open
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('Escape from menu item closes dropdown', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      // Open dropdown
      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ArrowDown}');

      // Press Escape
      await user.keyboard('{Escape}');

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
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

      // Should have triggered a navigation
      expect(window.location.href).toContain('fr');
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

      expect(screen.getByTestId('caret-down-black')).toBeInTheDocument();
    });

    it('shows caret up when open', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('caret-up-black')).toBeInTheDocument();
    });

    it('caret down has descriptive aria-label', () => {
      render(<LanguageDropdown />);

      const caret = screen.getByTestId('caret-down-black');
      expect(caret).toHaveAttribute('aria-label', 'Expand language menu');
    });

    it('caret up has descriptive aria-label', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown />);

      await user.click(screen.getByRole('button'));

      const caret = screen.getByTestId('caret-up-black');
      expect(caret).toHaveAttribute('aria-label', 'Collapse language menu');
    });
  });

  describe('White caret variant', () => {
    it('shows white caret when withWhiteCaret is true', () => {
      render(<LanguageDropdown withWhiteCaret />);

      expect(screen.getByTestId('caret-down-white')).toBeInTheDocument();
    });

    it('shows white caret up when open and withWhiteCaret is true', async () => {
      const user = userEvent.setup();
      render(<LanguageDropdown withWhiteCaret />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByTestId('caret-up-white')).toBeInTheDocument();
    });
  });

  describe('Initial language prop', () => {
    it('uses initialLanguage when provided', () => {
      render(<LanguageDropdown initialLanguage="fr" />);

      expect(screen.getByText('FR')).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('applies languageDropdown class', () => {
      const { container } = render(<LanguageDropdown />);

      expect(container.querySelector('.languageDropdown')).toBeInTheDocument();
    });

    it('applies languageDropdown-button class', () => {
      const { container } = render(<LanguageDropdown />);

      expect(container.querySelector('.languageDropdown-button')).toBeInTheDocument();
    });

    it('applies languageDropdown-menu class', () => {
      const { container } = render(<LanguageDropdown />);

      expect(container.querySelector('.languageDropdown-menu')).toBeInTheDocument();
    });

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
      expect(screen.getByRole('button', { name: 'Select language' })).toHaveAttribute('aria-expanded', 'true');

      // Click outside
      await user.click(screen.getByTestId('outside-button'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Select language' })).toHaveAttribute('aria-expanded', 'false');
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

    it('should have no violations with white caret variant', async () => {
      const { container } = render(<LanguageDropdown withWhiteCaret />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
