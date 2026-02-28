import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HomeClient from '../HomeClient';

// --- Mocks ---

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: vi.fn((selector: any) =>
    selector({ journalReducer: { currentJournal: null } })
  ),
}));

vi.mock('@/components/icons', () => ({
  CaretRightGreyIcon: ({ ariaLabel }: any) => (
    <span data-testid="caret-right" aria-label={ariaLabel} />
  ),
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/HomeSections/PresentationSection/PresentationSection', () => ({
  default: ({ language, aboutContent, lastInformation }: any) => (
    <div
      data-testid="presentation-section"
      data-language={language}
      data-has-last-info={!!lastInformation}
      data-has-about-content={!!aboutContent}
    />
  ),
}));

vi.mock('@/components/HomeSections/NewsSection/NewsSection', () => ({
  default: ({ news }: any) => (
    <div data-testid="news-section" data-count={news?.length} />
  ),
}));

vi.mock('@/components/HomeSections/StatisticsSection/StatisticsSection', () => ({
  default: ({ stats }: any) => (
    <div data-testid="statistics-section" data-count={stats?.length} />
  ),
}));

vi.mock('@/components/HomeSections/JournalSection/JournalSection', () => ({
  default: ({ language }: any) => (
    <div data-testid="journal-section" data-language={language} />
  ),
}));

vi.mock('@/components/HomeSections/IssuesSection/IssuesSection', () => ({
  default: ({ issues }: any) => (
    <div data-testid="issues-section" data-count={issues?.length} />
  ),
}));

vi.mock('@/components/Swiper/Swiper', () => ({
  default: ({ id, type, cards }: any) => (
    <div data-testid={`swiper-${type}`} id={id} data-count={cards?.length} />
  ),
}));

// Env vars controlled per-test — blocksConfiguration() reads process.env at call-time
const ALL_BLOCK_ENV_VARS = [
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_RENDER',
  'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER',
];

// --- Fixtures ---

const mockArticle = { id: 1, title: { en: 'Article 1', fr: 'Article 1' } } as any;
const mockAcceptedArticle = { id: 2, title: { en: 'Accepted 1', fr: 'Accepté 1' } } as any;
const mockNews = { id: 10, title: { en: 'News 1', fr: 'Actualité 1' } } as any;
const mockIssue = { id: 20, num: '1', title: { en: 'Issue 1', fr: 'Numéro 1' }, articles: [], downloadLink: '' } as any;
const mockMember = { uuid: 'u1', fullName: 'Alice Dupont', roles: [] } as any;
const mockStat = { type: 'articles', value: 42 } as any;
const mockContent = { id: 1, page_code: 'about', rvcode: 'test', title: { en: 'T', fr: 'T' }, content: { en: 'Content', fr: 'Contenu' } } as any;

const fullHomeData = {
  aboutPage: mockContent,
  articles: { data: [mockArticle], totalItems: 1 },
  news: { data: [mockNews], totalItems: 1 },
  members: [mockMember],
  stats: [mockStat],
  indexation: mockContent,
  issues: { data: [mockIssue], totalItems: 1 },
  acceptedArticles: { data: [mockAcceptedArticle], totalItems: 1 },
};

const emptyHomeData = {
  articles: { data: [], totalItems: 0 },
  news: { data: [], totalItems: 0 },
  members: [],
  stats: [],
  issues: { data: [], totalItems: 0 },
  acceptedArticles: { data: [], totalItems: 0 },
};

const defaultProps = {
  homeData: fullHomeData,
  language: 'en',
  journalId: 'testjournal',
};

// --- Tests ---

describe('HomeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ALL_BLOCK_ENV_VARS.forEach(key => delete process.env[key]);
  });

  afterEach(() => {
    ALL_BLOCK_ENV_VARS.forEach(key => delete process.env[key]);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Structure de base
  // ─────────────────────────────────────────────────────────────────────────
  describe('Structure', () => {
    it('renders a <main> element with class "home"', () => {
      render(<HomeClient {...defaultProps} />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('home');
    });

    it('renders an h1 title', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('pages.home.title');
    });

    it('always renders PresentationSection regardless of homeData', () => {
      render(<HomeClient {...defaultProps} homeData={emptyHomeData} />);
      expect(screen.getByTestId('presentation-section')).toBeInTheDocument();
    });

    it('passes language prop to PresentationSection', () => {
      render(<HomeClient {...defaultProps} language="fr" />);
      expect(screen.getByTestId('presentation-section')).toHaveAttribute('data-language', 'fr');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PresentationSection — lastInformation
  // ─────────────────────────────────────────────────────────────────────────
  describe('lastInformation (PresentationSection)', () => {
    it('passes lastInformation when news.data[0] exists', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('presentation-section')).toHaveAttribute(
        'data-has-last-info',
        'true'
      );
    });

    it('passes no lastInformation when news.data is empty', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, news: { data: [], totalItems: 0 } }}
        />
      );
      expect(screen.getByTestId('presentation-section')).toHaveAttribute(
        'data-has-last-info',
        'false'
      );
    });

    it('passes aboutContent to PresentationSection', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('presentation-section')).toHaveAttribute(
        'data-has-about-content',
        'true'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Articles section (Swiper type="article")
  // ─────────────────────────────────────────────────────────────────────────
  describe('Articles section', () => {
    it('renders articles swiper when articles.data is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('swiper-article')).toBeInTheDocument();
    });

    it('hides articles swiper when articles.data is empty', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, articles: { data: [], totalItems: 0 } }}
        />
      );
      expect(screen.queryByTestId('swiper-article')).not.toBeInTheDocument();
    });

    it('hides articles swiper when articles.data contains only null-like entries', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, articles: { data: [null as any], totalItems: 1 } }}
        />
      );
      expect(screen.queryByTestId('swiper-article')).not.toBeInTheDocument();
    });

    it('hides articles swiper when LATEST_ARTICLES_CAROUSEL_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('swiper-article')).not.toBeInTheDocument();
    });

    it('passes articles to swiper', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('swiper-article')).toHaveAttribute('data-count', '1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // News section
  // ─────────────────────────────────────────────────────────────────────────
  describe('News section', () => {
    it('renders news section when news.data is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('news-section')).toBeInTheDocument();
    });

    it('hides news section when news.data is empty', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, news: { data: [], totalItems: 0 } }}
        />
      );
      expect(screen.queryByTestId('news-section')).not.toBeInTheDocument();
    });

    it('hides news section when LATEST_NEWS_CAROUSEL_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('news-section')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Members section (Swiper type="board")
  // ─────────────────────────────────────────────────────────────────────────
  describe('Members section', () => {
    it('renders board swiper when members is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('swiper-board')).toBeInTheDocument();
    });

    it('hides board swiper when members is empty', () => {
      render(<HomeClient {...defaultProps} homeData={{ ...fullHomeData, members: [] }} />);
      expect(screen.queryByTestId('swiper-board')).not.toBeInTheDocument();
    });

    it('hides board swiper when MEMBERS_CAROUSEL_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('swiper-board')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Statistics section
  // ─────────────────────────────────────────────────────────────────────────
  describe('Statistics section', () => {
    it('renders statistics section when stats is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('statistics-section')).toBeInTheDocument();
    });

    it('hides statistics section when stats is empty', () => {
      render(<HomeClient {...defaultProps} homeData={{ ...fullHomeData, stats: [] }} />);
      expect(screen.queryByTestId('statistics-section')).not.toBeInTheDocument();
    });

    it('hides statistics section when STATS_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('statistics-section')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Indexation section (JournalSection)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Indexation section', () => {
    it('renders journal section when indexation.content exists and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('journal-section')).toBeInTheDocument();
    });

    it('still renders journal section when indexation is undefined (default { content: {} } is applied)', () => {
      // HomeClient destructures: `indexation = { content: {} }` as default.
      // `!!{}` is truthy, so the section renders unless the env var disables the block.
      render(
        <HomeClient {...defaultProps} homeData={{ ...fullHomeData, indexation: undefined }} />
      );
      expect(screen.getByTestId('journal-section')).toBeInTheDocument();
    });

    it('hides journal section when JOURNAL_INDEXATION_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('journal-section')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Special Issues section (IssuesSection)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Special Issues section', () => {
    it('renders issues section when issues.data is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('issues-section')).toBeInTheDocument();
    });

    it('hides issues section when issues.data is empty', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, issues: { data: [], totalItems: 0 } }}
        />
      );
      expect(screen.queryByTestId('issues-section')).not.toBeInTheDocument();
    });

    it('hides issues section when SPECIAL_ISSUES_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('issues-section')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accepted Articles section (Swiper type="article-accepted")
  // ─────────────────────────────────────────────────────────────────────────
  describe('Accepted Articles section', () => {
    it('renders accepted articles swiper when data is non-empty and block is enabled', () => {
      render(<HomeClient {...defaultProps} />);
      expect(screen.getByTestId('swiper-article-accepted')).toBeInTheDocument();
    });

    it('hides accepted articles swiper when data is empty', () => {
      render(
        <HomeClient
          {...defaultProps}
          homeData={{ ...fullHomeData, acceptedArticles: { data: [], totalItems: 0 } }}
        />
      );
      expect(screen.queryByTestId('swiper-article-accepted')).not.toBeInTheDocument();
    });

    it('hides accepted articles swiper when LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER=false', () => {
      process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER = 'false';
      render(<HomeClient {...defaultProps} />);
      expect(screen.queryByTestId('swiper-article-accepted')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Empty homeData — tous les blocs masqués
  // ─────────────────────────────────────────────────────────────────────────
  describe('Empty homeData', () => {
    it('hides all data-dependent sections when all data is empty and all blocks disabled', () => {
      // Disable every block via env vars so we can assert all are hidden.
      ALL_BLOCK_ENV_VARS.forEach(key => (process.env[key] = 'false'));
      render(<HomeClient {...defaultProps} homeData={emptyHomeData} />);
      expect(screen.getByTestId('presentation-section')).toBeInTheDocument();
      expect(screen.queryByTestId('swiper-article')).not.toBeInTheDocument();
      expect(screen.queryByTestId('news-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('swiper-board')).not.toBeInTheDocument();
      expect(screen.queryByTestId('statistics-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('journal-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('issues-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('swiper-article-accepted')).not.toBeInTheDocument();
    });

    it('hides data-driven sections (articles, news, members, stats, issues, acceptedArticles) when data is empty', () => {
      render(<HomeClient {...defaultProps} homeData={emptyHomeData} />);
      expect(screen.queryByTestId('swiper-article')).not.toBeInTheDocument();
      expect(screen.queryByTestId('news-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('swiper-board')).not.toBeInTheDocument();
      expect(screen.queryByTestId('statistics-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('issues-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('swiper-article-accepted')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // journalId fallback
  // ─────────────────────────────────────────────────────────────────────────
  describe('journalId', () => {
    it('renders without crashing when journalId is undefined', () => {
      render(<HomeClient homeData={emptyHomeData} language="en" />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
