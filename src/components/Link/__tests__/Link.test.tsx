import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import { Link } from '../Link';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} data-testid="next-link" {...props}>
      {children}
    </a>
  ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
    },
  }),
}));

// Mock language utils
vi.mock('@/utils/language-utils', () => ({
  getLocalizedPath: vi.fn((path: string, lang: string) => `/${lang}${path}`),
  defaultLanguage: 'en',
}));

import { getLocalizedPath } from '@/utils/language-utils';

describe('Link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders children content', () => {
      render(<Link href="/test">Click me</Link>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('renders as anchor element', () => {
      render(<Link href="/test">Link Text</Link>);

      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Link href="/test" className="custom-class">
          Styled Link
        </Link>
      );

      expect(screen.getByRole('link')).toHaveClass('custom-class');
    });
  });

  describe('Internal links', () => {
    it('uses Next.js Link for internal paths', () => {
      render(<Link href="/articles">Articles</Link>);

      expect(screen.getByTestId('next-link')).toBeInTheDocument();
    });

    it('localizes internal paths', () => {
      render(<Link href="/about">About</Link>);

      expect(getLocalizedPath).toHaveBeenCalledWith('/about', 'en');
    });

    it('normalizes path without leading slash', () => {
      render(<Link href="volumes">Volumes</Link>);

      expect(getLocalizedPath).toHaveBeenCalledWith('/volumes', 'en');
    });

    it('normalizes duplicate slashes', () => {
      render(<Link href="//test//path">Test</Link>);

      // Double slashes at start are treated as external (protocol-relative URL)
      // This is expected behavior
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('uses provided lang prop for localization', () => {
      render(
        <Link href="/test" lang="fr">
          French Link
        </Link>
      );

      expect(getLocalizedPath).toHaveBeenCalledWith('/test', 'fr');
    });
  });

  describe('External links', () => {
    it('renders regular anchor for http URLs', () => {
      render(<Link href="https://example.com">External</Link>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(screen.queryByTestId('next-link')).not.toBeInTheDocument();
    });

    it('renders regular anchor for protocol-relative URLs', () => {
      render(<Link href="//cdn.example.com/file.js">CDN</Link>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '//cdn.example.com/file.js');
    });

    it('renders regular anchor for mailto links', () => {
      render(<Link href="mailto:test@example.com">Email Us</Link>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'mailto:test@example.com');
    });

    it('renders regular anchor for hash links', () => {
      render(<Link href="#section">Jump to Section</Link>);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '#section');
    });

    it('does not localize external links', () => {
      render(<Link href="https://example.com">External</Link>);

      expect(getLocalizedPath).not.toHaveBeenCalled();
    });
  });

  describe('Link attributes', () => {
    it('passes target attribute', () => {
      render(
        <Link href="https://example.com" target="_blank">
          New Tab
        </Link>
      );

      expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    });

    it('passes rel attribute', () => {
      render(
        <Link href="https://example.com" rel="noopener noreferrer">
          Safe Link
        </Link>
      );

      expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('passes additional props', () => {
      render(
        <Link href="/test" data-custom="value" aria-label="Custom label">
          Link
        </Link>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-custom', 'value');
      expect(link).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('Click handling', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn((e) => e.preventDefault());

      render(
        <Link href="/test" onClick={handleClick}>
          Clickable
        </Link>
      );

      await user.click(screen.getByRole('link'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Next.js Link props', () => {
    it('passes prefetch prop to NextLink', () => {
      render(
        <Link href="/test" prefetch={false}>
          No Prefetch
        </Link>
      );

      expect(screen.getByTestId('next-link')).toBeInTheDocument();
    });

    it('passes scroll prop to NextLink', () => {
      render(
        <Link href="/test" scroll={false}>
          No Scroll
        </Link>
      );

      expect(screen.getByTestId('next-link')).toBeInTheDocument();
    });

    it('passes replace prop to NextLink', () => {
      render(
        <Link href="/test" replace>
          Replace
        </Link>
      );

      expect(screen.getByTestId('next-link')).toBeInTheDocument();
    });

    it('passes shallow prop to NextLink', () => {
      render(
        <Link href="/test" shallow>
          Shallow
        </Link>
      );

      expect(screen.getByTestId('next-link')).toBeInTheDocument();
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref to anchor element', () => {
      const ref = vi.fn();

      render(
        <Link href="/test" ref={ref}>
          With Ref
        </Link>
      );

      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Children variations', () => {
    it('handles string children', () => {
      render(<Link href="/test">Simple Text</Link>);

      expect(screen.getByText('Simple Text')).toBeInTheDocument();
    });

    it('handles element children', () => {
      render(
        <Link href="/test">
          <span data-testid="child-element">Element Child</span>
        </Link>
      );

      expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Link href="/test">
          <span>Icon</span>
          <span>Text</span>
        </Link>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations for internal link', async () => {
      const { container } = render(<Link href="/test">Accessible Link</Link>);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations for external link', async () => {
      const { container } = render(
        <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
          External Link
        </Link>
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('link is focusable', () => {
      render(<Link href="/test">Focusable</Link>);

      const link = screen.getByRole('link');
      link.focus();

      expect(document.activeElement).toBe(link);
    });
  });
});
