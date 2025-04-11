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
    LAST_SPECIAL_ISSUE = 'last-special-issue'
}

export interface BlockConfig {
    key: HOMEPAGE_BLOCK
    render: boolean
    order: number
}

export const blocksConfiguration = (): BlockConfig[] => [
    {
        key: HOMEPAGE_BLOCK.LATEST_ARTICLES_CAROUSEL,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_ORDER || '1', 10)
    },
    {
        key: HOMEPAGE_BLOCK.LATEST_NEWS_CAROUSEL,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_ORDER || '2', 10)
    },
    {
        key: HOMEPAGE_BLOCK.MEMBERS_CAROUSEL,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_ORDER || '3', 10)
    },
    {
        key: HOMEPAGE_BLOCK.STATS,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_ORDER || '4', 10)
    },
    {
        key: HOMEPAGE_BLOCK.JOURNAL_INDEXATION,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_ORDER || '5', 10)
    },
    {
        key: HOMEPAGE_BLOCK.SPECIAL_ISSUES,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_ORDER || '6', 10)
    },
    {
        key: HOMEPAGE_BLOCK.LATEST_ACCEPTED_ARTICLES_CAROUSEL,
        render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER !== 'false',
        order: parseInt(process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_ORDER || '7', 10)
    }
];

export const lastInformationBlockConfiguration = () => ({
    key: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LAST_INFORMATION_BLOCK_KEY as HOMEPAGE_LAST_INFORMATION_BLOCK || HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS,
    render: process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LAST_INFORMATION_BLOCK_RENDER !== 'false'
}); 