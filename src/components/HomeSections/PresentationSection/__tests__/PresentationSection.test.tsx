import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PresentationSection from '../PresentationSection';
import { HOMEPAGE_LAST_INFORMATION_BLOCK } from '@/config/homepage';
import { VOLUME_TYPE } from '@/utils/volume';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, lang }: any) => (
    <a href={href} lang={lang}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/icons', () => ({
  CaretRightGreyIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('@/config/paths', () => ({
  PATHS: { about: 'about', news: 'news', volumes: 'volumes' },
}));

vi.mock('@/utils/date', () => ({
  formatDate: (_date: string, _lang: string) => '01/01/2024',
}));

vi.mock('@/utils/string', () => ({
  truncate: (text: string, max: number) => (text.length > max ? text.slice(0, max) + '...' : text),
}));

vi.mock('@/utils/i18n', () => ({
  defaultLanguage: 'en',
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => key);

const defaultProps = {
  language: 'en' as const,
  t: mockT,
};

const shortAboutContent = { en: 'Short about content.', fr: 'Contenu court.' };

const mockNews: any = {
  date_creation: '2024-01-15',
  title: { en: 'Latest News Title', fr: 'Titre Actualité' },
  content: { en: 'News content body.', fr: 'Corps de l\'actualité.' },
};

const mockVolume: any = {
  id: 7,
  num: 2,
  year: 2024,
  title: { en: 'Volume Title', fr: 'Titre Volume' },
  description: { en: 'Volume description.' },
  types: [],
};

const mockSpecialIssue: any = {
  ...mockVolume,
  types: [VOLUME_TYPE.SPECIAL_ISSUE],
};

// --- Tests ---

describe('PresentationSection', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // About section
  // ─────────────────────────────────────────────────────────────────────────
  describe('About section', () => {
    it('renders about content when aboutContent is provided', () => {
      render(<PresentationSection {...defaultProps} aboutContent={shortAboutContent} />);
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
      expect(screen.getByText('Short about content.')).toBeInTheDocument();
    });

    it('does not render about section when aboutContent is empty', () => {
      render(<PresentationSection {...defaultProps} aboutContent={{}} />);
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
    });

    it('does not render about section when aboutContent is not provided', () => {
      render(<PresentationSection {...defaultProps} />);
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument();
    });

    it('renders "see more" link to about page', () => {
      render(<PresentationSection {...defaultProps} aboutContent={shortAboutContent} />);
      const links = screen.getAllByRole('link');
      const aboutLink = links.find(l => l.getAttribute('href') === 'about');
      expect(aboutLink).toBeInTheDocument();
    });

    it('uses fallback to default language (en) when requested lang content is absent', () => {
      render(
        <PresentationSection
          {...defaultProps}
          language={'fr' as const}
          aboutContent={{ en: 'English fallback' } as any}
        />
      );
      expect(screen.getByText('English fallback')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Last Information — News
  // ─────────────────────────────────────────────────────────────────────────
  describe('lastInformation type=LAST_NEWS', () => {
    it('renders news title', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS, information: mockNews }}
        />
      );
      expect(screen.getByText('Latest News Title')).toBeInTheDocument();
    });

    it('renders news content', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS, information: mockNews }}
        />
      );
      expect(screen.getByText('News content body.')).toBeInTheDocument();
    });

    it('renders "see more" link to news page', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS, information: mockNews }}
        />
      );
      const links = screen.getAllByRole('link');
      expect(links.some(l => l.getAttribute('href') === 'news')).toBe(true);
    });

    it('does not render news section when news has no title', () => {
      const newsNoTitle = { ...mockNews, title: {} };
      const { container } = render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS, information: newsNoTitle }}
        />
      );
      expect(container.querySelector('.presentationSection-new')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Last Information — Volume
  // ─────────────────────────────────────────────────────────────────────────
  describe('lastInformation type=LAST_VOLUME', () => {
    it('renders volume title', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_VOLUME, information: mockVolume }}
        />
      );
      expect(screen.getByText('Volume Title')).toBeInTheDocument();
    });

    it('renders "see more" link to volumes page', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{ type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_VOLUME, information: mockVolume }}
        />
      );
      expect(screen.getAllByRole('link').some(l => l.getAttribute('href') === 'volumes')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Last Information — Special Issue
  // ─────────────────────────────────────────────────────────────────────────
  describe('lastInformation type=LAST_SPECIAL_ISSUE', () => {
    it('renders volume title for special issue', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{
            type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_SPECIAL_ISSUE,
            information: mockSpecialIssue,
          }}
        />
      );
      expect(screen.getByText('Volume Title')).toBeInTheDocument();
    });

    it('link href contains type=special_issue for special issues', () => {
      render(
        <PresentationSection
          {...defaultProps}
          lastInformation={{
            type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_SPECIAL_ISSUE,
            information: mockSpecialIssue,
          }}
        />
      );
      const links = screen.getAllByRole('link');
      expect(links.some(l => l.getAttribute('href')?.includes('type=special_issue'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // No lastInformation
  // ─────────────────────────────────────────────────────────────────────────
  describe('No lastInformation', () => {
    it('does not render news/volume section when lastInformation is absent', () => {
      const { container } = render(<PresentationSection {...defaultProps} />);
      expect(container.querySelector('.presentationSection-new')).toBeNull();
    });
  });
});
