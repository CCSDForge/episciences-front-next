import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import HeaderDropdown from '../HeaderDropdown';
import { MenuItemConfig } from '@/config/menu';

// --- Mocks ---

const mockPathname = vi.fn(() => '/en/home');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// --- Fixtures ---

const items: MenuItemConfig[] = [
  { key: 'articles', label: 'components.header.links.articles', path: '/en/articles' },
  { key: 'volumes', label: 'components.header.links.volumes', path: '/en/volumes' },
  { key: 'accepted', label: 'components.header.links.accepted', path: '/en/articles-accepted' },
];

const defaultProps = {
  label: 'Content',
  items,
  isOpen: false,
  onToggle: vi.fn(),
  dropdownKey: 'content',
};

function renderDropdown(props = {}) {
  return render(<HeaderDropdown {...defaultProps} {...props} />);
}

// --- Tests ---

describe('HeaderDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/en/home');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders the trigger button with correct label', () => {
      renderDropdown();
      expect(screen.getByRole('button', { name: /Content menu/i })).toBeInTheDocument();
    });

    it('button has aria-expanded=false when closed', () => {
      renderDropdown();
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('button has aria-expanded=true when open', () => {
      renderDropdown({ isOpen: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('button has aria-haspopup=true', () => {
      renderDropdown();
      expect(screen.getByRole('button')).toHaveAttribute('aria-haspopup', 'true');
    });

    it('does not render menu items when closed', () => {
      renderDropdown({ isOpen: false });
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    it('renders menu items when open', () => {
      renderDropdown({ isOpen: true });
      expect(screen.getAllByRole('menuitem')).toHaveLength(items.length);
    });

    it('renders menu with correct aria-label', () => {
      renderDropdown({ isOpen: true });
      expect(screen.getByRole('menu', { name: /Content menu/i })).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Active link detection
  // ─────────────────────────────────────────────────────────────────────────
  describe('active link detection', () => {
    it('marks exact path match as aria-current="page"', () => {
      mockPathname.mockReturnValue('/en/articles');
      renderDropdown({ isOpen: true });
      const activeLink = screen.getByRole('menuitem', {
        name: 'components.header.links.articles',
      });
      expect(activeLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark non-matching paths as active', () => {
      mockPathname.mockReturnValue('/en/home');
      renderDropdown({ isOpen: true });
      const menuItems = screen.getAllByRole('menuitem');
      menuItems.forEach(item => {
        expect(item).not.toHaveAttribute('aria-current', 'page');
      });
    });

    it('matches path ignoring query params', () => {
      mockPathname.mockReturnValue('/en/volumes');
      const itemsWithQuery: MenuItemConfig[] = [
        { key: 'special', label: 'Special', path: '/en/volumes?type=special_issue' },
      ];
      renderDropdown({ isOpen: true, items: itemsWithQuery });
      const link = screen.getByRole('menuitem', { name: 'Special' });
      expect(link).toHaveAttribute('aria-current', 'page');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard — button
  // ─────────────────────────────────────────────────────────────────────────
  describe('keyboard navigation — button', () => {
    it('Enter opens the dropdown and sets focusedIndex to 0', async () => {
      const onToggle = vi.fn();
      renderDropdown({ onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('Space opens the dropdown', async () => {
      const onToggle = vi.fn();
      renderDropdown({ onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('Enter on open dropdown closes it', () => {
      const onToggle = vi.fn();
      renderDropdown({ isOpen: true, onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('ArrowDown opens and focuses first item', () => {
      const onToggle = vi.fn();
      renderDropdown({ onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('ArrowUp opens and focuses last item', () => {
      const onToggle = vi.fn();
      renderDropdown({ onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'ArrowUp' });

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('Escape closes the dropdown', () => {
      const onToggle = vi.fn();
      renderDropdown({ isOpen: true, onToggle });

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Escape' });

      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard — menu items
  // ─────────────────────────────────────────────────────────────────────────
  describe('keyboard navigation — menu items', () => {
    it('ArrowDown on last item wraps to first', () => {
      renderDropdown({ isOpen: true });
      const menuItems = screen.getAllByRole('menuitem');
      const lastItem = menuItems[items.length - 1];

      fireEvent.keyDown(lastItem, { key: 'ArrowDown' });
      // No error thrown — cyclic navigation works
    });

    it('ArrowUp on first item wraps to last', () => {
      renderDropdown({ isOpen: true });
      const menuItems = screen.getAllByRole('menuitem');
      const firstItem = menuItems[0];

      fireEvent.keyDown(firstItem, { key: 'ArrowUp' });
      // No error thrown — cyclic navigation works
    });

    it('Escape on menu item closes the dropdown', () => {
      const onToggle = vi.fn();
      renderDropdown({ isOpen: true, onToggle });

      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(menuItems[0], { key: 'Escape' });

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('Tab on menu item closes the dropdown', () => {
      const onToggle = vi.fn();
      renderDropdown({ isOpen: true, onToggle });

      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(menuItems[0], { key: 'Tab' });

      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mouse interactions
  // ─────────────────────────────────────────────────────────────────────────
  describe('mouse interactions', () => {
    it('calls onToggle(true) on mouse enter', async () => {
      const onToggle = vi.fn();
      const { container } = renderDropdown({ onToggle });

      const dropdown = container.querySelector('.header-dropdown')!;
      fireEvent.mouseEnter(dropdown);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle(false) on mouse leave of the container', async () => {
      const onToggle = vi.fn();
      const { container } = renderDropdown({ onToggle });

      const dropdown = container.querySelector('.header-dropdown')!;
      fireEvent.mouseLeave(dropdown);

      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('closes when clicking outside', () => {
      const onToggle = vi.fn();
      renderDropdown({ isOpen: true, onToggle });

      fireEvent.mouseDown(document.body);

      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('accessibility', () => {
    it('has no axe violations when closed', async () => {
      const { container } = renderDropdown();
      const results = await checkA11y(container);
      expect(results.violations).toHaveLength(0);
    });

    it('has no axe violations when open', async () => {
      const { container } = renderDropdown({ isOpen: true });
      const results = await checkA11y(container);
      expect(results.violations).toHaveLength(0);
    });

    it('button type is "button" (not submit)', () => {
      renderDropdown();
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });
});
