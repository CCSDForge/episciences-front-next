import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../Header';

// Mock react-device-detect: mobile-only rendering path
vi.mock('react-device-detect', () => ({
  isMobileOnly: true,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/home',
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.header.content': 'Content',
        'components.header.about': 'About',
        'components.header.publish': 'Publish',
      };
      return translations[key] || key;
    },
  }),
}));

const mockDispatch = vi.fn();
const mockState = {
  searchReducer: { search: '' },
  i18nReducer: { language: 'en' },
  journalReducer: { currentJournal: { name: 'Test Journal', code: 'test' }, config: undefined },
  volumeReducer: { lastVolume: { id: 1 } },
};
vi.mock('@/hooks/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => selector(mockState),
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/icons', () => ({
  BurgerIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="burger-icon" role="img" aria-label={ariaLabel} />
  ),
  LogoTextIcon: () => <span data-testid="logo-text-icon" />,
  ArrowRightBlackIcon: () => <span data-testid="arrow-right-icon" />,
  ExternalLinkWhiteIcon: () => <span data-testid="external-link-icon" />,
  UserCircleIcon: () => <span data-testid="user-circle-icon" />,
}));

vi.mock('@/components/LanguageDropdown/LanguageDropdown', () => ({
  default: () => <div data-testid="language-dropdown">Language Dropdown</div>,
}));

vi.mock('@/components/SearchInput/HeaderSearchInput/HeaderSearchInput', () => ({
  default: () => <input type="search" data-testid="header-search-input" />,
}));

vi.mock('../HeaderDropdown', () => ({
  default: ({ label }: { label: string }) => (
    <div data-testid={`header-dropdown-${label.toLowerCase()}`} />
  ),
}));

vi.mock('@/components/Button/Button', () => ({
  default: ({ text }: { text: string }) => <button>{text}</button>,
}));

vi.mock('@/config/menu', () => ({
  menuConfig: {
    dropdowns: { content: [{ key: 'c1', label: 'Item 1', path: '/c1' }], about: [], publish: [] },
    standalone: [{ key: 's1', label: 'Boards', path: '/boards' }],
  },
  getVisibleMenuItems: (items: unknown[]) => items,
  processMenuItemPath: (item: unknown) => item,
}));

vi.mock('@/config/statistics', () => ({
  statisticsBlocksConfiguration: () => [],
}));

vi.mock('@/config/paths', () => ({
  PATHS: { home: '/', search: '/search', about: '/about' },
}));

vi.mock('@/utils/i18n', () => ({
  availableLanguages: ['en', 'fr'],
}));

describe('Header - mobile burger menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the burger icon when isMobileOnly is true', () => {
    render(<Header currentJournal={{ id: 1, code: 'test', name: 'Test Journal', description: '', createdAt: '', updatedAt: '' }} />);
    expect(screen.getByTestId('burger-icon')).toBeInTheDocument();
  });

  it('toggles the mobile menu open on click and closed again on a second click', () => {
    render(<Header />);
    const burgerButton = screen.getByRole('button', { name: 'Toggle mobile menu' });

    expect(burgerButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(burgerButton);
    expect(burgerButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(burgerButton);
    expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the mobile menu on Enter/Space and closes it on Escape', () => {
    render(<Header />);
    const burgerButton = screen.getByRole('button', { name: 'Toggle mobile menu' });

    fireEvent.keyDown(burgerButton, { key: 'Enter' });
    expect(burgerButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(burgerButton, { key: 'Escape' });
    expect(burgerButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(burgerButton, { key: ' ' });
    expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('ignores unrelated key presses on the burger trigger', () => {
    render(<Header />);
    const burgerButton = screen.getByRole('button', { name: 'Toggle mobile menu' });

    fireEvent.keyDown(burgerButton, { key: 'Tab' });
    expect(burgerButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('navigates and shows standalone/content menu items when the mobile menu is open', () => {
    render(<Header />);
    const burgerButton = screen.getByRole('button', { name: 'Toggle mobile menu' });
    fireEvent.click(burgerButton);

    const contentItem = screen.getByText('Item 1');
    fireEvent.touchEnd(contentItem);
    expect(mockPush).toHaveBeenCalledWith('/c1');

    const standaloneItems = screen.getAllByText('Boards');
    const standaloneSpan = standaloneItems.find(el => el.tagName === 'SPAN')!;
    fireEvent.touchEnd(standaloneSpan);
    expect(mockPush).toHaveBeenCalledWith('/boards');
  });

  it('closes the mobile menu when a touch happens outside of it', () => {
    const { container } = render(<Header />);
    const burgerButton = screen.getByRole('button', { name: 'Toggle mobile menu' });
    fireEvent.click(burgerButton);
    expect(burgerButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.touchStart(document.body);

    expect(container.querySelector('[aria-expanded="false"]')).toBeInTheDocument();
  });
});
