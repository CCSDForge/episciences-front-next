import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Header from '../Header';

// Mock react-device-detect
vi.mock('react-device-detect', () => ({
  isMobileOnly: false,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/en/home',
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.header.content': 'Content',
        'components.header.about': 'About',
        'components.header.publish': 'Publish',
        'components.header.journal': 'All Journals',
        'components.header.searchPlaceholder': 'Search...',
        'components.header.search': 'Search',
        'components.header.submit': 'Submit',
        'components.header.languageSelector': 'Select language',
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
      searchReducer: { search: '' },
      i18nReducer: { language: 'en' },
      journalReducer: { currentJournal: { name: 'Test Journal', code: 'test' } },
      volumeReducer: { lastVolume: { id: 1 } },
    };
    return selector(mockState);
  },
}));

// Mock Link component
vi.mock('@/components/Link/Link', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock icon components with proper ARIA
vi.mock('@/components/icons', () => ({
  BurgerIcon: ({ size, ariaLabel, className }: { size: number; ariaLabel?: string; className?: string }) => (
    <span data-testid="burger-icon" data-size={size} role="img" aria-label={ariaLabel} className={className} />
  ),
  LogoTextIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="logo-text-icon" data-size={size} role="img" aria-label={ariaLabel} />
  ),
  ArrowRightBlackIcon: ({ size, ariaLabel }: { size: number; ariaLabel?: string }) => (
    <span data-testid="arrow-right-icon" data-size={size} role="img" aria-label={ariaLabel} />
  ),
  ExternalLinkWhiteIcon: ({ size }: { size: number }) => (
    <span data-testid="external-link-icon" data-size={size} role="img" aria-label="External link" />
  ),
}));

// Mock LanguageDropdown
vi.mock('@/components/LanguageDropdown/LanguageDropdown', () => ({
  default: () => <div data-testid="language-dropdown">Language Dropdown</div>,
}));

// Mock HeaderSearchInput
vi.mock('@/components/SearchInput/HeaderSearchInput/HeaderSearchInput', () => ({
  default: ({ placeholder, value, onChangeCallback, onSubmitCallback }: {
    placeholder: string;
    value: string;
    onChangeCallback: (value: string) => void;
    onSubmitCallback: () => void;
  }) => (
    <input
      type="search"
      data-testid="header-search-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChangeCallback(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSubmitCallback()}
    />
  ),
}));

// Mock HeaderDropdown
vi.mock('../HeaderDropdown', () => ({
  default: ({ label, isOpen, onToggle }: { label: string; isOpen: boolean; onToggle: (open: boolean) => void }) => (
    <div data-testid={`header-dropdown-${label.toLowerCase()}`}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => onToggle(!isOpen)}
      >
        {label}
      </button>
    </div>
  ),
}));

// Mock Button
vi.mock('@/components/Button/Button', () => ({
  default: ({ text, onClickCallback }: { text: string; onClickCallback: () => void }) => (
    <button onClick={onClickCallback}>{text}</button>
  ),
}));

// Mock menu config
vi.mock('@/config/menu', () => ({
  menuConfig: {
    dropdowns: {
      content: [],
      about: [],
      publish: [],
    },
    standalone: [],
  },
  getVisibleMenuItems: () => [],
  processMenuItemPath: (item: unknown) => item,
}));

// Mock statistics config
vi.mock('@/config/statistics', () => ({
  statisticsBlocksConfiguration: () => [],
}));

// Mock paths config
vi.mock('@/config/paths', () => ({
  PATHS: {
    home: '/',
    search: '/search',
    about: '/about',
  },
}));

// Mock availableLanguages
vi.mock('@/utils/i18n', () => ({
  availableLanguages: ['en', 'fr'],
}));

describe('Header', () => {
  const defaultProps = {
    currentJournal: {
      id: 1,
      code: 'test',
      name: 'Test Journal',
      description: 'A test journal',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  describe('Basic rendering', () => {
    it('renders header element with banner role', () => {
      render(<Header {...defaultProps} />);

      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('renders navigation with aria-label', () => {
      render(<Header {...defaultProps} />);

      const nav = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(nav).toBeInTheDocument();
    });

    it('renders journal logo with alt text', () => {
      render(<Header {...defaultProps} />);

      const logo = screen.getByAltText('Test Journal');
      expect(logo).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByTestId('header-search-input')).toBeInTheDocument();
    });

    it('renders language dropdown when multiple languages available', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByTestId('language-dropdown')).toBeInTheDocument();
    });
  });

  describe('Accessibility - Semantic structure', () => {
    it('uses header element as landmark', () => {
      const { container } = render(<Header {...defaultProps} />);

      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('uses nav element for navigation', () => {
      const { container } = render(<Header {...defaultProps} />);

      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('has descriptive aria-label on navigation', () => {
      render(<Header {...defaultProps} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });
  });

  describe('Logo accessibility', () => {
    it('logo image has meaningful alt text', () => {
      render(<Header {...defaultProps} />);

      const logos = screen.getAllByAltText('Test Journal');
      expect(logos.length).toBeGreaterThan(0);
    });

    it('uses currentJournal name for alt text', () => {
      render(<Header currentJournal={{ ...defaultProps.currentJournal, name: 'Custom Journal' }} />);

      const logo = screen.getByAltText('Custom Journal');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('search input has placeholder', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  describe('External links accessibility', () => {
    it('external links have proper attributes', () => {
      render(<Header {...defaultProps} />);

      // Check for links with target="_blank"
      const externalLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('target') === '_blank'
      );

      externalLinks.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Header dropdowns', () => {
    it('renders content dropdown', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByTestId('header-dropdown-content')).toBeInTheDocument();
    });

    it('renders about dropdown', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByTestId('header-dropdown-about')).toBeInTheDocument();
    });

    it('dropdown buttons have aria-haspopup', () => {
      render(<Header {...defaultProps} />);

      const dropdownButtons = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-haspopup') === 'true'
      );

      expect(dropdownButtons.length).toBeGreaterThan(0);
    });

    it('dropdown buttons have aria-expanded', () => {
      render(<Header {...defaultProps} />);

      const dropdownButtons = screen.getAllByRole('button').filter(
        button => button.hasAttribute('aria-expanded')
      );

      expect(dropdownButtons.length).toBeGreaterThan(0);
    });
  });

  describe('CSS classes for layout', () => {
    it('applies header class', () => {
      const { container } = render(<Header {...defaultProps} />);

      expect(container.querySelector('.header')).toBeInTheDocument();
    });

    it('applies preheader class', () => {
      const { container } = render(<Header {...defaultProps} />);

      expect(container.querySelector('.header-preheader')).toBeInTheDocument();
    });

    it('applies postheader class', () => {
      const { container } = render(<Header {...defaultProps} />);

      expect(container.querySelector('.header-postheader')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    // Note: Some violations may occur due to mocked components
    // Disable specific rules that are affected by mocking
    const axeOptions = {
      rules: {
        'link-in-text-block': { enabled: false }, // Mock links may not have proper distinction
        region: { enabled: false }, // Isolated component testing
      },
    };

    it('should have no critical accessibility violations', async () => {
      const { container } = render(<Header {...defaultProps} />);

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations without currentJournal', async () => {
      const { container } = render(<Header />);

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});
