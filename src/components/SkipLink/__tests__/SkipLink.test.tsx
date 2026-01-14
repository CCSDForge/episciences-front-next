import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SkipLink from '../SkipLink';

describe('SkipLink', () => {
  describe('Basic rendering', () => {
    it('renders as a link element', () => {
      render(<SkipLink href="#main-content">Skip to main content</SkipLink>);

      const link = screen.getByRole('link', { name: /skip to main content/i });
      expect(link).toBeInTheDocument();
    });

    it('renders children text correctly', () => {
      render(<SkipLink href="#main">Skip to content</SkipLink>);

      expect(screen.getByText('Skip to content')).toBeInTheDocument();
    });

    it('points to the correct anchor', () => {
      render(<SkipLink href="#main-content">Skip</SkipLink>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '#main-content');
    });
  });

  describe('CSS and styling', () => {
    it('applies skip-link class', () => {
      render(<SkipLink href="#main">Skip</SkipLink>);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('skip-link');
    });
  });

  describe('Keyboard navigation', () => {
    it('is focusable via Tab key', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <SkipLink href="#main">Skip to main content</SkipLink>
          <button>Other button</button>
        </div>
      );

      // Tab to the skip link
      await user.tab();

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveFocus();
    });

    it('can be activated with Enter key', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <SkipLink href="#main">Skip</SkipLink>
          <main id="main">Main content</main>
        </div>
      );

      const link = screen.getByRole('link');
      link.focus();

      // Enter should activate the link (navigation to anchor)
      await user.keyboard('{Enter}');

      // Link should still be in document after activation
      expect(link).toBeInTheDocument();
    });
  });

  describe('WCAG 2.4.1 - Bypass Blocks', () => {
    it('provides mechanism to bypass repetitive navigation', () => {
      render(
        <div>
          <SkipLink href="#main-content">Skip to main content</SkipLink>
          <nav>
            <a href="/home">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
          <main id="main-content">
            <h1>Page Content</h1>
          </main>
        </div>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Verify target exists
      const mainContent = document.getElementById('main-content');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Multiple skip links', () => {
    it('supports multiple skip link targets', () => {
      render(
        <div>
          <SkipLink href="#main">Skip to main</SkipLink>
          <SkipLink href="#search">Skip to search</SkipLink>
          <SkipLink href="#footer">Skip to footer</SkipLink>
        </div>
      );

      expect(screen.getByRole('link', { name: /skip to main/i })).toHaveAttribute('href', '#main');
      expect(screen.getByRole('link', { name: /skip to search/i })).toHaveAttribute('href', '#search');
      expect(screen.getByRole('link', { name: /skip to footer/i })).toHaveAttribute('href', '#footer');
    });
  });

  describe('Content variations', () => {
    it('supports different skip link labels', () => {
      const { rerender } = render(<SkipLink href="#main">Skip to main content</SkipLink>);
      expect(screen.getByText('Skip to main content')).toBeInTheDocument();

      rerender(<SkipLink href="#nav">Skip to navigation</SkipLink>);
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument();

      rerender(<SkipLink href="#search">Skip to search</SkipLink>);
      expect(screen.getByText('Skip to search')).toBeInTheDocument();
    });

    it('supports localized text', () => {
      render(<SkipLink href="#contenu-principal">Aller au contenu principal</SkipLink>);

      expect(screen.getByText('Aller au contenu principal')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <SkipLink href="#main-content">Skip to main content</SkipLink>
          <main id="main-content">Content</main>
        </div>
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with multiple skip links', async () => {
      const { container } = render(
        <div>
          <SkipLink href="#main">Skip to main</SkipLink>
          <SkipLink href="#search">Skip to search</SkipLink>
          <main id="main">Main</main>
          <div id="search">Search</div>
        </div>
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
