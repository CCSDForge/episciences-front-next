import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JournalSection from '../JournalSection';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, target }: any) => (
    <a href={href} target={target}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/icons', () => ({
  ExternalLinkBlackIcon: ({ ariaLabel }: any) => <span data-testid="ext-link-icon" aria-label={ariaLabel} />,
}));

// ReactMarkdown: render children directly for easy text assertions
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// --- Tests ---

describe('JournalSection', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the container div', () => {
      const { container } = render(<JournalSection language="en" />);
      expect(container.querySelector('.journalSection')).toBeInTheDocument();
    });

    it('renders markdown content when content is provided for the language', () => {
      render(
        <JournalSection
          language="en"
          content={{ en: 'This is the indexing section.', fr: 'Section indexation.' }}
        />
      );
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
      expect(screen.getByText('This is the indexing section.')).toBeInTheDocument();
    });

    it('renders French content when language=fr', () => {
      render(
        <JournalSection
          language="fr"
          content={{ en: 'English content', fr: 'Contenu français' }}
        />
      );
      expect(screen.getByText('Contenu français')).toBeInTheDocument();
    });

    it('renders nothing inside container when content is not provided', () => {
      render(<JournalSection language="en" />);
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
    });

    it('renders nothing inside container when content has no entry for the language', () => {
      render(
        <JournalSection
          language="en"
          content={{ fr: 'Only French' } as any}
        />
      );
      // ReactMarkdown receives undefined — no content rendered
      expect(screen.queryByText('Only French')).not.toBeInTheDocument();
    });
  });
});
