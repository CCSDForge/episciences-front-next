import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SwiperArticleAcceptedCard from '../SwiperArticleAcceptedCard';
import { IArticle } from '@/types/article';

// --- Mocks ---

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    target,
  }: {
    href: string;
    children: React.ReactNode;
    target?: string;
    lang?: string;
  }) => (
    <a href={href} target={target}>
      {children}
    </a>
  ),
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => key) as any;

const mockArticle: IArticle = {
  id: 42,
  title: 'Quantum Entanglement in Open Systems',
  abstract: 'An abstract.',
  authors: [{ fullname: 'Alice Martin' }, { fullname: 'Bob Dupont' }],
  publicationDate: '2024-03-15T00:00:00Z',
  acceptanceDate: '2024-02-01T00:00:00Z',
  docLink: 'https://arxiv.org/abs/2403.00001',
  tag: 'research-article',
  repositoryName: 'arxiv',
  repositoryIdentifier: '2403.00001',
  doi: '10.1234/test.42',
};

// --- Tests ---

describe('SwiperArticleAcceptedCard', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Null guard
  // ─────────────────────────────────────────────────────────────────────────
  describe('null guard', () => {
    it('renders nothing when article is undefined', () => {
      const { container } = render(
        <SwiperArticleAcceptedCard language="en" t={mockT} article={undefined} />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Content rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('content rendering', () => {
    it('renders article title as a link to docLink', () => {
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={mockArticle} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://arxiv.org/abs/2403.00001');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('renders article title text', () => {
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={mockArticle} />);
      expect(screen.getByText('Quantum Entanglement in Open Systems')).toBeInTheDocument();
    });

    it('does not render title link when docLink is absent', () => {
      const articleNoDocLink = { ...mockArticle, docLink: undefined };
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={articleNoDocLink} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders authors', () => {
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={mockArticle} />);
      expect(screen.getByText(/Alice Martin/)).toBeInTheDocument();
    });

    it('renders acceptance date when present', () => {
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={mockArticle} />);
      expect(screen.getByText(/common\.acceptedOn/)).toBeInTheDocument();
    });

    it('renders empty date div when acceptanceDate is absent', () => {
      const articleNoDate = { ...mockArticle, acceptanceDate: undefined };
      const { container } = render(
        <SwiperArticleAcceptedCard language="en" t={mockT} article={articleNoDate} />
      );
      const dateEl = container.querySelector('.swiperArticleAcceptedCard-acceptanceDate');
      expect(dateEl).toBeInTheDocument();
      expect(dateEl!.textContent).toBe('');
    });

    it('renders tag when article has a tag', () => {
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={mockArticle} />);
      expect(document.querySelector('.swiperArticleAcceptedCard-tag')).toBeInTheDocument();
    });

    it('does not render tag when article has no tag', () => {
      const articleWithoutTag = { ...mockArticle, tag: undefined };
      render(<SwiperArticleAcceptedCard language="en" t={mockT} article={articleWithoutTag} />);
      expect(document.querySelector('.swiperArticleAcceptedCard-tag')).not.toBeInTheDocument();
    });
  });
});
