export enum HOMEPAGE_BLOCK {
  LATEST_ARTICLES_CAROUSEL = 'latest-articles-carousel',
  LATEST_NEWS_CAROUSEL = 'latest-news-carousel',
  MEMBERS_CAROUSEL = 'members-carousel',
  STATS = 'stats',
  JOURNAL_INDEXATION = 'journal-indexation',
  SPECIAL_ISSUES = 'special-issues',
  LATEST_ACCEPTED_ARTICLES_CAROUSEL = 'latest-accepted-articles-carousel',
}

export enum HOMEPAGE_LAST_INFORMATION_BLOCK {
  LAST_NEWS = 'last-news',
  LAST_VOLUME = 'last-volume',
  LAST_SPECIAL_ISSUE = 'last-special-issue',
}

export interface BlockConfig {
  key: HOMEPAGE_BLOCK;
  render: boolean;
  order: number;
}

const getEnv = (key: string, journalConfig?: Record<string, string>): string | undefined =>
  journalConfig?.[key] ?? process.env[key];

export const blocksConfiguration = (journalConfig?: Record<string, string>): BlockConfig[] => [
  {
    key: HOMEPAGE_BLOCK.LATEST_ARTICLES_CAROUSEL,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_RENDER', journalConfig) !==
      'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_ORDER', journalConfig) || '1',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.LATEST_NEWS_CAROUSEL,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_ORDER', journalConfig) || '2',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.MEMBERS_CAROUSEL,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_ORDER', journalConfig) || '3',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.STATS,
    render: getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_ORDER', journalConfig) || '4',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.JOURNAL_INDEXATION,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_ORDER', journalConfig) || '5',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.SPECIAL_ISSUES,
    render: getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_ORDER', journalConfig) || '6',
      10
    ),
  },
  {
    key: HOMEPAGE_BLOCK.LATEST_ACCEPTED_ARTICLES_CAROUSEL,
    render:
      getEnv(
        'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER',
        journalConfig
      ) !== 'false',
    order: Number.parseInt(
      getEnv(
        'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_ORDER',
        journalConfig
      ) || '7',
      10
    ),
  },
];

export const lastInformationBlockConfiguration = (journalConfig?: Record<string, string>) => ({
  key:
    (getEnv(
      'NEXT_PUBLIC_JOURNAL_HOMEPAGE_LAST_INFORMATION_RENDER_TYPE',
      journalConfig
    ) as HOMEPAGE_LAST_INFORMATION_BLOCK) || HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS,
  render:
    getEnv('NEXT_PUBLIC_JOURNAL_HOMEPAGE_LAST_INFORMATION_BLOCK_RENDER', journalConfig) !== 'false',
});
