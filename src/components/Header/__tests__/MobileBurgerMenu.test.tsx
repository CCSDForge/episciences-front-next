import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import MobileBurgerMenu from '../MobileBurgerMenu';

// Mock icons
vi.mock('@/components/icons', () => ({
  BurgerIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="burger-icon" aria-label={ariaLabel} />
  ),
}));

// Mock Link
vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    lang,
  }: {
    href: string;
    children: React.ReactNode;
    lang?: string;
  }) => (
    <a href={href} lang={lang}>
      {children}
    </a>
  ),
}));

const sections = [
  {
    title: 'Journal',
    items: [
      { key: 'about', label: 'About', path: '/en/about' },
      { key: 'editorial', label: 'Editorial Board', path: '/en/editorial-board' },
    ],
  },
  {
    items: [
      { key: 'submit', label: 'Submit', path: '/en/for-authors' },
    ],
  },
];

describe('MobileBurgerMenu', () => {
  describe('initial rendering', () => {
    it('renders the burger icon', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      expect(screen.getByTestId('burger-icon')).toBeInTheDocument();
    });

    it('menu is collapsed initially', () => {
      const { container } = render(<MobileBurgerMenu sections={sections} lang="en" />);
      expect(
        container.querySelector('.header-postheader-burger-content-displayed')
      ).not.toBeInTheDocument();
    });

    it('does not render menu items initially', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      expect(screen.queryByText('About')).not.toBeInTheDocument();
      expect(screen.queryByText('Editorial Board')).not.toBeInTheDocument();
    });

    it('has role="button" and aria-label', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      expect(trigger).toBeInTheDocument();
    });

    it('has aria-expanded="false" initially', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('open/close behaviour', () => {
    it('shows menu items after clicking trigger', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Editorial Board')).toBeInTheDocument();
    });

    it('updates aria-expanded to true when open', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));
      expect(
        screen.getByRole('button', { name: /Toggle mobile menu/i })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes menu on second click', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      await user.click(trigger);
      await user.click(trigger);

      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });

    it('opens menu with Enter key', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      trigger.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('opens menu with Space key', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      trigger.focus();
      await user.keyboard(' ');

      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('closes menu with Escape key', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      await user.click(trigger);
      expect(screen.getByText('About')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });
  });

  describe('menu content', () => {
    it('renders section title when provided', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      expect(screen.getByText('Journal')).toBeInTheDocument();
    });

    it('does not render section title when not provided', async () => {
      const user = userEvent.setup();
      const sectionsNoTitle = [{ items: [{ key: 'a', label: 'Link A', path: '/a' }] }];
      render(<MobileBurgerMenu sections={sectionsNoTitle} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      // No title element should exist in the section
      const { container } = render(<MobileBurgerMenu sections={sectionsNoTitle} lang="en" />);
      const titles = container.querySelectorAll(
        '.header-postheader-burger-content-links-section-links-title'
      );
      expect(titles).toHaveLength(0);
    });

    it('renders correct links with correct hrefs', async () => {
      const user = userEvent.setup();
      render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      const aboutLink = screen.getByRole('link', { name: 'About' });
      expect(aboutLink).toHaveAttribute('href', '/en/about');
    });

    it('adds bordered class to all sections except the last', async () => {
      const user = userEvent.setup();
      const { container } = render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      const borderedSections = container.querySelectorAll(
        '.header-postheader-burger-content-links-section-bordered'
      );
      // 2 sections → first is bordered, last is not
      expect(borderedSections).toHaveLength(1);
    });
  });

  describe('click outside to close', () => {
    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <MobileBurgerMenu sections={sections} lang="en" />
          <button data-testid="outside">Outside</button>
        </div>
      );

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));
      expect(screen.getByText('About')).toBeInTheDocument();

      // Simulate mousedown outside
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('trigger is a native button element', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      expect(trigger.tagName).toBe('BUTTON');
    });

    it('trigger has aria-haspopup', () => {
      render(<MobileBurgerMenu sections={sections} lang="en" />);
      const trigger = screen.getByRole('button', { name: /Toggle mobile menu/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have no violations when closed', async () => {
      const { container } = render(<MobileBurgerMenu sections={sections} lang="en" />);
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<MobileBurgerMenu sections={sections} lang="en" />);

      await user.click(screen.getByRole('button', { name: /Toggle mobile menu/i }));

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
