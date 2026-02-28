import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SectionCard from '../SectionCard';
import { ISection } from '@/types/section';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, lang }: { href: string; children: React.ReactNode; lang?: string }) => (
    <a href={href} lang={lang}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/icons', () => ({
  CaretUpBlackIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-up" aria-label={ariaLabel} />
  ),
  CaretDownBlackIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-down" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/utils/keyboard', () => ({
  handleKeyboardClick: vi.fn((e: React.KeyboardEvent, cb: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') cb();
  }),
}));

vi.mock('@/config/paths', () => ({
  PATHS: { sections: 'sections' },
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.articles': 'articles',
    'common.article': 'article',
    'common.about': 'About',
  };
  return translations[key] ?? key;
});

const sectionWithDescription: ISection = {
  id: 1,
  title: { en: 'Physics', fr: 'Physique' },
  description: { en: 'Physics articles.', fr: 'Articles de physique.' },
  articles: [{ id: 1 } as any, { id: 2 } as any, { id: 3 } as any],
};

const sectionWithoutDescription: ISection = {
  id: 2,
  title: { en: 'Chemistry', fr: 'Chimie' },
  articles: [{ id: 10 } as any],
};

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  section: sectionWithDescription,
};

// --- Tests ---

describe('SectionCard', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the section title', () => {
      render(<SectionCard {...defaultProps} />);
      expect(screen.getByText('Physics')).toBeInTheDocument();
    });

    it('renders the section title in the requested language', () => {
      render(<SectionCard {...defaultProps} language="fr" />);
      expect(screen.getByText('Physique')).toBeInTheDocument();
    });

    it('renders a link to the section detail page', () => {
      render(<SectionCard {...defaultProps} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'sections/1');
    });

    it('renders plural article count when count > 1', () => {
      render(<SectionCard {...defaultProps} />);
      expect(screen.getAllByText('3 articles')).not.toHaveLength(0);
    });

    it('renders singular article count when count is 1', () => {
      render(<SectionCard {...defaultProps} section={sectionWithoutDescription} />);
      expect(screen.getAllByText('1 article')).not.toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Description toggle — section WITH description
  // ─────────────────────────────────────────────────────────────────────────
  describe('Description toggle', () => {
    it('renders the About toggle button when description is present', () => {
      render(<SectionCard {...defaultProps} />);
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('shows caret-down initially (description collapsed)', () => {
      render(<SectionCard {...defaultProps} />);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });

    it('shows description content when About is clicked', async () => {
      const user = userEvent.setup();
      render(<SectionCard {...defaultProps} />);
      // The div[role="button"] has text "About" and a caret icon child;
      // use regex to match the accessible name that includes the icon's aria-label
      await user.click(screen.getByRole('button', { name: /About/ }));
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('collapses description on a second click', async () => {
      const user = userEvent.setup();
      render(<SectionCard {...defaultProps} />);
      const btn = screen.getByRole('button', { name: /About/ });
      await user.click(btn);
      await user.click(btn);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });

    it('opens description on Enter key', async () => {
      const user = userEvent.setup();
      render(<SectionCard {...defaultProps} />);
      screen.getByRole('button', { name: /About/ }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Section WITHOUT description
  // ─────────────────────────────────────────────────────────────────────────
  describe('Section without description', () => {
    it('does not render the About toggle when no description', () => {
      render(<SectionCard {...defaultProps} section={sectionWithoutDescription} />);
      expect(screen.queryByText('About')).not.toBeInTheDocument();
    });

    it('does not render any caret when no description', () => {
      render(<SectionCard {...defaultProps} section={sectionWithoutDescription} />);
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('About toggle has role="button" and tabIndex={0}', () => {
      render(<SectionCard {...defaultProps} />);
      const btn = screen.getByRole('button', { name: /About/ });
      expect(btn).toHaveAttribute('tabindex', '0');
    });

    it('carets have descriptive aria-labels', async () => {
      const user = userEvent.setup();
      render(<SectionCard {...defaultProps} />);
      expect(screen.getByTestId('caret-down')).toHaveAttribute('aria-label', 'Expand description');
      await user.click(screen.getByRole('button', { name: /About/ }));
      expect(screen.getByTestId('caret-up')).toHaveAttribute('aria-label', 'Collapse description');
    });
  });
});
