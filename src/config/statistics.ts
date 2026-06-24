import { STAT_EVALUATION_TYPE, STAT_TYPE } from '@/utils/stat';

export enum STATISTIC_BLOCK {
  ACCEPTANCE_RATE = STAT_TYPE.ACCEPTANCE_RATE,
  NB_SUBMISSIONS = STAT_TYPE.NB_SUBMISSIONS,
  NB_SUBMISSIONS_DETAILS = STAT_TYPE.NB_SUBMISSIONS_DETAILS,
  REVIEWS_REQUESTED = STAT_EVALUATION_TYPE.REVIEWS_REQUESTED,
  REVIEWS_RECEIVED = STAT_EVALUATION_TYPE.REVIEWS_RECEIVED,
  MEDIAN_SUBMISSION_PUBLICATION = STAT_TYPE.MEDIAN_SUBMISSION_PUBLICATION,
  MEDIAN_REVIEWS_NUMBER = STAT_EVALUATION_TYPE.MEDIAN_REVIEWS_NUMBER,
}

export interface BlockConfig {
  key: STATISTIC_BLOCK;
  render: boolean;
  order: number;
  title: string;
}

const getEnv = (key: string, journalConfig?: Record<string, string>): string | undefined =>
  journalConfig?.[key] ?? process.env[key];

export const statisticsBlocksConfiguration = (
  journalConfig?: Record<string, string>
): BlockConfig[] => [
  {
    key: STATISTIC_BLOCK.ACCEPTANCE_RATE,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_ACCEPTANCE_RATE_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_ACCEPTANCE_RATE_ORDER', journalConfig) ?? '0'
    ),
    title: 'Acceptance Rate',
  },
  {
    key: STATISTIC_BLOCK.NB_SUBMISSIONS,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_NB_SUBMISSIONS_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_NB_SUBMISSIONS_ORDER', journalConfig) || '2',
      10
    ),
    title: 'Submissions',
  },
  {
    key: STATISTIC_BLOCK.NB_SUBMISSIONS_DETAILS,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_NB_SUBMISSIONS_DETAILS_RENDER', journalConfig) !==
      'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_NB_SUBMISSIONS_DETAILS_ORDER', journalConfig) || '3',
      10
    ),
    title: 'Submissions Details',
  },
  {
    key: STATISTIC_BLOCK.REVIEWS_REQUESTED,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_REVIEWS_REQUESTED_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_REVIEWS_REQUESTED_ORDER', journalConfig) || '1',
      10
    ),
    title: 'Reviews Requested',
  },
  {
    key: STATISTIC_BLOCK.REVIEWS_RECEIVED,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_REVIEWS_RECEIVED_RENDER', journalConfig) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_REVIEWS_RECEIVED_ORDER', journalConfig) || '2',
      10
    ),
    title: 'Reviews Received',
  },
  {
    key: STATISTIC_BLOCK.MEDIAN_SUBMISSION_PUBLICATION,
    render:
      getEnv(
        'NEXT_PUBLIC_JOURNAL_STATISTICS_MEDIAN_SUBMISSION_PUBLICATION_RENDER',
        journalConfig
      ) !== 'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_MEDIAN_SUBMISSION_PUBLICATION_ORDER', journalConfig) ||
        '3',
      10
    ),
    title: 'Median Submission-Publication Time',
  },
  {
    key: STATISTIC_BLOCK.MEDIAN_REVIEWS_NUMBER,
    render:
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_MEDIAN_REVIEWS_NUMBER_RENDER', journalConfig) !==
      'false',
    order: Number.parseInt(
      getEnv('NEXT_PUBLIC_JOURNAL_STATISTICS_MEDIAN_REVIEWS_NUMBER_ORDER', journalConfig) || '4',
      10
    ),
    title: 'Median Reviews Number',
  },
];

export const hasAnyStatisticsBlock = (journalConfig?: Record<string, string>): boolean =>
  statisticsBlocksConfiguration(journalConfig).some(block => block.render);
