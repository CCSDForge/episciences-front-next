import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IssuesSection from '../IssuesSection';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, target }: any) => (
    <a href={href} target={target}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('@/components/icons', () => ({
  FileGreyIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  DownloadBlackIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
}));

vi.mock('@/config/paths', () => ({
  PATHS: { volumes: 'volumes' },
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const t: Record<string, string> = {
    'common.volumeCard.specialIssue': 'Special Issue',
    'common.articles': 'articles',
    'common.article': 'article',
    'common.pdf': 'PDF',
  };
  return t[key] ?? key;
});

const baseIssue: any = {
  id: 1,
  num: 3,
  year: 2024,
  title: { en: 'Physics Today', fr: 'Physique Aujourd\'hui' },
  articles: [{ id: 10 }, { id: 11 }, { id: 12 }],
};

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  issues: [baseIssue],
  currentJournal: { code: 'myjournal' } as any,
};

// --- Tests ---

describe('IssuesSection', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // Empty / invalid
  // ─────────────────────────────────────────────────────────────────────────
  describe('Empty / invalid data', () => {
    it('returns empty when issues array is empty', () => {
      const { container } = render(<IssuesSection {...defaultProps} issues={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns empty when issues prop is undefined', () => {
      const { container } = render(
        <IssuesSection {...defaultProps} issues={undefined as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('skips issues without an id', () => {
      const invalidIssue = { ...baseIssue, id: undefined } as any;
      const { container } = render(<IssuesSection {...defaultProps} issues={[invalidIssue]} />);
      expect(container.querySelector('.issuesSection-card')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cover image vs template
  // ─────────────────────────────────────────────────────────────────────────
  describe('Cover image vs template', () => {
    it('renders <img> when tileImageURL is present', () => {
      const issueWithImage = { ...baseIssue, tileImageURL: 'https://example.com/cover.jpg' };
      render(<IssuesSection {...defaultProps} issues={[issueWithImage]} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('img alt uses language-specific title', () => {
      const issueWithImage = { ...baseIssue, tileImageURL: 'https://example.com/cover.jpg' };
      render(<IssuesSection {...defaultProps} issues={[issueWithImage]} />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Physics Today');
    });

    it('img alt falls back to issue num when no title', () => {
      const issueWithImage = { ...baseIssue, title: {}, tileImageURL: 'https://example.com/cover.jpg' };
      render(<IssuesSection {...defaultProps} issues={[issueWithImage]} />);
      expect(screen.getByRole('img')).toHaveAttribute('alt', 'Issue 3');
    });

    it('renders template when no tileImageURL', () => {
      render(<IssuesSection {...defaultProps} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('Special Issue')).toBeInTheDocument();
    });

    it('displays journal code in uppercase from journalId prop', () => {
      render(<IssuesSection {...defaultProps} journalId="myjournal" />);
      expect(screen.getByText('MYJOURNAL')).toBeInTheDocument();
    });

    it('displays journal code in uppercase from currentJournal.code', () => {
      render(<IssuesSection {...defaultProps} currentJournal={{ code: 'epijrn' } as any} />);
      expect(screen.getByText('EPIJRN')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Content
  // ─────────────────────────────────────────────────────────────────────────
  describe('Content', () => {
    it('renders language-specific title', () => {
      render(<IssuesSection {...defaultProps} />);
      expect(screen.getByText('Physics Today')).toBeInTheDocument();
    });

    it('renders French title when language=fr', () => {
      render(<IssuesSection {...defaultProps} language="fr" />);
      expect(screen.getByText('Physique Aujourd\'hui')).toBeInTheDocument();
    });

    it('renders year', () => {
      render(<IssuesSection {...defaultProps} />);
      expect(screen.getAllByText('2024')).not.toHaveLength(0);
    });

    it('renders plural article count when count > 1', () => {
      render(<IssuesSection {...defaultProps} />);
      expect(screen.getByText('3 articles')).toBeInTheDocument();
    });

    it('renders singular article count when count is 1', () => {
      const singleArticleIssue = { ...baseIssue, articles: [{ id: 1 }] };
      render(<IssuesSection {...defaultProps} issues={[singleArticleIssue]} />);
      expect(screen.getByText('1 article')).toBeInTheDocument();
    });

    it('renders volume link with correct href', () => {
      render(<IssuesSection {...defaultProps} />);
      const links = screen.getAllByRole('link');
      const volumeLink = links.find(l => l.getAttribute('href')?.includes('volumes/1'));
      expect(volumeLink).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Download link
  // ─────────────────────────────────────────────────────────────────────────
  describe('Download link', () => {
    it('renders download link when downloadLink is present', () => {
      const issueWithDownload = { ...baseIssue, downloadLink: 'https://example.com/issue.pdf' };
      render(<IssuesSection {...defaultProps} issues={[issueWithDownload]} />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('does not render download link when downloadLink is absent', () => {
      render(<IssuesSection {...defaultProps} />);
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });
  });
});
