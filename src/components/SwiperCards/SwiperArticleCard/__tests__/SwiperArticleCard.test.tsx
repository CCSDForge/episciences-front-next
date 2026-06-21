import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SwiperArticleCard from '../SwiperArticleCard';
import { IArticle } from '@/types/article';

// --- Mocks ---

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode; lang?: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => key) as any;

const mockArticle: IArticle = {
  id: 42,
  title: 'Quantum Entanglement in Open Systems',
  abstract: 'An abstract.',
  authors: [
    { fullname: 'Alice Martin', orcid: undefined },
    { fullname: 'Bob Dupont', orcid: undefined },
  ],
  publicationDate: '2024-03-15T00:00:00Z',
  tag: 'research-article',
  repositoryName: 'arxiv',
  repositoryIdentifier: '2403.00001',
  doi: '10.1234/test.42',
};

// --- Tests ---

describe('SwiperArticleCard', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Null guard
  // ─────────────────────────────────────────────────────────────────────────
  describe('null guard', () => {
    it('renders nothing when article is undefined', () => {
      const { container } = render(
        <SwiperArticleCard language="en" t={mockT} article={undefined} />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Content rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('content rendering', () => {
    it('renders article title', () => {
      render(<SwiperArticleCard language="en" t={mockT} article={mockArticle} />);
      expect(screen.getByText('Quantum Entanglement in Open Systems')).toBeInTheDocument();
    });

    it('renders truncated authors', () => {
      render(<SwiperArticleCard language="en" t={mockT} article={mockArticle} />);
      // truncatedArticleAuthorsName returns a string with author names
      expect(screen.getByText(/Alice Martin/)).toBeInTheDocument();
    });

    it('renders publication date', () => {
      render(<SwiperArticleCard language="en" t={mockT} article={mockArticle} />);
      // "common.publishedOn" key + formatted date
      const dateEl = screen.getByText(/common\.publishedOn/);
      expect(dateEl).toBeInTheDocument();
    });

    it('renders tag when article has a tag', () => {
      render(<SwiperArticleCard language="en" t={mockT} article={mockArticle} />);
      // getArticleTypeLabel returns a translation key, mockT returns the key itself
      const tagEl = document.querySelector('.swiperArticleCard-tag');
      expect(tagEl).toBeInTheDocument();
    });

    it('does not render tag when article has no tag', () => {
      const articleWithoutTag = { ...mockArticle, tag: undefined };
      render(<SwiperArticleCard language="en" t={mockT} article={articleWithoutTag} />);
      expect(document.querySelector('.swiperArticleCard-tag')).not.toBeInTheDocument();
    });

    it('links to the article detail page', () => {
      render(<SwiperArticleCard language="en" t={mockT} article={mockArticle} />);
      const link = screen.getByRole('link');
      expect(link.getAttribute('href')).toContain('/42');
    });
  });
});
